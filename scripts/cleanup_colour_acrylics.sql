-- SQL script to clean up Colour Acrylics product list
-- This script removes unwanted products and adds missing ones

-- 1. Delete the "Customer Choice" product (not a real product)
DELETE FROM products
WHERE name = 'Colour Acrylics - Customer Choice (Order BL-MIJ9P3QJ)';

-- 2. Delete the "test" product (not a real product)
DELETE FROM products
WHERE name = 'Colour Acrylics - test';

-- 3. Add missing products that should be in the range
-- Missing: 024
INSERT INTO products (
    name, 
    description, 
    short_description, 
    price, 
    stock, 
    cost_price, 
    track_inventory, 
    is_active, 
    created_at, 
    updated_at
) VALUES (
    'Colour Acrylics - 024',
    '<p>Our Colour Acrylic Powder is a professional-grade polymer designed for superior adhesion, smooth application, and exceptional strength. The self-leveling formula ensures a flawless finish with minimal filing required. Available in essential shades for every nail technician.</p>
     <h3>Features & Benefits</h3>
     <ul>
         <li>Superior adhesion and longevity</li>
         <li>Self-leveling buttery consistency</li>
         <li>Non-yellowing formula</li>
         <li>Medium setting time for perfect control</li>
         <li>Bubble-free application</li>
     </ul>
     <h3>Product Details</h3>
     <ul>
         <li><strong>Size:</strong> 15g</li>
         <li><strong>Shelf Life:</strong> 24 months</li>
         <li><strong>Claims:</strong> HEMA-Free, Professional Grade, Non-Yellowing</li>
     </ul>',
    'Professional grade polymer powder for perfect sculpting and strength.',
    150.00, 
    100, 
    100.00, 
    true, 
    true, 
    NOW(), 
    NOW()
);

-- 4. Verify the final list
SELECT name, stock, price, cost_price
FROM products
WHERE name LIKE 'Colour Acrylics -%'
ORDER BY name;