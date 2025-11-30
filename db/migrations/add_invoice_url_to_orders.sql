-- Add invoice_url column to orders table for storing invoice links
-- Migration created: 2025-11-29

ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- Create an index for better performance when querying orders by invoice URL
CREATE INDEX IF NOT EXISTS idx_orders_invoice_url ON orders(invoice_url);

-- Add a comment to document the column purpose

