import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { ProductCard } from '../components/ProductCard';
import { Search, Filter, Grid3x3 as Grid3X3, Grid2x2 as Grid2X2, List, ChevronDown, BookOpen, Download } from 'lucide-react';
import { AutocompleteSearch } from '../components/search/AutocompleteSearch';
import { supabase } from '../lib/supabase';
// Discount system disabled

export const ShopPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid-3' | 'grid-2' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'list' : 'grid-3';
    }
    return 'grid-3';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Discount system disabled

  // Static products - Keep existing products working while database is being populated
  const staticProducts = [
    // Bundle Deals
    {
      id: 'bundle-1',
      name: 'Prep & Primer Bundle',
      slug: 'prep-primer-bundle',
      price: 370,
      short_description: 'Essential prep duo - Dehydrator & Primer - save R40!',
      shortDescription: 'Essential prep duo - Dehydrator & Primer - save R40!',
      description: 'Perfect nail preparation starts here. Get both our Prep Solution and Vitamin Primer together and save.',
      images: ['/bundle-prep-primer-white.webp', '/bundle-prep-primer-colorful.webp'],
      category: 'bundle-deals',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      includedProducts: [
        { productId: '3', productName: 'Prep Solution (Nail Dehydrator)', quantity: 1 },
        { productId: '2', productName: 'Vitamin Primer', quantity: 1 }
      ],
      variants: []
    },
    // Live Products (with Prices)
    {
      id: '1',
      name: 'Cuticle Oil',
      slug: 'cuticle-oil',
      price: 140,
      compareAtPrice: undefined,
      short_description: 'A nourishing blend that deeply hydrates and softens cuticles while promoting healthy nail growth.',
      shortDescription: 'A nourishing blend that deeply hydrates and softens cuticles while promoting healthy nail growth.',
      description: 'A nourishing blend that deeply hydrates and softens cuticles while promoting healthy nail growth. Lightweight, fast-absorbing, and enriched with restorative oils, it leaves nails and skin feeling smooth, conditioned, and beautifully cared for.',
      images: ['/cuticle-oil-white.webp', '/cuticle-oil-colorful.webp'],
      category: 'prep-finishing',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      variants: [
        { name: 'Cotton Candy', inStock: true, image: '/cuticle-oil-cotton-candy.webp' },
        { name: 'Vanilla', inStock: true, image: '/cuticle-oil-vanilla.webp' },
        { name: 'Tiny Touch', inStock: true, image: '/cuticle-oil-tiny-touch.webp' },
        { name: 'Dragon Fruit Lotus', inStock: true, image: '/cuticle-oil-dragon-fruit-lotus.webp' },
        { name: 'Watermelon', inStock: true, image: '/cuticle-oil-watermelon.webp' }
      ]
    },
    {
      id: '2',
      name: 'Vitamin Primer',
      slug: 'vitamin-primer',
      price: 210,
      compareAtPrice: undefined,
      short_description: 'Strengthens bond between natural nail and product — essential for long-lasting wear.',
      shortDescription: 'Strengthens bond between natural nail and product — essential for long-lasting wear.',
      description: 'Strengthens bond between natural nail and product — essential for long-lasting wear.',
      images: ['/vitamin-primer-white.webp', '/vitamin-primer-colorful.webp'],
      category: 'prep-finishing',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      variants: []
    },
    {
      id: '3',
      name: 'Prep Solution (Nail Dehydrator)',
      slug: 'prep-solution',
      price: 200,
      compareAtPrice: undefined,
      short_description: 'Removes oils and moisture from the nail surface for better product adhesion and long-lasting results.',
      shortDescription: 'Removes oils and moisture from the nail surface for better product adhesion and long-lasting results.',
      description: 'Removes oils and moisture from the nail surface for better product adhesion and long-lasting results.',
      images: ['/prep-solution-white.webp', '/prep-solution-colorful.webp'],
      category: 'prep-finishing',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      variants: []
    },
    {
      id: '4',
      name: 'Non-Wipe Top Coat',
      slug: 'top-coat',
      price: 190,
      compareAtPrice: undefined,
      short_description: 'A crystal-clear, high-shine finish that seals and protects your nail art without leaving a sticky layer.',
      shortDescription: 'A crystal-clear, high-shine finish that seals and protects your nail art without leaving a sticky layer.',
      description: 'A crystal-clear, high-shine finish that seals and protects your nail art without leaving a sticky layer. Long-lasting, scratch-resistant, and easy to use — perfect for a flawless, glossy look every time.',
      images: ['/top-coat-white.webp', '/top-coat-colorful.webp'],
      category: 'gel-system',
      rating: 0,
      reviews: 201,
      badges: [],
      inStock: true,
      variants: []
    },
    {
      id: '5',
      name: 'Fairy Dust Top Coat',
      slug: 'fairy-dust-top-coat',
      price: 195,
      compareAtPrice: undefined,
      short_description: 'A dazzling, non-wipe top coat infused with fine sparkles that adds a touch of glamour to any set.',
      shortDescription: 'A dazzling, non-wipe top coat infused with fine sparkles that adds a touch of glamour to any set.',
      description: 'A dazzling, non-wipe top coat infused with fine sparkles that adds a touch of glamour to any set. Provides long-lasting shine, strength, and protection while giving nails a radiant, shimmering finish.',
      images: ['/fairy-dust-top-coat-white.webp', '/fairy-dust-top-coat-colorful.webp'],
      category: 'gel-system',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      variants: []
    },
    {
      id: '6',
      name: 'Hand Files',
      slug: 'nail-file',
      price: 35,
      compareAtPrice: undefined,
      short_description: 'Durable nail files for professional shaping and smoothing.',
      shortDescription: 'Durable nail files for professional shaping and smoothing.',
      description: 'Durable nail files for professional shaping and smoothing.',
      images: ['/nail-file-white.webp', '/nail-file-colorful.webp'],
      category: 'tools-essentials',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      variants: [
        { name: 'Single File', inStock: true, price: 35, image: '/nail-file-white.webp' },
        { name: '5-Pack Bundle', inStock: true, price: 160, image: '/nail-file-colorful.webp' }
      ]
    },
    {
      id: '7',
      name: 'Nail Forms',
      slug: 'nail-forms',
      price: 290,
      compareAtPrice: undefined,
      short_description: 'Super sturdy and strong nail forms for acrylic and gel applications.',
      shortDescription: 'Super sturdy and strong nail forms for acrylic and gel applications.',
      description: 'Super sturdy and strong nail forms for acrylic and gel applications.',
      images: ['/nail-forms-white.webp', '/nail-forms-colorful.webp'],
      category: 'tools-essentials',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      variants: []
    },
    {
      id: '8',
      name: 'Acetone (Remover)',
      slug: 'acetone-remover',
      price: 60,
      compareAtPrice: undefined,
      short_description: 'Professional-grade, fast acting nail remover.',
      shortDescription: 'Professional-grade, fast acting nail remover.',
      description: 'Professional-grade acetone for fast and effective nail polish removal.',
      images: ['/acetone-remover-white.webp', '/acetone-remover-colorful.webp'],
      category: 'archived',
      rating: 0,
      reviews: 112,
      badges: [],
      inStock: false,
      variants: []
    },

    // Coming Soon Products (Prices TBA) - HIDDEN
    // {
    //   id: '10',
    //   name: 'Crystal Clear Acrylic',
    //   slug: 'crystal-clear-acrylic',
    //   price: -1,
    //   compareAtPrice: undefined,
    //   short_description: 'Glass-like powder for encapsulation & overlays.',
    //   shortDescription: 'Glass-like powder for encapsulation & overlays.',
    //   description: 'Professional grade acrylic powder for encapsulation and overlays.',
    //   images: ['/crystal-clear-acrylic-white.webp', '/crystal-clear-acrylic-colorful.webp'],
    //   category: 'acrylic-system',
    //   rating: 4.9,
    //   reviews: 156,
    //   badges: ['Coming Soon'],
    //   inStock: false,
    //   variants: [
    //     { name: 'Baby Blue', inStock: false, image: '/acrylic-powder-baby-blue.webp' },
    //     { name: 'Lilac Mist', inStock: false, image: '/acrylic-powder-baby-ligt-purple.webp' },
    //     { name: 'Blush Pink', inStock: false, image: '/acrylic-powder-baby-pink.webp' },
    //     { name: 'Ballet Pink', inStock: false, image: '/acrylic-powder-ballet-pink.webp' },
    //     { name: 'Fuchsia Pink', inStock: false, image: '/acrylic-powder-hot-pink.webp' },
    //     { name: 'Cloud Grey', inStock: false, image: '/acrylic-powder-light-grey.webp' },
    //     { name: 'Mint Mist', inStock: false, image: '/acrylic-powder-light-mint.webp' },
    //     { name: 'Rose Pink', inStock: false, image: '/acrylic-powder-light-pink.webp' },
    //     { name: 'Fresh Mint', inStock: false, image: '/acrylic-powder-mint.webp' },
    //     { name: 'Soft Nude', inStock: false, image: '/acrylic-powder-nude.webp' },
    //     { name: 'Petal Pink', inStock: false, image: '/acrylic-powder-pink.webp' },
    //     { name: 'Sky Blue', inStock: false, image: '/acrylic-powder-sky-blue.webp' },
    //     { name: 'Lemon Glow', inStock: false, image: '/acrylic-powder-yellow.webp' }
    //   ]
    // },
    // {
    //   id: '11',
    //   name: 'Snow White Acrylic',
    //   slug: 'snow-white-acrylic',
    //   price: -1,
    //   compareAtPrice: undefined,
    //   short_description: 'Bright opaque white acrylic for French designs.',
    //   shortDescription: 'Bright opaque white acrylic for French designs.',
    //   description: 'Bright opaque white acrylic powder perfect for French designs and nail art.',
    //   images: ['/snow-white-acrylic-white.webp', '/snow-white-acrylic-colorful.webp'],
    //   category: 'acrylic-system',
    //   rating: 4.8,
    //   reviews: 89,
    //   badges: ['Coming Soon'],
    //   inStock: false,
    //   variants: []
    // },
    // {
    //   id: '12',
    //   name: 'Colour Acrylics',
    //   slug: 'colour-acrylics',
    //   price: -1,
    //   compareAtPrice: undefined,
    //   short_description: 'High-pigment powders for creative nail art.',
    //   shortDescription: 'High-pigment powders for creative nail art.',
    //   description: 'High-pigment acrylic powders in vibrant colors for creative nail art.',
    //   images: ['/colour-acrylics-white.webp', '/colour-acrylics-colorful.webp'],
    //   category: 'acrylic-system',
    //   rating: 4.7,
    //   reviews: 73,
    //   badges: ['Coming Soon'],
    //   inStock: false,
    //   variants: []
    // },
    // {
    //   id: '13',
    //   name: 'Glitter Acrylics',
    //   slug: 'glitter-acrylics',
    //   price: -1,
    //   compareAtPrice: undefined,
    //   short_description: 'Sparkle acrylics for encapsulated effects.',
    //   shortDescription: 'Sparkle acrylics for encapsulated effects.',
    //   description: 'Sparkle acrylic powders for creating encapsulated glitter effects.',
    //   images: ['/glitter-acrylics-white.webp', '/glitter-acrylics-colorful.webp'],
    //   category: 'acrylic-system',
    //   rating: 4.6,
    //   reviews: 45,
    //   badges: ['Coming Soon'],
    //   inStock: false,
    //   variants: []
    // },
    {
      id: '15',
      name: 'Crystal Kolinsky Sculpting Brush',
      slug: 'crystal-kolinsky-sculpting-brush',
      price: 384,
      compareAtPrice: 480,
      short_description: 'Premium Kolinsky brush with floating glitter handle.',
      shortDescription: 'Premium Kolinsky brush with floating glitter handle.',
      description: 'Premium 100% Kolinsky brush with floating glitter handle for professional acrylic work.',
      images: ['/acrylic-sculpture-brush-white.webp', '/acrylic-sculpture-brush-colorful.webp'],
      category: 'tools-essentials',
      rating: 0,
      reviews: 23,
      badges: [],
      inStock: true,
      variants: [
        { name: '10mm', price: 384, inStock: true }
      ]
    },
    {
      id: '16',
      name: 'Professional Detail Brush',
      slug: 'professional-detail-brush',
      price: 320,
      compareAtPrice: undefined,
      short_description: 'High-quality detail brush for intricate nail art designs. Perfect for fine lines, dots, and detailed artwork.',
      shortDescription: 'High-quality detail brush for intricate nail art designs. Perfect for fine lines, dots, and detailed artwork.',
      description: 'High-quality detail brush for intricate nail art designs. Perfect for fine lines, dots, and detailed artwork. Professional grade with precise control.',
      images: ['/detail-brush-white.webp', '/detail-brush-colorful.webp'],
      category: 'tools-essentials',
      rating: 0,
      reviews: 15,
      badges: ['New'],
      inStock: true,
      variants: [
        { name: '10mm', price: 320, inStock: true }
      ]
    },
    {
      id: '17',
      name: 'Glitter Acrylic',
      slug: 'glitter-acrylic',
      price: 250,
      compareAtPrice: undefined,
      short_description: 'Opalescent crushed-ice acrylic blend with prismatic shimmer.',
      shortDescription: 'Opalescent crushed-ice acrylic blend with prismatic shimmer.',
      description: 'This glitter-acrylic blend looks like a soft, opalescent crushed-ice mix — a dreamy combination of translucent and iridescent shards suspended in clear acrylic. Features fine to medium reflective flakes that shift between white-silver, icy blue, and lilac hues.',
      images: ['/glitter-acrylic-white.webp', '/glitter-acrylic-colorful.webp'],
      category: 'acrylic-system',
      rating: 4.8,
      reviews: 156,
      badges: ['New'],
      inStock: true,
      variants: [
        { name: '56g', price: 250, inStock: true }
      ]
    },
    // Furniture Products
    {
      id: '18',
      name: 'Rose Petal Manicure Table',
      slug: 'rose-petal-manicure-table',
      price: 2590,
      compareAtPrice: undefined,
              shortDescription: 'Beautiful manicure table perfect for salons and home studios.',
      description: 'Beautiful manicure table perfect for salons and home studios.',
      images: ['/rose-petal-manicure-table-white.webp', '/rose-petal-manicure-table-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 12,
      badges: [],
      inStock: true,
      variants: [
        { name: 'Standard', price: 2590, inStock: true }
      ]
    },
    {
      id: '24',
      name: 'Iris Manicure Table',
      slug: 'iris-manicure-table',
      price: 3490,
      compareAtPrice: undefined,
              shortDescription: 'Professional manicure table with integrated shelf system.',
      description: 'Professional manicure table with shelf. Choice of wooden or glass top.',
      images: ['/iris-manicure-table-white.webp', '/iris-manicure-table-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 8,
      badges: [],
      inStock: true,
      variants: [
        { name: 'With wooden top', price: 3490, inStock: true },
        { name: 'With glass top', price: 3700, inStock: true }
      ]
    },
    {
      id: '25',
      name: 'Blom Manicure Table & Work Station',
      slug: 'blom-manicure-workstation',
      price: 4500,
      compareAtPrice: undefined,
              shortDescription: 'Complete professional workstation with table and shelf.',
      description: 'Complete workstation with table and shelf. Premium quality construction.',
      images: ['/blom-manicure-workstation-white.webp', '/blom-manicure-workstation-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 15,
      badges: [],
      inStock: true,
      variants: [
        { name: 'With wooden tops', price: 4500, inStock: true },
        { name: 'With glass top shelf & workstation', price: 5100, inStock: true }
      ]
    },
    {
      id: '19',
      name: 'Daisy Manicure Table',
      slug: 'daisy-manicure-table',
      price: 2700,
      compareAtPrice: undefined,
              shortDescription: 'Classic manicure table with timeless design.',
      description: 'Classic manicure table design with quality construction.',
      images: ['/daisy-manicure-table-white.webp', '/daisy-manicure-table-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 10,
      badges: [],
      inStock: true,
      variants: [
        { name: 'Wooden top', price: 2700, inStock: true },
        { name: 'Wooden base & glass top', price: 3100, inStock: true }
      ]
    },
    {
      id: '20',
      name: 'Polish Garden (Gel Polish Rack)',
      slug: 'polish-garden-rack',
      price: 1150,
      compareAtPrice: undefined,
              shortDescription: 'Wall-mounted gel polish rack for organized storage.',
      description: 'Wall-mounted gel polish rack for organized storage.',
      images: ['/polish-garden-rack-white.webp', '/polish-garden-rack-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 18,
      badges: [],
      inStock: true,
      variants: [
        { name: 'Standard', price: 1150, inStock: true }
      ]
    },
    {
      id: '21',
      name: 'Blossom Manicure Table',
      slug: 'blossom-manicure-table',
      price: 5200,
      compareAtPrice: undefined,
              shortDescription: 'Premium manicure table with elegant design and superior build quality.',
      description: 'Our premium manicure table with elegant design and superior build quality.',
      images: ['/blossom-manicure-table-white.webp', '/blossom-manicure-table-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 6,
      badges: [],
      inStock: true,
      variants: [
        { name: 'Wooden top', price: 5200, inStock: true },
        { name: 'Wooden & glass top', price: 5550, inStock: true },
        { name: 'Glass top only', price: 6200, inStock: true }
      ]
    },
    {
      id: '22',
      name: 'Pearly Pedicure Station',
      slug: 'pearly-pedicure-station',
      price: 4800,
      compareAtPrice: undefined,
              shortDescription: 'Complete pedicure station with platform, step and storage drawers.',
      description: 'Complete pedicure station with storage. Professional quality for salons.',
      images: ['/pearly-pedicure-station-white.webp', '/pearly-pedicure-station-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 9,
      badges: [],
      inStock: true,
      variants: [
        { name: 'Standard', price: 4800, inStock: true }
      ]
    },
    {
      id: '23',
      name: 'Princess Dresser',
      slug: 'princess-dresser',
      price: 7400,
      compareAtPrice: undefined,
      shortDescription: 'Elegant princess-style dresser with glass open top and LED lighting.',
      description: 'Beautiful princess-style dresser featuring glass open top, LED lights, and mirror included. Perfect for creating a luxurious salon atmosphere.',
      images: ['/princess-dresser-white.webp', '/princess-dresser-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      variants: [
        { name: 'Standard with LED', price: 7400, inStock: true, image: '/princess-dresser-colorful.webp' }
      ],
      dimensions: '130cm x 45cm x 180cm',
      materialsFinish: 'Premium wood construction with glass open top and integrated LED lighting system.',
      productionDelivery: 'Custom built to order. Delivery within 3-4 weeks. Professional installation available.'
    },
    {
      id: '26',
      name: 'Floral Manicure Table',
      slug: 'floral-manicure-table',
      price: 4300,
      compareAtPrice: undefined,
      shortDescription: 'Beautiful floral-themed manicure table with glass top included.',
      description: 'Elegant floral manicure table with glass top included. Features decorative floral details and professional construction.',
      images: ['/floral-manicure-table-white.webp', '/floral-manicure-table-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      variants: [
        { name: 'With Glass Top', price: 4300, inStock: true, image: '/floral-manicure-table-colorful.webp' }
      ],
      dimensions: '120cm x 45cm x 80cm',
      materialsFinish: 'High-quality wood construction with decorative floral accents and included glass top.',
      productionDelivery: 'Custom built to order. Delivery within 3-4 weeks. Glass top included in price.'
    },
    {
      id: '27',
      name: 'Orchid Manicure Table',
      slug: 'orchid-manicure-table',
      price: 3700,
      compareAtPrice: undefined,
      shortDescription: 'Stylish orchid-themed manicure table with elegant design.',
      description: 'Beautiful orchid manicure table featuring elegant orchid-inspired design elements and professional construction.',
      images: ['/orchid-manicure-table-white.webp', '/orchid-manicure-table-colorful.webp'],
      category: 'furniture',
      rating: 0,
      reviews: 0,
      badges: [],
      inStock: true,
      variants: [
        { name: 'Standard', price: 3700, inStock: true, image: '/orchid-manicure-table-colorful.webp' }
      ],
      dimensions: '140cm x 50cm x 79cm',
      materialsFinish: 'Premium wood construction with orchid-inspired decorative details.',
      productionDelivery: 'Custom built to order. Delivery within 3-4 weeks. Professional installation available.'
    }
  ];

  // Helper function to normalize category names to slugs
  const normalizeCategoryToSlug = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Bundle Deals': 'bundle-deals',
      'Acrylic System': 'acrylic-system',
      'Prep & Finish': 'prep-finishing',
      'Prep & Finishing': 'prep-finishing',
      'Gel System': 'gel-system',
      'Tools & Essentials': 'tools-essentials',
      'Furniture': 'furniture',
      'Coming Soon': 'coming-soon'
    };

    // Return mapped value or convert to slug format as fallback
    return categoryMap[category] || category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');
  };

  // Fetch additional products from Supabase database
  useEffect(() => {
    async function loadDbProducts() {
      try {
        // Fetch products from products table
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*, product_reviews(count), hover_image')
          // .eq('is_active', true)
          .eq('status', 'active')
          .order('category', { ascending: true });

        if (productsError) {
          console.error('Error fetching products from database:', productsError);
        }

        // Fetch bundles from bundles table
        const { data: bundles, error: bundlesError } = await supabase
          .from('bundles')
          .select('*')
          .eq('status', 'active')
          .order('name', { ascending: true });

        if (bundlesError) {
          console.error('Error fetching bundles from database:', bundlesError);
        }

        if (productsError && bundlesError) {
          setError('Failed to load some products');
          return;
        }

        // Map products from products table
        const mappedProducts = (products || []).map((p: any) => {
          // Check if this is actually a bundle stored in products table
          const isBundleFromProductsTable = p.product_type === 'bundle' || p.category === 'Bundle Deals';
          
          if (isBundleFromProductsTable) {
            return {
              id: `bundle-${p.id}`,
              name: p.name,
              slug: p.slug,
              category: 'bundle-deals', // Force bundle category

              // Price - check all variations
              price: p.price || (p.price_cents ? p.price_cents / 100 : 0),
              compareAtPrice: p.compare_at_price || p.compare_at || null,

              // Stock - check ALL possible columns (using ?? to properly handle 0 values)
              stock: p.stock ?? p.stock_quantity ?? p.stock_qty ?? p.stock_on_hand ?? p.stock_available ?? p.inventory_quantity ?? 0,
              inStock: (p.stock ?? p.stock_quantity ?? p.stock_qty ?? p.stock_on_hand ?? p.stock_available ?? p.inventory_quantity ?? 0) > 0,

              // Descriptions - check variations
              shortDescription: p.short_description || p.short_desc || p.description_short || '',
              short_description: p.short_description || p.short_desc || p.description_short || '',
              description: p.short_description || p.short_desc || p.description_short || '',
              overview: p.overview || p.long_description || p.description_full || p.description || '',

              // Images - check variations (including gallery fallback)
              // We insert hover_image at index 1 for the card flip effect
              images: [
                p.thumbnail_url || p.image_main || p.image_url,
                p.hover_image || p.hover_url, 
                ...(p.gallery_urls || p.image_gallery || p.gallery || [])
              ].filter(Boolean),

              // Arrays (use modern names, fallback to empty)
              features: p.features || [],
              howToUse: p.how_to_use || [],
              ingredients: {
                inci: p.inci_ingredients || [],
                key: p.key_ingredients || []
              },
              // Variants - ensure proper mapping with name/label fallback
              variants: Array.isArray(p.variants)
                ? p.variants.map((v: any) => {
                    // Handle both object and string variants
                    if (typeof v === 'string') {
                      return { name: v, inStock: true };
                    }
                    return {
                      name: v.name || v.label || v.title || '',
                      label: v.label || v.name || v.title || '',
                      inStock: v.inStock ?? v.in_stock ?? true,
                      image: v.image || v.image_url || null,
                      price: v.price || null
                    };
                  })
                : [],

              // Meta
              rating: 0,
              reviews: 0,
              badges: [...(p.badges || []), 'Bundle'],
              seo: {
                title: p.meta_title || p.name,
                description: p.meta_description || p.short_description || p.short_desc
              },
              
              // Bundle-specific fields
              isBundle: true,
              bundleProducts: p.bundle_products || [] // Will be populated if needed
            };
          }
          
          // Regular product
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            category: normalizeCategoryToSlug(p.category || 'all'),

            // Price - check all variations
            price: p.price || (p.price_cents ? p.price_cents / 100 : 0),
            compareAtPrice: p.compare_at_price || p.compare_at || null,

            // Stock - check ALL possible columns (using ?? to properly handle 0 values)
            stock: p.stock ?? p.stock_quantity ?? p.stock_qty ?? p.stock_on_hand ?? p.stock_available ?? p.inventory_quantity ?? 0,
            inStock: (p.stock ?? p.stock_quantity ?? p.stock_qty ?? p.stock_on_hand ?? p.stock_available ?? p.inventory_quantity ?? 0) > 0,

            // Descriptions - check variations
            shortDescription: p.short_description || p.short_desc || p.description_short || '',
            short_description: p.short_description || p.short_desc || p.description_short || '',
            description: p.short_description || p.short_desc || p.description_short || '',
            overview: p.overview || p.long_description || p.description_full || p.description || '',

            // Images - check variations (including gallery fallback)
            // We insert hover_image at index 1 for the card flip effect
            images: [
              p.thumbnail_url || p.image_main || p.image_url,
              p.hover_image || p.hover_url, 
              ...(p.gallery_urls || p.image_gallery || p.gallery || [])
            ].filter(Boolean),

            // Arrays (use modern names, fallback to empty)
            features: p.features || [],
            howToUse: p.how_to_use || [],
            ingredients: {
              inci: p.inci_ingredients || [],
              key: p.key_ingredients || []
            },
            // Variants - ensure proper mapping with name/label fallback
            variants: Array.isArray(p.variants)
              ? p.variants.map((v: any) => {
                  // Handle both object and string variants
                  if (typeof v === 'string') {
                    return { name: v, inStock: true };
                  }
                  return {
                    name: v.name || v.label || v.title || '',
                    label: v.label || v.name || v.title || '',
                    inStock: v.inStock ?? v.in_stock ?? true,
                    image: v.image || v.image_url || null,
                    price: v.price || null
                  };
                })
              : [],

            // Meta
            rating: 0,
            reviews: 0,
            badges: p.badges || [],
            seo: {
              title: p.meta_title || p.name,
              description: p.meta_description || p.short_description || p.short_desc
            }
          };
        }));

        // Map bundles to product format
        const mappedBundles = (bundles || []).map((bundle: any) => ({
          id: `bundle-${bundle.id}`,
          name: bundle.name,
          slug: bundle.slug,
          category: 'bundle-deals', // Always use bundle-deals category

          // Price - check all variations
          price: bundle.price_cents ? bundle.price_cents / 100 : (bundle.price || 0),
          compareAtPrice: bundle.compare_at_price_cents ? bundle.compare_at_price_cents / 100 : bundle.compare_at_price || null,

          // Stock - bundles are always in stock if active
          stock: 1,
          inStock: true,

          // Descriptions - check variations
          shortDescription: bundle.short_desc || bundle.description_short || '',
          short_description: bundle.short_desc || bundle.description_short || '',
          description: bundle.short_desc || bundle.description_short || '',
          overview: bundle.long_desc || bundle.description_full || bundle.description || '',

          // Images - bundles use images array, fallback to image_url
          images: Array.isArray(bundle.images) 
            ? bundle.images 
            : [bundle.image_url || bundle.thumbnail_url].filter(Boolean),

          // Arrays (use modern names, fallback to empty)
          features: bundle.features || [],
          howToUse: bundle.how_to_use || [],
          ingredients: {
            inci: bundle.inci_ingredients || [],
            key: bundle.key_ingredients || []
          },
          // Variants - ensure proper mapping with name/label fallback
          variants: Array.isArray(bundle.variants)
            ? bundle.variants.map((v: any) => {
                // Handle both object and string variants
                if (typeof v === 'string') {
                  return { name: v, inStock: true };
                }
                return {
                  name: v.name || v.label || v.title || '',
                  label: v.label || v.name || v.title || '',
                  inStock: v.inStock ?? v.in_stock ?? true,
                  image: v.image || v.image_url || null,
                  price: v.price || null
                };
              })
            : [],

          // Meta
          rating: 0,
          reviews: 0,
          badges: bundle.badges || ['Bundle'],
          seo: {
            title: bundle.meta_title || bundle.name,
            description: bundle.meta_description || bundle.short_desc || ''
          },
          
          // Bundle-specific fields
          isBundle: true,
          bundleProducts: bundle.bundle_products || [] // Will be populated if needed
        }));

        // Combine products and bundles
        const allDbProducts = [...mappedProducts, ...mappedBundles];
        setDbProducts(allDbProducts);
      } catch (err: any) {
        console.error('Error loading database products:', err);
        setError('Failed to load some products');
      } finally {
        setLoading(false);
      }
    }

    loadDbProducts();
  }, []);

  // Use database products (fetched from Supabase) merged with static bundle products
  // Ensure bundle products have correct local images (not placeholder URLs from database)
  const allProducts = dbProducts.map(product => {
    // Override bundle images with local images
    if (product.slug === 'prep-primer-bundle') {
      return {
        ...product,
        images: ['/bundle-prep-primer-white.webp', '/bundle-prep-primer-colorful.webp']
      };
    }
    return product;
  });

  // --- DYNAMIC CATEGORY GENERATION ---
  const productCategories = useMemo(() => {
    const cats = new Map();

    // 1. Always start with "All Products"
    cats.set('all', { name: 'All Products', slug: 'all', count: allProducts.length });

    // 2. Scan products for unique categories
    allProducts.forEach((product: any) => {
      const slug = product.category;
      if (!slug || slug === 'all') return;

      if (!cats.has(slug)) {
        // Create a pretty name from the slug (e.g. "new-category" -> "New Category")
        const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        cats.set(slug, { name, slug, count: 0 });
      }
      cats.get(slug).count++;
    });

    return Array.from(cats.values());
  }, [allProducts]);

  const sortOptions = [
    { value: 'featured', label: 'Featured' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' }
  ];

  useEffect(() => {
    document.title = 'Shop - BLOM Cosmetics';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Shop professional nail care products, acrylic systems, and tools. High-quality products trusted by nail artists and beauty professionals.');
    }
    window.scrollTo({ top: 0 });

    // If navigated with hash to a category (e.g., #acrylic-system), preselect it
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setSelectedCategory(hash);
      // Scroll to filter bar smoothly
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
    }
  }, []);

  const filteredProducts = allProducts.filter(product => {
    const matchesCategory = selectedCategory === 'all' ||
      product.category === selectedCategory;

    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.shortDescription || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStock = !showInStockOnly || (product.inStock && product.price !== -1);

    // Exclude archived products
    const isNotArchived = product.category !== 'archived';

    return matchesCategory && matchesSearch && matchesStock && isNotArchived;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // Always put "Coming Soon" products at the bottom
    if (a.category === 'coming-soon' && b.category !== 'coming-soon') return 1;
    if (b.category === 'coming-soon' && a.category !== 'coming-soon') return -1;

    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price-low':
        // Handle products with price -1 (coming soon) by putting them at the end
        if (a.price === -1 && b.price !== -1) return 1;
        if (b.price === -1 && a.price !== -1) return -1;
        return a.price - b.price;
      case 'price-high':
        // Handle products with price -1 (coming soon) by putting them at the end
        if (a.price === -1 && b.price !== -1) return 1;
        if (b.price === -1 && a.price !== -1) return -1;
        return b.price - a.price;
      default:
        return 0;
    }
  });

  const getGridClasses = () => {
    switch (viewMode) {
      case 'grid-3':
        // On mobile show 2 columns, tablet 2, desktop 3
        return 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3';
      case 'grid-2':
        // On mobile show 2 columns, tablet+ show 2 columns
        return 'grid-cols-2 sm:grid-cols-2';
      case 'list':
        return 'grid-cols-1';
      default:
        return 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('featured');
    setShowInStockOnly(false);
    setSelectedCategory('all');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-blue-100">
        <Header showMobileMenu={true} />
        <main className="section-padding">
          <Container>
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading products...</p>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-pink-100 to-blue-100">
      <Header showMobileMenu={true} />

      <main className="pt-8 pb-16">
          <Container>
          {/* Page Header - Clean & Modern */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Shop</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional nail products and furniture trusted by beauty professionals
            </p>
          </div>

          {/* Professional Autocomplete Search */}
          <AutocompleteSearch
            products={allProducts}
            onSearchChange={setSearchTerm}
            searchTerm={searchTerm}
            placeholder="Search products... (try 'brush', 'acrylic', 'primer')"
            className="mb-6"
          />

          {/* Category Pills - Mobile Optimized */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
                      {productCategories.map((category) => (
                        <button
                          key={category.slug}
                          onClick={() => setSelectedCategory(category.slug)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            selectedCategory === category.slug
                      ? 'bg-pink-400 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                          }`}
                        >
                  {category.name}
                  <span className="ml-1 text-xs opacity-75">({category.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>

          {/* Sticky Filter Bar - Mobile Optimized */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-100 mb-6 -mx-4 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              {/* Left: Sort & Filter */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline font-medium">Filters</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                      </button>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none min-w-0 flex-1"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                      Sort: {option.label}
                        </option>
                      ))}
                    </select>
              </div>

              {/* Right: View Toggle & Count */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden lg:block">
                  {sortedProducts.length} of {allProducts.length}
                </span>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('grid-3')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'grid-3' ? 'bg-white text-pink-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                      >
                    <Grid3X3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setViewMode('grid-2')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'grid-2' ? 'bg-white text-pink-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                      >
                    <Grid2X2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-white text-pink-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                      >
                    <List className="h-3 w-3" />
                      </button>
                </div>

                {/* Catalogue Buttons */}
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => window.open('https://heyzine.com/flip-book/6d112b7bc1.html', '_blank')}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    title="View Catalogue Online"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Catalogue</span>
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = '/catalogue.pdf';
                      link.download = 'BLOM-Catalogue.pdf';
                      link.click();
                    }}
                    className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    title="Download Catalogue PDF"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Mobile Filter Sheet */}
          {showFilters && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="space-y-4">
                {/* In Stock Only */}
                      <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">Availability</h3>
                    <p className="text-xs text-gray-500">Show only in-stock items</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInStockOnly}
                      onChange={(e) => setShowInStockOnly(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-400"></div>
                  </label>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-3 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* Category Sections for Anchor Navigation */}
          {selectedCategory === 'acrylic-system' && (
            <div id="acrylic-system" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Acrylic System</h2>
              <p className="text-gray-600 mb-6">Professional acrylic powders and liquid monomers for nail extensions and overlays.</p>
            </div>
          )}
          
          {selectedCategory === 'prep-finishing' && (
            <div id="prep-finishing" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Prep & Finish</h2>
              <p className="text-gray-600 mb-6">Essential prep solutions, primers, and finishing products for professional nail care.</p>
            </div>
          )}
          
          {selectedCategory === 'tools-essentials' && (
            <div id="tools-essentials" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Tools & Essentials</h2>
              <p className="text-gray-600 mb-6">Professional nail tools, files, brushes, and essential accessories for nail artistry.</p>
            </div>
          )}

          {/* Products Grid - Clean Modern Layout */}
          <div className={`grid ${getGridClasses()} gap-6`}>
                {sortedProducts.map((product) => {
                  // Compute discount for this product
                  return (
                  <ProductCard
                      key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                    shortDescription={product.shortDescription}
                    images={product.images}
                    inStock={product.inStock}
                    badges={product.badges}
                      isListView={viewMode === 'list'}
                  />
                  );
                })}
              </div>

          {/* Empty State */}
          {sortedProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
                      <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-pink-400 text-white rounded-xl hover:bg-pink-500 transition-colors font-medium"
                >
                  Clear All Filters
                    </button>
            </div>
          </div>
        )}
        </Container>
      </main>

      <Footer />
    </div>
  );
};
