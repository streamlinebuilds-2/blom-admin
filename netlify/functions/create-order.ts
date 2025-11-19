import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' }
    }

    const body = JSON.parse(event.body || '{}')

    // DEBUG: Log what frontend is sending
    console.log("📦 Received orderData:", JSON.stringify(body, null, 2));
    console.log("📦 Items array:", JSON.stringify(body.items, null, 2));

    // --- 1. Extract & Normalize Payloads ---

    let items = body.items || []
    let buyer: any = body.buyer || {}
    let fulfillment: any = body.fulfillment || {}
    const coupon = body.coupon || null

    // 1a. Normalize Buyer
    if (body.customerEmail || body.customerName || body.shippingInfo) {
      buyer = {
        name: body.customerName || `${body.shippingInfo?.firstName || ''} ${body.shippingInfo?.lastName || ''}`.trim() || buyer.name,
        email: body.customerEmail || body.shippingInfo?.email || buyer.email || '',
        phone: body.customerPhone || body.shippingInfo?.phone || buyer.phone || '',
        user_id: body.customerId || buyer.user_id || null
      }
    }

    // 1b. Normalize Fulfillment
    if (body.shipping) {
      const method = body.shipping.method;
      const isNoShipping = method === 'store-pickup' || method === 'digital' || method === 'collection';

      fulfillment = {
        method: isNoShipping ? 'collection' : 'delivery',
        delivery_address: body.shipping.address || body.deliveryAddress || null,
        collection_location: method === 'store-pickup' ? 'BLOM HQ, Randfontein' : (method === 'digital' ? 'Online Access' : null)
      }
    } else if (body.shippingMethod || body.deliveryAddress) {
      const method = body.shippingMethod || 'door-to-door';
      const isPickup = method === 'store-pickup' || method === 'collection';

      fulfillment = {
        method: isPickup ? 'collection' : 'delivery',
        delivery_address: !isPickup ? (body.deliveryAddress || {}) : null,
        collection_location: isPickup ? 'BLOM HQ, Randfontein' : null
      }
    }

    // 1c. Normalize Items with Variants
    if (items.length > 0) {
      items = items.map((it: any) => {
        let finalName = it.product_name || it.name || 'Unknown Product';
        if (it.variant && it.variant.title) {
          finalName = `${finalName} - ${it.variant.title}`;
        } else if (it.selectedVariant) {
           finalName = `${finalName} - ${it.selectedVariant}`;
        }

        return {
          product_id: it.product_id || it.productId || it.id,
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price ?? it.price ?? 0),
          product_name: finalName,
          sku: it.sku || null,
          variant: it.variant?.title || it.variant || null
        };
      });
    }

    if (!items.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No items' }) }
    }

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) }
    }

    // --- 2. Calculate Totals ---
    let subtotal_cents = Number(body.totals?.subtotal_cents)
    let shipping_cents = Number(body.totals?.shipping_cents || 0)
    let tax_cents = Number(body.totals?.tax_cents || 0)

    if (!Number.isFinite(subtotal_cents)) {
      subtotal_cents = items.reduce((sum: number, it: any) =>
        sum + Math.round(Number(it.unit_price) * 100) * Number(it.quantity || 1), 0)
    }

    // --- 3. Apply Coupon ---
    let discount_cents = 0
    if (coupon?.code) {
      try {
        const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/redeem_coupon`, {
          method: 'POST',
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            p_code: String(coupon.code).toUpperCase(),
            p_email: buyer.email || '',
            p_order_total_cents: subtotal_cents
          })
        })

        if (rpcRes.ok) {
          const rpcData = await rpcRes.json()
          const row = Array.isArray(rpcData) ? rpcData[0] : rpcData
          if (row?.valid) {
            discount_cents = Number(row.discount_cents) || 0
          }
        }
      } catch (e) {
        console.error('Coupon validation failed:', e)
      }
    }

    const total_cents = Math.max(0, subtotal_cents + shipping_cents + tax_cents - discount_cents)
    const amountStr = (total_cents / 100).toFixed(2)
    const m_payment_id = `BL-${Date.now().toString(16).toUpperCase()}`
    const order_number = `BL-${Date.now().toString(36).toUpperCase()}`

    // --- 4. Construct Delivery Address ---
    let deliveryAddressJson = null
    if (fulfillment.method === 'delivery') {
      const rawAddr = fulfillment.delivery_address || {}
      deliveryAddressJson = {
        street_address: rawAddr.street_address || rawAddr.streetAddress || rawAddr.address || rawAddr.street || '',
        local_area: rawAddr.local_area || rawAddr.localArea || rawAddr.suburb || '',
        city: rawAddr.city || rawAddr.town || '',
        zone: rawAddr.zone || rawAddr.province || rawAddr.state || '',
        code: rawAddr.code || rawAddr.postalCode || rawAddr.zipCode || rawAddr.zip || '',
        country: rawAddr.country || 'ZA',
        lat: rawAddr.lat || null,
        lng: rawAddr.lng || null
      }
    }

    // --- 5. Save Order DIRECTLY (no RPC) ---
    const orderPayload = {
      order_number,
      m_payment_id,
      merchant_payment_id: m_payment_id,
      buyer_email: buyer.email || '',
      buyer_name: buyer.name || '',
      buyer_phone: buyer.phone || '',
      customer_email: buyer.email || '',
      customer_name: buyer.name || '',
      customer_phone: buyer.phone || '',
      user_id: buyer.user_id,
      channel: 'website',
      status: 'pending_payment',
      payment_status: 'unpaid',
      subtotal_cents,
      shipping_cents,
      discount_cents,
      tax_cents,
      total_cents,
      total: total_cents / 100,
      fulfillment_method: fulfillment.method,
      delivery_method: fulfillment.method,
      delivery_address: deliveryAddressJson,
      shipping_address: deliveryAddressJson,
      collection_location: fulfillment.collection_location,
      placed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(orderPayload)
    })

    if (!orderRes.ok) {
      const err = await orderRes.text()
      console.error('DB Error:', err)
      return { statusCode: 400, body: JSON.stringify({ error: 'ORDER_CREATE_FAILED', details: err }) }
    }

    const orderData = await orderRes.json()
    const orderRow = Array.isArray(orderData) ? orderData[0] : orderData

    // --- 6. Save Order Items ---
    if (items.length > 0) {
      const itemsPayload = items.map((it: any) => ({
        order_id: orderRow.id,
        product_id: it.product_id || null,
        product_name: it.product_name,
        name: it.product_name,
        sku: it.sku || null,
        quantity: it.quantity,
        qty: it.quantity,
        unit_price: it.unit_price,
        unit_price_cents: Math.round(it.unit_price * 100),
        line_total_cents: Math.round(it.unit_price * 100) * it.quantity,
        variant: it.variant || null
      }))

      await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(itemsPayload)
      })
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderRow.id,
        order_number,
        m_payment_id,
        merchant_payment_id: m_payment_id,
        amount: amountStr,
        total_cents,
        discount_cents
      })
    }

  } catch (e: any) {
    console.error('Create order fatal error:', e)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message || 'Server error' })
    }
  }
}
