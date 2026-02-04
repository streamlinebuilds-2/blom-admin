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

      console.log('✅ Order status updated successfully');

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ 
          ok: true, 
          order: updatedOrder,
          statusChanged: oldStatus !== status,
          webhookCalled: false,
          webhookOk: false
        })
      };
    }

    // Handle GET request for fetching order details
    const id = new URL(e.rawUrl).searchParams.get("id");
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing id" }) };
    }

    // 1. Get Order with specific columns - include all pricing fields and invoice URL
    const { data: order, error: oErr } = await s.from("orders")
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
      const productIds = Array.from(new Set((items || []).map((it: any) => it.product_id).filter(Boolean)));
      const { data: products, error: pErr } = await s
        .from("products")
        .select("id, price")
        .in("id", productIds);
      if (pErr) throw pErr;

      const priceById = new Map<string, number>();
      for (const p of products || []) {
        const cents = guessMoneyToCents(p.price) ?? 0;
        if (cents > 0) priceById.set(p.id, cents);
      }

      const baseSum = (items || []).reduce((sum: number, it: any) => {
        const q = asNumber(it.quantity) ?? 0;
        const baseUnit = it.product_id ? (priceById.get(it.product_id) ?? 0) : 0;
        return sum + Math.max(0, baseUnit * q);
      }, 0);

      const scale = orderSubtotalCents != null && baseSum > 0 ? orderSubtotalCents / baseSum : 1;

      let allocated = 0;
      const inferredLines: number[] = (items || []).map((it: any, idx: number) => {
        const q = asNumber(it.quantity) ?? 0;
        const baseUnit = it.product_id ? (priceById.get(it.product_id) ?? 0) : 0;
        const baseLine = Math.max(0, baseUnit * q);
        if (idx === (items || []).length - 1 && orderSubtotalCents != null) {
          return Math.max(0, orderSubtotalCents - allocated);
        }
        const inferred = Math.max(0, Math.round(baseLine * scale));
        allocated += inferred;
        return inferred;
      });

      enrichedItems = (items || []).map((it: any, idx: number) => {
        const q = asNumber(it.quantity) ?? 0;
        const existingUnitCents = asNumber(it.unit_price_cents) ?? guessMoneyToCents(it.unit_price) ?? guessMoneyToCents(it.price) ?? null;
        const existingLineCents = asNumber(it.line_total_cents) ?? guessMoneyToCents(it.line_total) ?? (existingUnitCents != null ? existingUnitCents * q : null);

        if (q > 0 && (existingUnitCents === 0 || existingLineCents === 0) && it.product_id) {
          const inferredLine = inferredLines[idx] ?? 0;
          const inferredUnit = Math.round(inferredLine / q);
          return { ...it, unit_price_cents: inferredUnit, line_total_cents: inferredLine };
        }
        return it;
      });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, order, items: enrichedItems })
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
