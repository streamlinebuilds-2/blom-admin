import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone, MessageSquare } from 'lucide-react';
import { config } from '../config';
import StatsBanner from '../components/StatsBanner';
import ServiceCard from '../components/ServiceCard';
import ProductCard from '../components/ProductCard';
import TestimonialCard from '../components/TestimonialCard';
import * as LucideIcons from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Hero Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={config.business.heroImage} 
            alt="Hero" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-[2px]" />
          {/* Decorative glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#22c55e]/10 blur-[120px] rounded-full pointer-events-none" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block bg-[#22c55e] text-white text-[10px] font-black uppercase tracking-[0.3em] px-6 py-2 rounded-full mb-8 shadow-lg shadow-[#22c55e]/20">
              Gauteng's Multi-Trade Specialists
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-[1.1] uppercase italic">
              {config.business.tagline.split('. ').map((part, i) => (
                <span key={i} className="block last:text-[#22c55e]">
                  {part}{i !== config.business.tagline.split('. ').length - 1 && '.'}
                </span>
              ))}
            </h1>
            <p className="text-[#94a3b8] text-lg md:text-xl max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              {config.business.sub} Backed by qualified technicians and real results since {config.business.established}.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/contact"
                className="w-full sm:w-auto bg-[#22c55e] text-white font-black uppercase tracking-widest px-10 py-5 rounded-2xl hover:bg-[#16a34a] transition-all transform hover:-translate-y-1 active:translate-y-0 shadow-2xl shadow-[#22c55e]/30 flex items-center justify-center gap-3"
              >
                Get a Free Quote
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/services"
                className="w-full sm:w-auto bg-white/5 backdrop-blur-md border border-white/10 text-white font-black uppercase tracking-widest px-10 py-5 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3"
              >
                Our Services
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Floating elements */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-[#22c55e] rounded-full" />
          </div>
        </div>
      </section>

      <StatsBanner />

      {/* Services Section */}
      <section className="py-24 bg-[#0f172a] relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl">
              <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Professional Solutions</span>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic leading-none">What We Do</h2>
            </div>
            <Link to="/services" className="text-[#22c55e] font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:gap-4 transition-all">
              View All Services <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {config.services.map((service, index) => (
              <ServiceCard
                key={service.id}
                index={index}
                {...service}
                description={service.tagline}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Shop Teaser */}
      <section className="py-24 bg-[#020617] relative overflow-hidden">
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#22c55e]/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 text-center md:text-left">
            <div className="max-w-2xl">
              <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Quality Hardware</span>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic leading-none">Products & Systems</h2>
            </div>
            <Link to="/shop" className="text-[#22c55e] font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:gap-4 transition-all mx-auto md:mx-0">
              View All Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {config.products.slice(0, 4).map((product, index) => (
              <ProductCard
                key={product.id}
                index={index}
                {...product}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Madiega Section */}
      <section className="py-24 bg-[#0f172a]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">The Madiega Difference</span>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic">Why Choose Us</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {config.trust.map((item, index) => {
              const IconComponent = (LucideIcons as any)[item.icon.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')] || LucideIcons.Shield;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-[#1e293b] p-8 rounded-2xl border border-white/5 text-center group hover:border-[#22c55e]/30 transition-all shadow-xl"
                >
                  <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center text-[#22c55e] mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">{item.label}</h4>
                  <p className="text-[#94a3b8] text-xs leading-relaxed">Professional service guaranteed across all trades.</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-[#020617]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Customer Success</span>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic">What Clients Say</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {config.testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={testimonial.name}
                index={index}
                {...testimonial}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Quote Banner */}
      <section className="py-20 bg-[#0f172a]">
        <div className="container mx-auto px-6">
          <div className="bg-[#1e293b] rounded-[2rem] border-l-[12px] border-[#22c55e] p-10 md:p-16 relative overflow-hidden shadow-2xl">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:20px_20px]" />
            </div>
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="max-w-2xl text-center lg:text-left">
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic mb-6 leading-tight">
                  Need a quote? We respond within 24 hours.
                </h2>
                <p className="text-[#94a3b8] text-lg font-medium">
                  Call, WhatsApp, or fill in the form — we'll get back to you fast with a competitive quote for your project.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6 shrink-0">
                <a
                  href={`tel:${config.business.phone}`}
                  className="w-full sm:w-auto bg-[#22c55e] text-white font-black uppercase tracking-widest px-10 py-5 rounded-2xl hover:bg-[#16a34a] transition-all transform hover:-translate-y-1 shadow-xl shadow-[#22c55e]/20 flex items-center justify-center gap-3"
                >
                  <Phone className="w-5 h-5" />
                  Call Now
                </a>
                <a
                  href={`https://wa.me/${config.business.whatsapp}`}
                  className="w-full sm:w-auto bg-white/5 backdrop-blur-md border border-white/10 text-white font-black uppercase tracking-widest px-10 py-5 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <MessageSquare className="w-5 h-5 text-[#22c55e]" />
                  WhatsApp Us
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
