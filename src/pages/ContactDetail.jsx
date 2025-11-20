// src/pages/ContactDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { api } from "@/components/data/api";
import { ShoppingBag, Tag, User, Mail, Phone, Calendar } from "lucide-react";

export default function ContactDetail(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  async function load(){
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getContactDetail(id);
      setData(res);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [id]);

  const moneyZAR = (cents) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(cents / 100);
  };

  if (loading) return <div className="p-6" style={{ color: 'var(--text)' }}>Loading...</div>;
  if (!data || !data.contact) return <div className="p-6" style={{ color: 'var(--text)' }}>Contact not found</div>;

  const { contact, orders, coupons } = data;

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text)' }}>
      <div className="flex items-center gap-4">
        <button
          onClick={()=>navigate("/contacts")}
          style={{
            padding: '4px 12px',
            border: '1px solid var(--card)',
            background: 'var(--card)',
            color: 'var(--text)',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold">Customer Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div className="md:col-span-1 space-y-6">
          <div style={{
            border: '1px solid var(--card)',
            borderRadius: '12px',
            padding: '24px',
            background: 'var(--card)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold">Contact Details</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                <div className="mt-1 font-medium text-lg">{contact.full_name || '—'}</div>
              </div>
              
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</label>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${contact.email}`} className="hover:underline" style={{ color: 'var(--accent)' }}>{contact.email}</a>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Phone</label>
                <div className="mt-1 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="hover:underline" style={{ color: 'var(--accent)' }}>{contact.phone}</a>
                  ) : '—'}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Joined</label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(contact.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Active Coupons */}
          <div style={{
            border: '1px solid var(--card)',
            borderRadius: '12px',
            padding: '24px',
            background: 'var(--card)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-full bg-purple-500/10 text-purple-500">
                <Tag className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold">Active Coupons</h2>
            </div>

            {coupons && coupons.length > 0 ? (
              <div className="space-y-3">
                {coupons.map((coupon, i) => (
                  <div key={i} className="p-3 rounded-lg border border-dashed border-gray-600 bg-gray-50/5">
                    <div className="font-mono font-bold text-lg text-purple-400">{coupon.code}</div>
                    <div className="text-sm mt-1">
                      {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `R${coupon.discount_value} OFF`}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Expires: {new Date(coupon.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No active coupons</div>
            )}
          </div>
        </div>

        {/* Order History */}
        <div className="md:col-span-2">
          <div style={{
            border: '1px solid var(--card)',
            borderRadius: '12px',
            padding: '24px',
            background: 'var(--card)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-full bg-green-500/10 text-green-500">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold">Recent Orders</h2>
            </div>

            {orders && orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-3 px-4 font-semibold text-sm text-gray-400">Order #</th>
                      <th className="py-3 px-4 font-semibold text-sm text-gray-400">Date</th>
                      <th className="py-3 px-4 font-semibold text-sm text-gray-400">Status</th>
                      <th className="py-3 px-4 font-semibold text-sm text-gray-400">Fulfillment</th>
                      <th className="py-3 px-4 font-semibold text-sm text-gray-400 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-50/5 transition-colors cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                        <td className="py-4 px-4 font-medium text-accent">{order.order_number}</td>
                        <td className="py-4 px-4 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 capitalize">
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm capitalize">{order.fulfillment_method?.replace('_', ' ') || '-'}</td>
                        <td className="py-4 px-4 font-medium text-right">{moneyZAR(order.total_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 bg-gray-50/5 rounded-lg">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No paid orders found for this customer.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
