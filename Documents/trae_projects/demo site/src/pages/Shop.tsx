import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ArrowRight } from 'lucide-react';
import { config } from '../config';
import ProductCard from '../components/ProductCard';

const categories = ['All', 'Solar', 'Plumbing', 'Security'];

const Shop: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = config.products.filter((product) => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pt-24 bg-[#0f172a] min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="bg-[#020617] py-24 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#22c55e]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#22c55e]/5 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Professional Hardware</span>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic mb-8 leading-tight">Products & Systems</h1>
            <p className="text-[#94a3b8] text-lg md:text-xl max-w-3xl mx-auto font-medium">
              High-performance solar, plumbing, and security hardware. All products include professional installation by our qualified technicians.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="sticky top-[72px] lg:top-[112px] z-30 bg-[#0f172a]/80 backdrop-blur-md border-y border-white/5 py-6">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Category Tabs */}
            <div className="flex items-center gap-2 bg-[#020617] p-1.5 rounded-2xl border border-white/5 overflow-x-auto w-full lg:w-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeCategory === category 
                    ? 'bg-[#22c55e] text-white shadow-lg shadow-[#22c55e]/20' 
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-[400px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
              <input
                type="text"
                placeholder="Search products or systems..."
                className="w-full bg-[#020617] border border-white/5 rounded-2xl px-14 py-4 text-white text-sm font-medium focus:outline-none focus:border-[#22c55e]/50 transition-all placeholder:text-white/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-white/10 hidden sm:block">
                {filteredProducts.length} Results
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <AnimatePresence mode="wait">
            {filteredProducts.length > 0 ? (
              <motion.div
                key={activeCategory + searchQuery}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              >
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    index={index}
                    {...product}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-40"
              >
                <div className="w-24 h-24 bg-[#1e293b] rounded-full flex items-center justify-center mx-auto mb-8 text-[#94a3b8]">
                  <Filter className="w-10 h-10 opacity-20" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic mb-4">No products found</h3>
                <p className="text-[#94a3b8] font-medium max-w-sm mx-auto">
                  Try adjusting your search or category filters to find what you're looking for.
                </p>
                <button
                  onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
                  className="mt-8 text-[#22c55e] font-black uppercase tracking-widest text-xs flex items-center gap-2 mx-auto hover:gap-4 transition-all"
                >
                  Clear all filters <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Quote Banner */}
      <section className="py-24 bg-[#020617] border-t border-white/5">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-10">
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic leading-tight">
              Can't find a specific system?
            </h2>
            <p className="text-[#94a3b8] text-lg font-medium">
              We source and install custom configurations for solar, plumbing, and security projects. Tell us what you need and we'll build a custom quote for you.
            </p>
            <div className="pt-4">
              <a
                href={`https://wa.me/${config.business.whatsapp}`}
                className="inline-flex items-center gap-3 bg-[#22c55e] text-white font-black uppercase tracking-widest px-12 py-6 rounded-2xl hover:bg-[#16a34a] transition-all transform hover:-translate-y-1 shadow-2xl shadow-[#22c55e]/30"
              >
                <MessageSquare className="w-6 h-6" />
                Chat with an Expert
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Shop;
