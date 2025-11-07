import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/components/supabaseClient';
import { toast } from '@/components/ui/use-toast';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  image_url?: string;
  status: 'new' | 'responded' | 'archived';
  created_at: string;
  updated_at: string;
}

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadContact = async () => {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Contact message not found');

        setContact(data);
      } catch (err: any) {
        console.error('Failed to load contact:', err);
        setError(err.message || 'Failed to load contact message');
      } finally {
        setLoading(false);
      }
    };

    loadContact();
  }, [id]);

  const updateStatus = async (newStatus: 'new' | 'responded' | 'archived') => {
    if (!contact) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', contact.id);

      if (updateError) throw updateError;

      setContact(prev => prev ? { ...prev, status: newStatus } : null);

      toast({
        title: "Status Updated",
        description: `Message marked as ${newStatus}`,
      });
    } catch (err: any) {
      console.error('Failed to update status:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const openWhatsApp = () => {
    if (!contact?.phone) return;
    const phoneNumber = contact.phone.replace(/\D/g, ''); // Remove non-digits
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    window.open(whatsappUrl, '_blank');
  };

  const openEmail = () => {
    if (!contact?.email) return;
    const emailUrl = `mailto:${contact.email}`;
    window.open(emailUrl, '_blank');
  };

  if (loading) {
    return (
      <>
        <div className="topbar">
          <div className="font-bold">Contact Message</div>
        </div>
        <div className="content-area">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
          </div>
        </div>
      </>
    );
  }

  if (error || !contact) {
    return (
      <>
        <div className="topbar">
          <div className="font-bold">Contact Message</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate('/messages')}
              className="btn-primary"
              style={{ background: 'var(--accent-2)' }}
            >
              Back to Messages
            </button>
          </div>
        </div>
        <div className="content-area">
          <div className="section-card error-message">
            {error || 'Contact message not found'}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="font-bold">Contact Message</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate('/messages')}
            className="btn-primary"
            style={{ background: 'var(--accent-2)' }}
          >
            Back to Messages
          </button>
        </div>
      </div>

      <div className="content-area">
        {error && (
          <div className="section-card error-message">
            {error}
          </div>
        )}

        <div className="form-col">
          {/* Contact Info */}
          <div className="section-card">
            <h3 className="section-title">Contact Information</h3>
            <div className="form-grid">
              <div>
                <div className="label">Name</div>
                <div style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: '12px', color: 'var(--text)' }}>
                  {contact.name}
                </div>
              </div>
              <div>
                <div className="label">Status</div>
                <select
                  className="select"
                  value={contact.status}
                  onChange={(e) => updateStatus(e.target.value as 'new' | 'responded' | 'archived')}
                  disabled={saving}
                >
                  <option value="new">New</option>
                  <option value="responded">Responded</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div className="label">Contact Actions</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                {contact.phone && (
                  <button
                    onClick={openWhatsApp}
                    className="btn-primary"
                    style={{ background: '#25D366', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    📱 WhatsApp
                  </button>
                )}
                {contact.email && (
                  <button
                    onClick={openEmail}
                    className="btn-primary"
                    style={{ background: '#EA4335', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    ✉️ Email
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="section-card">
            <h3 className="section-title">Message</h3>
            <div style={{ whiteSpace: 'pre-wrap', padding: '12px', background: 'var(--card)', borderRadius: '12px', color: 'var(--text)' }}>
              {contact.message}
            </div>
          </div>

          {/* Attached Image */}
          {contact.image_url && (
            <div className="section-card">
              <h3 className="section-title">Attached Image</h3>
              <div style={{ textAlign: 'center' }}>
                <img
                  src={contact.image_url}
                  alt="Contact attachment"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="section-card">
            <h3 className="section-title">Message Details</h3>
            <div className="form-grid">
              <div>
                <div className="label">Received</div>
                <div style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: '12px', color: 'var(--text)' }}>
                  {new Date(contact.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="label">Last Updated</div>
                <div style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: '12px', color: 'var(--text)' }}>
                  {new Date(contact.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {contact.status !== 'responded' && (
              <button
                onClick={() => updateStatus('responded')}
                disabled={saving}
                className="btn-primary"
                style={{ background: '#10B981' }}
              >
                {saving ? 'Updating...' : 'Mark as Responded'}
              </button>
            )}
            <button
              onClick={() => navigate('/messages')}
              className="btn-primary"
              style={{ background: 'var(--accent-2)' }}
            >
              Back to Messages
            </button>
          </div>
        </div>
      </div>
    </>
  );
}