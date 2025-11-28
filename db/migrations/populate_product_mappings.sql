-- Sample Product Mapping Data based on real order examples
-- Populate the product_name_mapping table with known mappings

-- Insert common mappings based on actual order data
INSERT INTO product_name_mapping (order_name, inventory_name, category_pattern, match_confidence) VALUES
-- Hand Files / Nail Files
('Nail File (80/80 Grit) - Single File', 'Hand Files / Single File', 'Hand Files', 0.98),
('Nail File (80/80 Grit) - 5-Pack Bundle', 'Hand Files / 5-Pack Bundle', 'Hand Files', 0.98),
('Nail File (100/100 Grit) - Single File', 'Hand Files / Single File', 'Hand Files', 0.95),
('Nail File (100/100 Grit) - 5-Pack Bundle', 'Hand Files / 5-Pack Bundle', 'Hand Files', 0.95),

-- Core Acrylics
('Core Acrylics - AvanéSignatureNude (071)', 'Core Acrylics / AvanéSignatureNude (071)', 'Core Acrylics', 0.95),
('Core Acrylics - Barely Blooming Nude (070)', 'Core Acrylics / Barely Blooming Nude (070)', 'Core Acrylics', 0.95),
('Core Acrylics - Blom Cover Pink (072)', 'Core Acrylics / Blom Cover Pink (072)', 'Core Acrylics', 0.95),
('Core Acrylics - Crystal Clear (073)', 'Core Acrylics / Crystal Clear (073)', 'Core Acrylics', 0.95),
('Core Acrylics - Pearl White (076)', 'Core Acrylics / Pearl White (076)', 'Core Acrylics', 0.95),
('Core Acrylics - Purely White (075)', 'Core Acrylics / Purely White (075)', 'Core Acrylics', 0.95),
('Core Acrylics - The Perfect Milky White (074)', 'Core Acrylics / The Perfect Milky White (074)', 'Core Acrylics', 0.95),

-- Colour Acrylics  
('Colour Acrylics - 040', 'Colour Acrylics / 040', 'Colour Acrylics', 0.95),
('Colour Acrylics - 035', 'Colour Acrylics / 035', 'Colour Acrylics', 0.95),
('Colour Acrylics - 026', 'Colour Acrylics / 026', 'Colour Acrylics', 0.95),

-- Cuticle Oils
('Cuticle Oil - Vanilla', 'Cuticle Oil / Vanilla', 'Cuticle Oil', 0.95),
('Cuticle Oil - Cotton Candy', 'Cuticle Oil / Cotton Candy', 'Cuticle Oil', 0.95),
('Cuticle Oil - Tiny Touch', 'Cuticle Oil / Tiny Touch', 'Cuticle Oil', 0.95),
('Cuticle Oil - Dragon Fruit Lotus', 'Cuticle Oil / Dragon Fruit Lotus', 'Cuticle Oil', 0.95),
('Cuticle Oil - Watermelon', 'Cuticle Oil / Watermelon', 'Cuticle Oil', 0.95),
('Cuticle Oil - Sweet Peach', 'Cuticle Oil / Sweet Peach', 'Cuticle Oil', 0.95),

-- Top Coats and Other Products
('Top Coat - Default', 'Fairy Dust Top Coat', 'Top Coat', 0.90),
('Non-Wipe Top Coat', 'Non-Wipe Top Coat', 'Top Coat', 0.95),
('Nail Forms', 'Nail Forms', 'Forms', 0.95),
('Prep & Primer Bundle', 'Prep & Primer Bundle', 'Bundle', 0.95),

-- Alternative name variations that might appear in orders
('Nail File Single', 'Hand Files / Single File', 'Hand Files', 0.85),
('Nail File Bundle', 'Hand Files / 5-Pack Bundle', 'Hand Files', 0.85),
('File Single', 'Hand Files / Single File', 'Hand Files', 0.80),
('File Bundle', 'Hand Files / 5-Pack Bundle', 'Hand Files', 0.80),

-- Acrylic variations
('Core Acrylic', 'Core Acrylics', 'Core Acrylics', 0.85),
('Colour Acrylic', 'Colour Acrylics', 'Colour Acrylics', 0.85),
('AvanéSignatureNude', 'Core Acrylics / AvanéSignatureNude (071)', 'Core Acrylics', 0.80),
('Barely Blooming Nude', 'Core Acrylics / Barely Blooming Nude (070)', 'Core Acrylics', 0.80),

-- Bundle variations
('Prep Bundle', 'Prep & Primer Bundle', 'Bundle', 0.85),
('Primer Bundle', 'Prep & Primer Bundle', 'Bundle', 0.85),

-- Liquid variations
('250ml Nail Liquid', '250ml Nail Liquid', 'Liquid', 0.95),
('500ml Nail Liquid', '500ml Nail Liquid', 'Liquid', 0.95),
('Nail Liquid', '250ml Nail Liquid', 'Liquid', 0.85),

-- Brushes
('Crystal Kolinsky Sculpting Brush 10mm', 'Crystal Kolinsky Sculpting Brush 10mm', 'Brushes', 0.95),
('Kolinsky Brush', 'Crystal Kolinsky Sculpting Brush 10mm', 'Brushes', 0.80);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_mapping_order_name ON product_name_mapping(order_name);
CREATE INDEX IF NOT EXISTS idx_product_mapping_inventory_name ON product_name_mapping(inventory_name);
CREATE INDEX IF NOT EXISTS idx_product_mapping_category ON product_name_mapping(category_pattern);
CREATE INDEX IF NOT EXISTS idx_product_mapping_active ON product_name_mapping(is_active);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON product_name_mapping TO authenticated;