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
    
    if (period === '1') {
      // For "Today", set to midnight last night
      startDate.setHours(0, 0, 0, 0); 
    } else {
      const days = parseInt(period) || 30;
      startDate.setDate(now.getDate() - days);
    }

    // 2. Fetch All Products first (to get Cost Prices for Profit calc)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, cost_price_cents, price_cents');

    // Create a quick lookup map: ProductID -> { Cost, Name }
    const productMap = new Map();
    products?.forEach(p => {
      // Fallback: If no cost price, assume 40% of sell price (or 0 if preferred)
      const cost = p.cost_price_cents || 0; 
      productMap.set(p.id, { cost, name: p.name });
    });

    // 3. Fetch "Active" Orders
    // Logic: Created in date range AND (Paid OR Status implies active) AND Not Archived
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, 
        total_cents, 
        subtotal_cents,
        discount_cents,
        shipping_cost_cents,
        created_at,
        status,
        payment_status,
        order_items (
          product_id, 
          quantity,
          qty,
          name
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      // Filter: Only include valid, active orders (Paid OR Active Status)
      .or('payment_status.eq.paid,status.in.(paid,packed,collected,out_for_delivery,delivered)')
      .or('archived.is.null,archived.eq.false');

    if (error) throw error;

    // 4. Calculate Metrics by iterating through the fetched orders
    let totalRevenue = 0;
    let totalCOGS = 0; // Cost of Goods Sold
    let totalOrders = 0;
    let totalItemsSold = 0;
    let totalDiscounts = 0;
    
    // Track product sales for "Best Seller"
    const productSales = new Map<string, number>(); // Name -> Quantity

    orders?.forEach(order => {
      totalOrders++;
      totalRevenue += (order.total_cents || 0);
      totalDiscounts += (order.discount_cents || 0);

      // Process Items in this order
      const items = order.order_items || [];
      items.forEach((item: any) => {
        // Handle both 'quantity' and 'qty' fields depending on DB schema
        const qty = item.quantity || item.qty || 0;
        totalItemsSold += qty;

        // Calculate Cost for this item
        if (item.product_id) {
          const pInfo = productMap.get(item.product_id);
          if (pInfo) {
            totalCOGS += (pInfo.cost * qty);
            
            // Add to best seller tracker
            // We use the Product Name from the Products table to ensure consistency
            const prodName = pInfo.name || item.name || 'Unknown Product';
            const currentQty = productSales.get(prodName) || 0;
            productSales.set(prodName, currentQty + qty);
          }
        }
      });
    });

    // 5. Determine Best Selling Product
    let topProduct = "No sales yet";
    let topCount = 0;

    for (const [name, count] of productSales.entries()) {
      if (count > topCount) {
        topCount = count;
        topProduct = name;
      }
    }

    // 6. Calculate Expenses (Operating Costs)
    // We also subtract any recorded operating expenses for this period
    const { data: expenses } = await supabase
      .from('operating_costs')
      .select('amount')
      .gte('occurred_on', startDate.toISOString())
      .lte('occurred_on', now.toISOString());

    const totalOperatingCosts = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // 7. Final Profit Calculation
    // Net Profit = Revenue - COGS - Discounts - Operating Costs
    // (Note: Revenue usually already accounts for discounts, but COGS is raw)
    const netProfit = totalRevenue - totalCOGS - totalOperatingCosts;

    const resultData = {
      orders_count: totalOrders,
      items_sold: totalItemsSold,
      revenue: totalRevenue,         // Total Money In
      netRevenue: totalRevenue,      // Same for now (unless you separate Gross/Net)
      cogs: totalCOGS,              // Cost of items
      expenses: totalOperatingCosts, // Extra expenses
      profit: netProfit,             // Final money kept
      top_selling_product: topProduct,
      top_selling_count: topCount,
      totalDiscounts: totalDiscounts,
      period_label: period === '1' ? 'Today' : `Last ${period} Days`
    };

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        ok: true,
        data: resultData
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
