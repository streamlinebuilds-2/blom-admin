import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    // 1. Get Date Range (default to last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const fromIso = thirtyDaysAgo.toISOString();

    // 2. Fetch Orders (Revenue)
    // Status: paid, packed, collected, out_for_delivery, delivered
    const { data: orders, error: oErr } = await s
      .from("orders")
      .select("id, total_cents, created_at, status")
      .gte("created_at", fromIso)
      .in("status", ["paid", "packed", "collected", "out_for_delivery", "delivered"]);
    
    if (oErr) throw oErr;

    const revenueCents = (orders || []).reduce((sum, o) => sum + (o.total_cents || 0), 0);

    // 3. Fetch Operating Costs (Expenses)
    const { data: expenses, error: eErr } = await s
      .from("operating_costs")
      .select("amount, category, description, occurred_on")
      .gte("occurred_on", fromIso.slice(0, 10)) // occurred_on is usually YYYY-MM-DD
      .order("occurred_on", { ascending: false });

    if (eErr) throw eErr;

    const expensesTotal = (expenses || []).reduce((sum, ex) => sum + (Number(ex.amount) || 0), 0);

    // 4. Calculate COGS (Cost of Goods Sold)
    // We need order items for the fetched orders to calculate COGS based on product cost price
    // Note: This is an approximation using CURRENT cost price. 
    // Ideally, we'd snapshot cost price at time of order, but for now we fetch current product cost.
    let cogsCents = 0;
    if (orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      
      // Fetch items for these orders
      const { data: items, error: iErr } = await s
        .from("order_items")
        .select("product_id, qty")
        .in("order_id", orderIds);

      if (iErr) throw iErr;

      if (items && items.length > 0) {
        // Get unique product IDs to fetch cost prices
        const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))];
        
        const { data: products, error: pErr } = await s
          .from("products")
          .select("id, cost_price_cents")
          .in("id", productIds);
          
        if (pErr) throw pErr;

        // Map product cost
        const costMap: Record<string, number> = {};
        products?.forEach(p => {
          costMap[p.id] = p.cost_price_cents || 0;
        });

        // Sum up COGS
        items.forEach(item => {
          if (item.product_id) {
            const cost = costMap[item.product_id] || 0;
            cogsCents += cost * (item.qty || 0);
          }
        });
      }
    }

    // 5. Recent Expenses (Last 5)
    const recentExpenses = (expenses || []).slice(0, 5);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        ok: true,
        data: {
          revenue: revenueCents / 100, // Convert to main currency unit
          expenses: expensesTotal,
          cogs: cogsCents / 100,
          profit: (revenueCents - cogsCents) / 100 - expensesTotal,
          recentExpenses
        }
      })
    };

  } catch (err: any) {
    console.error("Finance Stats Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || "Failed to fetch finance stats" })
    };
  }
};