import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, CheckCircle2 } from 'lucide-react';
import { config } from '../config';

interface ProductCardProps {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  badge?: string;
  index: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ name, category, price, description, image, badge, index }) => {
  const handleQuoteRequest = () => {
    const message = `Hi! I'd like a quote for ${name} priced at R${price.toLocaleString()}.`;
    const whatsappUrl = `https://wa.me/${config.business.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative flex flex-col h-full bg-[#1e293b] rounded-2xl overflow-hidden border border-white/5 hover:border-[#22c55e]/30 transition-all shadow-xl hover:shadow-2xl"
    >
      {/* Image Section */}
      <div className="relative h-64 overflow-hidden">
        <img 
          src={image} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {badge && (
            <span className="bg-[#22c55e] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
              {badge}
            </span>
          )}
          <span className="bg-[#0f172a]/80 backdrop-blur-md text-[#94a3b8] text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            {category}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
          <span className="text-[10px] font-bold text-[#22c55e] uppercase tracking-widest">In Stock</span>
        </div>
        
        <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-[#22c55e] transition-colors">{name}</h3>
        <p className="text-[#94a3b8] text-sm mb-4 flex-grow line-clamp-2">{description}</p>
        
        <div className="mt-auto">
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-xs text-[#94a3b8] font-medium uppercase tracking-tighter">Price from</span>
            <span className="text-2xl font-bold text-[#22c55e]">R{price.toLocaleString()}</span>
          </div>
          
          <button
            onClick={handleQuoteRequest}
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-[#22c55e]/20"
          >
            <MessageSquare className="w-5 h-5" />
            Request Quote
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
