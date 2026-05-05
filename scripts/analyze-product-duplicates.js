#!/usr/bin/env node

/**
 * Product Data Integrity Analysis
 * 
 * This script analyzes the product data to identify duplicates and
 * their impact on order linking and stock management.
 */

console.log('🔍 Product Data Integrity Analysis\n');

// Sample data from user's Supabase query
const allProducts = [
  {
    "id": "efe16488-1de6-4522-aeb3-b08cfae3a640",
    "name": "🌲 Watercolour Christmas Workshop",
    "sku": "COU-152829",
    "price": "450.00",
    "is_active": true
  },
  {
    "id": "7c5276c1-9207-4653-89c3-bb4c675db5e2",
    "name": "🌸 Blom Flower Workshop",
    "sku": "COU-172650",
    "price": "480.00",
    "is_active": false
  },
  {
    "id": "9aeb2592-8073-47b3-853f-37827b1b34a8",
    "name": "Blom Manicure Table & Work Station",
    "sku": "SKU-WORKSTATION-001",
    "price": "4500.00",
    "is_active": true
  },
  {
    "id": "798f1ec8-22b4-4267-986e-e1073ab3cbca",
    "name": "Blossom Manicure Table",
    "sku": "SKU-BLOSSOM-TABLE-001",
    "price": "5200.00",
    "is_active": true
  },
  {
    "id": "3b63686d-7b75-4fb7-b5cd-786451eced6a",
    "name": "Colour Acrylics",
    "sku": "ACR-254353",
    "price": "150.00",
    "is_active": true
  },
  {
    "id": "7bfc85b3-261e-4d21-be09-b55ab2967e56",
    "name": "Core Acrylics",
    "sku": "ACR-331580",
    "price": "320.00",
    "is_active": true
  },
  {
    "id": "48219d99-b865-4281-af37-658eaecb3d52",
    "name": "Crystal Kolinsky Sculpting Brush",
    "sku": "TOO-363159",
    "price": "320.00",
    "is_active": true
  },
  {
    "id": "2e8b058b-965e-4720-b956-0aacafa55b59",
    "name": "Cuticle Oil",
    "sku": "PRE-972965",
    "price": "140.00",
    "is_active": true
  },
  {
    "id": "14a262ac-61ac-4729-9661-f6ce5b959638",
    "name": "Cuticle Oil-852",
    "sku": "TOO-306558",
    "price": "140.00",
    "is_active": false
  },
  {
    "id": "a9bf3717-f113-47d6-9e72-707fe9ad3836",
    "name": "Daisy Manicure Table",
    "sku": "SKU-DAISY-TABLE-001",
    "price": "2700.00",
    "is_active": true
  },
  {
    "id": "5b006e50-c52f-464e-b39e-f6998120276b",
    "name": "Fairy Dust Top Coat",
    "sku": null,
    "price": "195.00",
    "is_active": false
  },
  {
    "id": "23277fea-c7dc-4cbe-8efe-7f5b58718f81",
    "name": "Fairy Dust Top Coat",
    "sku": "GEL-589593",
    "price": "195.00",
    "is_active": true
  },
  {
    "id": "c1e72d58-539d-4d8a-a48b-94158755f31f",
    "name": "Floral Manicure Table",
    "sku": "SKU-FLORAL-TABLE-001",
    "price": "4300.00",
    "is_active": true
  },
  {
    "id": "c2fc40d7-9e5a-4caa-b24d-eb9b90524755",
    "name": "Glitter Acrylic",
    "sku": "ACR-688275",
    "price": "150.00",
    "is_active": true
  },
  {
    "id": "6980f293-46a7-44ee-963d-744684f1702d",
    "name": "Hand Files",
    "sku": "TOO-442547",
    "price": "35.00",
    "is_active": true
  },
  {
    "id": "1ee3e71b-1b9b-4563-a376-b740e5423842",
    "name": "Iris Manicure Table",
    "sku": "SKU-IRIS-TABLE-001",
    "price": "3490.00",
    "is_active": true
  },
  {
    "id": "c65fe9a7-28bd-4f29-8ad7-0cbec015877c",
    "name": "Nail Forms",
    "sku": "TOO-367379",
    "price": "290.00",
    "is_active": true
  },
  {
    "id": "fa2256eb-e351-4b4f-9df1-8e2f6ad97e69",
    "name": "Non-Wipe Top Coat",
    "sku": "GEL-490972",
    "price": "190.00",
    "is_active": true
  },
  {
    "id": "a85cf490-9ae1-4a44-97f4-5918b4b03687",
    "name": "Orchid Manicure Table",
    "sku": "SKU-ORCHID-TABLE-001",
    "price": "3700.00",
    "is_active": true
  },
  {
    "id": "d540fade-2e8d-442f-8082-a0c9eff34099",
    "name": "Orchid Manicure Table",
    "sku": null,
    "price": "3700.00",
    "is_active": false
  }
];

console.log('📊 Analysis Results:');
console.log(`   Total products: ${allProducts.length}`);

// Group products by name to find duplicates
const productGroups = {};
allProducts.forEach(product => {
  const normalizedName = product.name.trim();
  if (!productGroups[normalizedName]) {
    productGroups[normalizedName] = [];
  }
  productGroups[normalizedName].push(product);
});

// Find duplicates (products with same name)
const duplicates = {};
Object.keys(productGroups).forEach(name => {
  if (productGroups[name].length > 1) {
    duplicates[name] = productGroups[name];
  }
});

console.log(`\n🚨 DUPLICATE PRODUCTS FOUND: ${Object.keys(duplicates).length}`);

let totalDuplicates = 0;
Object.keys(duplicates).forEach(name => {
  totalDuplicates += duplicates[name].length;
  console.log(`\n📋 "${name}":`);
  
  duplicates[name].forEach((product, index) => {
    const status = product.is_active ? '✅ ACTIVE' : '❌ INACTIVE';
    const sku = product.sku || 'NO SKU';
    console.log(`   ${index + 1}. ID: ${product.id}`);
    console.log(`      SKU: ${sku}`);
    console.log(`      Price: R${product.price}`);
    console.log(`      Status: ${status}`);
  });
});

console.log(`\n📈 Summary:`);
console.log(`   • Duplicate groups: ${Object.keys(duplicates).length}`);
console.log(`   • Total duplicate entries: ${totalDuplicates}`);
console.log(`   • Unique products (after deduplication): ${allProducts.length - totalDuplicates + Object.keys(duplicates).length}`);

console.log('\n🔍 Impact Analysis:');
console.log('   ❌ Stock Deduction Issues:');
console.log('      • Orders may reference one ID, stock tracked on another');
console.log('      • Analytics split between duplicate products');
console.log('      • Admin shows different products than website');

console.log('\n   🎯 Root Causes:');
console.log('      • Products imported multiple times');
console.log('      • No unique constraints on product names');
console.log('      • Website and admin use different product sources');
console.log('      • Stock tracking breaks with duplicate IDs');

console.log('\n🛠️ Required Actions:');
console.log('   1. Identify which products are referenced in orders');
console.log('   2. Consolidate duplicates into single products');
console.log('   3. Update foreign key references');
console.log('   4. Prevent future duplicates with constraints');

console.log('\n📋 Specific Duplicates Requiring Action:');

Object.keys(duplicates).forEach(name => {
  const group = duplicates[name];
  const activeProducts = group.filter(p => p.is_active);
  const inactiveProducts = group.filter(p => !p.is_active);
  
  console.log(`\n   "${name}":`);
  
  if (activeProducts.length > 1) {
    console.log(`      ⚠️  Multiple ACTIVE products - need to consolidate`);
    activeProducts.forEach(p => console.log(`         • ${p.id} (SKU: ${p.sku || 'NO SKU'})`));
  } else if (activeProducts.length === 1 && inactiveProducts.length > 0) {
    console.log(`      ✅ Keep active product, remove inactive duplicates`);
    console.log(`         Keep: ${activeProducts[0].id} (SKU: ${activeProducts[0].sku || 'NO SKU'})`);
    inactiveProducts.forEach(p => console.log(`         Remove: ${p.id} (SKU: ${p.sku || 'NO SKU'})`));
  }
});

console.log('\n🎯 Next Steps:');
console.log('   1. Run SQL queries to check order references');
console.log('   2. Create consolidation migration');
console.log('   3. Update stock_movements and other references');
console.log('   4. Test stock deduction with clean data');

console.log('\n✅ Analysis Complete!');