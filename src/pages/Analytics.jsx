import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Users, Package, Loader2 } from "lucide-react";
import { moneyZAR } from "../components/formatUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";

function MetricCard({ title, value, subtitle, icon: Icon, loading }) {
  return (
    <div className="metric-card">
      <div className="metric-header">
        <div className="metric-icon">
          <Icon className="w-6 h-6" />
        </div>
        <div className="metric-info">
          <div className="metric-label">{title}</div>
          <div className="metric-value">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : value}
          </div>
        </div>
      </div>
      <div className="metric-subtitle">{subtitle}</div>
    </div>
  );
}

export default function Analytics() {
  // Fetch Advanced Analytics directly from Backend Function
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics-advanced', '30'],
    queryFn: async () => {
      const res = await fetch('/.netlify/functions/admin-analytics-advanced?period=30');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    }
  });

  const stats = analytics?.summary || {};
  const trends = analytics?.trends || [];
  const topProducts = analytics?.topProducts || [];
  const inventory = analytics?.inventory || {};

  return (
    <>
      <style>{`
        .analytics-container {
          padding-bottom: 40px;
        }
        .analytics-header {
          margin-bottom: 32px;
        }
        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }
        .metric-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
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
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
        }
        .metric-info { flex: 1; }
        .metric-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }
        .metric-subtitle {
          font-size: 13px;
          color: #9ca3af;
        }
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }
        @media (min-width: 1024px) {
          .charts-grid { grid-template-columns: 1fr 1fr; }
        }
        .chart-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          min-height: 400px;
        }
        .chart-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 20px;
        }
      `}</style>

      <div className="analytics-container">
        <div className="analytics-header">
          <h1 className="header-title">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            Performance Analytics
          </h1>
        </div>

        <div className="metrics-grid">
          <MetricCard
            title="Total Revenue"
            value={moneyZAR(stats.totalRevenueCents || 0)}
            subtitle="Last 30 Days"
            icon={DollarSign}
            loading={isLoading}
          />
          <MetricCard
            title="Total Orders"
            value={stats.totalOrders || 0}
            subtitle="Last 30 Days"
            icon={ShoppingCart}
            loading={isLoading}
          />
          <MetricCard
            title="Avg Order Value"
            value={moneyZAR(stats.avgOrderValue || 0)}
            subtitle="Per Transaction"
            icon={TrendingUp}
            loading={isLoading}
          />
          <MetricCard
            title="Inventory Value"
            value={moneyZAR(inventory.totalInventoryValue || 0)}
            subtitle={`${inventory.activeProducts || 0} Active Products`}
            icon={Package}
            loading={isLoading}
          />
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3 className="chart-title">Revenue Trend (30 Days)</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    formatter={(value) => [`R${(value/100).toFixed(2)}`, 'Revenue']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Bar dataKey="revenueCents" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">Top Selling Products</h3>
            <div className="space-y-4 mt-4">
              {topProducts.length === 0 && !isLoading && (
                <p className="text-gray-500 text-center py-8">No sales data available yet.</p>
              )}
              {topProducts.map((product, i) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-sm font-bold text-blue-600 border border-blue-100">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.totalUnitsSold} units sold</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{moneyZAR(product.totalRevenueCents)}</div>
                    <div className="text-xs text-green-600">{product.totalOrders} orders</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
