import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Award, CheckCircle2, Zap } from 'lucide-react';
import { config } from '../config';
import StatsBanner from '../components/StatsBanner';

const About: React.FC = () => {
  return (
    <div className="pt-24 bg-[#0f172a] min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="bg-[#020617] py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600" 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#020617]" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Our Legacy</span>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic mb-8 leading-tight">About Madiega</h1>
            <p className="text-[#94a3b8] text-lg md:text-xl max-w-3xl mx-auto font-medium">
              Established in {config.business.established}, Madiega Trading Enterprise has grown into a leading multi-trade service provider across Gauteng, delivering excellence in solar, plumbing, construction, and security.
            </p>
          </motion.div>
        </div>
      </section>

      <StatsBanner />

      {/* Story Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2 space-y-8"
            >
              <div className="space-y-4">
                <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block">How We Started</span>
                <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic leading-none">Built on Trust & Professionalism</h2>
              </div>
              
              <div className="prose prose-invert prose-lg text-[#94a3b8]">
                <p>
                  Madiega Trading Enterprise was founded with a clear mission: to provide Gauteng residents and businesses with a reliable, one-stop solution for their most critical trade needs. We recognized the frustration many property owners faced when dealing with multiple, uncoordinated contractors.
                </p>
                <p>
                  By bringing together qualified experts in solar power, plumbing, construction, and security, we've created a service model that prioritizes quality, transparency, and long-term value. Today, we are proud to have completed over 500 projects, ranging from residential solar installations to commercial plumbing infrastructure.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8">
                <div className="space-y-2">
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">Qualified</h4>
                  <p className="text-[#94a3b8] text-xs">Certified installers & technicians across all departments.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">Reliable</h4>
                  <p className="text-[#94a3b8] text-xs">24-hour response time for emergencies and callouts.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2 relative"
            >
              <div className="relative aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1000" 
                  alt="Our Team" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-60" />
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-10 -left-10 bg-[#22c55e] p-8 rounded-[2rem] shadow-2xl hidden md:block max-w-[240px] transform -rotate-3">
                <Zap className="w-10 h-10 text-white mb-4" />
                <p className="text-white font-black uppercase tracking-widest text-sm leading-tight">Gauteng's #1 Multi-Trade Choice</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-24 bg-[#020617]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Our Presence</span>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic">Where to Find Us</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <div className="bg-[#1e293b] p-10 rounded-[2.5rem] border border-white/5 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#22c55e]/5 blur-3xl rounded-full" />
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center text-[#22c55e] shrink-0">
                  <MapPin className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-white uppercase italic">Head Office (Meyerton)</h4>
                  <p className="text-[#94a3b8] font-medium leading-relaxed">{config.business.address}</p>
                </div>
              </div>
              <div className="pt-4 flex flex-wrap gap-6">
                <a href={`tel:${config.business.phone}`} className="flex items-center gap-2 text-white font-bold text-sm hover:text-[#22c55e] transition-colors">
                  <Phone className="w-4 h-4 text-[#22c55e]" />
                  {config.business.phone}
                </a>
                <a href={`mailto:${config.business.email}`} className="flex items-center gap-2 text-white font-bold text-sm hover:text-[#22c55e] transition-colors">
                  <Mail className="w-4 h-4 text-[#22c55e]" />
                  {config.business.email}
                </a>
              </div>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=6+Pretorius+Road+Henley-on-Klip" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[#22c55e] font-black uppercase tracking-widest text-[10px] hover:gap-4 transition-all"
              >
                Get Directions <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-[#1e293b] p-10 rounded-[2.5rem] border border-white/5 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#22c55e]/5 blur-3xl rounded-full" />
              <div className="flex items-start gap-6">
                <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center text-[#22c55e] shrink-0">
                  <MapPin className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-white uppercase italic">JHB South (Mondeor)</h4>
                  <p className="text-[#94a3b8] font-medium leading-relaxed">{config.business.address2}</p>
                </div>
              </div>
              <div className="pt-4 flex flex-wrap gap-6">
                <a href={`tel:${config.business.phone}`} className="flex items-center gap-2 text-white font-bold text-sm hover:text-[#22c55e] transition-colors">
                  <Phone className="w-4 h-4 text-[#22c55e]" />
                  {config.business.phone}
                </a>
                <a href={`mailto:${config.business.email}`} className="flex items-center gap-2 text-white font-bold text-sm hover:text-[#22c55e] transition-colors">
                  <Mail className="w-4 h-4 text-[#22c55e]" />
                  {config.business.email}
                </a>
              </div>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=148+Columbine+Avenue+Mondeor" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[#22c55e] font-black uppercase tracking-widest text-[10px] hover:gap-4 transition-all"
              >
                Get Directions <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Map Embed */}
          <div className="h-[500px] rounded-[3rem] overflow-hidden border border-white/5 grayscale invert opacity-80 hover:grayscale-0 hover:invert-0 hover:opacity-100 transition-all duration-700 shadow-2xl">
            <iframe
              src={config.business.mapsEmbed}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Credentials */}
      <section className="py-24 bg-[#0f172a]">
        <div className="container mx-auto px-6">
          <div className="bg-[#1e293b] rounded-[3rem] p-12 md:p-20 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:30px_30px]" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-xl text-center md:text-left">
                <h3 className="text-3xl md:text-5xl font-black text-white uppercase italic mb-6">Certified & Insured</h3>
                <p className="text-[#94a3b8] text-lg font-medium">
                  We maintain the highest industry standards. Every job we do comes with the necessary compliance certificates and a solid workmanship warranty.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                <div className="bg-[#0f172a] p-6 rounded-2xl border border-white/5 text-center">
                  <ShieldCheck className="w-10 h-10 text-[#22c55e] mx-auto mb-4" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">COC Certified</span>
                </div>
                <div className="bg-[#0f172a] p-6 rounded-2xl border border-white/5 text-center">
                  <Award className="w-10 h-10 text-[#22c55e] mx-auto mb-4" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Qualified Team</span>
                </div>
                <div className="bg-[#0f172a] p-6 rounded-2xl border border-white/5 text-center">
                  <CheckCircle2 className="w-10 h-10 text-[#22c55e] mx-auto mb-4" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Insured Work</span>
                </div>
                <div className="bg-[#0f172a] p-6 rounded-2xl border border-white/5 text-center">
                  <Clock className="w-10 h-10 text-[#22c55e] mx-auto mb-4" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">5+ Years Exp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
