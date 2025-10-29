import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Users, Package } from "lucide-react";
import { moneyZAR } from "../components/formatUtils";
import { Banner } from "../components/ui/Banner";

export default function Analytics() {
  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ordersLast30 = orders.filter(o => new Date(o.created_date) >= last30Days);
    const revenueLast30 = ordersLast30.reduce((sum, o) => sum + (o.total || 0), 0);
    
    const activeProducts = products.filter(p => p.status === 'active').length;
    const lowStockProducts = products.filter(p => p.stock < 5).length;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      revenueLast30,
      ordersLast30: ordersLast30.length,
      activeProducts,
      lowStockProducts,
      totalContacts: contacts.length
    };
  }, [orders, products, contacts]);

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