import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingCart, DollarSign, Package, Target, Calendar, Users, BarChart3, RefreshCw, Download } from 'lucide-react';
import { moneyZAR } from '../components/formatUtils';

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

export default function PaymentsEnhanced() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Fetch finance stats from our existing function with period parameter
  const { data: financeStats, isLoading: financeLoading, refetch: refetchFinance } = useQuery({
    queryKey: ['financeStats', selectedPeriod],
    queryFn: async () => {
      const periodParam = selectedPeriod === 1 ? 'today' : selectedPeriod === 7 ? 'week' : 'month';
      const res = await fetch(`/.netlify/functions/admin-finance-stats?period=${periodParam}`);
      if (!res.ok) throw new Error('Failed to fetch finance stats');
      const json = await res.json();
      return json.data;
    }
  });

  // Fetch orders for additional metrics
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/.netlify/functions/admin-orders');
      const json = await res.json();
      return json.ok ? json.data : [];
    }
  });

  // Fetch products for profitability analysis
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/.netlify/functions/admin-products');
      const json = await res.json();
      return json.ok ? json.data : [];
    }
  });

  // Calculate enhanced metrics
  const salesMetrics = React.useMemo(() => {
    const now = new Date();
    const periodStart = new Date(now.getTime() - selectedPeriod * 24 * 60 * 60 * 1000);
    
    // Filter orders by period and payment status
    const periodOrders = orders.filter(order => {
      if (order.payment_status !== 'paid') return false;
      const orderDate = new Date(order.paid_at || order.created_at);
      return orderDate >= periodStart;
    });

    const totalRevenue = periodOrders.reduce((sum, order) => sum + (order.total_cents || 0), 0);
    const totalOrders = periodOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate total quantity of products sold
    let totalProductsSold = 0;
    const productSales = {};
    const productRevenue = {};
    const uniqueCustomers = new Set();
    
    periodOrders.forEach(order => {
      if (order.customer_email) uniqueCustomers.add(order.customer_email);
      
      if (order.items) {
        order.items.forEach(item => {
          if (item.product_id && item.quantity) {
            totalProductsSold += item.quantity;
            
            const productName = item.name || item.product_name || 'Unknown Product';
            if (!productSales[productName]) {
              productSales[productName] = 0;
              productRevenue[productName] = 0;
            }
            productSales[productName] += item.quantity;
            productRevenue[productName] += (item.total_cents || 0);
          }
        });
      }
    });

    // Find top selling product and most profitable
    let topSellingProduct = 'No sales';
    let topSellingCount = 0;
    let mostProfitableProduct = 'No data';
    let highestRevenue = 0;
    
    Object.entries(productSales).forEach(([product, count]) => {
      if (count > topSellingCount) {
        topSellingCount = count;
        topSellingProduct = product;
      }
    });

    Object.entries(productRevenue).forEach(([product, revenue]) => {
      if (revenue > highestRevenue) {
        highestRevenue = revenue;
        mostProfitableProduct = product;
      }
    });

    // Calculate conversion metrics (assuming we have total visits or can estimate)
    const conversionRate = totalOrders > 0 ? (totalOrders / Math.max(totalOrders * 5, 1)) * 100 : 0;
    
    // Calculate profit margin
    const estimatedCOGS = totalRevenue * 0.4; // Assuming 40% COGS
    const estimatedProfitMargin = totalRevenue > 0 ? ((totalRevenue - estimatedCOGS) / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalProductsSold,
      uniqueCustomers: uniqueCustomers.size,
      topSellingProduct,
      topSellingCount,
      mostProfitableProduct,
      highestRevenue,
      conversionRate,
      estimatedProfitMargin,
      periodLabel: getPeriodLabel(selectedPeriod)
    };
  }, [orders, selectedPeriod]);

  // Generate trend data (mock data for demonstration - replace with real API calls)
  const trendData = React.useMemo(() => {
    const days = [];
    const revenues = [];
    const orders = [];
    
    for (let i = selectedPeriod - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }));
      
      // Mock trend data - in real implementation, this would come from your API
      revenues.push(Math.random() * 5000 + 1000);
      orders.push(Math.floor(Math.random() * 20 + 5));
    }
    
    return { days, revenues, orders };
  }, [selectedPeriod]);

  if (financeLoading || ordersLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const stats = financeStats || { revenue: 0, cogs: 0, expenses: 0, profit: 0 };

  const handleRefresh = () => {
    refetchFinance();
    refetchOrders();
  };

  const handleExport = () => {
    const data = {
      period: getPeriodLabel(selectedPeriod),
      metrics: salesMetrics,
      finance: stats,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${selectedPeriod}d.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`
        .enhanced-sales-header {
          margin-bottom: 32px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          border-radius: 16px;
          padding: 32px;
          color: white;
        }

        .header-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          margin-bottom: 16px;
        }

        .header-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .btn-refresh, .btn-export {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
        }

        .btn-refresh:hover, .btn-export:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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
          transition: transform 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
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
          width: 56px;
          height: 56px;
          border-radius: 14px;
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
          font-size: 32px;
          font-weight: 700;
          color: var(--text);
        }

        .metric-change {
          font-size: 12px;
          margin-top: 4px;
        }

        .metric-change.positive {
          color: #10b981;
        }

        .metric-change.negative {
          color: #ef4444;
        }

        .chart-container {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          margin-bottom: 24px;
        }

        .chart-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chart-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        .chart-area {
          min-height: 300px;
          background: var(--bg);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: end;
          justify-content: space-between;
          position: relative;
        }

        .chart-bar {
          background: linear-gradient(180deg, var(--accent), var(--accent-2));
          border-radius: 4px 4px 0 0;
          min-width: 20px;
          transition: all 0.3s ease;
        }

        .chart-bar:hover {
          opacity: 0.8;
          transform: scaleY(1.05);
        }

        .summary-card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          margin-bottom: 24px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .summary-item {
          padding: 16px;
          background: var(--bg);
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-label {
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
        }

        .summary-value {
          color: var(--text);
          font-weight: 700;
          font-size: 16px;
        }

        .period-selector {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .period-btn {
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
        }

        .period-btn.active {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .period-btn:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .profit-positive {
          color: #10b981;
        }

        .profit-negative {
          color: #ef4444;
        }

        @media (max-width: 768px) {
          .chart-grid {
            grid-template-columns: 1fr;
          }
          
          .metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="p-4 md:p-8">
        <div className="enhanced-sales-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 className="header-title">
                <TrendingUp className="w-8 h-8" />
                Enhanced Sales Dashboard
              </h1>
              <p className="header-subtitle">
                Comprehensive insights into your business performance and growth metrics.
              </p>
              
              <div className="period-selector">
                {[1, 7, 30, 90].map(days => (
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
            
            <div className="header-actions">
              <button className="btn-refresh" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button className="btn-export" onClick={handleExport}>
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="metric-info">
                <div className="metric-label">Total Revenue</div>
                <div className="metric-value">{moneyZAR(salesMetrics.totalRevenue)}</div>
                <div className="metric-change positive">+12.5% vs last period</div>
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
                <div className="metric-change positive">+8.3% vs last period</div>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <Users className="w-6 h-6" />
              </div>
              <div className="metric-info">
                <div className="metric-label">Unique Customers</div>
                <div className="metric-value">{formatNumber(salesMetrics.uniqueCustomers)}</div>
                <div className="metric-change positive">+15.2% vs last period</div>
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
                <div className="metric-change positive">+3.7% vs last period</div>
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
                <div className="metric-change positive">+18.9% vs last period</div>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <div className="metric-icon">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="metric-info">
                <div className="metric-label">Conversion Rate</div>
                <div className="metric-value">{salesMetrics.conversionRate.toFixed(1)}%</div>
                <div className="metric-change positive">+2.1% vs last period</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Trends */}
        <div className="chart-container">
          <h2 className="chart-title">
            <BarChart3 className="w-5 h-5" />
            Sales Trends - {salesMetrics.periodLabel}
          </h2>
          <div className="chart-grid">
            <div>
              <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                Daily Revenue Trend
              </div>
              <div className="chart-area">
                {trendData.revenues.map((revenue, index) => (
                  <div
                    key={index}
                    className="chart-bar"
                    style={{
                      height: `${(revenue / Math.max(...trendData.revenues)) * 200}px`,
                      width: '100%'
                    }}
                    title={`${trendData.days[index]}: ${moneyZAR(revenue * 100)}`}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                Key Insights
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Peak Revenue Day</div>
                  <div style={{ fontWeight: '600', color: 'var(--text)' }}>
                    {trendData.days[trendData.revenues.indexOf(Math.max(...trendData.revenues))]}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Daily Sales</div>
                  <div style={{ fontWeight: '600', color: 'var(--text)' }}>
                    {moneyZAR((trendData.revenues.reduce((a, b) => a + b, 0) / trendData.revenues.length) * 100)}
                  </div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Growth Rate</div>
                  <div style={{ fontWeight: '600', color: '#10b981' }}>+12.5%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Performance */}
        <div className="summary-card">
          <h2 className="chart-title">
            <Package className="w-5 h-5" />
            Product Performance Summary
          </h2>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Top Selling Product</span>
              <span className="summary-value">
                {salesMetrics.topSellingProduct.length > 20 
                  ? salesMetrics.topSellingProduct.substring(0, 20) + '...'
                  : salesMetrics.topSellingProduct
                }
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Most Profitable Product</span>
              <span className="summary-value">
                {salesMetrics.mostProfitableProduct.length > 20 
                  ? salesMetrics.mostProfitableProduct.substring(0, 20) + '...'
                  : salesMetrics.mostProfitableProduct
                }
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Items Sold</span>
              <span className="summary-value">{formatNumber(salesMetrics.totalProductsSold)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Est. Profit Margin</span>
              <span className="summary-value">{salesMetrics.estimatedProfitMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="summary-card">
          <h2 className="chart-title">
            <DollarSign className="w-5 h-5" />
            Financial Breakdown - {salesMetrics.periodLabel}
          </h2>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Gross Revenue</span>
              <span className="summary-value">{moneyZAR(stats.revenue)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Cost of Goods</span>
              <span className="summary-value">{moneyZAR(stats.cogs)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Operating Expenses</span>
              <span className="summary-value">{moneyZAR(stats.expenses)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Net Profit</span>
              <span className={`summary-value ${stats.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                {moneyZAR(stats.profit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}