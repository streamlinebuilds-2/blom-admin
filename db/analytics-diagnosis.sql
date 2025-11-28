-- Analytics System Diagnosis Script
-- Run this to check the current state of your analytics system

-- 1. Check if analytics tables exist and have data
SELECT 'Daily Sales Table' as table_name, COUNT(*) as record_count, 
       COALESCE(MIN(date), 'No data') as earliest_date, 
       COALESCE(MAX(date), 'No data') as latest_date
FROM daily_sales

UNION ALL

SELECT 'Product Sales Stats Table' as table_name, COUNT(*) as record_count,
       COALESCE(MIN(created_at)::date::text, 'No data') as earliest_date,
       COALESCE(MAX(updated_at)::date::text, 'No data') as latest_date
FROM product_sales_stats

UNION ALL

SELECT 'Product Name Mapping Table' as table_name, COUNT(*) as record_count,
       COALESCE(MIN(created_at)::date::text, 'No data') as earliest_date,
       COALESCE(MAX(updated_at)::date::text, 'No data') as latest_date
FROM product_name_mapping

UNION ALL

SELECT 'Stock Movements Table' as table_name, COUNT(*) as record_count,
       COALESCE(MIN(created_at)::date::text, 'No data') as earliest_date,
       COALESCE(MAX(created_at)::date::text, 'No data') as latest_date
FROM stock_movements;

-- 2. Check current orders and their payment status
SELECT 
  status,
  payment_status,
  COUNT(*) as order_count,
  COALESCE(SUM(total_cents), 0) as total_value_cents,
  COALESCE(AVG(total_cents), 0) as avg_order_value_cents
FROM orders 
GROUP BY status, payment_status
ORDER BY status, payment_status;

-- 3. Check sample order items with names
SELECT 
  o.id as order_id,
  o.status,
  o.payment_status,
  oi.product_id,
  oi.name as item_name,
  oi.quantity,
  oi.unit_price_cents,
  oi.line_total_cents
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.payment_status = 'paid'
ORDER BY o.created_at DESC
LIMIT 10;

-- 4. Check if product mappings exist
SELECT 
  order_name,
  inventory_name,
  match_confidence,
  is_active
FROM product_name_mapping
WHERE is_active = true
ORDER BY match_confidence DESC
LIMIT 10;

-- 5. Check stock movements with matching info
SELECT 
  sm.created_at,
  p.name as product_name,
  sm.movement_type,
  sm.quantity,
  sm.matching_method,
  sm.confidence_score,
  sm.notes
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
ORDER BY sm.created_at DESC
LIMIT 10;

-- 6. Check analytics data aggregation
SELECT 
  date,
  total_sales_cents,
  total_orders,
  total_items_sold
FROM daily_sales
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;