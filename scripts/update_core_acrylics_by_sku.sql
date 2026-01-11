-- SQL Script to update Core Acrylics variants by specific SKUs
-- This targets exactly the 7 products you specified

-- Update the 7 Core Acrylics variants by their SKUs
UPDATE products
SET
    short_description = 'All Blom Cosmetics Acrylic powders are self-leveling, non yellowing and buttery to work with.',
    overview = '',
    description = '',
    long_description = '',
    updated_at = NOW()
WHERE sku IN (
    'ACR-235489',  -- Core Acrylics - The Perfect Milky White (074)
    'ACR-189397',  -- Core Acrylics - AvanéSignatureNude (071)
    'ACR-172961',  -- Core Acrylics - Pearl White (076)
    'ACR-147071',  -- Core Acrylics - Barely Blooming Nude (070)
    'ACR-125174',  -- Core Acrylics - Purely White (075)
    'ACR-758585',  -- Core Acrylics - Crystal Clear (073)
    'ACR-302182'   -- Core Acrylics - Blom Cover Pink (072)
);

-- Verify the updates for these specific SKUs
SELECT
    id,
    name,
    sku,
    short_description,
    overview,
    description,
    long_description
FROM products
WHERE sku IN (
    'ACR-235489', 'ACR-189397', 'ACR-172961', 'ACR-147071',
    'ACR-125174', 'ACR-758585', 'ACR-302182'
)
ORDER BY name;