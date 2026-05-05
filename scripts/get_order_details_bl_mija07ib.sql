SELECT 
    o.id as order_id,
    o.order_number,
    o.buyer_name,
    o.buyer_email,
    o.buyer_phone,
    o.shipping_address,
    o.delivery_address,
    o.fulfillment_type,
    o.total_cents,
    o.subtotal_cents,
    o.shipping_cents,
    o.discount_cents,
    o.status,
    o.created_at,
    o.updated_at,
    -- Get order items
    COALESCE(
        json_agg(
            json_build_object(
                'name', oi.name,
                'quantity', oi.quantity,
                'unit_price_cents', oi.unit_price_cents,
                'line_total_cents', oi.line_total_cents,
                'variant', oi.variant,
                'sku', oi.sku
            )
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::json
    ) as order_items
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.order_number = 'BL-MIJA07IB'
GROUP BY 
    o.id, o.order_number, o.buyer_name, o.buyer_email, o.buyer_phone,
    o.shipping_address, o.delivery_address, o.fulfillment_type,
    o.total_cents, o.subtotal_cents, o.shipping_cents, o.discount_cents,
    o.status, o.created_at, o.updated_at;