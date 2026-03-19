import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, MessageSquare, Send, ArrowRight } from 'lucide-react';
import { config } from '../config';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: config.services[0].name,
    location: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const whatsappMessage = `Hi Madiega Trading! I have an enquiry.
Name: ${formData.name}
Phone: ${formData.phone}
Service: ${formData.service}
Location: ${formData.location}
Message: ${formData.message}`;

    const whatsappUrl = `https://wa.me/${config.business.whatsapp}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="pt-24 bg-[#0f172a] min-h-screen">
      {/* Hero Section */}
      <section className="bg-[#020617] py-24 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Connect With Us</span>
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic mb-8 leading-tight">Get in Touch</h1>
            <p className="text-[#94a3b8] text-lg md:text-xl max-w-3xl mx-auto font-medium">
              Have a project in mind or an emergency callout? Our team is ready to assist you across Gauteng. We respond to all enquiries within 24 hours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16">
            {/* Left: Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-3/5"
            >
              <div className="bg-[#1e293b] p-10 md:p-16 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#22c55e]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <h2 className="text-3xl font-black text-white uppercase italic mb-10 relative z-10">Send a Message</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-4">Full Name</label>
                      <input
                        required
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-[#0f172a] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#22c55e] transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-4">Phone Number</label>
                      <input
                        required
                        type="tel"
                        placeholder="+27 00 000 0000"
                        className="w-full bg-[#0f172a] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#22c55e] transition-all"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-4">Service Needed</label>
                      <select
                        className="w-full bg-[#0f172a] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#22c55e] transition-all appearance-none cursor-pointer"
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      >
                        {config.services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-4">Location (Suburb)</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Meyerton"
                        className="w-full bg-[#0f172a] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#22c55e] transition-all"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest ml-4">Your Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="How can we help you?"
                      className="w-full bg-[#0f172a] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#22c55e] transition-all resize-none"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#22c55e] text-white font-black uppercase tracking-widest py-6 rounded-2xl hover:bg-[#16a34a] transition-all transform hover:-translate-y-1 shadow-2xl shadow-[#22c55e]/20 flex items-center justify-center gap-3"
                  >
                    <Send className="w-6 h-6" />
                    Submit via WhatsApp
                  </button>
                </form>
              </div>
            </motion.div>

            {/* Right: Contact Details */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-2/5 space-y-8"
            >
              <div className="bg-[#1e293b] p-10 rounded-[3rem] border border-white/5 space-y-10">
                <h3 className="text-2xl font-black text-white uppercase italic">Contact Details</h3>
                
                <div className="space-y-8">
                  <a href={`tel:${config.business.phone}`} className="flex items-center gap-6 group">
                    <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center text-[#22c55e] group-hover:bg-[#22c55e] group-hover:text-white transition-all">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Call Us Directly</p>
                      <p className="text-xl font-bold text-white group-hover:text-[#22c55e] transition-colors">{config.business.phone}</p>
                    </div>
                  </a>

                  <a href={`https://wa.me/${config.business.whatsapp}`} className="flex items-center gap-6 group">
                    <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center text-[#22c55e] group-hover:bg-[#22c55e] group-hover:text-white transition-all">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">WhatsApp Chat</p>
                      <p className="text-xl font-bold text-white group-hover:text-[#22c55e] transition-colors">Chat Now</p>
                    </div>
                  </a>

                  <a href={`mailto:${config.business.email}`} className="flex items-center gap-6 group">
                    <div className="w-14 h-14 bg-[#0f172a] rounded-2xl flex items-center justify-center text-[#22c55e] group-hover:bg-[#22c55e] group-hover:text-white transition-all">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-1">Email Address</p>
                      <p className="text-lg font-bold text-white group-hover:text-[#22c55e] transition-colors break-all">{config.business.email}</p>
                    </div>
                  </a>
                </div>

                <div className="pt-10 border-t border-white/5 space-y-8">
                  <div className="flex items-start gap-6">
                    <MapPin className="w-6 h-6 text-[#22c55e] mt-1" />
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2">Meyerton Office</p>
                        <p className="text-white font-bold leading-relaxed">{config.business.address}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2">JHB South Office</p>
                        <p className="text-white font-bold leading-relaxed">{config.business.address2}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-6">
                    <Clock className="w-6 h-6 text-[#22c55e] mt-1" />
                    <div>
                      <p className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-2">Operating Hours</p>
                      <p className="text-white font-bold">Mon – Fri: 07:00 – 17:00</p>
                      <p className="text-white/60 font-bold">Sat: 08:00 – 13:00</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0f172a] p-8 rounded-2xl border border-[#22c55e]/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#22c55e] rounded-full flex items-center justify-center text-white font-black italic">!</div>
                    <div>
                      <p className="text-white font-black uppercase tracking-widest text-sm">Callout Fee: {config.business.calloutFee}</p>
                      <p className="text-[#94a3b8] text-xs font-medium">Fee is credited against the final job cost.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Map Embed */}
          <div className="mt-24">
            <div className="text-center mb-12">
              <span className="text-[#22c55e] text-xs font-black uppercase tracking-[0.3em] block mb-4">Find Our Locations</span>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic">Service Coverage Map</h2>
            </div>
            <div className="h-[600px] rounded-[4rem] overflow-hidden border border-white/5 grayscale invert opacity-80 hover:grayscale-0 hover:invert-0 hover:opacity-100 transition-all duration-700 shadow-2xl">
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
            <div className="mt-12 flex justify-center">
              <div className="bg-[#1e293b] px-8 py-4 rounded-full border border-white/5 flex items-center gap-4">
                <MapPin className="w-5 h-5 text-[#22c55e]" />
                <span className="text-[#94a3b8] font-bold text-sm uppercase tracking-widest">Serving all major areas in Gauteng</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
