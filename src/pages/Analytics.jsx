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
    // Use existing classes for consistency
    if (cents > 0) return { value, color: 'text-green-600' };
    if (cents < 0) return { value, color: 'text-red-600' };
    return { value, color: 'text-gray-500' };
};

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
  const inventory = analytics?.inventory || {};
  
  // 🚨 NEW: Extract all products (for profitability table) and financial losses
  const allTopProducts = analytics?.allTopProducts || []; 
  const losses = analytics?.financialLosses || {};

  // Calculate Net Shipping Profit/Loss: Revenue from delivery minus cost of shipping.
  const deliveryRevenueCents = analytics?.fulfillment?.delivery?.revenueCents || 0;
  const actualShippingCostCents = losses.totalShippingCostCents || 0;
  const netShippingCents = (deliveryRevenueCents || 0) - actualShippingCostCents;

  const netShippingInfo = formatProfit(netShippingCents);
  const netShippingSubtitle = netShippingCents >= 0 ? "Net Profit/Break-even" : "Net Loss";

  // Sort products by Profit (highest first) for the new table
  const productsByProfit = [...allTopProducts]
    .filter(p => p.totalUnitsSold > 0)
    .sort((a, b) => b.estimatedProfitCents - a.estimatedProfitCents);

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
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .header-subtitle {
          color: var(--text-muted);
          font-size: 14px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
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

        .metric-card.revenue::before {
          background: linear-gradient(90deg, #10b981, #34d399);
        }

        .metric-card.orders::before {
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
        }

        .metric-card.value::before {
          background: linear-gradient(90deg, #8b5cf6, #a78bfa);
        }

        .metric-card.inventory::before {
          background: linear-gradient(90deg, #f59e0b, #fbbf24);
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
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
          background: var(--card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }
        .metric-info { flex: 1; }
        .metric-label {
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 500;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
        }
        .metric-subtitle {
          font-size: 13px;
          color: var(--text-muted);
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
          background: var(--card);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          min-height: 400px;
          overflow: hidden;
        }
        .chart-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 20px;
        }

        .top-products-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }

        .product-rank-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: var(--bg);
          border-radius: 12px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
          transition: all 0.2s ease;
        }

        .product-rank-item:hover {
          background: var(--card);
          transform: translateY(-1px);
        }

        .product-rank-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .product-rank-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--card);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: var(--accent);
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .product-rank-details {
          flex: 1;
        }

        .product-rank-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 2px;
        }

        .product-rank-stats {
          font-size: 12px;
          color: var(--text-muted);
        }

        .product-rank-value {
          text-align: right;
        }

        .product-rank-revenue {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 2px;
        }

        .product-rank-orders {
          font-size: 12px;
          color: #16a34a;
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
        }

        .empty-state-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }

        /* 🚨 ADDED STYLES FOR NEW METRICS/TABLE */
        /* Reusing the existing dark shadow/color scheme */
        .metric-card.discount::before { background: linear-gradient(90deg, #ef4444, #f87171); }
        .metric-card.shipping::before { background: linear-gradient(90deg, #1d4ed8, #3b82f6); }
        
        /* ADJUST GRID TO FIT NEW CARDS BETTER */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        /* Full width for the table when container is too small */
        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr; 
          gap: 24px;
          margin-bottom: 32px;
        }
        .chart-card.full-width { 
            grid-column: 1 / -1; 
        }

        /* --- NEW Profitability Table Styles (Reusing existing colors) --- */
        .profitability-table-container {
            margin-top: 20px;
            overflow-x: auto;
        }
        .profit-item {
            display: grid;
            /* Column layout: Name | Units | Revenue | Profit */
            grid-template-columns: 4fr 1.5fr 1.5fr 1.5fr; 
            align-items: center;
            padding: 12px 24px;
            border-bottom: 1px solid var(--border);
            font-size: 14px;
        }
        .profit-item:first-child { 
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            font-size: 12px;
            padding-bottom: 10px;
            padding-top: 0;
            border-bottom: 2px solid var(--border);
        }
        .profit-item:hover {
            background: rgba(110, 193, 255, 0.05); /* Reuse light hover color */
        }
        .profit-col-units, .profit-col-revenue, .profit-col-profit { 
             text-align: right; 
        }
        .profit-col-name { font-weight: 600; }
        .text-green-600 { color: #10b981; } /* Reusing existing green class */
        .text-red-600 { color: #ef4444; }   /* Reusing existing red class */
        .text-gray-500 { color: var(--text-muted); }
        /* --- End NEW Profitability Table Styles --- */
      `}</style>

      <div className="analytics-container">
        <div className="analytics-header">
          <h1 className="header-title">
            <BarChart3 className="w-8 h-8 text-blue-500" />
            Performance Analytics
          </h1>
          <p className="header-subtitle">Detailed insights into your business performance</p>
        </div>

        <div className="metrics-grid">
          <div className="metric-card revenue">
            <MetricCard
              title="Total Revenue"
              value={moneyZAR(stats.totalRevenueCents || 0)}
              subtitle="Last 30 Days"
              icon={DollarSign}
              loading={isLoading}
            />
          </div>
          <div className="metric-card orders">
            <MetricCard
              title="Total Orders"
              value={stats.totalOrders || 0}
              subtitle="Last 30 Days"
              icon={ShoppingCart}
              loading={isLoading}
            />
          </div>
          <div className="metric-card value">
            <MetricCard
              title="Avg Order Value"
              value={moneyZAR(stats.avgOrderValue || 0)}
              subtitle="Per Transaction"
              icon={TrendingUp}
              loading={isLoading}
            />
          </div>
          <div className="metric-card inventory">
            <MetricCard
              title="Inventory Value"
              value={moneyZAR(inventory.totalInventoryValue || 0)}
              subtitle={`${inventory.activeProducts || 0} Active Products`}
              icon={Package}
              loading={isLoading}
            />
          </div>
          
          {/* 🚨 NEW METRIC 1: DISCOUNTS GIVEN */}
          <div className="metric-card discount">
            <MetricCard
              title="Discounts Given"
              value={`-${moneyZAR(losses.totalDiscountsCents || 0)}`}
              subtitle="Coupon and Promo Loss"
              icon={Percent} /* Changed from MinusCircle to Percent for clarity */
              loading={isLoading}
            />
          </div>
          {/* 🚨 NEW METRIC 2: NET SHIPPING (Profit/Loss) */}
          <div className="metric-card shipping">
            <MetricCard
              title="Net Shipping"
              value={netShippingInfo.value}
              subtitle={netShippingSubtitle}
              icon={Truck}
              loading={isLoading}
            />
          </div>
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

          {/* 🚨 REPLACING Top Selling Products List with Profitability Table */}
          {/* The full-width class ensures it spans both columns on large screens */}
          <div className="chart-card full-width">
            <h3 className="chart-title">Product Profitability (Top 10 by Net Profit)</h3>
            <div className="profitability-table-container">
                {/* Header Row */}
                <div className="profit-item profit-header">
                    <div className="profit-col-name">Product Name</div>
                    <div className="profit-col-units">Units Sold</div>
                    <div className="profit-col-revenue">Revenue</div>
                    <div className="profit-col-profit">Net Profit</div>
                </div>
                {/* Data Rows (Filtered and Sorted) */}
                {productsByProfit.slice(0, 10).map((product, i) => {
                    const profitInfo = formatProfit(product.estimatedProfitCents);
                    const revenueDisplay = moneyZAR(product.totalRevenueCents);
                    return (
                        <div key={product.id || i} className="profit-item">
                            <div className="profit-col-name" title={product.name}>
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
                        <div className="empty-state-title">No products sold in the selected period.</div>
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
