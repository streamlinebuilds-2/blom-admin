-- Create variant-aware stock deduction function
-- This function handles automatic stock deduction when order is marked as paid

CREATE OR REPLACE FUNCTION deduct_variant_stock_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  order_item RECORD;
  product_record RECORD;
  variant_product RECORD;
  deduction_amount int;
BEGIN
  -- Only proceed if status changed to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Set paid timestamp
    NEW.paid_at = NOW();
    
    -- Process each item in the order
    FOR order_item IN 
      SELECT * FROM order_items WHERE order_id = NEW.id
    LOOP
      -- Find the product that was ordered
      SELECT * INTO product_record 
      FROM products 
      WHERE id = order_item.product_id;
      
      IF product_record IS NULL THEN
        RAISE WARNING 'Product not found for order item: %', order_item.product_id;
        CONTINUE;
      END IF;
      
      -- If this is a variant product, deduct from the variant
      IF product_record.is_variant = true THEN
        -- Deduct from the variant product directly
        deduction_amount := COALESCE(order_item.quantity, 1);
        
        UPDATE products 
        SET 
          stock = GREATEST(0, stock - deduction_amount),
          stock_qty = GREATEST(0, stock_qty - deduction_amount),
          is_active = CASE 
            WHEN GREATEST(0, stock - deduction_amount) > 0 THEN is_active
            ELSE false
          END
        WHERE id = product_record.id;
        
        -- Log the stock movement
        INSERT INTO stock_movements (
          product_id,
          movement_type,
          quantity,
          reason,
          reference_id,
          reference_type,
          created_at
        ) VALUES (
          product_record.id,
          'sale',
          -deduction_amount,
          'Order paid - variant stock deduction',
          NEW.id,
          'order',
          NOW()
        );
        
      ELSIF product_record.has_variants = true THEN
        -- If parent product has variants but we're ordering the parent, 
        -- we need to determine which variant was ordered
        -- This handles legacy orders where variant info might be in order_items.variant
        
        IF order_item.variant IS NOT NULL AND order_item.variant != '' THEN
          -- Find the specific variant product
          SELECT * INTO variant_product
          FROM products 
          WHERE 
            variant_of_product = product_record.id 
            AND variant_name = order_item.variant
          LIMIT 1;
          
          IF variant_product IS NOT NULL THEN
            deduction_amount := COALESCE(order_item.quantity, 1);
            
            UPDATE products 
            SET 
              stock = GREATEST(0, stock - deduction_amount),
              stock_qty = GREATEST(0, stock_qty - deduction_amount),
              is_active = CASE 
                WHEN GREATEST(0, stock - deduction_amount) > 0 THEN is_active
                ELSE false
              END
            WHERE id = variant_product.id;
            
            -- Log the stock movement
            INSERT INTO stock_movements (
              product_id,
              movement_type,
              quantity,
              reason,
              reference_id,
              reference_type,
              created_at
            ) VALUES (
              variant_product.id,
              'sale',
              -deduction_amount,
              'Order paid - variant stock deduction (legacy)',
              NEW.id,
              'order',
              NOW()
            );
          END IF;
        END IF;
        
      ELSE
        -- Standard product without variants
        deduction_amount := COALESCE(order_item.quantity, 1);
        
        UPDATE products 
        SET 
          stock = GREATEST(0, stock - deduction_amount),
          stock_qty = GREATEST(0, stock_qty - deduction_amount),
          is_active = CASE 
            WHEN GREATEST(0, stock - deduction_amount) > 0 THEN is_active
            ELSE false
          END
        WHERE id = product_record.id;
        
        -- Log the stock movement
        INSERT INTO stock_movements (
          product_id,
          movement_type,
          quantity,
          reason,
          reference_id,
          reference_type,
          created_at
        ) VALUES (
          product_record.id,
          'sale',
          -deduction_amount,
          'Order paid - stock deduction',
          NEW.id,
          'order',
          NOW()
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_deduct_variant_stock_on_payment ON orders;
CREATE TRIGGER trigger_deduct_variant_stock_on_payment
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION deduct_variant_stock_on_payment();

-- Create function to handle variant stock adjustment
CREATE OR REPLACE FUNCTION adjust_variant_stock()
RETURNS TABLE(
  product_id uuid,
  product_name text,
  variant_name text,
  old_stock int,
  new_stock int,
  adjustment int,
  success boolean
) AS $$
DECLARE
  product_record RECORD;
  target_product_id uuid;
  adjustment_amount int;
  current_stock int;
BEGIN
  -- This function will be called by the stock adjustment system
  -- It handles both regular products and variants
  
  FOR product_record IN 
    SELECT 
      p.*,
      COALESCE(pp.name, p.name) as parent_product_name
    FROM products p
    LEFT JOIN products pp ON p.parent_product_id = pp.id
    WHERE p.id = target_product_id
  LOOP
    current_stock := product_record.stock;
    
    -- Perform the adjustment
    UPDATE products 
    SET 
      stock = GREATEST(0, stock + adjustment_amount),
      stock_qty = GREATEST(0, stock_qty + adjustment_amount)
    WHERE id = target_product_id;
    
    -- Log the movement
    INSERT INTO stock_movements (
      product_id,
      movement_type,
      quantity,
      reason,
      created_at
    ) VALUES (
      target_product_id,
      CASE 
        WHEN adjustment_amount > 0 THEN 'restock'
        WHEN adjustment_amount < 0 THEN 'adjustment'
        ELSE 'no_change'
      END,
      adjustment_amount,
      'Manual stock adjustment via admin interface',
      NOW()
    );
    
    -- Return result
    RETURN QUERY SELECT 
      product_record.id,
      product_record.parent_product_name,
      COALESCE(product_record.variant_name, 'Standard'),
      current_stock,
      product_record.stock + adjustment_amount,
      adjustment_amount,
      true;
  END LOOP;
END;
$$ LANGUAGE plpgsql;