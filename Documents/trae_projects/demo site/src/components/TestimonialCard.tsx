import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

interface TestimonialCardProps {
  name: string;
  location: string;
  stars: number;
  text: string;
  service: string;
  index: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ name, location, stars, text, service, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-[#1e293b] p-8 rounded-2xl border border-white/5 relative shadow-xl hover:shadow-2xl transition-shadow group"
    >
      {/* Decorative quote icon */}
      <div className="absolute top-6 right-6 text-[#22c55e]/10 group-hover:text-[#22c55e]/20 transition-colors">
        <Quote className="w-12 h-12 rotate-180" />
      </div>

      <div className="flex gap-1 mb-6">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-5 h-5 ${i < stars ? 'text-[#22c55e] fill-[#22c55e]' : 'text-[#94a3b8] fill-[#94a3b8]'}`}
          />
        ))}
      </div>

      <p className="text-[#f8fafc] text-lg italic leading-relaxed mb-8 relative z-10">"{text}"</p>

      <div className="flex items-center justify-between border-t border-white/5 pt-6">
        <div>
          <h4 className="font-bold text-white text-base mb-1">{name}</h4>
          <p className="text-[#94a3b8] text-sm font-medium tracking-wide uppercase">{location}</p>
        </div>
        <div className="bg-[#0f172a] px-3 py-1.5 rounded-lg border border-white/5">
          <span className="text-[10px] font-bold text-[#22c55e] uppercase tracking-widest">{service}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TestimonialCard;
