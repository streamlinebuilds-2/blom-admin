-- Remove old demo/test bookings and seed fresh demo bookings for UI testing

-- 1) Remove the specific old bookings listed
DELETE FROM course_purchases
WHERE (
  buyer_email = 'maximussteffen@gmail.com'
  AND course_slug IN ('watercolour-christmas', 'blom-flower-workshop')
)
OR (
  buyer_email = 'magielpieter@gmail.com'
  AND course_slug IN ('-watercolour-christmas-workshop')
);

-- 2) Remove previous demo seed data (safe to re-run)
DELETE FROM course_purchases
WHERE details->>'seed' = 'demo';

DELETE FROM orders
WHERE order_number LIKE 'DEMO-COURSE-%'
   OR invoice_url LIKE 'https://example.com/receipt-demo-%';

-- 3) Seed demo orders + course_purchases
INSERT INTO orders (id, order_number, status, payment_status, total_cents, buyer_name, buyer_email, fulfillment_method, invoice_url, created_at, placed_at, paid_at)
VALUES
  ('demo-course-order-0001', 'DEMO-COURSE-0001', 'paid', 'paid', 200000, 'Alicia Demo', 'alicia.demo@example.com', 'delivery', 'https://example.com/receipt-demo-0001.pdf', now(), now(), now()),
  ('demo-course-order-0002', 'DEMO-COURSE-0002', 'paid', 'paid', 720000, 'Alicia Demo', 'alicia.demo@example.com', 'delivery', 'https://example.com/receipt-demo-0002.pdf', now(), now(), now()),
  ('demo-course-order-0003', 'DEMO-COURSE-0003', 'paid', 'paid', 499900, 'Ben Tester', 'ben.tester@example.com', 'delivery', 'https://example.com/receipt-demo-0003.pdf', now(), now(), now()),
  ('demo-course-order-0004', 'DEMO-COURSE-0004', 'paid', 'paid', 999900, 'Cara Example', 'cara.example@example.com', 'delivery', 'https://example.com/receipt-demo-0004.pdf', now(), now(), now()),
  ('demo-course-order-0005', 'DEMO-COURSE-0005', 'paid', 'paid', 250000, 'Dylan Sample', 'dylan.sample@example.com', 'delivery', 'https://example.com/receipt-demo-0005.pdf', now(), now(), now()),
  ('demo-course-order-0006', 'DEMO-COURSE-0006', 'paid', 'paid', 799900, 'Emma Demo', 'emma.demo@example.com', 'delivery', 'https://example.com/receipt-demo-0006.pdf', now(), now(), now());

INSERT INTO course_purchases (
  order_id,
  course_slug,
  buyer_email,
  buyer_name,
  buyer_phone,
  invitation_status,
  invited_at,
  created_at,
  course_title,
  course_type,
  selected_package,
  selected_date,
  amount_paid_cents,
  payment_kind,
  details
)
VALUES
  (
    'demo-course-order-0001',
    'professional-acrylic-training',
    'alicia.demo@example.com',
    'Alicia Demo',
    '+27 82 111 2222',
    'sent',
    now(),
    now() - interval '2 days',
    'Professional Acrylic Training',
    'in-person',
    'Deposit',
    'March 15-19, 2026',
    200000,
    'deposit',
    jsonb_build_object('seed','demo','note','In-person deposit booking')
  ),
  (
    'demo-course-order-0002',
    'professional-acrylic-training',
    'alicia.demo@example.com',
    'Alicia Demo',
    '+27 82 111 2222',
    'pending',
    NULL,
    now() - interval '1 day',
    'Professional Acrylic Training',
    'in-person',
    'Standard',
    'March 15-19, 2026',
    720000,
    'full',
    jsonb_build_object('seed','demo','note','In-person full payment booking')
  ),
  (
    'demo-course-order-0003',
    'advanced-gel-design',
    'ben.tester@example.com',
    'Ben Tester',
    '+27 83 333 4444',
    'sent',
    now(),
    now() - interval '6 days',
    'Advanced Gel Design Workshop',
    'in-person',
    'VIP',
    'April 12-13, 2026',
    499900,
    'full',
    jsonb_build_object('seed','demo','note','In-person workshop booking')
  ),
  (
    'demo-course-order-0004',
    'online-acrylic-masterclass',
    'cara.example@example.com',
    'Cara Example',
    NULL,
    'sent',
    now(),
    now() - interval '10 days',
    'Online Acrylic Masterclass',
    'online',
    'Full Access',
    NULL,
    999900,
    'full',
    jsonb_build_object('seed','demo','note','Online course booking')
  ),
  (
    'demo-course-order-0005',
    'online-nail-theory-basics',
    'dylan.sample@example.com',
    'Dylan Sample',
    NULL,
    'failed',
    now() - interval '1 day',
    now() - interval '8 days',
    'Nail Theory Basics (Online)',
    'online',
    'Standard',
    NULL,
    250000,
    'full',
    jsonb_build_object('seed','demo','note','Online course booking (invite failed)')
  ),
  (
    'demo-course-order-0006',
    'watercolour-christmas',
    'emma.demo@example.com',
    'Emma Demo',
    '+27 84 555 6666',
    'pending',
    NULL,
    now() - interval '3 days',
    'Watercolour Christmas Workshop',
    'in-person',
    'Standard',
    'May 10-11, 2026',
    799900,
    'full',
    jsonb_build_object('seed','demo','note','In-person seasonal workshop booking')
  );
