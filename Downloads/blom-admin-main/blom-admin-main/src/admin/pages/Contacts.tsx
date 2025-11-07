import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function ContactsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'responded' | 'archived'>('all');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setContacts(data || []);
    } catch (err: any) {
      console.error('Failed to load contacts:', err);
      setError(err.message || 'Failed to load contact messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [filter]);

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      new: 'status-active',
      responded: 'status-draft',
      archived: 'status-archived'
    };

    const statusText = {
      new: 'New',
      responded: 'Responded',
      archived: 'Archived'
    };

    return (
      <span className={`status-badge ${statusClasses[status as keyof typeof statusClasses] || 'status-archived'}`}>
        {statusText[status as keyof typeof statusText] || status}
      </span>
    );
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <>
        <div className="topbar">
          <div className="font-bold">Contact Messages</div>
        </div>
        <div className="content-area">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="font-bold">Contact Messages</div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="select"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'new' | 'responded' | 'archived')}
            style={{ marginRight: '8px' }}
          >
            <option value="all">All Messages</option>
            <option value="new">New</option>
            <option value="responded">Responded</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="content-area">
        {error && (
          <div className="section-card error-message">
            {error}
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">
              {filter === 'all' ? 'No contact messages yet' : `No ${filter} messages`}
            </div>
            <p>Messages from your contact form will appear here.</p>
          </div>
        ) : (
          <div className="section-card">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/messages/${contact.id}`)}>
                    <td style={{ fontWeight: '600' }}>{contact.name}</td>
                    <td>{contact.email}</td>
                    <td>{contact.phone || '-'}</td>
                    <td>{truncateMessage(contact.message)}</td>
                    <td>{getStatusBadge(contact.status)}</td>
                    <td>{new Date(contact.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/messages/${contact.id}`);
                        }}
                        className="btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        View
                      </button>
                    </td>
                    <td style={{ fontWeight: '600' }}>{contact.name}</td>
                    <td>{contact.email}</td>
                    <td>{contact.phone || '-'}</td>
                    <td>{truncateMessage(contact.message)}</td>
                    <td>{getStatusBadge(contact.status)}</td>
                    <td>{new Date(contact.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/messages/${contact.id}`);
                        }}
                        className="btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}