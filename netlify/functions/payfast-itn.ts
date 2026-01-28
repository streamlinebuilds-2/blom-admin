import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import crypto from 'crypto';

// Helper to get Supabase admin client
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase env vars');
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
};

// Helper to parse form-urlencoded body
const parseBody = (body: string) => {
  const params = new URLSearchParams(body);
  const payload: { [key: string]: any } = {};
  for (const [key, value] of params.entries()) {
    payload[key] = value;
  }
  return payload;
};

// CRITICAL: PayFast Security Validation
const validatePayfastSignature = (payload: any, passphrase: string) => {
  const pfPassphrase = passphrase.trim();

  // 1. Remove 'signature' from payload
  const { signature, ...data } = payload;
  if (!signature) return false;

  // 2. Create the data string
  const sortedData = Object.keys(data)
    .sort()
    .reduce((acc, key) => {
      if (data[key] !== '') {
        acc[key] = data[key];
      }
      return acc;
    }, {} as { [key: string]: any });

  const pfDataString = new URLSearchParams({
    ...sortedData,
    passphrase: pfPassphrase,
  }).toString();

  // 3. Create the MD5 hash
  const generatedSignature = crypto.createHash('md5').update(pfDataString).digest('hex');

  // 4. Compare
  return signature === generatedSignature;
};

// THE MAIN HANDLER
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabase = getSupabaseAdmin();
  const passphrase = process.env.PAYFAST_PASSPHRASE; // You MUST set this in Netlify

  if (!passphrase) {
    console.error('CRITICAL: PAYFAST_PASSPHRASE is not set.');
    return { statusCode: 500, body: 'Internal config error' };
  }

  try {
    // 1. Parse the incoming ITN data
    const itnPayload = parseBody(event.body || '');
    console.log('Received ITN Payload:', itnPayload);

    // 2. Validate the ITN Signature (SECURITY)
    if (!validatePayfastSignature(itnPayload, passphrase)) {
      console.warn('CRITICAL: PayFast ITN Signature Validation FAILED.');
      return { statusCode: 401, body: 'ITN Validation Failed' };
    }
    console.log('PayFast ITN Signature Validated.');

    // 3. Get key data
    const orderId = itnPayload.m_payment_id; // Your internal order ID (m_payment_id)
    const pfPaymentId = itnPayload.pf_payment_id;
    const paymentStatus = itnPayload.payment_status;
    const customStr1 = itnPayload.custom_str1;

    // 4. Check if this is a 'COMPLETE' payment
    if (paymentStatus !== 'COMPLETE') {
      console.log(`ITN for order ${orderId} has status: ${paymentStatus}. No action taken.`);
      return { statusCode: 200, body: 'OK (non-complete status)' };
    }

    // 5. Convert Rands to cents; total in rands from amount_gross (actual paid)
    const grossCents = Math.round(parseFloat(itnPayload.amount_gross || '0') * 100);
    const feeCents = Math.round(parseFloat(itnPayload.amount_fee || '0') * 100);
    const netCents = Math.round(parseFloat(itnPayload.amount_net || '0') * 100);
    const totalRands = parseFloat(itnPayload.amount_gross || '0');

    // 5b. Resolve order: match by m_payment_id first (what PayFast echoes), then by id for legacy
    let orderUuid: string | null = null;
    const { data: byMpid } = await supabase.from('orders').select('id').eq('m_payment_id', orderId).maybeSingle();
    if (byMpid) orderUuid = byMpid.id;
    else {
      const { data: byId } = await supabase.from('orders').select('id').eq('id', orderId).maybeSingle();
      if (byId) orderUuid = byId.id;
    }
    if (!orderUuid) {
      console.error(`Order not found for m_payment_id/id=${orderId}`);
      return { statusCode: 200, body: 'OK' };
    }

    // 6. Update the Order: status, paid_at, and totals from actual paid amount
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        total: totalRands,
        total_cents: grossCents,
      })
      .eq('id', orderUuid);

    if (orderError) {
      console.error(`Error updating order ${orderUuid}:`, orderError.message);
      return { statusCode: 200, body: 'OK' };
    }

    // 7. Create the new Payment record (match current payments table schema)
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderUuid,
        provider: 'payfast',
        amount_cents: grossCents,
        status: 'succeeded',
        raw: itnPayload,
        provider_txn_id: pfPaymentId,
        pf_payment_id: pfPaymentId,
        method: itnPayload.payment_method || null,
        amount: totalRands,
        paid_at: new Date().toISOString(),
      });

    if (paymentError && paymentError.code !== '23505') {
      console.error(`Error creating payment record for ${orderUuid}:`, paymentError.message);
    }

    // 8. If this is a course order, update the linked course_purchases record (paid/owed)
    let isCourseOrder = false;
    try {
      const { data: kindRow, error: kindErr } = await supabase
        .from('orders')
        .select('order_kind')
        .eq('id', orderUuid)
        .maybeSingle();
      if (!kindErr && kindRow?.order_kind === 'course') isCourseOrder = true;
    } catch {
      isCourseOrder = false;
    }

    if (isCourseOrder) {
      try {
        const { data: purchase, error: pErr } = await supabase
          .from('course_purchases')
          .select('id, amount_paid_cents, amount_owed_cents, details')
          .or(`order_id.eq.${orderUuid},balance_order_id.eq.${orderUuid}`)
          .maybeSingle();

        if (pErr) throw pErr;

        if (purchase) {
          const currentPaid = Number(purchase.amount_paid_cents || 0);
          const currentOwed = purchase.amount_owed_cents == null ? null : Number(purchase.amount_owed_cents);
          const details: any = purchase.details || {};
          const fullPriceCents =
            Number.isFinite(Number(details.full_price_cents))
              ? Number(details.full_price_cents)
              : currentOwed != null
                ? currentPaid + currentOwed
                : null;

          const newPaid = currentPaid + grossCents;
          const newOwed = fullPriceCents == null ? null : Math.max(0, fullPriceCents - newPaid);

          const updatePayload: any = {
            amount_paid_cents: newPaid,
          };
          if (newOwed != null) updatePayload.amount_owed_cents = newOwed;

          const { error: upErr } = await supabase
            .from('course_purchases')
            .update(updatePayload)
            .eq('id', purchase.id);
          if (upErr) throw upErr;
        }
      } catch (e: any) {
        console.error('Course purchase update (ITN):', e?.message || e);
      }
    }

    // 9. Call the enhanced stock deduction function for product orders only
    if (!isCourseOrder) {
      const { data: deductionResult, error: rpcError } = await supabase.rpc('process_order_stock_deduction', {
        p_order_id: orderUuid
      });
      if (rpcError) {
        console.error(`Error triggering stock deduction for ${orderUuid}:`, rpcError.message);
      } else {
        console.log(`Stock deduction completed for order ${orderUuid}:`, deductionResult);
      }
    }

    // 10. Generate invoice on payment (so it exists even if user never hits success page). Fire-and-forget.
    const base = process.env.URL || process.env.SITE_URL || 'https://blom-cosmetics.co.za';
    fetch(`${base.replace(/\/$/, '')}/.netlify/functions/invoice-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ m_payment_id: orderId })
    }).catch(e => console.error('Invoice generation (ITN):', e));

    // 11. Send a 200 OK to PayFast
    return { statusCode: 200, body: 'OK' };

  } catch (e: any) {
    console.error('Server error in payfast-itn:', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
