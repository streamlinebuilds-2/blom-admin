-- Mark specific test course orders as paid so admin shows Deposit Paid / Paid statuses

DO $$
BEGIN
  -- In-person acrylic deposit: mark linked order paid so admin shows DEPOSIT PAID
  UPDATE orders o
  SET
    status = 'paid',
    payment_status = 'paid',
    paid_at = COALESCE(o.paid_at, now())
  FROM course_purchases cp
  WHERE cp.order_id = o.id
    AND cp.buyer_name = 'Christiaan Steffen'
    AND (cp.course_title = 'Professional Acrylic Training' OR cp.course_slug = 'professional-acrylic-training')
    AND cp.course_type = 'in-person'
    AND (o.payment_status IS DISTINCT FROM 'paid' OR o.status IS DISTINCT FROM 'paid' OR o.paid_at IS NULL);

  -- Online workshop full: mark linked order paid so admin shows PAID
  UPDATE orders o
  SET
    status = 'paid',
    payment_status = 'paid',
    paid_at = COALESCE(o.paid_at, now())
  FROM course_purchases cp
  WHERE cp.order_id = o.id
    AND cp.buyer_name = 'Christiaan Steffen'
    AND (cp.course_title = 'Online Watercolour Workshop' OR cp.course_slug = 'online-watercolour-workshop')
    AND (o.payment_status IS DISTINCT FROM 'paid' OR o.status IS DISTINCT FROM 'paid' OR o.paid_at IS NULL);
END $$;

