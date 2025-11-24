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
  const [financeError, setFinanceError] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/.netlify/functions/admin-finance-daily?date=${new Date().toISOString().slice(0,10)}`);
        const j = await r.json();
        console.log('Finance metrics response:', j);
        if (j.ok && j.data && j.data.length > 0) {
          setFinanceMetrics(j.data[0]);
        } else {
          setFinanceError('No finance data available');
        }
      } catch (e) {
        console.error('Failed to load finance metrics:', e);
        setFinanceError(e.message);
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
    const total = order?.total_cents ? order.total_cents : (order?.total ? order.total * 100 : 0);
    return sum + total;
  }, 0);

  const topProduct = products.length > 0 ? [...products].sort((a, b) => (b.stock_qty || b.stock || 0) - (a.stock_qty || a.stock || 0))[0] : null;

  return (
    <>
      <style>{`
        /* Enhanced mobile responsiveness for Dashboard */
        .dashboard-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (min-width: 640px) {
          .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
        }

        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
            margin-bottom: 32px;
          }
        }

        .stat-card {
          background: var(--card);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          position: relative;
          overflow: hidden;
          min-height: 120px;
          flex-shrink: 0;
        }

        @media (min-width: 640px) {
          .stat-card {
            padding: 20px;
            min-height: 140px;
          }
        }

        @media (min-width: 768px) {
          .stat-card {
            padding: 24px;
            min-height: 160px;
          }
        }

        @media (min-width: 1024px) {
          .stat-card {
            min-height: 180px;
          }
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-2));
        }

        @media (min-width: 768px) {
          .stat-card::before {
            height: 4px;
          }
        }

        .stat-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        @media (min-width: 768px) {
          .stat-header {
            gap: 16px;
            margin-bottom: 12px;
          }
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          }
        }

        .stat-info {
          flex: 1;
          min-width: 0;
        }

        .stat-title {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
          margin-bottom: 3px;
          line-height: 1.3;
        }

        @media (min-width: 640px) {
          .stat-title {
            font-size: 13px;
            margin-bottom: 4px;
          }
        }

        @media (min-width: 768px) {
          .stat-title {
            font-size: 14px;
          }
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          word-break: break-word;
          line-height: 1.2;
        }

        @media (min-width: 640px) {
          .stat-value {
            font-size: 20px;
          }
        }

        @media (min-width: 768px) {
          .stat-value {
            font-size: 24px;
          }
        }

        @media (min-width: 1024px) {
          .stat-value {
            font-size: 32px;
          }
        }

        .stat-subtitle {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 6px;
          line-height: 1.3;
        }

        @media (min-width: 640px) {
          .stat-subtitle {
            font-size: 12px;
            margin-top: 8px;
          }
        }

        @media (min-width: 768px) {
          .stat-subtitle {
            font-size: 13px;
          }
        }

        @media (min-width: 1024px) {
          .stat-subtitle {
            font-size: 14px;
          }
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          font-size: 12px;
          font-weight: 600;
        }

        @media (min-width: 640px) {
          .stat-trend {
            gap: 6px;
            margin-top: 12px;
            font-size: 13px;
          }
        }

        @media (min-width: 768px) {
          .stat-trend {
            font-size: 14px;
          }
        }

        .trend-up {
          color: #10b981;
        }

        .trend-down {
          color: #ef4444;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 12px;
          margin-top: 20px;
        }

        @media (min-width: 640px) {
          .section-title {
            font-size: 17px;
            margin-bottom: 16px;
            margin-top: 24px;
          }
        }

        @media (min-width: 768px) {
          .section-title {
            font-size: 18px;
            margin-bottom: 20px;
            margin-top: 28px;
          }
        }

        @media (min-width: 1024px) {
          .section-title {
            font-size: 20px;
            margin-bottom: 24px;
            margin-top: 32px;
          }
        }

        .quick-links-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (min-width: 640px) {
          .quick-links-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }

        @media (min-width: 1024px) {
          .quick-links-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
        }

        @media (min-width: 1280px) {
          .quick-links-grid {
            gap: 20px;
          }
        }

        .quick-link {
          background: var(--card);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          transition: all 0.3s ease;
          min-height: 44px;
          flex-shrink: 0;
          touch-action: manipulation;
        }

        @media (min-width: 640px) {
          .quick-link {
            padding: 16px;
            gap: 12px;
          }
        }

        @media (min-width: 768px) {
          .quick-link {
            padding: 20px;
            gap: 16px;
            min-height: 48px;
          }
        }

        .quick-link:hover {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
          transform: translateY(-1px);
        }

        .quick-link:active {
          transform: translateY(0);
          box-shadow: inset 1px 1px 2px var(--shadow-dark), inset -1px -1px 2px var(--shadow-light);
        }

        .quick-link-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: var(--card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .quick-link-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
          }
        }

        .quick-link-content {
          flex: 1;
          min-width: 0;
        }

        .quick-link-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 3px;
          line-height: 1.3;
        }

        @media (min-width: 640px) {
          .quick-link-title {
            font-size: 15px;
          }
        }

        @media (min-width: 768px) {
          .quick-link-title {
            font-size: 16px;
            margin-bottom: 4px;
          }
        }

        .quick-link-description {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.3;
        }

        @media (min-width: 640px) {
          .quick-link-description {
            font-size: 12px;
          }
        }

        @media (min-width: 768px) {
          .quick-link-description {
            font-size: 13px;
          }
        }

        .quick-link-arrow {
          color: var(--text-muted);
          transition: transform 0.3s ease;
          flex-shrink: 0;
        }

        .quick-link:hover .quick-link-arrow {
          transform: translate(3px, -3px);
        }

        @media (min-width: 768px) {
          .quick-link:hover .quick-link-arrow {
            transform: translate(4px, -4px);
          }
        }

        .recent-table {
          background: var(--card);
          border-radius: 16px;
          padding: 14px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          margin-top: 20px;
          overflow: hidden;
        }

        @media (min-width: 640px) {
          .recent-table {
            padding: 16px;
            margin-top: 24px;
          }
        }

        @media (min-width: 768px) {
          .recent-table {
            padding: 24px;
            margin-top: 32px;
            border-radius: 20px;
            box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          }
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }

        @media (min-width: 640px) {
          .table-header {
            margin-bottom: 16px;
          }
        }

        @media (min-width: 768px) {
          .table-header {
            margin-bottom: 20px;
          }
        }

        .table-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
        }

        @media (min-width: 640px) {
          .table-title {
            font-size: 15px;
          }
        }

        @media (min-width: 768px) {
          .table-title {
            font-size: 18px;
          }
        }

        .table-scroll-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin: 0 -14px;
          padding: 0 14px;
        }

        @media (min-width: 640px) {
          .table-scroll-wrapper {
            margin: 0 -16px;
            padding: 0 16px;
          }
        }

        @media (min-width: 768px) {
          .table-scroll-wrapper {
            margin: 0;
            padding: 0;
          }
        }

        .view-all-link {
          font-size: 12px;
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 8px;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        }

        @media (min-width: 640px) {
          .view-all-link {
            font-size: 13px;
            gap: 6px;
          }
        }

        @media (min-width: 768px) {
          .view-all-link {
            font-size: 14px;
          }
        }

        .view-all-link:hover {
          background-color: var(--accent);
          color: white;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 400px;
        }

        @media (min-width: 640px) {
          table {
            min-width: 500px;
          }
        }

        th {
          text-align: left;
          padding: 8px 6px;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }

        @media (min-width: 640px) {
          th {
            padding: 10px 8px;
            font-size: 11px;
          }
        }

        @media (min-width: 768px) {
          th {
            padding: 12px;
            font-size: 12px;
          }
        }

        td {
          padding: 10px 6px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
          font-size: 12px;
          line-height: 1.3;
        }

        @media (min-width: 640px) {
          td {
            padding: 12px 8px;
            font-size: 13px;
          }
        }

        @media (min-width: 768px) {
          td {
            padding: 16px 12px;
            font-size: 14px;
          }
        }

        tr:last-child td {
          border-bottom: none;
        }

        .status-badge {
          display: inline-flex;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
          box-shadow: inset 1px 1px 2px var(--shadow-dark), inset -1px -1px 2px var(--shadow-light);
        }

        @media (min-width: 640px) {
          .status-badge {
            padding: 4px 10px;
            font-size: 11px;
          }
        }

        @media (min-width: 768px) {
          .status-badge {
            padding: 4px 12px;
            font-size: 12px;
          }
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

        /* Enhanced scrolling styles */
        .dashboard-grid::-webkit-scrollbar,
        .quick-links-grid::-webkit-scrollbar,
        .table-scroll-wrapper::-webkit-scrollbar {
          height: 3px;
        }

        .dashboard-grid::-webkit-scrollbar-track,
        .quick-links-grid::-webkit-scrollbar-track,
        .table-scroll-wrapper::-webkit-scrollbar-track {
          background: transparent;
        }

        .dashboard-grid::-webkit-scrollbar-thumb,
        .quick-links-grid::-webkit-scrollbar-thumb,
        .table-scroll-wrapper::-webkit-scrollbar-thumb {
          background: var(--accent);
          border-radius: 2px;
        }

        /* Touch optimizations */
        @media (max-width: 768px) {
          .stat-card,
          .quick-link {
            -webkit-tap-highlight-color: rgba(0,0,0,0.1);
            touch-action: manipulation;
          }

          .stat-card:active,
          .quick-link:active {
            transform: scale(0.98);
          }

          /* Prevent zoom on input focus */
          input, select, textarea {
            font-size: 16px;
          }

          /* Better spacing for mobile */
          .section-title:first-child {
            margin-top: 0;
          }
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

        <div className="table-scroll-wrapper">
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
      </div>
    </>
  );
}