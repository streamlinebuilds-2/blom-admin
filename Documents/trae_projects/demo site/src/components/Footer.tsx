import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, MessageSquare, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { config } from '../config';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#020617] text-[#94a3b8] pt-20 pb-10 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Column 1: Brand */}
          <div className="space-y-6">
            <Link to="/" className="group inline-block">
              <div className="flex flex-col">
                <span className="text-2xl font-black text-[#22c55e] leading-none uppercase italic">
                  {config.business.name.split(' ')[0]}
                </span>
                <span className="text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase mt-1">
                  Trading Enterprise
                </span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              {config.business.sub} Delivering professional installations and supplies across Gauteng since {config.business.established}.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center text-white hover:bg-[#22c55e] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center text-white hover:bg-[#22c55e] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href={`https://wa.me/${config.business.whatsapp}`} className="w-10 h-10 bg-[#1e293b] rounded-lg flex items-center justify-center text-white hover:bg-[#22c55e] transition-colors">
                <MessageSquare className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Services */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-sm mb-8 border-l-4 border-[#22c55e] pl-4">Our Services</h4>
            <ul className="space-y-4 text-sm">
              {config.services.map((service) => (
                <li key={service.id}>
                  <Link to={service.slug} className="hover:text-[#22c55e] transition-colors flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#22c55e]/30 rounded-full" />
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Quick Links */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-sm mb-8 border-l-4 border-[#22c55e] pl-4">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              <li><Link to="/" className="hover:text-[#22c55e] transition-colors">Home</Link></li>
              <li><Link to="/services" className="hover:text-[#22c55e] transition-colors">Services Hub</Link></li>
              <li><Link to="/shop" className="hover:text-[#22c55e] transition-colors">Product Shop</Link></li>
              <li><Link to="/about" className="hover:text-[#22c55e] transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-[#22c55e] transition-colors">Contact & Locations</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h4 className="text-white font-bold uppercase tracking-widest text-sm mb-8 border-l-4 border-[#22c55e] pl-4">Contact Us</h4>
            <ul className="space-y-6 text-sm">
              <li className="flex gap-4">
                <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex shrink-0 items-center justify-center text-[#22c55e]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-tighter mb-1">Call Us</p>
                  <a href={`tel:${config.business.phone}`} className="text-white font-bold hover:text-[#22c55e] transition-colors">
                    {config.business.phone}
                  </a>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex shrink-0 items-center justify-center text-[#22c55e]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-tighter mb-1">Email Us</p>
                  <a href={`mailto:${config.business.email}`} className="text-white font-bold hover:text-[#22c55e] transition-colors break-all">
                    {config.business.email}
                  </a>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="w-10 h-10 bg-[#1e293b] rounded-lg flex shrink-0 items-center justify-center text-[#22c55e]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase font-bold tracking-tighter mb-1">Business Hours</p>
                  <p className="text-white font-bold">Mon–Fri: 7am–5pm</p>
                  <p className="text-white/60">Sat: 8am–1pm</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="border-t border-white/5 pt-12 pb-8">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-8">
            <div className="flex items-center gap-3 bg-[#1e293b]/50 px-6 py-3 rounded-xl border border-white/5">
              <Award className="w-6 h-6 text-[#22c55e]" />
              <span className="text-xs font-black text-white uppercase tracking-widest">Qualified Installers</span>
            </div>
            <div className="flex items-center gap-3 bg-[#1e293b]/50 px-6 py-3 rounded-xl border border-white/5">
              <ShieldCheck className="w-6 h-6 text-[#22c55e]" />
              <span className="text-xs font-black text-white uppercase tracking-widest">COC Certified</span>
            </div>
            <div className="flex items-center gap-3 bg-[#1e293b]/50 px-6 py-3 rounded-xl border border-white/5">
              <CheckCircle2 className="w-6 h-6 text-[#22c55e]" />
              <span className="text-xs font-black text-white uppercase tracking-widest">1-Year Warranty</span>
            </div>
            <div className="flex items-center gap-3 bg-[#1e293b]/50 px-6 py-3 rounded-xl border border-white/5">
              <MapPin className="w-6 h-6 text-[#22c55e]" />
              <span className="text-xs font-black text-white uppercase tracking-widest">Gauteng Coverage</span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/5 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
          <p>© {currentYear} {config.business.name}. All Rights Reserved.</p>
          <div className="flex gap-8">
            <Link to="/contact" className="hover:text-[#22c55e] transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-[#22c55e] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
