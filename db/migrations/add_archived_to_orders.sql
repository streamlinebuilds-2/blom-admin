-- Add archived column to orders table for order archiving functionality
-- Migration created: 2025-11-22

ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Create an index for better performance when filtering archived orders
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(archived);

-- Add a comment to document the column
COMMENT ON COLUMN orders.archived IS 'Whether the order has been archived and should be hidden from main orders list';