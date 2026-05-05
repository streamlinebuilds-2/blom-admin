-- Fix all sign-up coupons (BLOM####-XXXXXX pattern) to have correct settings
-- They should be:
-- - type: 'percentage'
-- - value: 10 (for 10%)
-- - max_uses: 1 (single use only)
-- - is_active: true

UPDATE coupons
SET 
  type = 'percentage',
  value = 10,
  max_uses = 1,
  is_active = true
WHERE code LIKE 'BLOM____-%'
  AND (
    type != 'percentage' 
    OR value != 10 
    OR max_uses != 1
    OR value IS NULL
    OR value = 0
  );

-- Display results
SELECT 
  code,
  type,
  value,
  max_uses,
  is_active,
  used_count,
  created_at
FROM coupons
WHERE code LIKE 'BLOM____-%'
ORDER BY created_at DESC;
