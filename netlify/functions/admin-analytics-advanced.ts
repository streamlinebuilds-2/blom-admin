import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    // Parse query parameters
    const url = new URL(e.rawUrl);
    const period = url.searchParams.get('period') || '30'; // Default 30 days
    const productId = url.searchParams.get('product_id');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    
    let fromDate: Date;
    const now = new Date();
    
    // Handle date range or period
    if (startDate && endDate) {
      fromDate = new Date(startDate);
    } else {
      const days = parseInt(period) || 30;
      fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
    
    const fromIso = fromDate.toISOString();

    // 1. TOP SELLING PRODUCTS ANALYTICS
    let topProductsQuery = s
      .from("order_items")
      .select(`
        product_id,
        qty,
        line_total_cents,
        unit_price_cents,
        orders!inner (
          id,
          created_at,
          status,
          payment_status,
          subtotal_cents,
          total_cents,
          discount_cents,
          fulfillment_method,
          customer_email
        ),
        products!inner (
          id,
          name,
          cost_price_cents,
          stock_qty
        )
      `)
      .gte("orders.created_at", fromIso);

    if (productId) {
      topProductsQuery = topProductsQuery.eq("product_id", productId);
    }

    const { data: orderItems, error: itemsError } = await topProductsQuery;
    if (itemsError) throw itemsError;

    // Process top products data
    const productAnalytics: Record<string, any> = {};
    
    (orderItems || []).forEach((item: any) => {
      const productId = item.product_id;
      if (!productAnalytics[productId]) {
        productAnalytics[productId] = {
          id: productId,
          name: item.products?.name || 'Unknown Product',
          totalUnitsSold: 0,
          totalRevenueCents: 0,
          totalOrders: 0,
          uniqueCustomers: new Set(),
          estimatedCOGS: 0,
          estimatedProfitCents: 0,
          dailySales: {} as Record<string, number>
        };
      }
      
      const analytics = productAnalytics[productId];
      analytics.totalUnitsSold += item.qty || 0;
      analytics.totalRevenueCents += item.line_total_cents || 0;
      analytics.totalOrders += 1;
      
      if (item.orders?.customer_email) {
        analytics.uniqueCustomers.add(item.orders.customer_email);
      }
      
      // Cost calculation
      const costPrice = item.products?.cost_price_cents || 0;
      analytics.estimatedCOGS += (costPrice * (item.qty || 0));
      
      // Profit calculation
      analytics.estimatedProfitCents += (item.line_total_cents || 0) - (costPrice * (item.qty || 0));
      
      // Daily tracking
      const orderDate = new Date(item.orders?.created_at).toISOString().split('T')[0];
      analytics.dailySales[orderDate] = (analytics.dailySales[orderDate] || 0) + (item.qty || 0);
    });

    // Convert to array and sort
    const topProducts = Object.values(productAnalytics)
      .map((product: any) => ({
        ...product,
        uniqueCustomers: product.uniqueCustomers.size,
        avgOrderValue: product.totalOrders > 0 ? product.totalRevenueCents / product.totalOrders : 0,
        profitMargin: product.totalRevenueCents > 0 ? (product.estimatedProfitCents / product.totalRevenueCents) * 100 : 0
      }))
      .sort((a, b) => b.totalUnitsSold - a.totalUnitsSold)
      .slice(0, 10); // Top 10 for comprehensive view

    // 2. DELIVERY vs COLLECTION PERFORMANCE
    const { data: fulfillmentData, error: fulfillmentError } = await s
      .from("orders")
      .select("id, total_cents, subtotal_cents, fulfillment_method, created_at, payment_status, customer_email")
      .gte("created_at", fromIso)
      .eq("payment_status", "paid");

    if (fulfillmentError) throw fulfillmentError;

    const deliveryAnalytics = {
      delivery: { count: 0, revenueCents: 0, totalProfitCents: 0, customers: new Set() },
      collection: { count: 0, revenueCents: 0, totalProfitCents: 0, customers: new Set() }
    };

    (fulfillmentData || []).forEach((order: any) => {
      const method = order.fulfillment_method === 'delivery' ? 'delivery' : 'collection';
      const analytics = deliveryAnalytics[method];
      
      analytics.count += 1;
      analytics.revenueCents += order.total_cents || 0;
      
      if (order.customer_email) {
        analytics.customers.add(order.customer_email);
      }
    });

    // 3. CUSTOMER ANALYTICS
    const { data: customersData, error: customersError } = await s
      .from("orders")
      .select("customer_email, total_cents, created_at")
      .gte("created_at", fromIso)
      .not("customer_email", "is", null);

    if (customersError) throw customersError;

    const customerAnalytics = {
      totalCustomers: new Set(),
      newCustomers: new Set(),
      repeatCustomers: new Set(),
      totalCustomerRevenue: 0
    };

    // Group by customer and time
    const customerOrders: Record<string, any[]> = {};
    (customersData || []).forEach((order: any) => {
      const email = order.customer_email;
      if (!email) return;
      
      customerAnalytics.totalCustomers.add(email);
      
      if (!customerOrders[email]) {
        customerOrders[email] = [];
        customerAnalytics.newCustomers.add(email);
      } else {
        customerAnalytics.repeatCustomers.add(email);
        customerAnalytics.newCustomers.delete(email);
      }
      
      customerOrders[email].push(order);
      customerAnalytics.totalCustomerRevenue += order.total_cents || 0;
    });

    // 4. CONVERSION RATE ANALYTICS
    const { data: contactsData, error: contactsError } = await s
      .from("contacts")
      .select("created_at")
      .gte("created_at", fromIso);

    if (contactsError) throw contactsError;

    const conversionAnalytics = {
      totalContacts: (contactsData || []).length,
      totalOrders: (fulfillmentData || []).length,
      conversionRate: 0,
      averageOrderValue: 0,
      customerLifetimeValue: 0
    };

    conversionAnalytics.conversionRate = conversionAnalytics.totalContacts > 0 
      ? (conversionAnalytics.totalOrders / conversionAnalytics.totalContacts) * 100 
      : 0;

    conversionAnalytics.averageOrderValue = conversionAnalytics.totalOrders > 0 
      ? (fulfillmentData || []).reduce((sum, order) => sum + (order.total_cents || 0), 0) / conversionAnalytics.totalOrders
      : 0;

    conversionAnalytics.customerLifetimeValue = customerAnalytics.totalCustomers.size > 0
      ? conversionAnalytics.totalCustomerRevenue / customerAnalytics.totalCustomers.size
      : 0;

    // 5. INVENTORY TURNOVER
    const { data: productsData, error: productsError } = await s
      .from("products")
      .select("id, name, stock_qty, cost_price_cents, price_cents, status");

    if (productsError) throw productsError;

    const inventoryAnalytics = {
      totalProducts: (productsData || []).length,
      activeProducts: (productsData || []).filter(p => p.status === 'active').length,
      lowStockProducts: (productsData || []).filter(p => (p.stock_qty || 0) < 5).length,
      outOfStockProducts: (productsData || []).filter(p => (p.stock_qty || 0) === 0).length,
      totalInventoryValue: 0,
      averageInventoryTurnover: 0
    };

    inventoryAnalytics.totalInventoryValue = (productsData || []).reduce(
      (sum, product) => sum + ((product.stock_qty || 0) * (product.cost_price_cents || 0)), 
      0
    );

    // 6. SALES TRENDS & TIME-BASED ANALYTICS
    const salesTrends = {};
    const ordersTrends = {};
    
    for (let i = 0; i < parseInt(period); i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      salesTrends[dateKey] = 0;
      ordersTrends[dateKey] = 0;
    }

    (fulfillmentData || []).forEach((order: any) => {
      const dateKey = new Date(order.created_at).toISOString().split('T')[0];
      if (salesTrends.hasOwnProperty(dateKey)) {
        salesTrends[dateKey] += order.total_cents || 0;
        ordersTrends[dateKey] += 1;
      }
    });

    // Convert trends to arrays
    const trendData = Object.entries(salesTrends).map(([date, revenue]) => ({
      date,
      revenueCents: revenue,
      orders: ordersTrends[date] || 0
    })).sort((a, b) => a.date.localeCompare(b.date));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        ok: true,
        data: {
          period: {
            from: fromIso,
            to: now.toISOString(),
            days: parseInt(period)
          },
          topProducts: topProducts.slice(0, 3), // Top 3 for main view
          allTopProducts: topProducts, // Full list for drill-down
          fulfillment: {
            delivery: {
              count: deliveryAnalytics.delivery.count,
              revenueCents: deliveryAnalytics.delivery.revenueCents,
              avgOrderValue: deliveryAnalytics.delivery.count > 0 ? deliveryAnalytics.delivery.revenueCents / deliveryAnalytics.delivery.count : 0,
              uniqueCustomers: deliveryAnalytics.delivery.customers.size
            },
            collection: {
              count: deliveryAnalytics.collection.count,
              revenueCents: deliveryAnalytics.collection.revenueCents,
              avgOrderValue: deliveryAnalytics.collection.count > 0 ? deliveryAnalytics.collection.revenueCents / deliveryAnalytics.collection.count : 0,
              uniqueCustomers: deliveryAnalytics.collection.customers.size
            }
          },
          customers: {
            totalCustomers: customerAnalytics.totalCustomers.size,
            newCustomers: customerAnalytics.newCustomers.size,
            repeatCustomers: customerAnalytics.repeatCustomers.size,
            repeatCustomerRate: customerAnalytics.totalCustomers.size > 0 ? (customerAnalytics.repeatCustomers.size / customerAnalytics.totalCustomers.size) * 100 : 0,
            totalCustomerRevenue: customerAnalytics.totalCustomerRevenue,
            avgCustomerValue: customerAnalytics.totalCustomers.size > 0 ? customerAnalytics.totalCustomerRevenue / customerAnalytics.totalCustomers.size : 0
          },
          conversions: conversionAnalytics,
          inventory: inventoryAnalytics,
          trends: trendData,
          summary: {
            totalRevenueCents: (fulfillmentData || []).reduce((sum, order) => sum + (order.total_cents || 0), 0),
            totalOrders: (fulfillmentData || []).length,
            avgOrderValue: conversionAnalytics.averageOrderValue,
            avgProfitPerTransaction: topProducts.length > 0 
              ? topProducts.reduce((sum, p) => sum + p.estimatedProfitCents, 0) / (fulfillmentData || []).length 
              : 0
          }
        }
      })
    };

  } catch (err: any) {
    console.error("Advanced Analytics Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || "Failed to fetch advanced analytics" })
    };
  }
};