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

    // Prefer admin_orders view if present; fallback to orders
    let from = 'orders'
    try {
      const { data, error } = await sb.from('admin_orders').select('id').limit(1)
      if (!error && data) from = 'admin_orders'
    } catch { /* view not present */ }

    let query = sb.from(from).select('*', { count: 'exact' })

    if (status)          query = query.eq('status', status)
    if (payment_status)  query = query.eq('payment_status', payment_status)
    if (delivery_method) query = query.eq('delivery_method', delivery_method)
    if (email)           query = query.eq('customer_email', email)

    if (q) {
      if (from === 'orders') {
        query = query.or([
          `merchant_payment_id.ilike.%${q}%`,
          `customer_email.ilike.%${q}%`,
          `customer_name.ilike.%${q}%`
        ].join(','))
      } else {
        query = query.or([
          `merchant_payment_id.ilike.%${q}%`,
          `email.ilike.%${q}%`,
          `first_name.ilike.%${q}%`,
          `last_name.ilike.%${q}%`
        ].join(','))
      }
    }

    query = query
      .order(orderBy as any, { ascending: dir === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ rows: data ?? [], meta: { page, limit, total: count ?? 0, orderBy, dir, source: from } })
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
