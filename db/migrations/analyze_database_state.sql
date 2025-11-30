-- PHASE 1: Database State Analysis
-- This script analyzes the current database state to understand the exact issues

-- Step 1: Check Data Types for Orders and Order Items
SELECT 
  'orders' as table_name,
  'id' as column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'id'

UNION ALL

SELECT 
  'order_items' as table_name,
  'order_id' as column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' AND column_name = 'order_id'

UNION ALL

SELECT 
  'order_items' as table_name,
  'product_id' as column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'order_items' AND column_name = 'product_id';

-- Step 2: Check the specific problematic order
SELECT 
  'ORDER_FOUND' as check_type,
  id::text as order_id,
  order_number,
  m_payment_id,
  status,
  payment_status,
  paid_at::text,
  total_cents::text as total_amount,
  pg_typeof(id) as id_data_type
FROM public.orders 
WHERE order_number = 'BL-MIJ9P3QJ'
  OR m_payment_id = 'BL-MIJ9P3QJ'
  OR id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3'::uuid
  OR id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3'::text;

-- Step 3: Check order items with null product_id
SELECT 
  'NULL_PRODUCT_ITEMS' as check_type,
  oi.id as item_id,
  oi.product_name,
  oi.sku,
  oi.quantity,
  oi.unit_price,
  oi.order_id::text as order_id_text,
  oi.product_id,
  o.order_number
FROM public.order_items oi
LEFT JOIN public.orders o ON o.id::text = oi.order_id::text
WHERE o.order_number = 'BL-MIJ9P3QJ'
  AND oi.product_id IS NULL;