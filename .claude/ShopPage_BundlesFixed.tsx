import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { ProductCard } from '../components/ProductCard';
import { Search, Filter, Grid3x3 as Grid3X3, Grid2x2 as Grid2X2, List, ChevronDown, BookOpen, Download } from 'lucide-react';
import { AutocompleteSearch } from '../components/search/AutocompleteSearch';
import { supabase } from '../lib/supabase';

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

  // Static bundle product - keep as fallback
  const staticProducts = [
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
      variants: []
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
    return categoryMap[category] || category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, '');
  };

  // Fetch products and bundles from database
  useEffect(() => {
    async function loadDbProducts() {
      try {
        // Fetch regular products
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('*, hover_image')
          .eq('status', 'active')
          .order('category', { ascending: true });

        if (productsError) {
          console.error('Error fetching products:', productsError);
        }

        // Fetch bundles from bundles table
        const { data: bundles, error: bundlesError } = await supabase
          .from('bundles')
          .select('*')
          .eq('status', 'active')
          .order('name', { ascending: true });

        if (bundlesError) {
          console.error('Error fetching bundles:', bundlesError);
        }

        if (productsError && bundlesError) {
          setError('Failed to load products');
          return;
        }

        // Map regular products
        const mappedProducts = (products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          category: normalizeCategoryToSlug(p.category || 'all'),
          price: p.price || (p.price_cents ? p.price_cents / 100 : 0),
          compareAtPrice: p.compare_at_price || null,
          stock: p.stock || 1,
          inStock: (p.stock || 1) > 0,
          shortDescription: p.short_description || '',
          description: p.short_description || '',
          images: [p.thumbnail_url, p.hover_image].filter(Boolean),
          features: p.features || [],
          howToUse: p.how_to_use || [],
          variants: Array.isArray(p.variants) ? p.variants.map((v: any) => {
            if (typeof v === 'string') return { name: v, inStock: true };
            return { name: v.name || v.label || '', inStock: true, image: v.image || null };
          }) : [],
          rating: 0,
          reviews: 0,
          badges: p.badges || [],
          isBundle: false
        }));

        // Map bundles to product format
        const mappedBundles = (bundles || []).map((bundle: any) => ({
          id: `bundle-${bundle.id}`,
          name: bundle.name,
          slug: bundle.slug,
          category: 'bundle-deals', // Always use bundle category
          price: bundle.price_cents ? bundle.price_cents / 100 : (bundle.price || 0),
          compareAtPrice: bundle.compare_at_price_cents ? bundle.compare_at_price_cents / 100 : null,
          stock: 1,
          inStock: true,
          shortDescription: bundle.short_desc || '',
          description: bundle.short_desc || '',
          images: Array.isArray(bundle.images) ? bundle.images : [bundle.image_url || bundle.thumbnail_url].filter(Boolean),
          features: bundle.features || [],
          howToUse: bundle.how_to_use || [],
          variants: Array.isArray(bundle.variants) ? bundle.variants.map((v: any) => {
            if (typeof v === 'string') return { name: v, inStock: true };
            return { name: v.name || v.label || '', inStock: true, image: v.image || null };
          }) : [],
          rating: 0,
          reviews: 0,
          badges: [...(bundle.badges || []), 'Bundle'],
          isBundle: true
        }));

        // Combine products and bundles
        const allDbProducts = [...mappedProducts, ...mappedBundles];
        setDbProducts(allDbProducts);
      } catch (err: any) {
        console.error('Error loading products:', err);
        setError('Failed to load some products');
      } finally {
        setLoading(false);
      }
    }

    loadDbProducts();
  }, []);

  // Combine database products with static products
  const allProducts = useMemo(() => {
    // Replace database bundle with static bundle if they have the same slug
    const hasStaticBundle = dbProducts.some(p => p.slug === 'prep-primer-bundle');
    
    if (!hasStaticBundle) {
      return [...dbProducts, ...staticProducts];
    }
    return dbProducts;
  }, [dbProducts]);

  // Dynamic category generation
  const productCategories = useMemo(() => {
    const cats = new Map();
    cats.set('all', { name: 'All Products', slug: 'all', count: allProducts.length });

    allProducts.forEach((product: any) => {
      const slug = product.category;
      if (!slug || slug === 'all') return;

      if (!cats.has(slug)) {
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
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setSelectedCategory(hash);
    }
  }, []);

  // Filter and sort products
  const filteredProducts = allProducts.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStock = !showInStockOnly || product.inStock;
    const isNotArchived = product.category !== 'archived';
    
    return matchesCategory && matchesSearch && matchesStock && isNotArchived;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (a.category === 'coming-soon' && b.category !== 'coming-soon') return 1;
    if (b.category === 'coming-soon' && a.category !== 'coming-soon') return -1;

    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      default:
        return 0;
    }
  });

  const getGridClasses = () => {
    switch (viewMode) {
      case 'grid-3':
        return 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3';
      case 'grid-2':
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
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Shop</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Professional nail products, bundles, and furniture trusted by beauty professionals
            </p>
          </div>

          {/* Search */}
          <AutocompleteSearch
            products={allProducts}
            onSearchChange={setSearchTerm}
            searchTerm={searchTerm}
            placeholder="Search products... (try 'bundle', 'primer', 'acrylic')"
            className="mb-6"
          />

          {/* Category Filters */}
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

          {/* Filter Bar */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-100 mb-6 -mx-4 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
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

              {/* View Toggle */}
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
              </div>
            </div>
          </div>

          {/* Filter Sheet */}
          {showFilters && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="space-y-4">
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

                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-3 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* Category Sections */}
          {selectedCategory === 'bundle-deals' && (
            <div id="bundle-deals" className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Bundle Deals</h2>
              <p className="text-gray-600 mb-6">Save money with our curated product bundles combining complementary items.</p>
            </div>
          )}

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

          {/* Products Grid */}
          <div className={`grid ${getGridClasses()} gap-6`}>
            {sortedProducts.map((product) => (
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
            ))}
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