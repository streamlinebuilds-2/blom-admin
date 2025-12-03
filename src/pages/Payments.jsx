import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingCart, DollarSign, Package, Target, Calendar } from 'lucide-react';
import { moneyZAR } from '../components/formatUtils';
import { supabase } from '../lib/supabase';

// Helper to format numbers
const formatNumber = (num) => {
  if (num == null || isNaN(num)) return '0';
  return new Intl.NumberFormat().format(num);
};

// Helper to get period label
const getPeriodLabel = (days) => {
  if (days === 1) return 'Today';
  if (days === 7) return 'Last 7 Days';
  if (days === 30) return 'Last 30 Days';
  return `Last ${days} Days`;
};

export default function Payments() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // 1. FIX DATE LOGIC: "Today" means 00:00:00 to NOW, not last 24h
  const { periodStart, now } = React.useMemo(() => {
    const now = new Date();
    const start = new Date();
    
    if (selectedPeriod === 1) {
      start.setHours(0, 0, 0, 0); // Start of today
    } else {
      start.setDate(now.getDate() - selectedPeriod); // Start of X days ago
    }
    
    return { now, periodStart: start };
  }, [selectedPeriod]);

  // Fetch data directly from our analytics database tables
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-analytics-direct', selectedPeriod],
    queryFn: async () => {
      // Query our daily_sales table for the period
      const { data: dailySales, error: dailyError } = await supabase
        .from('daily_sales')
        .select('total_sales_cents, total_orders, total_items_sold, date')
        .gte('date', periodStart.toISOString().split('T')[0])
        .lte('date', now.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (dailyError) {
        console.error('Error fetching daily sales:', dailyError);
        throw dailyError;
      }

      // Use the new top selling products API (based on stock movement logic)
      let topProducts = [];
      try {
        const res = await fetch(`/.netlify/functions/admin-top-selling-products?period=${selectedPeriod}&limit=10`);
        if (res.ok) {
          const topSellingData = await res.json();
          if (topSellingData?.ok && topSellingData.data?.topProducts) {
            topProducts = topSellingData.data.topProducts;
          }
        }
      } catch (error) {
        console.warn('Edge function not available, using fallback method:', error);
        
        // Fallback: Get top selling products directly from orders
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - selectedPeriod);
        const fromIso = fromDate.toISOString();
        
        const { data: orderItems } = await supabase
          .from('order_items')
          .select(`
            product_id,
            name,
            quantity,
            total_cents,
            orders!inner(id, created_at, payment_status, paid_at)
          `)
          .gte('orders.created_at', fromIso)
          .eq('orders.payment_status', 'paid')
          .limit(1000);

        // Aggregate sales data by product
        const productSales = {};
        if (orderItems) {
          orderItems.forEach(item => {
            if (item.product_id) {
              if (!productSales[item.product_id]) {
                productSales[item.product_id] = {
                  id: item.product_id,
                  name: item.name || 'Unknown Product',
                  totalUnitsSold: 0,
                  totalRevenueCents: 0,
                  totalOrders: new Set()
                };
              }
              productSales[item.product_id].totalUnitsSold += item.quantity || 1;
              productSales[item.product_id].totalRevenueCents += item.total_cents || 0;
            }
          });
        }
        
        topProducts = Object.values(productSales)
          .map(product => ({
            ...product,
            totalOrders: product.totalOrders.size
          }))
          .sort((a, b) => b.totalUnitsSold - a.totalUnitsSold)
          .slice(0, 10);
      }

      console.log('Top selling products from new API:', topProducts);

      return {
        dailySales: dailySales || [],
        topProducts: topProducts
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Query existing financial data for COGS and expenses
  const { data: financeStats, isLoading: financeLoading } = useQuery({
    queryKey: ['finance-stats', selectedPeriod],
    queryFn: async () => {
      console.log('Fetching finance stats for period:', selectedPeriod);
      // Use dynamic period param with exact days
      const periodParam = selectedPeriod.toString();
      const res = await fetch(`/.netlify/functions/admin-finance-stats?period=${periodParam}`);
      if (!res.ok) {
        console.error('Finance stats fetch failed:', res.status, res.statusText);
        return {};
      }
      const json = await res.json();
      console.log('Finance stats response:', json);
      return json.data || {};
    }
  });

  // Calculate sales metrics from our analytics tables
  const salesMetrics = React.useMemo(() => {
    // If no data loaded yet, return zeros
    if (!salesData || !financeStats) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        totalProductsSold: 0,
        topSellingProduct: 'No sales',
        topSellingCount: 0,
        periodLabel: getPeriodLabel(selectedPeriod)
      };
    }

    const { dailySales, topProducts } = salesData;
    
    // Aggregate data from our analytics tables
    const totalRevenue = dailySales.reduce((sum, day) => sum + (day.total_sales_cents || 0), 0);
    const totalOrders = dailySales.reduce((sum, day) => sum + (day.total_orders || 0), 0);
    const totalProductsSold = dailySales.reduce((sum, day) => sum + (day.total_items_sold || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get top selling product from our processed data
    const topSellingProduct = topProducts && topProducts.length > 0 ? topProducts[0].name : 'No sales';
    const topSellingCount = topProducts && topProducts.length > 0 ? (topProducts[0].totalUnitsSold || 0) : 0;

    console.log('Top selling products from analytics:', topProducts);
    console.log('Selected top product:', topSellingProduct, 'with count:', topSellingCount);

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalProductsSold,
      topSellingProduct,
      topSellingCount,
      periodLabel: getPeriodLabel(selectedPeriod)
    };
  }, [salesData, financeStats, selectedPeriod]);

  // Debug logging for financial calculations
  console.log('Current selectedPeriod:', selectedPeriod);
  console.log('Finance stats:', financeStats);
  console.log('Sales metrics:', salesMetrics);

  if (salesLoading || financeLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const stats = financeStats || { revenue: 0, cogs: 0, expenses: 0, profit: 0 };

  return (
    <>
      <style>{`
        .sales-header {
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-subtitle {
          color: var(--text-muted);
          font-size: 14px;
        }

        .period-selector {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .period-btn {
          padding: 8px 16px;
          border-radius: 8px;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid var(--border);
          transition: all 0.2s ease;
        }

        .period-btn.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .period-btn:hover {
          opacity: 0.8;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .metric-card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          position: relative;
          overflow: hidden;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
        }

        .metric-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .metric-info {
          flex: 1;
        }

        .metric-label {
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 500;
          margin-bottom: 4px;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
        }

        .metric-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .profit-positive {
          color: #10b981;
        }

        .profit-negative {
          color: #ef4444;
        }

        .summary-card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          margin-bottom: 24px;
        }

        .summary-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .summary-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .summary-item {
          padding: 12px;
          background: var(--bg);
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-label {
          color: var(--text-muted);
          font-size: 14px;
        }

        .summary-value {
          color: var(--text);
          font-weight: 600;
          font-size: 14px;
        }
      `}</style>

      <div className="p-4 md:p-8">
        <div className="sales-header">
          <h1 className="header-title">
            <TrendingUp className="w-8 h-8" />
            Sales Overview
          </h1>
          <p className="header-subtitle">
            Track your business performance and key sales metrics.
          </p>

          <div className="period-selector">
            {[1, 7, 30].map(days => (
              <button
                key={days}
                className={`period-btn ${selectedPeriod === days ? 'active' : ''}`}
                onClick={() => setSelectedPeriod(days)}
              >
                {getPeriodLabel(days)}
              </button>
            ))}
          </div>
        </div>

        {/* Main Sales Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="metric-info">
                <div className="metric-label">Total Sales</div>
                <div className="metric-value">{moneyZAR(salesMetrics.totalRevenue)}</div>
                <div className="metric-subtitle">{salesMetrics.periodLabel}</div>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div className="metric-info">
                <div className="metric-label">Total Orders</div>
                <div className="metric-value">{formatNumber(salesMetrics.totalOrders)}</div>
                <div className="metric-subtitle">{salesMetrics.periodLabel}</div>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <Target className="w-6 h-6" />
              </div>
              <div className="metric-info">
                <div className="metric-label">Average Order Value</div>
                <div className="metric-value">{moneyZAR(salesMetrics.avgOrderValue)}</div>
                <div className="metric-subtitle">Per transaction</div>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <Package className="w-6 h-6" />
              </div>
              <div className="metric-info">
                <div className="metric-label">Items Sold</div>
                <div className="metric-value">{formatNumber(salesMetrics.totalProductsSold)}</div>
                <div className="metric-subtitle">Total quantity</div>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="metric-info">
                <div className="metric-label">Net Profit</div>
                <div className={`metric-value ${stats.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                  {moneyZAR(stats.profit)}
                </div>
                <div className="metric-subtitle">{salesMetrics.periodLabel}</div>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <Target className="w-6 h-6" />
              </div>
              <div className="metric-info">
                <div className="metric-label">Top Selling</div>
                <div className="metric-value" style={{ fontSize: '20px' }}>
                  {salesMetrics.topSellingProduct.length > 20 
                    ? salesMetrics.topSellingProduct.substring(0, 20) + '...'
                    : salesMetrics.topSellingProduct
                  }
                </div>
                <div className="metric-subtitle">{formatNumber(salesMetrics.topSellingCount)} sold</div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="summary-card">
          <h2 className="summary-title">
            <DollarSign className="w-5 h-5" />
            Financial Summary ({salesMetrics.periodLabel})
          </h2>
          <div className="summary-row">
            <div className="summary-item">
              <span className="summary-label">Gross Revenue</span>
              <span className="summary-value">{moneyZAR(stats.totalRevenue || stats.revenue || 0)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Discounts</span>
              <span className="summary-value">-{moneyZAR(stats.totalDiscounts || 0)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Net Revenue</span>
              <span className="summary-value">{moneyZAR(stats.netRevenue || stats.totalRevenue || 0)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Cost of Goods</span>
              <span className="summary-value">-{moneyZAR(stats.cogs)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Operating Expenses</span>
              <span className="summary-value">-{moneyZAR(stats.expenses)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Net Profit</span>
              <span className={`summary-value ${stats.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                {moneyZAR(stats.profit)}
              </span>
            </div>
          </div>
        </div>

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && (
          <div className="summary-card">
            <h2 className="summary-title">
              🔧 Debug Information ({salesMetrics.periodLabel})
            </h2>
            <div style={{ fontSize: '12px', fontFamily: 'monospace', background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
              <div>Orders Count: {stats.orders_count || 0}</div>
              <div>Period: {selectedPeriod} days</div>
              <div>Period Label: {stats.period_label}</div>
              <div>Date Range: {stats.date_range?.from?.split('T')[0]} to {stats.date_range?.to?.split('T')[0]}</div>
              <div>Gross Revenue: R{(stats.totalRevenue || stats.revenue || 0) / 100}</div>
              <div>Total Discounts: R{(stats.totalDiscounts || 0) / 100}</div>
              <div>Net Revenue: R{(stats.netRevenue || 0) / 100}</div>
              <div>COGS: R{(stats.cogs || 0) / 100}</div>
              <div>Expenses: R{(stats.expenses || 0) / 100}</div>
              <div style={{ fontWeight: 'bold', marginTop: '8px' }}>Net Profit: R{(stats.profit || 0) / 100}</div>
              
              <div style={{ marginTop: '16px', fontWeight: 'bold' }}>Top Selling Products:</div>
              <div>Total Top Products Found: {salesData?.topProducts?.length || 0}</div>
              {salesData?.topProducts?.map((product, index) => (
                <div key={index}>
                  #{index + 1}: {product.name} ({product.totalUnitsSold} sold, R{(product.totalRevenueCents / 100).toFixed(2)})
                </div>
              ))}
              
              <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                Currently Showing: "{salesMetrics.topSellingProduct}" with {salesMetrics.topSellingCount} sold
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
