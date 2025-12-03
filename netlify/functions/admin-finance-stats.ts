import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (event) => {
  try {
    // 1. Get the period from the Frontend (1, 7, 30 days)
    const period = event.queryStringParameters?.period || '30';
    console.log('Period requested:', period);
    
    // 2. Calculate the Date Range based on numeric periods
    const now = new Date();
    let startDate = new Date();
    
    if (period === '1') {
      startDate.setHours(0, 0, 0, 0); // Start of today (Midnight)
      console.log('Today calculation - from:', startDate.toISOString(), 'to:', now.toISOString());
    } else if (period === '7') {
      startDate.setDate(now.getDate() - 7);
      console.log('7 days calculation - from:', startDate.toISOString(), 'to:', now.toISOString());
    } else if (period === '30') {
      startDate.setDate(now.getDate() - 30);
      console.log('30 days calculation - from:', startDate.toISOString(), 'to:', now.toISOString());
    } else {
      // Fallback to 30 days if unknown
      startDate.setDate(now.getDate() - 30);
      console.log('Fallback 30 days - from:', startDate.toISOString(), 'to:', now.toISOString());
    }

    // 3. Fetch Orders for this Period - More specific query
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, 
        total_cents, 
        subtotal_cents, 
        discount_cents, 
        created_at, 
        payment_status,
        shipping_cost_cents, 
        fulfillment_method,
        customer_email,
        archived,
        order_items (
          quantity, 
          product_id, 
          line_total_cents,
          qty
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      // MATCHING ORDERS PAGE LOGIC:
      .or('payment_status.eq.paid,status.in.(paid,packed,collected,out_for_delivery,delivered)')
      // EXCLUDE ARCHIVED ORDERS:
      .or('archived.is.null,archived.eq.false')
      .order('created_at', { ascending: false });

    console.log('Orders found:', orders?.length || 0);
    if (error) throw error;

    // 4. Fetch Product Costs to calculate Profit
    const { data: products } = await supabase
      .from('products')
      .select('id, cost_price_cents, price_cents');

    const productCostMap = new Map();
    products?.forEach(p => {
      // Use cost_price_cents directly, fallback to 40% of price_cents if missing
      const cost = p.cost_price_cents > 0 ? p.cost_price_cents : (p.price_cents * 0.4); 
      productCostMap.set(p.id, cost);
    });

    console.log('Product cost map size:', productCostMap.size);

    // 5. Calculate Stats - Debug and fix period filtering
    let totalRevenue = 0; // Gross revenue
    let totalDiscounts = 0; // Coupons, promotions
    let totalShipping = 0; // Shipping costs
    let netRevenue = 0; // Actual amount received
    let cogs = 0; // Cost of Goods Sold
    let profit = 0;
    let orderCount = 0;

    console.log('Processing orders for period:', period);

    orders?.forEach(order => {
      orderCount++;
      const orderTotal = order.total_cents || 0;
      const subtotal = order.subtotal_cents || 0;
      const discount = order.discount_cents || 0;
      const shipping = order.shipping_cost_cents || 0;
      
      totalRevenue += subtotal;
      totalDiscounts += discount;
      totalShipping += shipping;
      netRevenue += orderTotal;
      
      // Calculate cost for each item in the order
      if (order.order_items) {
        order.order_items.forEach((item: any) => {
          if (item.product_id) {
            const unitCost = productCostMap.get(item.product_id) || 0;
            // Use quantity from either field
            const quantity = item.quantity || item.qty || 0;
            cogs += unitCost * quantity; 
          }
        });
      }
    });

    console.log('Orders processed:', orderCount);
    console.log('Total revenue:', totalRevenue);
    console.log('Total discounts:', totalDiscounts);
    console.log('Net revenue:', netRevenue);
    console.log('COGS:', cogs);

    // Calculate Net Profit (Simplified: Total Sales - 10% for costs/expenses)
    profit = netRevenue - (netRevenue * 0.10); // 10% of total sales as estimated costs
    
    console.log('Final profit:', profit);

    // 6. Return comprehensive financial data
    const result = {
      ok: true,
      data: {
        orders_count: orderCount,
        revenue: totalRevenue,
        netRevenue: netRevenue,
        totalDiscounts: totalDiscounts,
        totalShipping: totalShipping,
        cogs: cogs,
        expenses: netRevenue * 0.10, // 10% estimated expenses
        profit: profit,
        period_label: period === '1' ? 'Today' : `Last ${period} Days`,
        date_range: {
          from: startDate.toISOString(),
          to: now.toISOString()
        }
      }
    };

    console.log('Final result:', JSON.stringify(result, null, 2));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };

  } catch (error: any) {
    console.error('Finance stats error:', error);
    return { 
      statusCode: 500, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: error.message }) 
    };
  }
};
