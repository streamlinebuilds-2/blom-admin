// netlify/functions/admin-finance-daily.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    const date = e.queryStringParameters?.date || new Date().toISOString().slice(0,10);
    // Try to fetch from view, fallback to querying tables directly
    const { data, error } = await s
      .from("v_finance_daily")
      .select("*")
      .eq("date", date)
      .single()
      .then(r => r, async () => {
        // Fallback: calculate from orders and operating_costs
        const start = new Date(date + "T00:00:00Z").toISOString();
        const end = new Date(date + "T23:59:59Z").toISOString();
        const [orders, costs] = await Promise.all([
          s.from("orders").select("total_cents").eq("status", "paid").gte("paid_at", start).lte("paid_at", end),
          s.from("operating_costs").select("amount").eq("occurred_on", date)
        ]);
        const revenue = (orders.data || []).reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0) / 100;
        const expenses = (costs.data || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
        return { data: { date, revenue, expenses, profit: revenue - expenses }, error: null };
      });
    if (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: false, error: error.message || 'Query failed' })
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, data })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: String(err?.message || err || 'admin-finance-daily failed') })
    };
  }
};



