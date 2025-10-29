import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Mail, Phone } from "lucide-react";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";
import { api } from "@/components/data/api";

export default function Contacts() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: contactsData = [], isLoading, error } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => [], // Contacts not yet implemented in Supabase adapter
    enabled: false, // Disabled until implemented
  });

  const contacts = Array.isArray(contactsData) ? contactsData : [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      throw new Error('Contacts not yet implemented in Supabase adapter');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      showToast('success', 'Contact added successfully');
      setShowAddForm(false);
      setFormData({ name: "", email: "", phone: "" });
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to add contact');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email) {
      showToast('error', 'Email is required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <>
      <style>{`
        .contacts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .header-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-add {
          padding: 12px 20px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-add:hover {
          transform: translateY(-2px);
        }

        .contacts-list {
          background: var(--card);
          border-radius: 16px;
          padding: 0;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          overflow: hidden;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 20px 24px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border);
        }

        td {
          padding: 20px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        .contact-name {
          font-weight: 600;
        }

        .contact-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 13px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
        }

        .empty-state-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }

        .form-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .form-container {
          background: var(--card);
          border-radius: 16px;
          padding: 32px;
          width: 500px;
          max-width: 90vw;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
        }

        .form-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: var(--bg);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-cancel {
          padding: 12px 24px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .btn-submit {
          padding: 12px 24px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }
      `}</style>

      <div className="contacts-header">
        <h1 className="header-title">
          <Users className="w-8 h-8" />
          Contacts
        </h1>
        <button className="btn-add" onClick={() => setShowAddForm(true)}>
          <Plus className="w-5 h-5" />
          Add Contact
        </button>
      </div>

      <div className="contacts-list">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="3" className="empty-state">Loading...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="3" className="empty-state">
                  <div className="empty-state-title">Error loading contacts</div>
                  <div>{error.message || 'Please try again'}</div>
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan="3" className="empty-state">
                  <div className="empty-state-title">No contacts yet</div>
                  <div>Contacts feature coming soon</div>
                </td>
              </tr>
            ) : (
              contacts.map(contact => (
                <tr key={contact.id}>
                  <td>
                    <div className="contact-name">{contact.name || '—'}</div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <Mail className="w-4 h-4" />
                      {contact.email}
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <Phone className="w-4 h-4" />
                      {contact.phone || '—'}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <div className="form-modal" onClick={() => setShowAddForm(false)}>
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            <h2 className="form-title">Add New Contact</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
