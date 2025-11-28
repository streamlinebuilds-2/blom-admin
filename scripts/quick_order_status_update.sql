-- QUICK ORDER STATUS UPDATE - BL-MIJA07IB
-- This will mark the specific order as "paid"

-- ✅ METHOD 1: Direct SQL Update (Recommended for immediate update)
UPDATE orders 
SET 
    status = 'paid',
    updated_at = NOW(),
    paid_at = NOW()
WHERE order_number = 'BL-MIJA07IB';

-- ✅ Verify the change
SELECT order_number, status, updated_at, paid_at 
FROM orders 
WHERE order_number = 'BL-MIJA07IB';

-- 🔧 METHOD 2: Using RPC Function (if the function exists)
-- Uncomment this if you've run the migration that creates the RPC function:
-- SELECT * FROM update_order_status(
--     (SELECT id FROM orders WHERE order_number = 'BL-MIJA07IB'), 
--     'paid', 
--     NOW()
-- );

-- 🔧 METHOD 3: More comprehensive update (clears other timestamps)
UPDATE orders 
SET 
    status = 'paid',
    updated_at = NOW(),
    paid_at = NOW(),
    order_packed_at = NULL,  -- Clear any previous packed timestamp
    order_out_for_delivery_at = NULL,  -- Clear delivery timestamps
    fulfilled_at = NULL  -- Clear fulfillment timestamp
WHERE order_number = 'BL-MIJA07IB';

-- 🧪 TESTING THE COMPLETE ORDER FLOW
-- After marking as "paid", you can test the "Mark as Packed" functionality:
-- 1. Go to the order in the admin interface
-- 2. Click "Mark as Packed" button
-- 3. This will test the Netlify function and webhook system

-- 🔍 VERIFICATION QUERIES
-- Check if the update worked:
SELECT 
    order_number,
    status,
    paid_at,
    updated_at,
    CASE 
        WHEN status = 'paid' THEN '✅ Ready for "Mark as Packed" test'
        ELSE '❌ Status not updated correctly'
    END as test_status
FROM orders 
WHERE order_number = 'BL-MIJA07IB';