import React from 'react';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { config } from '../config';

const WhatsAppButton: React.FC = () => {
  const handleClick = () => {
    window.open(`https://wa.me/${config.business.whatsapp}`, '_blank');
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      {/* Pulse effect */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-[#22c55e] rounded-full"
      />
      
      <button
        onClick={handleClick}
        className="relative bg-[#22c55e] text-white p-5 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group flex items-center justify-center"
        aria-label="Contact on WhatsApp"
      >
        <MessageSquare className="w-7 h-7" />
        
        {/* Tooltip */}
        <span className="absolute right-full mr-6 bg-[#1e293b] text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none border border-white/5">
          Chat with an expert
        </span>
      </button>
    </div>
  );
};

export default WhatsAppButton;
