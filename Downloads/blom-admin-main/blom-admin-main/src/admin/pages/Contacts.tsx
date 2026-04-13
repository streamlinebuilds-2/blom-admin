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
        <div className="topbar bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="font-bold">Contact Messages</div>
        </div>
        <div className="content-area bg-gray-900 min-h-screen p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar bg-gray-800 text-white p-4 flex justify-between items-center">
        <div className="font-bold">Contact Messages</div>
        <div className="flex gap-2 items-center">
          <select
            className="p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'new' | 'responded' | 'archived')}
          >
            <option value="all">All Messages</option>
            <option value="new">New</option>
            <option value="responded">Responded</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="content-area bg-gray-900 min-h-screen p-6 text-gray-100">
        {error && (
          <div className="bg-red-900 border border-red-700 rounded p-4 text-red-300 mb-4">
            {error}
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg shadow-lg">
            <div className="text-xl font-bold text-white">
              {filter === 'all' ? 'No contact messages yet' : `No ${filter} messages`}
            </div>
            <p className="text-gray-400 mt-2">Messages from your contact form will appear here.</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Phone</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Message</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-700 transition-colors duration-200" onClick={() => navigate(`/messages/${contact.id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{contact.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{contact.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{contact.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{truncateMessage(contact.message)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(contact.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(contact.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/messages/${contact.id}`);
                        }}
                        className="text-blue-500 hover:text-blue-400 font-bold py-1 px-3 rounded bg-blue-900 bg-opacity-30"
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