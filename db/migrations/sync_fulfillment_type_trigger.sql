-- Migration: Auto-sync fulfillment_type from fulfillment_method
-- This ensures fulfillment_type is always populated when fulfillment_method is set

-- Create the trigger function
CREATE OR REPLACE FUNCTION sync_fulfillment_type()
RETURNS TRIGGER AS $$
BEGIN
  -- If fulfillment_type is null and fulfillment_method has a value, copy it
  IF NEW.fulfillment_type IS NULL AND NEW.fulfillment_method IS NOT NULL THEN
    NEW.fulfillment_type := NEW.fulfillment_method;
  END IF;

  -- Also sync from delivery_method as fallback
  IF NEW.fulfillment_type IS NULL AND NEW.delivery_method IS NOT NULL THEN
    NEW.fulfillment_type := NEW.delivery_method;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_fulfillment_type_trigger ON orders;

CREATE TRIGGER sync_fulfillment_type_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_fulfillment_type();

-- Verify trigger was created
SELECT
  tgname AS trigger_name,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'sync_fulfillment_type_trigger';

-- Test comment
COMMENT ON FUNCTION sync_fulfillment_type() IS 'Auto-populates fulfillment_type from fulfillment_method or delivery_method';
