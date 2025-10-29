import type { Handler } from '@netlify/functions'
import { supabaseAdmin } from '../../src/lib/supabaseServer'

const handler: Handler = async (event) => {
  try {
    const sb = supabaseAdmin()
    const url = new URL(event.rawUrl)

    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200)
    const page  = Math.max(Number(url.searchParams.get('page')  ?? 1), 1)
    const status = url.searchParams.get('status') ?? undefined
    const payment_status = url.searchParams.get('payment_status') ?? undefined
    const delivery_method = url.searchParams.get('delivery_method') ?? undefined
    const email = url.searchParams.get('email') ?? undefined
    const q = url.searchParams.get('q') ?? undefined
    const orderBy = url.searchParams.get('order_by') ?? 'placed_at'
    const dir = (url.searchParams.get('dir') ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'
    const offset = (page - 1) * limit

    // Select with nested items and payments
    const sel = `
      id,
      merchant_payment_id,
      order_number,
      customer_name,
      customer_email,
      customer_phone,
      status,
      payment_status,
      fulfillment_status,
      delivery_method,
      shipping_address,
      collection_slot,
      collection_location,
      subtotal_cents,
      shipping_cents,
      discount_cents,
      tax_cents,
      total_cents,
      currency,
      tracking_number,
      tracking_url,
      notes_admin,
      placed_at,
      paid_at,
      fulfilled_at,
      created_at,
      updated_at,
      order_items (
        id,
        sku,
        name,
        variant,
        qty,
        unit_price_cents,
        line_total_cents
      ),
      payments (
        id,
        provider,
        amount_cents,
        status,
        created_at
      )
    `

    let query = sb.from('orders').select(sel, { count: 'exact' })

    if (status)          query = query.eq('status', status)
    if (payment_status)  query = query.eq('payment_status', payment_status)
    if (delivery_method) query = query.eq('delivery_method', delivery_method)
    if (email)           query = query.eq('customer_email', email)

    if (q) {
      query = query.or([
        `merchant_payment_id.ilike.%${q}%`,
        `customer_email.ilike.%${q}%`,
        `customer_name.ilike.%${q}%`,
        `order_number.ilike.%${q}%`
      ].join(','))
    }

    query = query
      .order(orderBy as any, { ascending: dir === 'asc', nullsFirst: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    // Normalize item fields (supports old price_cents/total_cents)
    const normalizedData = (data ?? []).map((order: any) => {
      const items = (order.order_items ?? []).map((i: any) => ({
        ...i,
        unit_price_cents: i.unit_price_cents ?? i.price_cents ?? 0,
        line_total_cents: i.line_total_cents ?? i.total_cents ?? ((i.qty ?? 0) * (i.unit_price_cents ?? i.price_cents ?? 0)),
      }))
      return { ...order, order_items: items }
    })

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ rows: normalizedData, meta: { page, limit, total: count ?? 0, orderBy, dir } })
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ error: err?.message ?? 'server_error' })
    }
  }
}

export { handler }
