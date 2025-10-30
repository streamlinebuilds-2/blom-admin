import type { Handler } from '@netlify/functions'
import { supabaseAdmin } from '../../src/lib/supabaseServer'

const handler: Handler = async (event) => {
  try {
    const sb = supabaseAdmin()
    const url = new URL(event.rawUrl)
    const id = url.searchParams.get('id')
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) }
    }

    const { data: order, error } = await sb
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('id', id)
      .single()

    if (error) throw error

    // Normalize item fields (supports old price_cents/total_cents)
    const items = (order?.order_items ?? []).map((i: any) => ({
      ...i,
      unit_price_cents: i.unit_price_cents ?? i.price_cents ?? 0,
      line_total_cents: i.line_total_cents ?? i.total_cents ?? ((i.qty ?? 0) * (i.unit_price_cents ?? i.price_cents ?? 0)),
    }))
    order.order_items = items

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify(order)
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


