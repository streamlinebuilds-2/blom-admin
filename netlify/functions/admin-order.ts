import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    // Handle PATCH request for order status updates and archiving
    if (e.httpMethod === 'PATCH') {
      const body = JSON.parse(e.body || '{}');
      const { id, status, archived } = body;

      if (!id) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing order id" }) };
      }

      // Handle archiving
      if (archived !== undefined) {
        console.log('📦 Archiving order:', { id, archived });

        const { data: updatedOrder, error: archiveError } = await s
          .from("orders")
          .update({ 
            archived: archived,
            updated_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        if (archiveError) {
          throw new Error(`Failed to archive order: ${archiveError.message}`);
        }

        console.log(`✅ Order ${id} ${archived ? 'archived' : 'unarchived'} successfully`);

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ 
            ok: true, 
            order: updatedOrder,
            archived: archived
          })
        };
      }

      // Handle status updates (existing logic)
      if (!status) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing status" }) };
      }

      console.log('🔄 Updating order status:', { id, status });

      // Get current order status
      const { data: currentOrder, error: fetchError } = await s
        .from("orders")
        .select('status, paid_at')
        .eq("id", id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current order: ${fetchError.message}`);
      }

      const oldStatus = currentOrder?.status;
      console.log(`📊 Order ${id} status change: ${oldStatus} → ${status}`);

      // Prepare update data
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Set timestamps based on status
      if (status === 'paid' && oldStatus !== 'paid') {
        updateData.paid_at = new Date().toISOString();
        console.log('💰 Order marked as paid - will trigger stock deduction');
      }
      if (status === 'packed') {
        updateData.order_packed_at = new Date().toISOString();
      }
      if (status === 'out_for_delivery') {
        updateData.order_out_for_delivery_at = new Date().toISOString();
      }
      if (status === 'collected') {
        updateData.order_collected_at = new Date().toISOString();
        updateData.fulfilled_at = new Date().toISOString();
      }
      if (status === 'delivered') {
        updateData.order_delivered_at = new Date().toISOString();
        updateData.fulfilled_at = new Date().toISOString();
      }

      // Update the order
      const { data: updatedOrder, error: updateError } = await s
        .from("orders")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      let invoiceGenerated = false;
      let invoiceUrl: string | null = null;
      let invoiceError: string | null = null;

      if (status === 'paid' && oldStatus !== 'paid') {
        try {
          const { data: invRow, error: invRowErr } = await s
            .from("orders")
            .select("invoice_url, m_payment_id")
            .eq("id", id)
            .maybeSingle();
          if (invRowErr) throw invRowErr;

          if (!invRow?.invoice_url) {
            const base = process.env.URL || process.env.SITE_URL || 'https://blom-cosmetics.co.za';
            const url = `${base.replace(/\/$/, '')}/.netlify/functions/invoice-pdf?return_url=1`;
            const ac = new AbortController();
            const t = setTimeout(() => ac.abort(), 15000);
            try {
              const invRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: id, m_payment_id: invRow?.m_payment_id }),
                signal: ac.signal
              });
              if (!invRes.ok) {
                const detail = await invRes.text().catch(() => '');
                invoiceError = `invoice-pdf failed: ${invRes.status} ${detail}`;
              } else {
                const invJson: any = await invRes.json().catch(() => ({}));
                invoiceGenerated = true;
                invoiceUrl = invJson?.url || null;
              }
            } finally {
              clearTimeout(t);
            }
          }
        } catch (e: any) {
          invoiceError = e?.message || String(e);
        }
      }

      console.log('✅ Order status updated successfully');

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ 
          ok: true, 
          order: updatedOrder,
          statusChanged: oldStatus !== status,
          webhookCalled: false,
          webhookOk: false,
          invoiceGenerated,
          invoiceUrl,
          invoiceError
        })
      };
    }

    // Handle GET request for fetching order details
    const id = new URL(e.rawUrl).searchParams.get("id");
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing id" }) };
    }

    // 1. Get Order with specific columns - include all pricing fields and invoice URL
    const { data: orderData, error: oErr } = await s.from("orders")
      .select(`
        *,
        shipping_address,
        fulfillment_type,
        buyer_name, buyer_email, buyer_phone,
        customer_name, customer_email, customer_phone,
        total_cents, subtotal_cents, shipping_cents, discount_cents,
        total, subtotal, shipping, discount,
        invoice_url
      `)
      .eq("id", id).single();

    if (oErr) throw oErr;
    let order: any = orderData;

    // 2. Get Items with correct column names - include variant information
    const { data: items, error: iErr } = await s.from("order_items")
      .select(`
        name, product_name, quantity, 
        unit_price_cents, line_total_cents, 
        price, unit_price, line_total,
        variant, sku, product_id
      `)
      .eq("order_id", id)
      .order("name", { ascending: true });

    if (iErr) throw iErr;

    const asNumber = (v: any) => {
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? n : null;
    };

    const guessMoneyToCents = (value: any) => {
      const n = asNumber(value);
      if (n === null) return null;
      if (!Number.isInteger(n)) return Math.round(n * 100);
      if (n >= 10000) return Math.round(n);
      return Math.round(n * 100);
    };

    const orderSubtotalCents =
      asNumber(order?.subtotal_cents) ??
      guessMoneyToCents(order?.subtotal) ??
      null;

    const needsBackfill = (items || []).some((it: any) => {
      const q = asNumber(it.quantity) ?? 0;
      if (q <= 0) return false;
      const unitCents = asNumber(it.unit_price_cents) ?? guessMoneyToCents(it.unit_price) ?? guessMoneyToCents(it.price) ?? 0;
      const lineCents = asNumber(it.line_total_cents) ?? guessMoneyToCents(it.line_total) ?? (unitCents * q);
      return (unitCents === 0 || lineCents === 0) && !!it.product_id;
    });

    let enrichedItems: any[] = items || [];
    if (needsBackfill) {
      if (orderSubtotalCents != null) {
        const computedLineCents = (it: any) => {
          const q = asNumber(it.quantity) ?? 0;
          const unitCents = asNumber(it.unit_price_cents) ?? guessMoneyToCents(it.unit_price) ?? guessMoneyToCents(it.price) ?? 0;
          return asNumber(it.line_total_cents) ?? guessMoneyToCents(it.line_total) ?? (unitCents * q);
        };

        const missingIdx: number[] = [];
        let existingSum = 0;
        let missingQty = 0;

        (items || []).forEach((it: any, idx: number) => {
          const q = asNumber(it.quantity) ?? 0;
          const line = computedLineCents(it) || 0;
          if (q > 0 && line <= 0) {
            missingIdx.push(idx);
            missingQty += q;
          } else {
            existingSum += Math.max(0, line);
          }
        });

        const remaining = Math.max(0, orderSubtotalCents - existingSum);

        if (missingIdx.length > 0 && missingQty > 0 && remaining > 0) {
          let allocated = 0;
          const inferredLines = new Map<number, number>();
          missingIdx.forEach((idx, i) => {
            const q = asNumber((items || [])[idx]?.quantity) ?? 0;
            if (i === missingIdx.length - 1) {
              inferredLines.set(idx, Math.max(0, remaining - allocated));
              return;
            }
            const line = Math.max(0, Math.round((remaining * q) / missingQty));
            inferredLines.set(idx, line);
            allocated += line;
          });

          enrichedItems = (items || []).map((it: any, idx: number) => {
            if (!inferredLines.has(idx)) return it;
            const q = asNumber(it.quantity) ?? 0;
            const line = inferredLines.get(idx) ?? 0;
            const unit = q > 0 ? Math.round(line / q) : 0;
            return { ...it, unit_price_cents: unit, line_total_cents: line };
          });
        }
      }
    }

    let invoiceGenerated = false;
    let invoiceUrl: string | null = null;
    let invoiceError: string | null = null;

    if (order && !order.invoice_url && (order.status === 'paid' || order.payment_status === 'paid')) {
      try {
        const base = process.env.URL || process.env.SITE_URL || 'https://blom-cosmetics.co.za';
        const url = `${base.replace(/\/$/, '')}/.netlify/functions/invoice-pdf?return_url=1`;
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 15000);
        try {
          const invRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: id, m_payment_id: order.m_payment_id }),
            signal: ac.signal
          });
          if (!invRes.ok) {
            const detail = await invRes.text().catch(() => '');
            invoiceError = `invoice-pdf failed: ${invRes.status} ${detail}`;
          } else {
            const invJson: any = await invRes.json().catch(() => ({}));
            invoiceGenerated = true;
            invoiceUrl = invJson?.url || null;
          }
        } finally {
          clearTimeout(t);
        }

        const { data: refreshed, error: rErr } = await s
          .from("orders")
          .select("invoice_url")
          .eq("id", id)
          .maybeSingle();
        if (!rErr && refreshed?.invoice_url) {
          order = { ...order, invoice_url: refreshed.invoice_url };
        }
      } catch (e: any) {
        invoiceError = e?.message || String(e);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, order, items: enrichedItems, invoiceGenerated, invoiceUrl, invoiceError })
    };
  } catch (err:any) {
    console.error('❌ Order handler error:', err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};
