import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, MapPin, ShieldCheck, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { config } from '../config';
import QuoteForm from '../components/QuoteForm';

const ServicePage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const service = config.services.find(s => s.id === serviceId);

  if (!service) {
    return <Navigate to="/services" replace />;
  }

  const handleSolutionQuote = (solutionName: string, price: string) => {
    const message = `Hi Madiega Trading! I'd like a quote for the ${solutionName} (${price}) under ${service.name} services.`;
    const whatsappUrl = `https://wa.me/${config.business.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="pt-24 bg-[#0f172a] min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={service.heroImage} 
            alt={service.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/80 to-transparent" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Professional Trade Service</span>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic mb-6 leading-tight">{service.name}</h1>
            <p className="text-[#22c55e] text-xl md:text-2xl font-bold italic mb-8">{service.tagline}</p>
            <button
              onClick={() => document.getElementById('quote-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#22c55e] text-white font-black uppercase tracking-widest px-10 py-5 rounded-2xl hover:bg-[#16a34a] transition-all transform hover:-translate-y-1 shadow-xl shadow-[#22c55e]/20"
            >
              Get a Quote
            </button>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Left Content */}
            <div className="flex-grow space-y-20">
              {/* Intro & Trust Strip */}
              <div className="space-y-10">
                <div className="prose prose-invert max-w-none">
                  <p className="text-[#94a3b8] text-xl leading-relaxed font-medium">
                    {service.intro}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#22c55e]/10 rounded-full flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6 text-[#22c55e]" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm uppercase tracking-wider">{service.callout.split(' — ')[0]}</p>
                      <p className="text-[#94a3b8] text-xs">{service.callout.split(' — ')[1] || 'Professional Assessment'}</p>
                    </div>
                  </div>
                  <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#22c55e]/10 rounded-full flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-[#22c55e]" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm uppercase tracking-wider">Gauteng Wide</p>
                      <p className="text-[#94a3b8] text-xs">Full Coverage Area</p>
                    </div>
                  </div>
                  <div className="bg-[#1e293b] p-6 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#22c55e]/10 rounded-full flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-6 h-6 text-[#22c55e]" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm uppercase tracking-wider">1-Year Warranty</p>
                      <p className="text-[#94a3b8] text-xs">Workmanship Guaranteed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Solutions Grid */}
              <div className="space-y-12">
                <div className="text-center lg:text-left">
                  <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Tailored Packages</span>
                  <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic leading-none">Our {service.name} Solutions</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {service.solutions.map((solution, idx) => (
                    <motion.div
                      key={solution.name}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className="group bg-[#1e293b] rounded-2xl overflow-hidden border border-white/5 hover:border-[#22c55e]/30 transition-all shadow-xl"
                    >
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={solution.image} 
                          alt={solution.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-white group-hover:text-[#22c55e] transition-colors uppercase tracking-tight leading-tight">{solution.name}</h3>
                        <p className="text-[#94a3b8] text-sm leading-relaxed">{solution.description}</p>
                        <div className="pt-2">
                          <p className="text-[#22c55e] font-black text-sm uppercase mb-4">{solution.price}</p>
                          <button
                            onClick={() => handleSolutionQuote(solution.name, solution.price)}
                            className="w-full bg-[#0f172a] text-white font-bold py-3 rounded-xl border border-white/5 hover:bg-[#22c55e] hover:border-[#22c55e] transition-all flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Request Quote
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* How It Works */}
              <div className="space-y-12 py-12">
                <div className="text-center lg:text-left">
                  <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Our Methodology</span>
                  <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic leading-none">How It Works</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {service.process.map((step, idx) => (
                    <div key={idx} className="relative group">
                      <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-4">
                        <div className="w-16 h-16 bg-[#22c55e] text-white font-black text-2xl flex items-center justify-center rounded-2xl shadow-lg shadow-[#22c55e]/20 transform rotate-3 group-hover:rotate-0 transition-transform">
                          {step.step}
                        </div>
                        <h4 className="text-white font-bold uppercase tracking-widest text-sm">{step.title}</h4>
                        <p className="text-[#94a3b8] text-xs leading-relaxed font-medium">{step.desc}</p>
                      </div>
                      {idx < 3 && (
                        <div className="hidden lg:block absolute top-8 left-[80%] w-[60%] border-t-2 border-dashed border-[#22c55e]/20 z-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Features List */}
              <div className="bg-[#1e293b] p-10 md:p-16 rounded-[2rem] border border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h3 className="text-3xl font-black text-white uppercase italic">Full Scope of Service</h3>
                    <p className="text-[#94a3b8] font-medium leading-relaxed">
                      We offer a comprehensive range of solutions within the {service.name.toLowerCase()} sector. Every project is handled with precision and professional oversight.
                    </p>
                  </div>
                  <ul className="grid grid-cols-1 gap-4">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-4 text-white font-bold text-sm">
                        <CheckCircle2 className="w-6 h-6 text-[#22c55e] shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Side - Sticky Form */}
            <aside className="w-full lg:w-[400px] shrink-0">
              <div className="sticky top-32" id="quote-form">
                <QuoteForm serviceName={service.name} />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicePage;
