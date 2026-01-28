-- Convert an existing order into a course order and create a linked course booking for admin testing

DO $$
BEGIN
  UPDATE orders
  SET
    order_kind = 'course',
    fulfillment_method = NULL,
    delivery_method = NULL,
    fulfillment_type = NULL
  WHERE id = '6cc761c5-beae-44d2-8733-c3728209e310';

  IF NOT EXISTS (
    SELECT 1
    FROM course_purchases
    WHERE order_id = '6cc761c5-beae-44d2-8733-c3728209e310'
  ) THEN
    INSERT INTO course_purchases (
      order_id,
      course_slug,
      buyer_email,
      buyer_name,
      buyer_phone,
      invitation_status,
      invited_at,
      course_title,
      course_type,
      selected_package,
      selected_date,
      amount_paid_cents,
      amount_owed_cents,
      payment_kind,
      details
    )
    SELECT
      o.id,
      'professional-acrylic-training',
      o.buyer_email,
      o.buyer_name,
      COALESCE(o.buyer_phone, o.contact_phone),
      'pending',
      NULL,
      'Professional Acrylic Training',
      'in-person',
      NULL,
      NULL,
      0,
      760000,
      'deposit',
      jsonb_build_object(
        'source', 'manual_test',
        'full_price_cents', 760000,
        'deposit_cents', 180000,
        'm_payment_id', o.m_payment_id
      )
    FROM orders o
    WHERE o.id = '6cc761c5-beae-44d2-8733-c3728209e310';
  END IF;
END $$;
