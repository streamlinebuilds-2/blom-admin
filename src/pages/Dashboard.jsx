import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "@/components/data/api";
import {
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <div className="stat-icon">
          <Icon className="w-6 h-6" />
        </div>
        <div className="stat-info">
          <div className="stat-title">{title}</div>
          <div className="stat-value">{value}</div>
        </div>
      </div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      {trend && (
        <div className={`stat-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
          {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

function QuickLink({ title, description, url, icon: Icon }) {
  return (
    <Link to={createPageUrl(url)} className="quick-link">
      <div className="quick-link-icon">
        <Icon className="w-5 h-5" />
      </div>
      <div className="quick-link-content">
        <div className="quick-link-title">{title}</div>
        <div className="quick-link-description">{description}</div>
      </div>
      <ArrowUpRight className="w-5 h-5 quick-link-arrow" />
    </Link>
  );
}

export default function Dashboard() {
  const { data: productsData = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => api?.listProducts() || [],
    enabled: !!api,
  });

  const { data: ordersData = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api?.listOrders() || [],
    enabled: !!api,
  });

  const { data: reviewsData = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ['reviews', 'pending'],
    queryFn: () => api?.listReviews?.('pending') || [],
    enabled: !!api,
  });

  const [financeMetrics, setFinanceMetrics] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/.netlify/functions/admin-finance-daily?date=${new Date().toISOString().slice(0,10)}`);
        const j = await r.json();
        setFinanceMetrics(j.data);
      } catch (e) {
        console.error('Failed to load finance metrics:', e);
      }
    })();
  }, []);

  // Ensure arrays
  const products = Array.isArray(productsData) ? productsData : [];
  const orders = Array.isArray(ordersData) ? ordersData : [];
  const reviews = Array.isArray(reviewsData) ? reviewsData : [];

  // Safe calculations
  const totalSales = (Array.isArray(orders) ? orders : []).reduce((sum, order) => {
    const total = order?.total_cents ? order.total_cents / 100 : (order?.total || 0);
    return sum + total;
  }, 0);

  const todaySales = (Array.isArray(orders) ? orders : []).filter(o => {
    if (!o) return false;
    const today = new Date().toDateString();
    const orderDate = o.placed_at || o.created_at || o.created_date;
    if (!orderDate) return false;
    return new Date(orderDate).toDateString() === today;
  }).reduce((sum, order) => {
    const total = order?.total_cents ? order.total_cents / 100 : (order?.total || 0);
    return sum + total;
  }, 0);

  const topProduct = products.length > 0 ? [...products].sort((a, b) => (b.stock_qty || b.stock || 0) - (a.stock_qty || a.stock || 0))[0] : null;

  return (
    <>
      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: var(--card);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
        }

        .stat-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 12px;
        }

        .stat-icon {
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

        .stat-info {
          flex: 1;
        }

        .stat-title {
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 500;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--text);
        }

        .stat-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-top: 8px;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          font-size: 14px;
          font-weight: 600;
        }

        .trend-up {
          color: #10b981;
        }

        .trend-down {
          color: #ef4444;
        }

        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 20px;
        }

        .quick-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .quick-link {
          background: var(--card);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          transition: all 0.3s ease;
        }

        .quick-link:hover {
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
          transform: translateY(-2px);
        }

        .quick-link:active {
          transform: translateY(0);
        }

        .quick-link-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .quick-link-content {
          flex: 1;
        }

        .quick-link-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .quick-link-description {
          font-size: 13px;
          color: var(--text-muted);
        }

        .quick-link-arrow {
          color: var(--text-muted);
          transition: transform 0.3s ease;
        }

        .quick-link:hover .quick-link-arrow {
          transform: translate(4px, -4px);
        }

        .recent-table {
          background: var(--card);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          margin-top: 32px;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .table-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
        }

        .view-all-link {
          font-size: 14px;
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
        }

        td {
          padding: 16px 12px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .status-active {
          background: #10b98120;
          color: #10b981;
        }

        .status-draft {
          background: #f59e0b20;
          color: #f59e0b;
        }

        .status-pending {
          background: #3b82f620;
          color: #3b82f6;
        }
      `}</style>

      <div className="dashboard-grid">
        <StatCard
          title="Today's Sales"
          value={`R${(todaySales / 100).toFixed(2)}`}
          subtitle="24 hour period"
          icon={DollarSign}
          trend="+12.5%"
          trendUp={true}
        />
        
        <StatCard
          title="Total Orders"
          value={orders.length}
          subtitle="Lifetime"
          icon={ShoppingCart}
          trend="+8.2%"
          trendUp={true}
        />
        
        <StatCard
          title="Top Product"
          value={topProduct?.name || 'No products'}
          subtitle={topProduct ? `${topProduct.stock} in stock` : ''}
          icon={Package}
        />
        
        <StatCard
          title="Pending Reviews"
          value={reviews.length}
          subtitle="Awaiting moderation"
          icon={Star}
        />
      </div>

      {/* Analytics Section */}
      {financeMetrics && (
        <>
          <div className="section-title">Analytics</div>
          <div className="dashboard-grid">
            <StatCard
              title="Today's Revenue"
              value={`R${(financeMetrics.revenue || 0).toFixed(2)}`}
              subtitle="From paid orders"
              icon={DollarSign}
            />
            <StatCard
              title="Today's Expenses"
              value={`R${(financeMetrics.expenses || 0).toFixed(2)}`}
              subtitle="Operating costs"
              icon={TrendingUp}
            />
            <StatCard
              title="Today's Profit"
              value={`R${(financeMetrics.profit || 0).toFixed(2)}`}
              subtitle="Revenue - Expenses"
              icon={TrendingUp}
              trend={financeMetrics.profit >= 0 ? "positive" : "negative"}
              trendUp={financeMetrics.profit >= 0}
            />
          </div>
        </>
      )}

      <div className="section-title">Quick Actions</div>
      <div className="quick-links-grid">
        <QuickLink
          title="Add Product"
          description="Create a new product listing"
          url="ProductCreate"
          icon={Package}
        />
        
        <QuickLink
          title="View Orders"
          description="Manage customer orders"
          url="Orders"
          icon={ShoppingCart}
        />
        
        <QuickLink
          title="Moderate Reviews"
          description="Approve or reject reviews"
          url="Reviews"
          icon={Star}
        />
        
        <QuickLink
          title="Check Stock"
          description="Monitor inventory levels"
          url="Stock"
          icon={TrendingUp}
        />
        
        <QuickLink
          title="Finance"
          description="View financial reports and metrics"
          url="finance"
          icon={DollarSign}
        />
      </div>

      <div className="recent-table">
        <div className="table-header">
          <div className="table-title">Recent Products</div>
          <Link to={createPageUrl("Products")} className="view-all-link">
            View All <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Status</th>
              <th>Price</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 5).map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>
                  <span className={`status-badge status-${product.status}`}>
                    {product.status}
                  </span>
                </td>
                <td>R{((product.price_cents || product.price || 0) / 100).toFixed(2)}</td>
                <td>{product.stock_qty || product.stock || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}