import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Phone, MessageSquare } from 'lucide-react';
import { config } from '../config';

const Services: React.FC = () => {
  return (
    <div className="pt-24 overflow-hidden">
      {/* Hero Section */}
      <section className="bg-[#020617] py-24 relative">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#22c55e]/5 blur-[120px] rounded-full pointer-events-none" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Multi-Trade Expertise</span>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic mb-8 leading-tight">Our Services</h1>
            <p className="text-[#94a3b8] text-lg md:text-xl max-w-3xl mx-auto font-medium">
              Professional installations and supplies across Gauteng. We specialize in {config.business.tagline.toLowerCase()} — delivering quality results since {config.business.established}.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Service Blocks */}
      <section className="bg-[#0f172a] py-12">
        {config.services.map((service, index) => (
          <div key={service.id} className="py-12 md:py-24">
            <div className="container mx-auto px-6">
              <div className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-24 ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}>
                {/* Image side */}
                <motion.div
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="w-full lg:w-1/2 relative group"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-2xl">
                    <img 
                      src={service.heroImage} 
                      alt={service.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-60" />
                  </div>
                  {/* Decorative border accent */}
                  <div className={`absolute -bottom-6 -right-6 w-32 h-32 border-b-8 border-r-8 border-[#22c55e]/30 rounded-br-[3rem] hidden lg:block ${index % 2 !== 0 ? 'left-[-24px] right-auto border-l-8 border-r-0 rounded-bl-[3rem] rounded-br-0' : ''}`} />
                </motion.div>

                {/* Content side */}
                <motion.div
                  initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8 }}
                  className="w-full lg:w-1/2 space-y-8"
                >
                  <div>
                    <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Service {index + 1}</span>
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic mb-4">{service.name}</h2>
                    <p className="text-[#22c55e] font-bold text-lg italic">{service.tagline}</p>
                  </div>
                  
                  <p className="text-[#94a3b8] text-lg leading-relaxed">
                    {service.intro.split('. ')[0]}. {service.intro.split('. ')[1]}.
                  </p>

                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {service.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-white font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-[#22c55e] shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="pt-6">
                    <Link
                      to={service.slug}
                      className="inline-flex items-center gap-3 bg-[#22c55e] text-white font-black uppercase tracking-widest px-10 py-5 rounded-2xl hover:bg-[#16a34a] transition-all transform hover:-translate-y-1 shadow-xl shadow-[#22c55e]/20"
                    >
                      View {service.name}
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Quote Banner */}
      <section className="py-24 bg-[#020617]">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic leading-tight">
              Ready to start your next project?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
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
      </section>
    </div>
  );
};

export default Services;
