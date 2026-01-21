-- Order BL-MKO198P8: invoice fix (total was wrong; shipping is correct)
-- Run in Supabase SQL Editor.

-- 1) INSPECT: subtotal R740, shipping R120 are correct; total was stored as 740 (missing shipping)
SELECT
  order_number,
  m_payment_id,
  total,
  subtotal_cents,
  shipping_cents,
  discount_cents,
  coupon_code,
  created_at
FROM public.orders
WHERE order_number = 'BL-MKO198P8';

-- 2) FIX: set total to R860 (740 + 120). shipping_cents and discount are correct; only total was wrong.
-- If total is numeric: use 860. If text: use '860'.
UPDATE public.orders
SET total = 860
WHERE order_number = 'BL-MKO198P8';

-- 3) Get m_payment_id for regenerating the invoice (use in the browser console snippet):
-- SELECT m_payment_id FROM public.orders WHERE order_number = 'BL-MKO198P8';
-- → e.g. BL-19BE0A6554C
