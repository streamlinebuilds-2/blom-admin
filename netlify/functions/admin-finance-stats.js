import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const handler = async (event) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    // 1. Calculate Revenue (last 30 days paid orders)
    const { data: revenueOrders, error: revenueError } = await supabase
      .from('orders')
      .select('total_cents')
      .eq('payment_status', 'paid')
      .gte('paid_at', thirtyDaysAgoStr);

    if (revenueError) {
      console.error("Error fetching revenue:", revenueError);
      throw revenueError;
    }

    const revenue = Array.isArray(revenueOrders) 
      ? revenueOrders.reduce((sum, order) => sum + (order.total_cents || 0), 0) 
      : 0;

    // 2. Calculate COGS (estimated from product cost prices)
    // First get paid order IDs
    const { data: paidOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('payment_status', 'paid')
      .gte('paid_at', thirtyDaysAgoStr);

    if (ordersError) {
      console.error("Error fetching paid orders:", ordersError);
    }

    let orderIds = paidOrders?.map(o => o.id) || [];
    
    const { data: orderItems, error: itemsError } = orderIds.length > 0 
      ? await supabase
          .from('order_items')
          .select(`
            quantity,
            product_id,
            products (
              cost_price_cents
            )
          `)
          .in('order_id', orderIds)
      : { data: [], error: null };

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // Calculate estimated COGS
    let estimatedCogs = 0;
    if (orderItems && Array.isArray(orderItems)) {
      for (const item of orderItems) {
        const costPrice = item.products?.cost_price_cents || 0;
        estimatedCogs += (costPrice * item.quantity);
      }
    }

    // 3. Calculate Operating Expenses (last 30 days)
    const { data: expenses, error: expensesError } = await supabase
      .from('operating_costs')
      .select('amount, category, description, occurred_on')
      .gte('occurred_on', thirtyDaysAgoStr.split('T')[0]) // Just the date part
      .order('occurred_on', { ascending: false });

    if (expensesError) {
      console.error("Error fetching expenses:", expensesError);
      // Don't throw error for expenses, just continue with 0
    }

    const totalExpenses = Array.isArray(expenses) 
      ? expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0) 
      : 0;

    // 4. Calculate Net Profit
    const profit = revenue - estimatedCogs - totalExpenses;

    // 5. Prepare response data
    const result = {
      revenue: revenue, // in cents
      cogs: estimatedCogs, // in cents  
      expenses: totalExpenses, // in cents
      profit: profit, // in cents
      recentExpenses: expenses?.slice(0, 10) || [] // Last 10 expenses
    };

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, data: result }),
    };
  } catch (e) {
    console.error("Admin finance stats error:", e);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: e.message || "Server error" }),
    };
  }
};