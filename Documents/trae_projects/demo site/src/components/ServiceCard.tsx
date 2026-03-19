import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface ServiceCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  slug: string;
  index: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ name, description, icon, slug, index }) => {
  // Dynamically get icon component
  const getIcon = (name: string) => {
    const pascalName = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    return (LucideIcons as any)[pascalName] || LucideIcons.HelpCircle;
  };

  const IconComponent = getIcon(icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group"
    >
      <Link 
        to={slug}
        className="block h-full bg-[#1e293b] p-8 rounded-2xl border-t-4 border-transparent hover:border-[#22c55e] transition-all duration-300 hover:shadow-2xl relative overflow-hidden"
      >
        {/* Background glow effect on hover */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-48 h-48 bg-[#22c55e]/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="mb-6 relative">
          <div className="w-14 h-14 bg-[#0f172a] rounded-xl flex items-center justify-center text-[#22c55e] group-hover:bg-[#22c55e] group-hover:text-white transition-all duration-300">
            <IconComponent className="w-8 h-8" />
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#22c55e] transition-colors">{name}</h3>
        <p className="text-[#94a3b8] text-sm leading-relaxed mb-6">{description}</p>
        
        <div className="flex items-center text-[#22c55e] font-bold text-sm group-hover:gap-2 transition-all">
          Learn More
          <LucideIcons.ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </Link>
    </motion.div>
  );
};

export default ServiceCard;
