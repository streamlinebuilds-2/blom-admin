-- Direct Order Status Update Script
-- This updates the specific order that was failing

UPDATE orders 
SET 
  status = 'packed',
  updated_at = NOW(),
  order_packed_at = NOW()
WHERE id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3';

-- Verify the update
SELECT 
  id,
  status,
  updated_at,
  order_packed_at,
  order_out_for_delivery_at,
  fulfilled_at
FROM orders 
WHERE id = '4fc6796e-3b62-4890-8d8d-0e645f6599a3';