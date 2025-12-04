import React from "react";
import { useQuery } from "@tanstack/react-query";
// ADDED new icons for clarity
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Users, Package, Loader2, MinusCircle, Truck, Percent } from "lucide-react";
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

// Helper for formatting profitability numbers and coloring
const formatProfit = (cents) => {
    const value = moneyZAR(cents || 0);
    if (cents > 0) return { value, color: 'text-green-600' };
    if (cents < 0) return { value, color: 'text-red-600' };
    return { value, color: 'text-gray-500' };
};

function MetricCard({ title, value, subtitle, icon: Icon, loading }) {
  // ... (MetricCard component logic remains the same) ...
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
  // 🚨 NEW: Get the comprehensive product list and loss metrics
  const allTopProducts = analytics?.allTopProducts || []; 
  const losses = analytics?.financialLosses || {};

  // Calculate Net Shipping Loss: Revenue charged to customer MINUS Actual Cost paid
  const revenueChargedCents = stats.totalRevenueCents - (stats.totalRevenueCents - (analytics?.fulfillment?.delivery?.revenueCents || 0));
  const actualShippingCostCents = losses.totalShippingCostCents || 0;
  const netShippingCents = revenueChargedCents - actualShippingCostCents;
  
  const netShippingDisplay = formatProfit(netShippingCents).value;
  const netShippingColor = formatProfit(netShippingCents).color;
  const netShippingSubtitle = netShippingCents >= 0 ? "Net Revenue" : "Net Loss";

  // Sort products by Profit (highest first) for the new table
  const productsByProfit = [...allTopProducts]
    .filter(p => p.totalUnitsSold > 0)
    .sort((a, b) => b.estimatedProfitCents - a.estimatedProfitCents);

  return (
    <>
      <style>{`
        /* ... (Existing styles remain the same) ... */

        /* 🎨 CUSTOM STYLES FOR NEW METRICS */
        .metric-card.discount::before { background: linear-gradient(90deg, #f97316, #fcd34d); }
        .metric-card.shipping::before { background: linear-gradient(90deg, #1d4ed8, #3b82f6); }
        .profit-card { min-height: 400px; max-height: none; } /* Ensure it expands for the table */

        /* --- NEW Profitability Table Styles --- */
        .profitability-table-container {
            margin-top: 24px;
            overflow-x: auto;
        }
        .profit-item {
            display: grid;
            grid-template-columns: 4fr 1.5fr 1.5fr 1.5fr 1fr; /* Adjusted columns */
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid var(--border);
            font-size: 14px;
        }
        .profit-header {
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            font-size: 12px;
            padding-bottom: 10px;
        }
        .profit-col-name { font-weight: 600; }
        .profit-col-units { text-align: right; }
        .profit-col-revenue { text-align: right; }
        .profit-col-cogs { text-align: right; color: var(--text-muted); }
        .profit-col-profit { text-align: right; font-weight: 700; }
        .profit-positive { color: #10b981; }
        .profit-negative { color: #ef4444; }
        /* --- End NEW Profitability Table Styles --- */
      `}</style>

      <div className="analytics-container">
        <div className="analytics-header">
          <h1 className="header-title">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            Performance Analytics
          </h1>
          <p className="header-subtitle">Detailed insights into your business performance (Last 30 Days)</p>
        </div>

        <div className="metrics-grid">
          {/* 1. Total Revenue (Existing) */}
          <div className="metric-card revenue">
            <MetricCard
              title="Total Revenue"
              value={moneyZAR(stats.totalRevenueCents || 0)}
              subtitle="Net Sales (30 Days)"
              icon={DollarSign}
              loading={isLoading}
            />
          </div>
          {/* 2. Total Orders (Existing) */}
          <div className="metric-card orders">
            <MetricCard
              title="Total Orders"
              value={stats.totalOrders || 0}
              subtitle="Order Volume (30 Days)"
              icon={ShoppingCart}
              loading={isLoading}
            />
          </div>
          {/* 3. NEW: Total Discounts Given */}
          <div className="metric-card discount">
            <MetricCard
              title="Discounts Given"
              value={`-${moneyZAR(losses.totalDiscountsCents || 0)}`}
              subtitle="Coupon and Promo Loss"
              icon={Percent}
              loading={isLoading}
            />
          </div>
          {/* 4. NEW: Net Shipping Loss/Revenue */}
          <div className="metric-card shipping">
            <MetricCard
              title="Net Shipping"
              value={netShippingDisplay}
              subtitle={netShippingSubtitle}
              icon={Truck}
              loading={isLoading}
            />
          </div>
          {/* 5. Avg Order Value (Existing) */}
          <div className="metric-card value">
            <MetricCard
              title="Avg Order Value"
              value={moneyZAR(stats.avgOrderValue || 0)}
              subtitle="Per Transaction"
              icon={TrendingUp}
              loading={isLoading}
            />
          </div>
          {/* 6. Inventory Value (Existing) */}
          <div className="metric-card inventory">
            <MetricCard
              title="Inventory Value"
              value={moneyZAR(inventory.totalInventoryValue || 0)}
              subtitle={`${inventory.activeProducts || 0} Active Products`}
              icon={Package}
              loading={isLoading}
            />
          </div>
        </div>

        <div className="charts-grid">
          {/* Chart 1: Revenue Trend (Existing) */}
          <div className="chart-card">
            <h3 className="chart-title">Revenue Trend (30 Days)</h3>
            {/* ... (Recharts component code remains the same) ... */}
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

          {/* Chart 2: NEW Product Profitability Table */}
          <div className="chart-card profit-card">
            <h3 className="chart-title">Product Profitability (Sorted by Profit)</h3>
            <div className="profitability-table-container">
                {/* Header Row */}
                <div className="profit-item profit-header">
                    <div className="profit-col-name">Product Name</div>
                    <div className="profit-col-units" style={{textAlign: 'right'}}>Units Sold</div>
                    <div className="profit-col-revenue" style={{textAlign: 'right'}}>Revenue</div>
                    <div className="profit-col-profit" style={{textAlign: 'right'}}>Net Profit</div>
                </div>
                {/* Data Rows (Filtered and Sorted) */}
                {productsByProfit.slice(0, 10).map((product, i) => {
                    const profitInfo = formatProfit(product.estimatedProfitCents);
                    const revenueDisplay = moneyZAR(product.totalRevenueCents);
                    return (
                        <div key={product.id} className="profit-item">
                            <div className="profit-col-name">
                                {product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name}
                            </div>
                            <div className="profit-col-units">
                                {product.totalUnitsSold}
                            </div>
                            <div className="profit-col-revenue">
                                {revenueDisplay}
                            </div>
                            <div className={`profit-col-profit ${profitInfo.color}`}>
                                {profitInfo.value}
                            </div>
                        </div>
                    );
                })}
                {productsByProfit.length === 0 && !isLoading && (
                    <div className="empty-state">
                        <div className="empty-state-title">No products sold in the last 30 days.</div>
                        <div>Profitability will appear here after sales are made.</div>
                    </div>
                )}
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}
