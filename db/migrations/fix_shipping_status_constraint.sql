-- Fix shipping_status constraint to allow all needed values
-- Drop existing constraint and create new one with correct values

-- Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_shipping_status_check;

-- Create new constraint with all needed values
ALTER TABLE orders ADD CONSTRAINT orders_shipping_status_check 
CHECK (shipping_status IN (
  'pending',
  'ready_for_collection', 
  'ready_for_delivery',
  'shipped',
  'delivered',
  'cancelled',
  'processing',
  'completed',
  'refunded',
  'failed',
  'cancelled_payment'
));

-- Update any existing invalid values to valid ones
UPDATE orders 
SET shipping_status = 'pending'
WHERE shipping_status IS NULL 
   OR shipping_status NOT IN (
     'pending',
     'ready_for_collection', 
     'ready_for_delivery',
     'shipped',
     'delivered',
     'cancelled',
     'processing',
     'completed',
     'refunded',
     'failed',
     'cancelled_payment'
   );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);

-- Verification query
SELECT 
  shipping_status,
  COUNT(*) as count
FROM orders 
GROUP BY shipping_status
ORDER BY shipping_status;