-- Check if product_reviews table exists and its columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'product_reviews';

-- Check if contacts table exists and its columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contacts';

-- Check if orders table exists and its RLS policies
SELECT *
FROM pg_policies
WHERE tablename = 'orders';

-- Check RLS status for all tables
SELECT
    relname AS table_name,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN ('product_reviews', 'contacts', 'orders');