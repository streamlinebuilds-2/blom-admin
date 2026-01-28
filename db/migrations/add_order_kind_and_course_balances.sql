-- Separate course orders from product orders
-- Adds orders.order_kind (product|course) and course_purchases balance tracking fields.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_kind'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_kind text DEFAULT 'product';
  END IF;

  UPDATE orders SET order_kind = 'product' WHERE order_kind IS NULL OR order_kind = '';

  BEGIN
    ALTER TABLE orders ALTER COLUMN order_kind SET NOT NULL;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_order_kind_check'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_order_kind_check
      CHECK (order_kind = ANY (ARRAY['product'::text, 'course'::text])) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND indexname = 'idx_orders_order_kind'
  ) THEN
    CREATE INDEX idx_orders_order_kind ON orders(order_kind);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_purchases') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'course_purchases' AND column_name = 'amount_owed_cents'
    ) THEN
      ALTER TABLE course_purchases ADD COLUMN amount_owed_cents integer;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'course_purchases' AND column_name = 'balance_order_id'
    ) THEN
      ALTER TABLE course_purchases ADD COLUMN balance_order_id uuid;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'course_purchases_balance_order_id_fkey'
    ) THEN
      ALTER TABLE course_purchases
        ADD CONSTRAINT course_purchases_balance_order_id_fkey
        FOREIGN KEY (balance_order_id) REFERENCES orders(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;
