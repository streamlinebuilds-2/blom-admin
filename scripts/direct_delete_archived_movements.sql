-- Direct SQL to delete stock movements for archived orders
-- Run this directly in your Supabase SQL editor

-- Show what we're about to delete
SELECT 'Archived Orders' as table_name, COUNT(*) as count FROM orders WHERE archived = true
UNION ALL
SELECT 'Stock Movements to Delete' as table_name, COUNT(*) as count 
FROM stock_movements sm 
JOIN orders o ON sm.order_id = o.id 
WHERE o.archived = true;

-- Delete the stock movements for archived orders
DELETE FROM stock_movements 
WHERE order_id IN (
    SELECT id FROM orders WHERE archived = true
);

-- Show the result
SELECT 'Stock movements deleted for archived orders' as result, 
       COUNT(*) as remaining_movements
FROM stock_movements;