-- Complete migration to fix specials table schema
-- Run this in your Supabase SQL editor to fix the discount_value column issue

-- Drop existing specials table and recreate with correct schema
DROP TABLE IF EXISTS public.specials CASCADE;

-- Create specials table with proper schema including discount_value column
CREATE TABLE public.specials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  scope text NOT NULL DEFAULT 'product' CHECK (scope IN ('product', 'bundle', 'sitewide')),
  target_ids uuid[] DEFAULT '{}',
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'amount_off', 'fixed_price')),
  discount_value numeric NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('active', 'scheduled', 'expired')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_specials_status ON public.specials(status);
CREATE INDEX IF NOT EXISTS idx_specials_starts_at ON public.specials(starts_at);
CREATE INDEX IF NOT EXISTS idx_specials_ends_at ON public.specials(ends_at);
CREATE INDEX IF NOT EXISTS idx_specials_scope ON public.specials(scope);

-- Enable Row Level Security
ALTER TABLE public.specials ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for admin access
DROP POLICY IF EXISTS "authenticated read all specials" ON public.specials;
CREATE POLICY "authenticated read all specials" 
ON public.specials FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated insert specials" ON public.specials;
CREATE POLICY "authenticated insert specials" 
ON public.specials FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated update specials" ON public.specials;
CREATE POLICY "authenticated update specials" 
ON public.specials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated delete specials" ON public.specials;
CREATE POLICY "authenticated delete specials" 
ON public.specials FOR DELETE TO authenticated USING (true);

-- Allow public read access to active specials (for customer site)
DROP POLICY IF EXISTS "anon read active specials" ON public.specials;
CREATE POLICY "anon read active specials"
ON public.specials FOR SELECT TO anon
USING (
  status = 'active'
  AND starts_at <= NOW()
  AND ends_at > NOW()
);

-- Create function to compute special status based on dates
CREATE OR REPLACE FUNCTION public.compute_special_status(
  p_starts_at timestamptz,
  p_ends_at timestamptz
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE AS $$
BEGIN
  IF p_ends_at <= NOW() THEN
    RETURN 'expired';
  ELSIF p_starts_at > NOW() THEN
    RETURN 'scheduled';
  ELSE
    RETURN 'active';
  END IF;
END;
$$;

-- Create trigger to automatically update status based on dates
CREATE OR REPLACE FUNCTION public.update_special_status()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.status := public.compute_special_status(NEW.starts_at, NEW.ends_at);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_special_status ON public.specials;
CREATE TRIGGER trigger_update_special_status
  BEFORE INSERT OR UPDATE ON public.specials
  FOR EACH ROW
  EXECUTE FUNCTION update_special_status();

-- Verify the table was created correctly
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'specials'
ORDER BY ordinal_position;