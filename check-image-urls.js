import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to read .env
function getEnv() {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, ''); // remove quotes
        env[key] = val;
      }
    });
    return env;
  } catch (e) {
    console.error("Error reading .env:", e);
    return {};
  }
}

const env = getEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env");
  console.error("Please ensure you have a .env file in the root directory.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OLD_CLOUD_NAME = 'dd89enrjz';
const NEW_CLOUD_NAME = 'drsrbzm2t';

async function checkImages() {
  console.log(`🔍 Checking for images with old cloud name: ${OLD_CLOUD_NAME}...`);
  console.log(`✨ Replacing with new cloud name: ${NEW_CLOUD_NAME}...`);
  
  let sqlCommands = [];
  let brokenCount = 0;

  // 1. Check Products
  console.log("Checking Products...");
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name, thumbnail_url, hover_url, gallery_urls, variants');

  if (prodError) {
    console.error("Error fetching products:", prodError);
  } else if (products) {
    products.forEach(p => {
      let needsUpdate = false;
      let updateSql = `UPDATE products SET `;
      let updates = [];

      // Check thumbnail
      if (p.thumbnail_url && p.thumbnail_url.includes(OLD_CLOUD_NAME)) {
        console.log(`[Product] ${p.name} (ID: ${p.id}) has old thumbnail: ${p.thumbnail_url}`);
        const newUrl = p.thumbnail_url.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME);
        updates.push(`thumbnail_url = '${newUrl}'`);
        needsUpdate = true;
        brokenCount++;
      }

      // Check hover
      if (p.hover_url && p.hover_url.includes(OLD_CLOUD_NAME)) {
        console.log(`[Product] ${p.name} (ID: ${p.id}) has old hover: ${p.hover_url}`);
        const newUrl = p.hover_url.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME);
        updates.push(`hover_url = '${newUrl}'`);
        needsUpdate = true;
        brokenCount++;
      }

      // Check gallery (array)
      if (p.gallery_urls && Array.isArray(p.gallery_urls)) {
        let galleryChanged = false;
        const newGallery = p.gallery_urls.map(url => {
          if (url && typeof url === 'string' && url.includes(OLD_CLOUD_NAME)) {
             brokenCount++;
             galleryChanged = true;
             return url.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME);
          }
          return url;
        });
        if (galleryChanged) {
           updates.push(`gallery_urls = '${JSON.stringify(newGallery)}'`);
           needsUpdate = true;
        }
      }

      // Check variants (jsonb/array)
      if (p.variants && Array.isArray(p.variants)) {
         let variantsChanged = false;
         const newVariants = p.variants.map(v => {
            if (v && v.image && typeof v.image === 'string' && v.image.includes(OLD_CLOUD_NAME)) {
                brokenCount++;
                variantsChanged = true;
                return { ...v, image: v.image.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME) };
            }
            return v;
         });
         
         if (variantsChanged) {
             updates.push(`variants = '${JSON.stringify(newVariants)}'`);
             needsUpdate = true;
         }
      }

      if (needsUpdate) {
        updateSql += updates.join(', ') + ` WHERE id = '${p.id}';`;
        sqlCommands.push(updateSql);
      }
    });
  }

  // 2. Check Bundles
  console.log("Checking Bundles...");
  const { data: bundles, error: bundleError } = await supabase
    .from('bundles')
    .select('id, name, thumbnail_url, hover_image, gallery_urls, variants'); 

  if (bundleError) {
    console.error("Error fetching bundles:", bundleError);
  } else if (bundles) {
    bundles.forEach(b => {
      let needsUpdate = false;
      let updateSql = `UPDATE bundles SET `;
      let updates = [];

      // Check thumbnail
      if (b.thumbnail_url && b.thumbnail_url.includes(OLD_CLOUD_NAME)) {
        console.log(`[Bundle] ${b.name} (ID: ${b.id}) has old thumbnail: ${b.thumbnail_url}`);
        const newUrl = b.thumbnail_url.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME);
        updates.push(`thumbnail_url = '${newUrl}'`);
        needsUpdate = true;
        brokenCount++;
      }

      // Check hover (column is hover_image)
      if (b.hover_image && b.hover_image.includes(OLD_CLOUD_NAME)) {
        console.log(`[Bundle] ${b.name} (ID: ${b.id}) has old hover: ${b.hover_image}`);
        const newUrl = b.hover_image.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME);
        updates.push(`hover_image = '${newUrl}'`);
        needsUpdate = true;
        brokenCount++;
      }

      // Check gallery
      if (b.gallery_urls && Array.isArray(b.gallery_urls)) {
        let galleryChanged = false;
        const newGallery = b.gallery_urls.map(url => {
          if (url && typeof url === 'string' && url.includes(OLD_CLOUD_NAME)) {
             brokenCount++;
             galleryChanged = true;
             return url.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME);
          }
          return url;
        });
        if (galleryChanged) {
           updates.push(`gallery_urls = '${JSON.stringify(newGallery)}'`);
           needsUpdate = true;
        }
      }
      
      // Check variants
      if (b.variants && Array.isArray(b.variants)) {
         let variantsChanged = false;
         const newVariants = b.variants.map(v => {
            if (v && v.image && typeof v.image === 'string' && v.image.includes(OLD_CLOUD_NAME)) {
                brokenCount++;
                variantsChanged = true;
                return { ...v, image: v.image.replace(OLD_CLOUD_NAME, NEW_CLOUD_NAME) };
            }
            return v;
         });
         
         if (variantsChanged) {
             updates.push(`variants = '${JSON.stringify(newVariants)}'`);
             needsUpdate = true;
         }
      }

      if (needsUpdate) {
        updateSql += updates.join(', ') + ` WHERE id = '${b.id}';`;
        sqlCommands.push(updateSql);
      }
    });
  }

  console.log(`\n-----------------------------------`);
  console.log(`Found ${brokenCount} broken image references.`);
  
  if (sqlCommands.length > 0) {
    const sqlContent = sqlCommands.join('\n');
    fs.writeFileSync('fix_image_urls.sql', sqlContent);
    console.log(`✅ Generated 'fix_image_urls.sql' with ${sqlCommands.length} UPDATE statements.`);
    console.log(`👉 Please run the contents of 'fix_image_urls.sql' in your Supabase SQL Editor to update the database.`);
  } else {
    console.log("No broken images found! (Or database connection failed/empty)");
  }
}

checkImages();
