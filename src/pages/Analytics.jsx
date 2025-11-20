import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Users, Package } from "lucide-react";
import { moneyZAR } from "../components/formatUtils";
import { api } from "@/components/data/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";

export default function Analytics() {
  const { data: ordersData = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api?.listOrders() || [],
    enabled: !!api,
  });

  const { data: productsData = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api?.listProducts() || [],
    enabled: !!api,
  });

  // Ensure arrays
  const orders = Array.isArray(ordersData) ? ordersData : [];
  const products = Array.isArray(productsData) ? productsData : [];
  const contacts = []; // Contacts not yet implemented in adapter

  const metrics = useMemo(() => {
    const totalRevenueCents = orders.reduce((sum, o) => {
      // Keep everything in cents for consistency
      const totalCents = o.total_cents || (o.total ? o.total * 100 : 0);
      return sum + totalCents;
    }, 0);
    const totalOrders = orders.length;
    const avgOrderValueCents = totalOrders > 0 ? totalRevenueCents / totalOrders : 0;

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ordersLast30 = orders.filter(o => {
      const orderDate = o.placed_at || o.created_at || o.created_date;
      if (!orderDate) return false;
      return new Date(orderDate) >= last30Days;
    });
    const revenueLast30Cents = ordersLast30.reduce((sum, o) => {
      const totalCents = o.total_cents || (o.total ? o.total * 100 : 0);
      return sum + totalCents;
    }, 0);
    
    const activeProducts = products.filter(p => p.status === 'active').length;
    const lowStockProducts = products.filter(p => {
      const stock = p.stock_qty || p.stock || 0;
      return stock < 5;
    }).length;

    return {
      totalRevenue: totalRevenueCents,
      totalOrders,
      avgOrderValue: avgOrderValueCents,
      revenueLast30: revenueLast30Cents,
      ordersLast30: ordersLast30.length,
      activeProducts,
      lowStockProducts,
      totalContacts: contacts.length
    };
  }, [orders, products, contacts]);

  const chartData = useMemo(() => {
    // Group orders by date (last 30 days)
    const days = {};
    const now = new Date();
    
    // Initialize last 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      days[key] = { date: key, revenue: 0, orders: 0 };
    }

    orders.forEach(o => {
      const orderDate = o.placed_at || o.created_at || o.created_date;
      if (!orderDate) return;
      const key = new Date(orderDate).toISOString().split('T')[0];
      if (days[key]) {
        const totalCents = o.total_cents || (o.total ? o.total * 100 : 0);
        days[key].revenue += totalCents / 100; // Convert to Rands for chart
        days[key].orders += 1;
      }
    });

    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [orders]);

  return (
    <>
      <style>{`
        .analytics-header {
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 12px;
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
          font-size: 32px;
          font-weight: 700;
          color: var(--text);
        }

        .metric-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-top: 8px;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }

        @media (min-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .chart-card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          min-height: 400px;
        }

        .chart-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 20px;
        }

        .insights-section {
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 20px;
        }

        .insight-row {
          padding: 16px;
          border-radius: 10px;
          background: var(--bg);
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .insight-label {
          color: var(--text);
          font-weight: 500;
        }

        .insight-value {
          font-weight: 700;
          color: var(--text);
        }
      `}</style>

      <div className="analytics-header">
        <h1 className="header-title">
          <BarChart3 className="w-8 h-8" />
          Analytics
        </h1>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="metric-info">
              <div className="metric-label">Total Revenue</div>
              <div className="metric-value">{moneyZAR(metrics.totalRevenue)}</div>
            </div>
          </div>
          <div className="metric-subtitle">All time</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div className="metric-info">
              <div className="metric-label">Total Orders</div>
              <div className="metric-value">{metrics.totalOrders}</div>
            </div>
          </div>
          <div className="metric-subtitle">All time</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="metric-info">
              <div className="metric-label">Avg Order Value</div>
              <div className="metric-value">{moneyZAR(metrics.avgOrderValue)}</div>
            </div>
          </div>
          <div className="metric-subtitle">Per transaction</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon">
              <Package className="w-6 h-6" />
            </div>
            <div className="metric-info">
              <div className="metric-label">Active Products</div>
              <div className="metric-value">{metrics.activeProducts}</div>
            </div>
          </div>
          <div className="metric-subtitle">
            {metrics.lowStockProducts > 0 && `${metrics.lowStockProducts} low stock`}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon">
              <Users className="w-6 h-6" />
            </div>
            <div className="metric-info">
              <div className="metric-label">Contacts</div>
              <div className="metric-value">{metrics.totalContacts}</div>
            </div>
          </div>
          <div className="metric-subtitle">Total subscribers</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <div className="metric-icon">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="metric-info">
              <div className="metric-label">Last 30 Days</div>
              <div className="metric-value">{moneyZAR(metrics.revenueLast30)}</div>
            </div>
          </div>
          <div className="metric-subtitle">{metrics.ordersLast30} orders</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">Sales Volume (Last 30 Days)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  formatter={(value) => [`R${value.toFixed(2)}`, 'Revenue']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Orders Count (Last 30 Days)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="var(--text-muted)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  formatter={(value) => [value, 'Orders']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="orders" stroke="var(--accent-2)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="insights-section">
        <h2 className="section-title">Quick Insights</h2>
        <div className="insight-row">
          <span className="insight-label">Conversion Rate</span>
          <span className="insight-value">
            {metrics.totalContacts > 0
              ? ((metrics.totalOrders / metrics.totalContacts) * 100).toFixed(1)
              : 0}%
          </span>
        </div>
        <div className="insight-row">
          <span className="insight-label">Revenue per Contact</span>
          <span className="insight-value">
            {moneyZAR(metrics.totalContacts > 0 ? metrics.totalRevenue / metrics.totalContacts : 0)}
          </span>
        </div>
        <div className="insight-row">
          <span className="insight-label">Products per Order</span>
          <span className="insight-value">
            {metrics.totalOrders > 0 ? (metrics.totalOrders / metrics.activeProducts).toFixed(1) : 0}
          </span>
        </div>
      </div>
    </>
  );
}
