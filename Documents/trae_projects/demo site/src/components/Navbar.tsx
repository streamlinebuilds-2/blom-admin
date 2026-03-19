import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { config } from '../config';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsOpen(false);
    setIsServicesOpen(false);
  }, [location]);

  const navLinks = [
    { name: 'Home', path: '/' },
    { 
      name: 'Services', 
      path: '/services',
      dropdown: config.services.map(s => ({ name: s.name, path: s.slug }))
    },
    { name: 'Shop', path: '/shop' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300">
      {/* Top Bar - Desktop Only */}
      <div className="hidden lg:block bg-[#020617] text-[#94a3b8] py-2 border-b border-white/5">
        <div className="container mx-auto px-6 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#22c55e]" />
              {config.business.coverage}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#22c55e]" />
              Callout: {config.business.calloutFee}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href={`tel:${config.business.phone}`} className="flex items-center gap-2 hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5 text-[#22c55e]" />
              {config.business.phone}
            </a>
            <a href={`https://wa.me/${config.business.whatsapp}`} className="flex items-center gap-2 hover:text-white transition-colors">
              <MessageSquare className="w-3.5 h-3.5 text-[#22c55e]" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className={`transition-all duration-300 ${isScrolled ? 'bg-[#0f172a]/95 backdrop-blur-md shadow-2xl py-3 border-b border-[#22c55e]/10' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="group">
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-black text-[#22c55e] leading-none group-hover:scale-105 transition-transform duration-300 uppercase italic">
                {config.business.name.split(' ')[0]}
              </span>
              <span className="text-[10px] font-bold text-white/60 tracking-[0.2em] uppercase mt-1 group-hover:text-white transition-colors duration-300">
                Trading Enterprise
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <div key={link.name} className="relative group/nav"
                onMouseEnter={() => link.dropdown && setIsServicesOpen(true)}
                onMouseLeave={() => link.dropdown && setIsServicesOpen(false)}
              >
                <Link
                  to={link.path}
                  className={`flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest transition-all duration-300 hover:text-[#22c55e] ${
                    location.pathname === link.path ? 'text-[#22c55e]' : 'text-white'
                  }`}
                >
                  {link.name}
                  {link.dropdown && <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isServicesOpen ? 'rotate-180 text-[#22c55e]' : ''}`} />}
                </Link>

                {/* Dropdown Menu */}
                {link.dropdown && (
                  <AnimatePresence>
                    {isServicesOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-4 w-64 bg-[#1e293b] border border-white/5 rounded-2xl shadow-2xl overflow-hidden py-3"
                      >
                        {link.dropdown.map((sub) => (
                          <Link
                            key={sub.name}
                            to={sub.path}
                            className={`block px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:bg-[#22c55e]/10 hover:text-[#22c55e] ${
                              location.pathname === sub.path ? 'text-[#22c55e] bg-[#22c55e]/5' : 'text-[#94a3b8]'
                            }`}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            ))}
          </div>

          {/* Right Action */}
          <div className="hidden lg:flex items-center gap-6">
            <Link
              to="/contact"
              className="bg-[#22c55e] text-white text-xs font-black uppercase tracking-widest px-8 py-3.5 rounded-xl hover:bg-[#16a34a] transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-[#22c55e]/20"
            >
              Get a Quote
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="lg:hidden p-2 text-white hover:text-[#22c55e] transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '100vh' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden fixed inset-0 top-0 bg-[#0f172a] z-[60] overflow-y-auto pt-24"
          >
            <div className="container mx-auto px-6 py-10 space-y-8">
              {navLinks.map((link) => (
                <div key={link.name} className="space-y-4">
                  <Link
                    to={link.path}
                    className={`block text-2xl font-black uppercase tracking-widest ${
                      location.pathname === link.path ? 'text-[#22c55e]' : 'text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                  {link.dropdown && (
                    <div className="grid grid-cols-1 gap-4 pl-4 border-l-2 border-[#22c55e]/20">
                      {link.dropdown.map((sub) => (
                        <Link
                          key={sub.name}
                          to={sub.path}
                          className={`block text-base font-bold uppercase tracking-wider ${
                            location.pathname === sub.path ? 'text-[#22c55e]' : 'text-[#94a3b8]'
                          }`}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <div className="pt-10 space-y-6 border-t border-white/5">
                <a href={`tel:${config.business.phone}`} className="flex items-center gap-4 text-xl font-bold text-white">
                  <div className="w-12 h-12 bg-[#22c55e]/10 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-[#22c55e]" />
                  </div>
                  {config.business.phone}
                </a>
                <Link
                  to="/contact"
                  className="block w-full bg-[#22c55e] text-white text-center font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl"
                >
                  Get a Quote
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
