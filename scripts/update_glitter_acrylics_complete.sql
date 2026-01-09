-- Comprehensive SQL script to update all Glitter Acrylic variations
-- This script updates the three specific Glitter Acrylic products with detailed information

-- First, let's update Glitter Acrylic - Mienks
UPDATE products
SET
    price = 150,
    stock_quantity = 100,
    track_inventory = TRUE,
    is_active = TRUE,
    sku = 'ACR-445220',
    
    -- Short description for cards
    description = 'Opalescent crushed-ice acrylic blend with prismatic shimmer.',
    
    -- Full overview with features
    overview = 'This glitter-acrylic blend looks like a soft, opalescent crushed-ice mix — a dreamy combination of translucent and iridescent shards suspended in clear acrylic. The mix features fine to medium reflective flakes that shift between white-silver, icy blue, and lilac hues, giving it a prismatic, pearl-crystal effect.',
    
    -- Features as text array
    features = ARRAY[
        'Opalescent crushed-ice effect',
        'Prismatic pearl-crystal finish',
        'Fine to medium reflective flakes',
        'White-silver, icy blue, and lilac hues',
        'Cool-toned base with sparkle',
        'Smooth application with dimensional depth',
        'Reflects light like crushed diamonds',
        'Perfect for encapsulated designs'
    ]::text[],
    
    -- How to use instructions
    how_to_use = '1. Prep natural nail and apply primer\n2. Dip brush into monomer, then into powder\n3. Place bead onto nail and guide into place\n4. Allow to cure before filing',
    
    -- INCI ingredients
    inci_ingredients = 'Water (Aqua)',
    
    -- Key ingredients as text array
    key_ingredients = ARRAY[
        'Polymethyl Methacrylate – creates strong structure',
        'Glitter Particles – adds dimensional sparkle',
        'Iridescent Pigments – creates color-shifting effect',
        'Professional grade – salon quality results'
    ]::text[],
    
    -- Product details
    size = '56g',
    shelf_life = '12 months',
    
    -- Claims as text array
    claims = ARRAY[
        'Professional Grade',
        'Prismatic Effect',
        'Dimensional Sparkle'
    ]::text[],
    
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Mienks'
    AND (sku IS NULL OR sku = '' OR sku = 'ACR-445220');

-- Update Glitter Acrylic - Funfetti
UPDATE products
SET
    price = 150,
    stock_quantity = 100,
    track_inventory = TRUE,
    is_active = TRUE,
    sku = 'ACR-163655',
    
    -- Short description for cards
    description = 'Colorful confetti-style glitter acrylic with multi-colored sparkles.',
    
    -- Full overview with features
    overview = 'A vibrant, festive glitter acrylic that resembles colorful confetti. This blend features a mix of bright, multi-colored glitter particles in various shapes and sizes, creating a playful, celebratory effect. Perfect for special occasions, holidays, or when you want to add a pop of color and fun to your nail designs.',
    
    -- Features as text array
    features = ARRAY[
        'Multi-colored confetti glitter',
        'Vibrant and festive appearance',
        'Various glitter shapes and sizes',
        'Playful celebratory effect',
        'Perfect for special occasions',
        'Adds pop of color to designs',
        'Eye-catching sparkle',
        'Great for holiday themes'
    ]::text[],
    
    -- How to use instructions
    how_to_use = '1. Prep natural nail and apply primer\n2. Dip brush into monomer, then into powder\n3. Place bead onto nail and guide into place\n4. Allow to cure before filing',
    
    -- INCI ingredients
    inci_ingredients = 'Water (Aqua)',
    
    -- Key ingredients as text array
    key_ingredients = ARRAY[
        'Polymethyl Methacrylate – creates strong structure',
        'Multi-colored Glitter Particles – vibrant confetti effect',
        'Color Pigments – bright, festive colors',
        'Professional grade – salon quality results'
    ]::text[],
    
    -- Product details
    size = '56g',
    shelf_life = '12 months',
    
    -- Claims as text array
    claims = ARRAY[
        'Professional Grade',
        'Vibrant Colors',
        'Festive Design'
    ]::text[],
    
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Funfetti'
    AND (sku IS NULL OR sku = '' OR sku = 'ACR-163655');

-- Update Glitter Acrylic - Frozen
UPDATE products
SET
    price = 150,
    stock_quantity = 100,
    track_inventory = TRUE,
    is_active = TRUE,
    sku = 'ACR-304103',
    
    -- Short description for cards
    description = 'Icy blue and silver glitter acrylic with frosted finish.',
    
    -- Full overview with features
    overview = 'Inspired by winter wonderlands, this glitter acrylic features a cool, icy blue base with silver glitter particles that create a frosted, snow-like effect. The blend includes fine and medium silver flakes that resemble ice crystals, giving nails a chilly, ethereal appearance. Perfect for winter themes, frosty designs, or when you want to achieve a cool, sophisticated look.',
    
    -- Features as text array
    features = ARRAY[
        'Icy blue and silver color combination',
        'Frosted, snow-like effect',
        'Fine and medium silver flakes',
        'Ice crystal resemblance',
        'Cool, ethereal appearance',
        'Winter wonderland inspired',
        'Sophisticated frosty design',
        'Perfect for winter themes'
    ]::text[],
    
    -- How to use instructions
    how_to_use = '1. Prep natural nail and apply primer\n2. Dip brush into monomer, then into powder\n3. Place bead onto nail and guide into place\n4. Allow to cure before filing',
    
    -- INCI ingredients
    inci_ingredients = 'Water (Aqua)',
    
    -- Key ingredients as text array
    key_ingredients = ARRAY[
        'Polymethyl Methacrylate – creates strong structure',
        'Silver Glitter Particles – frosty ice effect',
        'Blue Pigments – cool icy base',
        'Professional grade – salon quality results'
    ]::text[],
    
    -- Product details
    size = '56g',
    shelf_life = '12 months',
    
    -- Claims as text array
    claims = ARRAY[
        'Professional Grade',
        'Frosted Effect',
        'Winter Inspired'
    ]::text[],
    
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Frozen'
    AND (sku IS NULL OR sku = '' OR sku = 'ACR-304103');

-- Verify the updates
SELECT 
    id,
    name,
    sku,
    price,
    stock_quantity,
    description,
    overview,
    features,
    how_to_use,
    inci_ingredients,
    key_ingredients,
    size,
    shelf_life,
    claims,
    updated_at
FROM 
    products
WHERE 
    name IN ('Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen')
ORDER BY 
    name;