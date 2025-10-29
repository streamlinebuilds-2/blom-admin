import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus } from "lucide-react";
import { dateTime } from "../components/formatUtils";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";
import { api } from "@/components/data/api";

export default function Campaigns() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    channel: "email",
    subject: "",
    body: ""
  });
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaignsData = [], isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => [], // Campaigns not yet implemented in Supabase adapter
    enabled: false, // Disabled until implemented
  });

  const campaigns = Array.isArray(campaignsData) ? campaignsData : [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      throw new Error('Campaigns not yet implemented in Supabase adapter');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      showToast('success', 'Campaign created successfully');
      setShowModal(false);
      setFormData({ name: "", channel: "email", subject: "", body: "" });
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to create campaign');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('error', 'Campaign name is required');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <>
      <style>{`
        .campaigns-header {
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

        .btn-new {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .campaigns-table {
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

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--card);
          border-radius: 16px;
          padding: 32px;
          max-width: 600px;
          width: 90%;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
        }

        .modal-title {
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

        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
        }

        .form-textarea {
          min-height: 120px;
          resize: vertical;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
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

        .status-badge {
          display: inline-flex;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }
      `}</style>

      {error && <Banner type="error">{error.message || 'Failed to load campaigns'}</Banner>}

      <div className="campaigns-header">
        <h1 className="header-title">
          <Megaphone className="w-8 h-8" />
          Campaigns
        </h1>
        <button className="btn-new" onClick={() => setShowModal(true)}>
          <Plus className="w-5 h-5" />
          New Campaign
        </button>
      </div>

      <div className="campaigns-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Loading campaigns...
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No campaigns found
                </td>
              </tr>
            ) : (
              campaigns.map(campaign => (
                <tr key={campaign.id}>
                  <td style={{ fontWeight: 600 }}>{campaign.name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{campaign.channel}</td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        background: campaign.status === 'sent' ? '#10b98120' : campaign.status === 'scheduled' ? '#3b82f620' : '#f59e0b20',
                        color: campaign.status === 'sent' ? '#10b981' : campaign.status === 'scheduled' ? '#3b82f6' : '#f59e0b'
                      }}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {dateTime(campaign.created_date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2 className="modal-title">New Campaign</h2>

            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Channel</label>
              <select
                className="form-select"
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            {formData.channel === 'email' && (
              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Body</label>
              <textarea
                className="form-textarea"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}