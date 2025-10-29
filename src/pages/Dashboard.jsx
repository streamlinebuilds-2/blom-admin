import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-updated_date', 5),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 10),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => base44.entities.Review.filter({ status: 'pending' }, '-created_date', 10),
  });

  const totalSales = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const todaySales = orders.filter(o => {
    const today = new Date().toDateString();
    return new Date(o.created_date).toDateString() === today;
  }).reduce((sum, order) => sum + (order.total || 0), 0);

  const topProduct = products.sort((a, b) => (b.stock || 0) - (a.stock || 0))[0];

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
                <td>R{(product.price / 100).toFixed(2)}</td>
                <td>{product.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}