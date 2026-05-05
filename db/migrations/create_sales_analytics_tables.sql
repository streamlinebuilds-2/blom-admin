-- Create Sales Analytics Tables for Order Processing
-- This migration creates the tables needed for real-time sales tracking

-- 1. Daily Sales Summary Table
CREATE TABLE IF NOT EXISTS daily_sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date UNIQUE NOT NULL,
  total_sales_cents bigint DEFAULT 0,
  total_orders integer DEFAULT 0,
  total_items_sold integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Product Sales Statistics Table
CREATE TABLE IF NOT EXISTS product_sales_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name text NOT NULL,
  total_quantity_sold integer DEFAULT 0,
  total_revenue_cents bigint DEFAULT 0,
  order_count integer DEFAULT 0,
  last_sold_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Best Selling Products View (for frontend queries)
CREATE OR REPLACE VIEW best_selling_products AS
SELECT 
  product_name,
  total_quantity_sold,
  total_revenue_cents,
  order_count,
  last_sold_at,
  ROUND(total_revenue_cents / 100.0, 2) as total_revenue_rands,
  CASE 
    WHEN order_count > 0 THEN total_revenue_cents / order_count 
    ELSE 0 
  END as average_order_value_cents,
  ROUND((total_revenue_cents / 100.0) / CASE WHEN order_count > 0 THEN order_count ELSE 1 END, 2) as average_order_value_rands
FROM product_sales_stats
WHERE total_quantity_sold > 0
ORDER BY total_quantity_sold DESC, total_revenue_cents DESC;

-- 4. Sales Summary View (for dashboard)
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
  ds.date,
  ds.total_sales_cents,
  ds.total_sales_cents / 100.0 as total_sales_rands,
  ds.total_orders,
  ds.total_items_sold,
  CASE 
    WHEN ds.total_orders > 0 THEN ds.total_sales_cents / ds.total_orders 
    ELSE 0 
  END as average_order_value_cents,
  ROUND((ds.total_sales_cents / 100.0) / CASE WHEN ds.total_orders > 0 THEN ds.total_orders ELSE 1 END, 2) as average_order_value_rands
FROM daily_sales ds
ORDER BY ds.date DESC;

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(date);
CREATE INDEX IF NOT EXISTS idx_product_sales_stats_name ON product_sales_stats(product_name);
CREATE INDEX IF NOT EXISTS idx_product_sales_stats_revenue ON product_sales_stats(total_revenue_cents DESC);
CREATE INDEX IF NOT EXISTS idx_product_sales_stats_quantity ON product_sales_stats(total_quantity_sold DESC);

-- 6. Function to calculate sales statistics for a date range
CREATE OR REPLACE FUNCTION get_sales_stats(date_range_start date, date_range_end date)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  total_sales bigint;
  total_orders integer;
  total_items integer;
  best_sellers jsonb;
BEGIN
  -- Calculate overall stats
  SELECT 
    COALESCE(SUM(total_sales_cents), 0),
    COALESCE(SUM(total_orders), 0),
    COALESCE(SUM(total_items_sold), 0)
  INTO total_sales, total_orders, total_items
  FROM daily_sales 
  WHERE date BETWEEN date_range_start AND date_range_end;
  
  -- Get best sellers for the period
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_name', product_name,
      'quantity_sold', total_quantity_sold,
      'revenue_cents', total_revenue_cents,
      'revenue_rands', ROUND(total_revenue_cents / 100.0, 2),
      'order_count', order_count
    )
  )
  INTO best_sellers
  FROM product_sales_stats
  WHERE last_sold_at::date BETWEEN date_range_start AND date_range_end
  ORDER BY total_quantity_sold DESC, total_revenue_cents DESC
  LIMIT 10;
  
  -- Build result
  result := jsonb_build_object(
    'period', jsonb_build_object(
      'start', date_range_start,
      'end', date_range_end
    ),
    'totals', jsonb_build_object(
      'sales_cents', total_sales,
      'sales_rands', ROUND(total_sales / 100.0, 2),
      'orders', total_orders,
      'items', total_items,
      'avg_order_value_cents', CASE WHEN total_orders > 0 THEN total_sales / total_orders ELSE 0 END,
      'avg_order_value_rands', ROUND((total_sales / 100.0) / CASE WHEN total_orders > 0 THEN total_orders ELSE 1 END, 2)
    ),
    'best_sellers', COALESCE(best_sellers, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. Grant permissions (adjust as needed for your setup)
GRANT SELECT ON daily_sales TO authenticated;
GRANT SELECT ON product_sales_stats TO authenticated;
GRANT SELECT ON best_selling_products TO authenticated;
GRANT SELECT ON sales_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_stats(date, date) TO authenticated;