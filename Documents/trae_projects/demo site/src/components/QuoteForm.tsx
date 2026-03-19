import React, { useState } from 'react';
import { Send, Phone, MessageSquare } from 'lucide-react';
import { config } from '../config';

interface QuoteFormProps {
  serviceName?: string;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ serviceName }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    enquiry: '',
    preferredTime: 'Morning',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = `Hi Madiega Trading! I'd like a quote for ${serviceName || 'a service'}.
Name: ${formData.name}
Phone: ${formData.phone}
Location: ${formData.location}
Preferred Time: ${formData.preferredTime}
Enquiry: ${formData.enquiry}`;

    const whatsappUrl = `https://wa.me/${config.business.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="bg-[#1e293b] p-6 rounded-xl border border-white/5 shadow-2xl">
      <h3 className="text-xl font-bold mb-4">Request a Quote</h3>
      <p className="text-[#94a3b8] text-sm mb-6">We respond within 24 hours.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1">Name</label>
          <input
            required
            type="text"
            className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#22c55e] transition-colors"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1">Phone</label>
          <input
            required
            type="tel"
            className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#22c55e] transition-colors"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1">Location (Suburb)</label>
          <input
            required
            type="text"
            className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#22c55e] transition-colors"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1">Preferred Contact Time</label>
          <select
            className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#22c55e] transition-colors"
            value={formData.preferredTime}
            onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
          >
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#94a3b8] mb-1">Specific Enquiry</label>
          <textarea
            required
            rows={3}
            className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-[#22c55e] transition-colors resize-none"
            value={formData.enquiry}
            onChange={(e) => setFormData({ ...formData, enquiry: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-[#22c55e] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#16a34a] transition-colors"
        >
          <Send className="w-5 h-5" />
          Send via WhatsApp
        </button>
      </form>

      <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
        <a href={`tel:${config.business.phone}`} className="flex items-center gap-3 text-[#f8fafc] hover:text-[#22c55e] transition-colors">
          <Phone className="w-5 h-5 text-[#22c55e]" />
          <span>{config.business.phone}</span>
        </a>
        <a href={`https://wa.me/${config.business.whatsapp}`} className="flex items-center gap-3 text-[#f8fafc] hover:text-[#22c55e] transition-colors">
          <MessageSquare className="w-5 h-5 text-[#22c55e]" />
          <span>Chat on WhatsApp</span>
        </a>
      </div>
    </div>
  );
};

export default QuoteForm;
