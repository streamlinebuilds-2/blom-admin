import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (event) => {
  try {
    const period = event.queryStringParameters?.period || '30';
    console.log(`📊 Calculating finance stats for period: ${period} days`);
    
    // 1. Setup Date Range (Local Time)
    const now = new Date();
    let startDate = new Date();
    
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0); // Start of today
    } else if (period === '1') {
       startDate.setHours(0, 0, 0, 0); 
    } else {
      const days = parseInt(period) || 30;
      startDate.setDate(now.getDate() - days);
    }

    // 2. Fetch Products (for Cost calculation) - Using * to be safe against missing columns
    const { data: products } = await supabase
      .from('products')
      .select('*');

    const productMap = new Map();
    products?.forEach(p => {
      // Fallback: If no cost price, assume 40% of sell price
      const cost = p.cost_price_cents || (p.price_cents ? p.price_cents * 0.4 : 0); 
      productMap.set(p.id, { cost, name: p.name });
    });

    // 3. Fetch Orders - REMOVED STRICT FILTERS to see all data first
    // We will filter in Javascript which is safer and easier to debug
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          product_id, 
          quantity,
          qty,
          name
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Database Error:", error);
      throw error;
    }

    // 4. Calculate Stats in Memory
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalOrders = 0;
    let totalItemsSold = 0;
    let totalDiscounts = 0;
    
    const productSales = new Map<string, number>();

    orders?.forEach(order => {
      // SKIP Archived orders
      if (order.archived === true) return;

      // SKIP Cancelled orders
      if (order.status === 'cancelled') return;

      // ✅ Count this as an active order (even if unpaid)
      totalOrders++;

      // CHECK Payment Status for Revenue
      // Consider paid if: payment_status is 'paid' OR status implies movement
      const isPaid = 
        order.payment_status === 'paid' || 
        ['paid', 'packed', 'shipped', 'collected', 'out_for_delivery', 'delivered'].includes(order.status);

      if (isPaid) {
        totalRevenue += (order.total_cents || 0);
        totalDiscounts += (order.discount_cents || 0);
      }

      // Process Items (Count them regardless of payment to show demand, or restrict to paid if preferred)
      // Currently counting ALL active demand
      const items = order.order_items || [];
      items.forEach((item: any) => {
        const qty = item.quantity || item.qty || 0;
        totalItemsSold += qty;

        // COGS & Best Sellers
        if (item.product_id) {
          const pInfo = productMap.get(item.product_id);
          if (pInfo) {
            // Only add COGS if we added Revenue (to keep Profit accurate)
            if (isPaid) {
              totalCOGS += (pInfo.cost * qty);
            }
            
            // Track popularity (demand) even if unpaid
            const prodName = pInfo.name || item.name || 'Unknown Product';
            const currentQty = productSales.get(prodName) || 0;
            productSales.set(prodName, currentQty + qty);
          }
        }
      });
    });

    // 5. Top Seller
    let topProduct = "No sales yet";
    let topCount = 0;
    for (const [name, count] of productSales.entries()) {
      if (count > topCount) {
        topCount = count;
        topProduct = name;
      }
    }

    // 6. Expenses
    const { data: expenses } = await supabase
      .from('operating_costs')
      .select('amount')
      .gte('occurred_on', startDate.toISOString())
      .lte('occurred_on', now.toISOString());

    const totalOperatingCosts = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // 7. Net Profit
    const netProfit = totalRevenue - totalCOGS - totalOperatingCosts;

    // Debug Log
    console.log(`✅ Stats Calculated: ${totalOrders} orders, R${totalRevenue/100} revenue`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        ok: true,
        data: {
          orders_count: totalOrders,
          items_sold: totalItemsSold,
          revenue: totalRevenue,
          netRevenue: totalRevenue,
          cogs: totalCOGS,
          expenses: totalOperatingCosts,
          profit: netProfit,
          top_selling_product: topProduct,
          top_selling_count: topCount,
          totalDiscounts: totalDiscounts,
          period_label: period === 'today' || period === '1' ? 'Today' : `Last ${period} Days`
        }
      })
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
