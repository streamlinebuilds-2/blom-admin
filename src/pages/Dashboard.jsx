import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Package,
  ShoppingCart,
  Star,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";

function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, loading }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <div className="stat-icon">
          <Icon className="w-6 h-6" />
        </div>
        <div className="stat-info">
          <div className="stat-title">{title}</div>
          <div className="stat-value">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : value}
          </div>
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
  // 1. Fetch Today's Financials (Same logic as Payments Page)
  const { data: todayStats, isLoading: isLoadingToday } = useQuery({
    queryKey: ['admin-finance-stats', 'today'],
    queryFn: async () => {
      const res = await fetch('/.netlify/functions/admin-finance-stats?period=today');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    }
  });

  // 2. Fetch General Analytics (For Total Orders & Top Product)
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['admin-analytics-advanced', '30'],
    queryFn: async () => {
      // Fetching last 30 days to get recent top products
      const res = await fetch('/.netlify/functions/admin-analytics-advanced?period=30');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    }
  });

  // 3. Fetch Recent Products directly from Admin API
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['admin-products-recent'],
    queryFn: async () => {
      const res = await fetch('/.netlify/functions/admin-products?page=1&pageSize=5');
      const json = await res.json();
      return json.data || [];
    }
  });

  // Safe Data Access
  const todaySales = todayStats?.revenue || 0;
  const todayProfit = todayStats?.profit || 0;
  const totalOrders = analyticsData?.summary?.totalOrders || 0; // Orders in last 30 days (active metric)
  const topProduct = analyticsData?.topProducts?.[0];
  
  return (
    <>
      <style>{`
        /* Dashboard Specific Styles */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }

        @media (min-width: 640px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
          }
        }

        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
          }
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          position: relative;
          overflow: hidden;
          border: 1px solid #f3f4f6;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #ec4899, #8b5cf6);
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
          background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ec4899;
        }

        .stat-info {
          flex: 1;
        }

        .stat-title {
          font-size: 13px;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .stat-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin-top: 8px;
        }

        .stat-trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .trend-up {
          background-color: #ecfdf5;
          color: #059669;
        }

        .trend-down {
          background-color: #fef2f2;
          color: #dc2626;
        }

        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 32px 0 20px 0;
        }

        .quick-links-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 640px) {
          .quick-links-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .quick-links-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .quick-link {
          background: white;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .quick-link:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border-color: #ec4899;
        }

        .quick-link-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
          transition: all 0.2s ease;
        }

        .quick-link:hover .quick-link-icon {
          background: #fce7f3;
          color: #ec4899;
        }

        .quick-link-content {
          flex: 1;
        }

        .quick-link-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 2px;
        }

        .quick-link-description {
          font-size: 13px;
          color: #6b7280;
        }

        .quick-link-arrow {
          color: #9ca3af;
        }

        .recent-table {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
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
          color: #111827;
        }

        .view-all-link {
          font-size: 14px;
          color: #ec4899;
          text-decoration: none;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .view-all-link:hover {
          text-decoration: underline;
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
          color: #6b7280;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          padding: 16px 12px;
          color: #111827;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }

        tr:last-child td {
          border-bottom: none;
        }

        .status-badge {
          display: inline-flex;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-active {
          background: #ecfdf5;
          color: #059669;
        }

        .status-archived {
          background: #f3f4f6;
          color: #6b7280;
        }
      `}</style>

      <div className="dashboard-grid">
        <StatCard
          title="Today's Sales"
          value={`R${(todaySales / 100).toFixed(2)}`}
          subtitle="Net Revenue"
          icon={DollarSign}
          trend={todaySales > 0 ? "Active" : "No Sales"}
          trendUp={todaySales > 0}
          loading={isLoadingToday}
        />
        
        <StatCard
          title="Today's Profit"
          value={`R${(todayProfit / 100).toFixed(2)}`}
          subtitle="After Est. Costs"
          icon={TrendingUp}
          trend={todayProfit > 0 ? "Positive" : "-"}
          trendUp={todayProfit > 0}
          loading={isLoadingToday}
        />
        
        <StatCard
          title="Orders (30 Days)"
          value={totalOrders}
          subtitle="Monthly Volume"
          icon={ShoppingCart}
          loading={isLoadingAnalytics}
        />
        
        <StatCard
          title="Top Product"
          value={topProduct ? topProduct.name : 'N/A'}
          subtitle={topProduct ? `${topProduct.totalUnitsSold} sold` : 'No data'}
          icon={Package}
          loading={isLoadingAnalytics}
        />
      </div>

      <div className="section-title">Quick Actions</div>
      <div className="quick-links-grid">
        <QuickLink
          title="View Orders"
          description="Manage recent orders"
          url="Orders"
          icon={ShoppingCart}
        />
        <QuickLink
          title="Products"
          description="Manage inventory"
          url="Products"
          icon={Package}
        />
        <QuickLink
          title="Finance"
          description="View reports"
          url="Finance"
          icon={DollarSign}
        />
        <QuickLink
          title="Stock"
          description="Manual adjustments"
          url="Stock"
          icon={TrendingUp}
        />
      </div>

      <div className="section-title">Recent Products</div>
      <div className="recent-table">
        <div className="table-header">
          <div className="table-title">Latest Inventory</div>
          <Link to={createPageUrl("Products")} className="view-all-link">
            View All <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
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
              {isLoadingProducts ? (
                <tr><td colSpan="4" className="text-center py-4">Loading products...</td></tr>
              ) : productsData.map(product => (
                <tr key={product.id}>
                  <td className="font-medium">{product.name}</td>
                  <td>
                    <span className={`status-badge status-${product.status}`}>
                      {product.status}
                    </span>
                  </td>
                  <td>R{((product.price_cents || 0) / 100).toFixed(2)}</td>
                  <td>{product.stock_qty || 0}</td>
                </tr>
              ))}
              {!isLoadingProducts && productsData.length === 0 && (
                <tr><td colSpan="4" className="text-center py-4">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}