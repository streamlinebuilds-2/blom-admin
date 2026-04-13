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
        <div className="topbar bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="font-bold">Contact Message</div>
        </div>
        <div className="content-area bg-gray-900 min-h-screen p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
      </>
    );
  }

  if (error || !contact) {
    return (
      <>
        <div className="topbar bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="font-bold">Contact Message</div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/messages')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Messages
            </button>
          </div>
        </div>
        <div className="content-area bg-gray-900 min-h-screen p-6">
          <div className="bg-red-900 border border-red-700 rounded p-4 text-red-300">
            {error || 'Contact message not found'}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="font-bold">Contact Message</div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/messages')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Back to Messages
          </button>
        </div>
      </div>

      <div className="content-area bg-gray-900 min-h-screen p-6 text-gray-100">
        {error && (
          <div className="bg-red-900 border border-red-700 rounded p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-400 mb-1">Name</div>
                <div className="p-3 bg-gray-700 rounded-lg text-white">
                  {contact.name}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-400 mb-1">Status</div>
                <select
                  className="w-full p-3 bg-gray-700 rounded-lg text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
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

            <div className="mt-4">
              <div className="text-sm font-medium text-gray-400 mb-1">Contact Actions</div>
              <div className="flex gap-2 mt-2">
                {contact.phone && (
                  <button
                    onClick={openWhatsApp}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                  >
                    📱 WhatsApp
                  </button>
                )}
                {contact.email && (
                  <button
                    onClick={openEmail}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
                  >
                    ✉️ Email
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 lg:col-span-2">
            <h3 className="text-xl font-bold mb-4">Message</h3>
            <div className="whitespace-pre-wrap p-3 bg-gray-700 rounded-lg text-white">
              {contact.message}
            </div>
          </div>

          {/* Attached Image */}
          {contact.image_url && (
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 lg:col-span-3">
              <h3 className="text-xl font-bold mb-4">Attached Image</h3>
              <div className="text-center">
                <img
                  src={contact.image_url}
                  alt="Contact attachment"
                  className="max-w-full max-h-96 rounded-lg shadow-md mx-auto"
                />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 lg:col-span-3">
            <h3 className="text-xl font-bold mb-4">Message Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-400 mb-1">Received</div>
                <div className="p-3 bg-gray-700 rounded-lg text-white">
                  {new Date(contact.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-400 mb-1">Last Updated</div>
                <div className="p-3 bg-gray-700 rounded-lg text-white">
                  {new Date(contact.updated_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 lg:col-span-3">
            {contact.status !== 'responded' && (
              <button
                onClick={() => updateStatus('responded')}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {saving ? 'Updating...' : 'Mark as Responded'}
              </button>
            )}
            <button
              onClick={() => navigate('/messages')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Messages
            </button>
          </div>
        </div>
      </div>
    </>
  );
}