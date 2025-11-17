import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Mail, Phone, Tag, Calendar, Download } from "lucide-react";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";
import { api } from "@/components/data/api";

export default function Contacts() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [sourceFilter, setSourceFilter] = useState("all");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: contactsData = [], isLoading, error } = useQuery({
    queryKey: ['contacts', sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sourceFilter !== "all") {
        params.set("source", sourceFilter);
      }
      const url = `/.netlify/functions/contacts-list${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      return json.data || [];
    },
  });

  const contacts = Array.isArray(contactsData) ? contactsData : [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch("/.netlify/functions/contacts-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
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

  const handleExportCSV = () => {
    if (contacts.length === 0) {
      showToast('error', 'No contacts to export');
      return;
    }
    const headers = ["Name", "Email", "Phone", "Source", "Created At"];
    const rows = contacts.map(c => [
      c.name || "",
      c.email,
      c.phone || "",
      c.source,
      new Date(c.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', `Exported ${contacts.length} contacts`);
  };

  const getSourceLabel = (source) => {
    const labels = {
      beauty_club_signup: "Beauty Club",
      account_creation: "Account",
      manual: "Manual",
      order: "Order",
    };
    return labels[source] || source;
  };

  const getSourceColor = (source) => {
    const colors = {
      beauty_club_signup: "#e91e63",
      account_creation: "#2196f3",
      manual: "#9e9e9e",
      order: "#4caf50",
    };
    return colors[source] || "#9e9e9e";
  };

  return (
    <>
      <style>{`
        .contacts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        @media (min-width: 768px) {
          .contacts-header {
            margin-bottom: 32px;
          }
        }

        .header-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        @media (min-width: 768px) {
          .header-title {
            font-size: 28px;
            gap: 12px;
          }
        }

        .btn-add {
          padding: 10px 16px;
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
          min-height: 44px;
        }

        @media (min-width: 768px) {
          .btn-add {
            padding: 12px 20px;
          }
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

        .table-scroll-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 500px;
        }

        th {
          text-align: left;
          padding: 16px 12px;
          font-size: 11px;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          th {
            padding: 20px 24px;
            font-size: 12px;
          }
        }

        td {
          padding: 16px 12px;
          font-size: 13px;
        }

        @media (min-width: 768px) {
          td {
            padding: 20px 24px;
            font-size: 14px;
          }
        }

        .th-mobile {
          text-align: left;
          padding: 16px 12px;
          font-size: 11px;
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

        .filter-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-select {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
          min-width: 160px;
        }

        .btn-export {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-export:hover {
          transform: translateY(-1px);
        }

        .contact-count {
          font-size: 14px;
          color: var(--text-muted);
          margin-left: auto;
        }

        .source-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
        }

        .contact-date {
          font-size: 12px;
          color: var(--text-muted);
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

      <div className="filter-bar">
        <select
          className="filter-select"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="all">All Sources</option>
          <option value="beauty_club_signup">Beauty Club Sign-ups</option>
          <option value="account_creation">Account Creations</option>
          <option value="order">Orders</option>
          <option value="manual">Manual Entry</option>
        </select>
        <button className="btn-export" onClick={handleExportCSV}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <div className="contact-count">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="contacts-list">
        <div className="table-scroll-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="empty-state">Loading...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    <div className="empty-state-title">Error loading contacts</div>
                    <div>{error.message || 'Please try again'}</div>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    <div className="empty-state-title">No contacts yet</div>
                    <div>Add contacts manually or integrate with your frontend to capture sign-ups</div>
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
                    <td>
                      <span
                        className="source-badge"
                        style={{ backgroundColor: getSourceColor(contact.source) }}
                      >
                        {getSourceLabel(contact.source)}
                      </span>
                    </td>
                    <td>
                      <div className="contact-date">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
