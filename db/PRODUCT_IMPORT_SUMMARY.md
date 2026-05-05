# Product Import Summary

## Overview
This import will clean the database and add 21 real products from the website's staticProducts array.

## Products to Import

### Bundle Deals (1 product)
1. **Prep & Primer Bundle** - R370
   - SKU: SKU-BUNDLE-001
   - Includes: Prep Solution + Vitamin Primer

### Prep & Finish (3 products)
1. **Cuticle Oil** - R140
   - SKU: SKU-CUTICLE-OIL-001
   - Variants: Cotton Candy, Vanilla, Tiny Touch, Dragon Fruit Lotus, Watermelon

2. **Vitamin Primer** - R210
   - SKU: SKU-VITAMIN-PRIMER-001

3. **Prep Solution (Nail Dehydrator)** - R200
   - SKU: SKU-PREP-SOLUTION-001

### Gel System (2 products)
1. **Non-Wipe Top Coat** - R190
   - SKU: SKU-TOP-COAT-001

2. **Fairy Dust Top Coat** - R195
   - SKU: SKU-FAIRY-DUST-001

### Tools & Essentials (4 products)
1. **Hand Files** - R35
   - SKU: SKU-NAIL-FILE-001
   - Variants: Single File (R35), 5-Pack Bundle (R160)

2. **Nail Forms** - R290
   - SKU: SKU-NAIL-FORMS-001

3. **Crystal Kolinsky Sculpting Brush** - R384
   - SKU: SKU-SCULPTING-BRUSH-001
   - Variant: 10mm

4. **Professional Detail Brush** - R320
   - SKU: SKU-DETAIL-BRUSH-001
   - Variant: 10mm

### Acrylic System (1 product)
1. **Glitter Acrylic** - R250
   - SKU: SKU-GLITTER-ACRYLIC-001
   - Variant: 56g

### Furniture (10 products)
1. **Rose Petal Manicure Table** - R2,590
   - SKU: SKU-ROSE-PETAL-TABLE-001

2. **Daisy Manicure Table** - R2,700
   - SKU: SKU-DAISY-TABLE-001
   - Variants: Wooden top (R2,700), Wooden base & glass top (R3,100)

3. **Polish Garden (Gel Polish Rack)** - R1,150
   - SKU: SKU-POLISH-RACK-001

4. **Blossom Manicure Table** - R5,200
   - SKU: SKU-BLOSSOM-TABLE-001
   - Variants: Wooden top (R5,200), Wooden & glass (R5,550), Glass only (R6,200)

5. **Pearly Pedicure Station** - R4,800
   - SKU: SKU-PEDICURE-STATION-001

6. **Princess Dresser** - R7,400
   - SKU: SKU-PRINCESS-DRESSER-001
   - Includes LED lighting

7. **Iris Manicure Table** - R3,490
   - SKU: SKU-IRIS-TABLE-001
   - Variants: Wooden top (R3,490), Glass top (R3,700)

8. **Blom Manicure Table & Work Station** - R4,500
   - SKU: SKU-WORKSTATION-001
   - Variants: Wooden tops (R4,500), Glass top shelf & workstation (R5,100)

9. **Floral Manicure Table** - R4,300
   - SKU: SKU-FLORAL-TABLE-001
   - Includes glass top

10. **Orchid Manicure Table** - R3,700
    - SKU: SKU-ORCHID-TABLE-001

## Import Details

- **Total Products**: 21
- **All products**: is_active = true, status = 'active'
- **Default stock**: 10 units per product
- **Image paths**: Preserved from staticProducts
- **Variants**: Stored as JSONB for products with multiple options

## Categories Breakdown

| Category | Count | Price Range |
|----------|-------|-------------|
| Bundle Deals | 1 | R370 |
| Prep & Finish | 3 | R140 - R210 |
| Gel System | 2 | R190 - R195 |
| Tools & Essentials | 4 | R35 - R384 |
| Acrylic System | 1 | R250 |
| Furniture | 10 | R1,150 - R7,400 |
| **TOTAL** | **21** | **R35 - R7,400** |

## Notes

- Acetone (Remover) excluded - marked as 'archived' and out of stock in staticProducts
- Coming Soon products excluded - not ready for sale
- All SKUs auto-generated in format: SKU-{PRODUCT-TYPE}-001
- Category names normalized to match database schema
