import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (event) => {
  try {
    // 1. Get the period from the Frontend (today, week, month)
    const period = event.queryStringParameters?.period || '30'; 
    
    // 2. Calculate the Date Range
    const now = new Date();
    let startDate = new Date();
    
    if (period === 'today' || period === '1') {
      startDate.setHours(0, 0, 0, 0); // Start of today (Midnight)
    } else if (period === 'week' || period === '7') {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setDate(now.getDate() - 30); // Default 30 days
    }

    // 3. Fetch Orders for this Period
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, total_cents, created_at, payment_status,
        order_items ( quantity, product_id )
      `)
      .or('payment_status.eq.paid,status.in.(paid,packed,shipped,delivered,collected)')
      .gte('created_at', startDate.toISOString());

    if (error) throw error;

    // 4. Fetch Product Costs to calculate Profit
    // We need the cost_price to know how much money you actually made
    const { data: products } = await supabase
      .from('products')
      .select('id, cost_price, price');

    const productCostMap = new Map();
    products?.forEach(p => {
      // Use cost_price, or fallback to 40% of price if cost is missing
      const cost = p.cost_price > 0 ? p.cost_price : (p.price * 0.4); 
      productCostMap.set(p.id, cost);
    });

    // 5. Calculate Stats
    let revenue = 0;
    let cogs = 0; // Cost of Goods Sold

    orders.forEach(order => {
      revenue += (order.total_cents || 0);
      
      // Calculate cost for each item in the order
      if (order.order_items) {
        order.order_items.forEach((item: any) => {
          if (item.product_id) {
            const unitCost = productCostMap.get(item.product_id) || 0;
            // Convert Rands to Cents for calculation if cost_price is in Rands
            // Assuming cost_price in DB is standard float (e.g. 50.00)
            cogs += (unitCost * 100) * item.quantity; 
          }
        });
      }
    });

    const expenses = 0; // Add fixed operating costs here later if needed
    const profit = revenue - cogs - expenses;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        data: {
          revenue,
          cogs,
          expenses,
          profit,
          period_label: period === 'today' ? 'Today' : `Last ${period} Days`
        }
      })
    };

  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
  }
};
