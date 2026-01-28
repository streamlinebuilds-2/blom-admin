-- Allow 'digital' in fulfillment_method
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fulfillment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_fulfillment_method_check 
  CHECK (fulfillment_method = ANY (ARRAY['delivery'::text, 'collection'::text, 'digital'::text])) NOT VALID;

-- Add columns to course_purchases if they don't exist
-- Note: course_purchases table is assumed to exist. If not, create it.
-- Based on previous check, it exists.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_purchases' AND column_name = 'course_title') THEN
        ALTER TABLE course_purchases ADD COLUMN course_title text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_purchases' AND column_name = 'course_type') THEN
        ALTER TABLE course_purchases ADD COLUMN course_type text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_purchases' AND column_name = 'selected_package') THEN
        ALTER TABLE course_purchases ADD COLUMN selected_package text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_purchases' AND column_name = 'selected_date') THEN
        ALTER TABLE course_purchases ADD COLUMN selected_date text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_purchases' AND column_name = 'amount_paid_cents') THEN
        ALTER TABLE course_purchases ADD COLUMN amount_paid_cents integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_purchases' AND column_name = 'payment_kind') THEN
        ALTER TABLE course_purchases ADD COLUMN payment_kind text CHECK (payment_kind IN ('full', 'deposit'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_purchases' AND column_name = 'details') THEN
        ALTER TABLE course_purchases ADD COLUMN details jsonb;
    END IF;
END $$;
