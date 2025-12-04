import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (event) => {
  try {
    // 1. Get the period from the Frontend (1, 7, 30 days)
    const period = event.queryStringParameters?.period || '30';
    console.log('Period requested:', period);
    
    // 2. Calculate the Date Range
    const now = new Date();
    let startDate = new Date();
    
    if (period === '1') {
      startDate.setHours(0, 0, 0, 0); // Start of today (Midnight)
    } else {
      const days = parseInt(period) || 30;
      startDate.setDate(now.getDate() - days);
    }

    // 3. Fetch Product Info (Costs & Names) - Optimized Map
    const { data: products } = await supabase
      .from('products')
      .select('id, cost_price_cents, price_cents, name');

    const productMap = new Map(); // id -> { cost, name }
    products?.forEach(p => {
      // Use cost_price_cents directly, fallback to 40% of price_cents if missing
      const cost = p.cost_price_cents > 0 ? p.cost_price_cents : (p.price_cents * 0.4); 
      productMap.set(p.id, { cost, name: p.name });
    });

    // 4. Fetch Orders for this Period with Strict "Current Order" Filters
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
        order_items (
          quantity, 
          product_id, 
          qty
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      // LOGIC: Only Paid/Active statuses, No Archived orders
      .or('payment_status.eq.paid,status.in.(paid,packed,collected,out_for_delivery,delivered)')
      .or('archived.is.null,archived.eq.false')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 5. Calculate Stats
    let totalRevenue = 0;   // Gross revenue (subtotal)
    let totalDiscounts = 0; 
    let totalShipping = 0;
    let netRevenue = 0;     // Actual Total (paid by customer)
    let cogs = 0;           // Cost of Goods Sold
    let orderCount = 0;
    let totalItemsSold = 0; // NEW: Total items count
    
    const productSales = new Map(); // id -> quantity sold

    orders?.forEach(order => {
      orderCount++;
      totalRevenue += order.subtotal_cents || 0;
      totalDiscounts += order.discount_cents || 0;
      totalShipping += order.shipping_cost_cents || 0;
      netRevenue += order.total_cents || 0;
      
      // Calculate COGS and Items Sold
      if (order.order_items) {
        order.order_items.forEach((item: any) => {
          const qty = item.quantity || item.qty || 0;
          totalItemsSold += qty;

          if (item.product_id) {
            const pInfo = productMap.get(item.product_id);
            if (pInfo) {
              cogs += pInfo.cost * qty;
              
              // Track for Top Selling
              const currentQty = productSales.get(item.product_id) || 0;
              productSales.set(item.product_id, currentQty + qty);
            }
          }
        });
      }
    });

    // Find Top Selling Product
    let topProduct = { name: 'No sales', count: 0 };
    let maxSold = 0;
    
    for (const [productId, qty] of productSales.entries()) {
      if (qty > maxSold) {
        maxSold = qty;
        const pInfo = productMap.get(productId);
        topProduct = { 
          name: pInfo?.name || 'Unknown Product', 
          count: qty 
        };
      }
    }

    // Calculate Net Profit
    // Profit = Net Revenue - COGS - Estimated Expenses (10%)
    const expenses = netRevenue * 0.10;
    const profit = netRevenue - cogs - expenses;

    // 6. Return Comprehensive Data
    const result = {
      ok: true,
      data: {
        orders_count: orderCount,
        items_sold: totalItemsSold,
        top_selling_product: topProduct.name,
        top_selling_count: topProduct.count,
        revenue: totalRevenue,
        netRevenue: netRevenue,
        totalDiscounts: totalDiscounts,
        totalShipping: totalShipping,
        cogs: cogs,
        expenses: expenses,
        profit: profit,
        period_label: period === '1' ? 'Today' : `Last ${period} Days`,
        date_range: {
          from: startDate.toISOString(),
          to: now.toISOString()
        }
      }
    };

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
