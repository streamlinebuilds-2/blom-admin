import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShoppingCart, DollarSign, Package, Target, Calendar } from 'lucide-react';
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

export default function Payments() {
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // Fetch finance stats from our existing function
  const { data: financeStats, isLoading: financeLoading } = useQuery({
    queryKey: ['financeStats'],
    queryFn: async () => {
      const res = await fetch('/.netlify/functions/admin-finance-stats');
      if (!res.ok) throw new Error('Failed to fetch finance stats');
      const json = await res.json();
      return json.data;
    }
  });

  // Fetch orders for additional metrics
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/.netlify/functions/admin-orders');
      const json = await res.json();
      return json.ok ? json.data : [];
    }
  });

  // Calculate additional metrics
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

    // Calculate total quantity of products sold (not unique products)
    let totalProductsSold = 0;
    const productSales = {};
    periodOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          if (item.product_id && item.quantity) {
            totalProductsSold += item.quantity;
            
            // Track for top selling product
            const productName = item.name || item.product_name || 'Unknown Product';
            if (!productSales[productName]) {
              productSales[productName] = 0;
            }
            productSales[productName] += item.quantity;
          }
        });
      }
    });

    // Find top selling product
    let topSellingProduct = 'No sales';
    let topSellingCount = 0;
    Object.entries(productSales).forEach(([product, count]) => {
      if (count > topSellingCount) {
        topSellingCount = count;
        topSellingProduct = product;
      }
    });

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalProductsSold,
      topSellingProduct,
      topSellingCount,
      periodLabel: getPeriodLabel(selectedPeriod)
    };
  }, [orders, selectedPeriod]);

  if (financeLoading || ordersLoading) {
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
                  {moneyZAR(stats.revenue - stats.cogs - stats.expenses)}
                </div>
                <div className="metric-subtitle">Last 30 days</div>
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
            Financial Summary (Last 30 Days)
          </h2>
          <div className="summary-row">
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
