import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../components/supabaseClient';

// Helper to format currency
const formatRands = (cents) => {
  if (cents == null) return 'R0.00';
  return `R${(cents / 100).toFixed(2)}`;
};

export default function Finance() {
  // Fetch all paid orders and their items
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['financeReport'],
    queryFn: async () => {
      // Get all paid orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_cents')
        .eq('status', 'paid');
      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return { orders: [], orderItems: [], products: [] };
      }

      const orderIds = orders.map(o => o.id);

      // Get all order items for those paid orders
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, qty')
        .in('order_id', orderIds);
      if (itemsError) throw itemsError;

      // Get all products to find their cost
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, cost_price_cents');
      if (productsError) throw productsError;

      return { orders, orderItems: orderItems || [], products: products || [] };
    },
  });

  // Calculate stats once data is loaded
  const stats = useMemo(() => {
    if (!reportData) return { revenue: 0, cogs: 0, profit: 0, ordersCount: 0 };

    const { orders, orderItems, products } = reportData;
    const productCostMap = new Map(products.map(p => [p.id, p.cost_price_cents || 0]));

    // 1. Calculate Revenue
    const totalRevenue = orders.reduce((acc, order) => acc + (order.total_cents || 0), 0);

    // 2. Calculate Cost of Goods Sold (COGS)
    const totalCogs = orderItems.reduce((acc, item) => {
      const cost = productCostMap.get(item.product_id) || 0;
      const quantity = item.qty || 0;
      return acc + (cost * quantity);
    }, 0);

    // 3. Calculate Profit
    const totalProfit = totalRevenue - totalCogs;

    return {
      revenue: totalRevenue,
      cogs: totalCogs,
      profit: totalProfit,
      ordersCount: orders.length,
    };
  }, [reportData]);

  if (isLoading) {
    return (
      <div style={{ padding: '32px', color: 'var(--text)' }}>
        Loading financial report...
      </div>
    );
  }

  return (
    <>
      <style>{`
        .finance-page {
          padding: 16px;
          color: var(--text);
        }

        @media (min-width: 768px) {
          .finance-page {
            padding: 32px;
          }
        }

        .finance-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .finance-title {
            font-size: 30px;
          }
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }

        @media (min-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }
        }

        .stat-card {
          background: var(--card);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        @media (min-width: 768px) {
          .stat-card {
            padding: 24px;
          }
        }

        .stat-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          word-break: break-word;
        }

        @media (min-width: 768px) {
          .stat-value {
            font-size: 30px;
          }
        }

        .section-card {
          background: var(--card);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        @media (min-width: 768px) {
          .section-card {
            padding: 24px;
          }
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        @media (min-width: 768px) {
          .section-title {
            font-size: 20px;
          }
        }

        .placeholder-box {
          height: 256px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 14px;
        }
      `}</style>

      <div className="finance-page">
        <h1 className="finance-title">Finance Report</h1>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3 className="stat-title">Total Revenue</h3>
            <p className="stat-value">{formatRands(stats.revenue)}</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-title">Total Costs (COGS)</h3>
            <p className="stat-value">{formatRands(stats.cogs)}</p>
          </div>
          <div className="stat-card">
            <h3 className="stat-title">Gross Profit</h3>
            <p className="stat-value">{formatRands(stats.profit)}</p>
          </div>
        </div>

        {/* Charts placeholder */}
        <div className="section-card">
          <h2 className="section-title">Sales Over Time</h2>
          <div className="placeholder-box">
            (Charts coming soon)
          </div>
        </div>
      </div>
    </>
  );
}
