-- Delete stock movements for archived orders
-- This removes the specific stock movement records you requested to be completely removed

-- First, let's see what archived orders we have
SELECT id, order_number, m_payment_id, archived, created_at 
FROM orders 
WHERE archived = true 
ORDER BY created_at DESC;

-- Delete stock movements for archived orders
-- This will permanently remove all stock movements that belong to archived orders
DELETE FROM stock_movements 
WHERE order_id IN (
    SELECT id FROM orders WHERE archived = true
);

-- Show the count of deleted movements
SELECT 'Deleted stock movements for archived orders' as action, 
       COUNT(*) as deleted_count
FROM stock_movements 
WHERE order_id NOT IN (
    SELECT id FROM orders WHERE archived = false
);

-- Show remaining stock movements count
SELECT 'Remaining stock movements' as action, 
       COUNT(*) as remaining_count
FROM stock_movements;