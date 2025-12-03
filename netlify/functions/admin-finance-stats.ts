import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (event) => {
  try {
    // 1. Get the period from the Frontend (now accepts 1, 7, 30)
    const period = event.queryStringParameters?.period || '30'; 
    
    // 2. Calculate the Date Range based on numeric periods
    const now = new Date();
    let startDate = new Date();
    
    if (period === '1') {
      startDate.setHours(0, 0, 0, 0); // Start of today (Midnight)
    } else if (period === '7') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === '30') {
      startDate.setDate(now.getDate() - 30);
    } else {
      // Fallback to 30 days if unknown
      startDate.setDate(now.getDate() - 30);
    }

    // 3. Fetch Orders for this Period (include discount fields)
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, total_cents, subtotal_cents, discount_cents, created_at, payment_status,
        shipping_cost_cents, fulfillment_method,
        order_items ( quantity, product_id, line_total_cents )
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

    // 5. Calculate Stats - Enhanced with proper period filtering
    let totalRevenue = 0; // Gross revenue (before deductions)
    let totalDiscounts = 0; // Coupons, promotions, etc.
    let totalShipping = 0; // Shipping costs
    let netRevenue = 0; // After discounts and shipping
    let cogs = 0; // Cost of Goods Sold
    let profit = 0;

    orders.forEach(order => {
      const orderTotal = order.total_cents || 0;
      const subtotal = order.subtotal_cents || 0;
      const discount = order.discount_cents || 0;
      const shipping = order.shipping_cost_cents || 0;
      
      totalRevenue += subtotal; // What they would have paid without discounts
      totalDiscounts += discount;
      totalShipping += shipping;
      netRevenue += orderTotal; // Actual amount received
      
      // Calculate cost for each item in the order
      if (order.order_items) {
        order.order_items.forEach((item: any) => {
          if (item.product_id) {
            const unitCost = productCostMap.get(item.product_id) || 0;
            // Cost is in Rands, convert to cents for consistency
            cogs += (unitCost * 100) * item.quantity; 
          }
        });
      }
    });

    // Calculate Net Profit
    // Net Profit = (Revenue - Discounts - Shipping) - COGS - Operating Expenses
    const operatingExpenses = 0; // Add any fixed costs here
    profit = netRevenue - cogs - operatingExpenses;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        data: {
          revenue: totalRevenue,
          netRevenue: netRevenue,
          totalDiscounts: totalDiscounts,
          totalShipping: totalShipping,
          cogs: cogs,
          expenses: operatingExpenses,
          profit: profit,
          period_label: period === '1' ? 'Today' : `Last ${period} Days`
        }
      })
    };

  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
  }
};
