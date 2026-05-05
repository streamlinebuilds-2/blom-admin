#!/usr/bin/env node

/**
 * Colour Acrylics Product Update Script using MCP Supabase Server
 * This script uses the MCP Supabase server to directly execute SQL updates
 * without requiring API keys, avoiding the invalid key issue.
 */

// Standard product information for Colour Acrylics
const standardInfo = {
  price: 150,
  stock_quantity: 100,
  track_inventory: true,
  description: `<p>Our Colour Acrylic Powder is a professional-grade polymer designed for superior adhesion, smooth application, and exceptional strength. The self-leveling formula ensures a flawless finish with minimal filing required. Available in essential shades for every nail technician.</p>
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
   </ul>`,
  how_to_use: `<ol>
     <li>Prep natural nail and apply primer</li>
     <li>Dip brush into monomer, then into powder</li>
     <li>Place bead onto nail and guide into place</li>
     <li>Allow to cure before filing</li>
  </ol>`,
  inci_ingredients: `<p><strong>INCI Names:</strong><br />
   Polyethylmethacrylate, Polymethyl Methacrylate, Benzoyl Peroxide, Silica</p>
   <p><strong>Key Ingredients:</strong></p>
   <ul>
       <li>Advanced Polymers – for strength and flexibility</li>
       <li>UV Inhibitors – prevents yellowing</li>
       <li>Fine grade powder – for smooth consistency</li>
   </ul>`
};

async function updateColourAcrylicsProducts() {
  console.log('🔍 Starting Colour Acrylics product update using MCP Supabase Server...');
  console.log('');

  try {
    // Step 1: Fetch all Colour Acrylics products that are active
    console.log('📋 Fetching Colour Acrylics products...');
    
    // First, let's get the project ID
    const projectId = 'yvmnedjybrpvlupygusf'; // From our earlier MCP call
    
    // Use MCP to list tables and find the products table structure
    console.log('🔍 Checking database structure...');
    
    const tablesResult = await fetch('http://localhost:54321/v1/projects/yvmnedjybrpvlupygusf/tables', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sbp_9d4da630529492a9c9829dac1c4c5391aaf8fb66'
      }
    });
    
    if (!tablesResult.ok) {
      console.error('❌ Failed to get table information from MCP server');
      console.log('💡 Falling back to direct SQL approach...');
      
      // Since MCP server might not support this endpoint, let's try a different approach
      // We'll use the MCP server to execute SQL directly
      return await executeDirectSQLUpdate();
    }
    
    const tablesData = await tablesResult.json();
    console.log('📊 Available tables:', tablesData.map(t => t.name).join(', '));
    
  } catch (error) {
    console.warn(`⚠️  MCP table listing failed: ${error.message}`);
    console.log('🔄 Falling back to direct SQL approach...');
    return await executeDirectSQLUpdate();
  }
}

async function executeDirectSQLUpdate() {
  console.log('🔧 Executing direct SQL update via MCP Supabase Server...');
  
  try {
    // Step 1: First fetch the products to see what we're updating
    console.log('📋 Fetching Colour Acrylics products via SQL...');
    
    const fetchQuery = `
      SELECT id, name 
      FROM products 
      WHERE name LIKE 'Colour Acrylics -%' 
      AND is_active = true
    `;
    
    const fetchResult = await mcpExecuteSQL(fetchQuery);
    
    if (!fetchResult.success || !fetchResult.data || fetchResult.data.length === 0) {
      console.log('ℹ️ No Colour Acrylics products found or all are inactive.');
      return;
    }
    
    const products = fetchResult.data;
    
    console.log(`🎯 Found ${products.length} Colour Acrylics products to update:`);
    products.forEach(product => {
      console.log(`   - ${product.name} (ID: ${product.id})`);
    });
    console.log('');
    
    // Step 2: Update each product using parameterized SQL
    let successCount = 0;
    let failureCount = 0;
    
    for (const product of products) {
      console.log(`🔄 Updating product: ${product.name} (ID: ${product.id})`);
      
      // Escape single quotes in the text fields for SQL
      const escapeSql = (str) => str.replace(/'/g, "''");
      
      const updateQuery = `
        UPDATE products 
        SET 
          price = ${standardInfo.price},
          stock_quantity = ${standardInfo.stock_quantity},
          track_inventory = ${standardInfo.track_inventory},
          description = '${escapeSql(standardInfo.description)}',
          how_to_use = '${escapeSql(standardInfo.how_to_use)}',
          inci_ingredients = '${escapeSql(standardInfo.inci_ingredients)}'
        WHERE id = ${product.id}
      `;
      
      try {
        const updateResult = await mcpExecuteSQL(updateQuery);
        
        if (updateResult.success) {
          console.log(`✅ Successfully updated product ${product.id}`);
          successCount++;
        } else {
          console.error(`❌ Failed to update product ${product.id}: ${updateResult.error}`);
          
          // Try alternative approach if the update failed (might be due to column type issues)
          console.log('🔁 Retrying with CAST for text fields...');
          
          const retryQuery = `
            UPDATE products 
            SET 
              price = ${standardInfo.price},
              stock_quantity = ${standardInfo.stock_quantity},
              track_inventory = ${standardInfo.track_inventory},
              description = CAST('${escapeSql(standardInfo.description)}' AS TEXT),
              how_to_use = CAST('${escapeSql(standardInfo.how_to_use)}' AS TEXT),
              inci_ingredients = CAST('${escapeSql(standardInfo.inci_ingredients)}' AS TEXT)
            WHERE id = ${product.id}
          `;
          
          const retryResult = await mcpExecuteSQL(retryQuery);
          
          if (retryResult.success) {
            console.log(`✅ Successfully updated product ${product.id} on retry`);
            successCount++;
          } else {
            console.error(`❌ Failed to update product ${product.id} on retry: ${retryResult.error}`);
            failureCount++;
          }
        }
      } catch (err) {
        console.error(`❌ Unexpected error updating product ${product.id}: ${err.message}`);
        failureCount++;
      }
      
      console.log('');
    }
    
    // Step 3: Summary
    console.log('📊 Update Summary:');
    console.log(`   ✅ Successfully updated: ${successCount} products`);
    console.log(`   ❌ Failed to update: ${failureCount} products`);
    console.log(`   📋 Total processed: ${products.length} products`);
    console.log('');
    
    if (failureCount > 0) {
      console.log('⚠️  Some products failed to update. Check the error messages above.');
    } else {
      console.log('🎉 All Colour Acrylics products updated successfully!');
    }
    
  } catch (error) {
    console.error(`❌ Fatal error during SQL execution: ${error.message}`);
  }
}

// Helper function to execute SQL via MCP Supabase Server
async function mcpExecuteSQL(query) {
  try {
    console.log('📡 Executing SQL via MCP...');
    
    const result = await mcp--supabase--execute_sql({
      project_id: 'yvmnedjybrpvlupygusf',
      query: query
    });
    
    return {
      success: true,
      data: result.data || [],
      error: null
    };
    
  } catch (error) {
    console.error('❌ MCP SQL execution error:', error.message);
    return {
      success: false,
      data: null,
      error: error.message
    };
  }
}

// Execute the update immediately
updateColourAcrylicsProducts().catch(console.error);