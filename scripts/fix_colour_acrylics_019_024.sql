-- SQL Script to fix Colour Acrylics - 019 and Colour Acrylics - 024
-- This will update their information to match the standard Colour Acrylics products

BEGIN;

-- Update Colour Acrylics - 019
UPDATE products
SET
    price = 150.00,
    stock_quantity = 100,
    track_inventory = true,
    description = '<p>Our Colour Acrylic Powder is a professional-grade polymer designed for superior adhesion, smooth application, and exceptional strength. The self-leveling formula ensures a flawless finish with minimal filing required. Available in essential shades for every nail technician.</p>
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
    how_to_use = '<ol>
        <li>Prep natural nail and apply primer</li>
        <li>Dip brush into monomer, then into powder</li>
        <li>Place bead onto nail and guide into place</li>
        <li>Allow to cure before filing</li>
     </ol>',
    inci_ingredients = '<p><strong>INCI Names:</strong><br />
      Polyethylmethacrylate, Polymethyl Methacrylate, Benzoyl Peroxide, Silica</p>
      <p><strong>Key Ingredients:</strong></p>
      <ul>
          <li>Advanced Polymers – for strength and flexibility</li>
          <li>UV Inhibitors – prevents yellowing</li>
          <li>Fine grade powder – for smooth consistency</li>
      </ul>',
    updated_at = NOW()
WHERE name = 'Colour Acrylics - 019';

-- Update Colour Acrylics - 024
UPDATE products
SET
    price = 150.00,
    stock_quantity = 100,
    track_inventory = true,
    description = '<p>Our Colour Acrylic Powder is a professional-grade polymer designed for superior adhesion, smooth application, and exceptional strength. The self-leveling formula ensures a flawless finish with minimal filing required. Available in essential shades for every nail technician.</p>
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
    how_to_use = '<ol>
        <li>Prep natural nail and apply primer</li>
        <li>Dip brush into monomer, then into powder</li>
        <li>Place bead onto nail and guide into place</li>
        <li>Allow to cure before filing</li>
     </ol>',
    inci_ingredients = '<p><strong>INCI Names:</strong><br />
      Polyethylmethacrylate, Polymethyl Methacrylate, Benzoyl Peroxide, Silica</p>
      <p><strong>Key Ingredients:</strong></p>
      <ul>
          <li>Advanced Polymers – for strength and flexibility</li>
          <li>UV Inhibitors – prevents yellowing</li>
          <li>Fine grade powder – for smooth consistency</li>
      </ul>',
    updated_at = NOW()
WHERE name = 'Colour Acrylics - 024';

-- Verification query to check the updates
SELECT 
    name,
    price,
    stock_quantity,
    track_inventory,
    LEFT(description, 50) as description_preview,
    LEFT(how_to_use, 50) as how_to_use_preview,
    LEFT(inci_ingredients, 50) as inci_ingredients_preview
FROM products
WHERE name IN ('Colour Acrylics - 019', 'Colour Acrylics - 024');

COMMIT;