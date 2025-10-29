import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "../components/data/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, Calendar, User, ExternalLink, Paperclip } from "lucide-react";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";

export default function MessageDetail() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const messageId = urlParams.get('id');

  const { data: message, isLoading, error } = useQuery({
    queryKey: ['message', messageId],
    queryFn: () => api.getMessage(messageId),
    enabled: !!messageId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ patch }) => api.updateMessage(messageId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message', messageId] });
      showToast('success', 'Message updated');
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to update message');
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        Loading message...
      </div>
    );
  }

  if (error || !message) {
    return <Banner type="error">{error?.message || 'Message not found'}</Banner>;
  }

  const handleReply = () => {
    const subject = message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`;
    window.open(`mailto:${message.email}?subject=${encodeURIComponent(subject)}`, '_blank');
  };

  return (
    <>
      <style>{`
        .detail-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .btn-back {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .btn-back:active {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .detail-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          flex: 1;
        }

        .btn-reply {
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

        .btn-reply:hover {
          transform: translateY(-2px);
        }

        .detail-content {
          max-width: 1000px;
        }

        .detail-card {
          background: var(--card);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          margin-bottom: 24px;
        }

        .detail-section {
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 2px solid var(--border);
        }

        .detail-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }

        .control-group {
          margin-bottom: 20px;
        }

        .control-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
          display: block;
        }

        .control-select, .control-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: var(--bg);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .control-select:focus, .control-input:focus {
          outline: none;
        }

        .message-body {
          background: var(--bg);
          border-radius: 12px;
          padding: 20px;
          color: var(--text);
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 15px;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
        }

        .attachments {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 16px;
        }

        .attachment-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 10px;
          background: var(--card);
          color: var(--text);
          text-decoration: none;
          font-size: 14px;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          transition: all 0.2s;
        }

        .attachment-chip:hover {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .meta-item {
          display: flex;
          align-items: start;
          gap: 12px;
        }

        .meta-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          box-shadow: 2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light);
          flex-shrink: 0;
        }

        .meta-content {
          flex: 1;
        }

        .meta-label {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .meta-value {
          font-size: 14px;
          color: var(--text);
          font-weight: 600;
        }

        .tip-banner {
          background: var(--card);
          border-left: 4px solid var(--accent);
          padding: 16px;
          border-radius: 10px;
          font-size: 14px;
          color: var(--text);
          margin-top: 24px;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }
      `}</style>

      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate(createPageUrl('Messages'))}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="detail-title">{message.subject}</h1>
        <button className="btn-reply" onClick={handleReply}>
          <Mail className="w-5 h-5" />
          Reply via Email
        </button>
      </div>

      <div className="detail-content">
        <div className="detail-card">
          <div className="detail-section">
            <h3 className="section-title">Status & Assignment</h3>
            
            <div className="control-group">
              <label className="control-label">Status</label>
              <select
                className="control-select"
                value={message.status}
                onChange={(e) => updateMutation.mutate({ patch: { status: e.target.value } })}
                disabled={updateMutation.isPending}
              >
                <option value="new">New</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="control-group">
              <label className="control-label">Assigned To</label>
              <input
                type="email"
                className="control-input"
                value={message.assignee || ''}
                onChange={(e) => updateMutation.mutate({ patch: { assignee: e.target.value || null } })}
                placeholder="email@example.com"
                disabled={updateMutation.isPending}
              />
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">Message</h3>
            <div className="message-body">{message.body}</div>

            {message.attachments && message.attachments.length > 0 && (
              <div className="attachments">
                {message.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="attachment-chip"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span>{att.name}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3 className="section-title">Customer Details</h3>
            
            <div className="meta-grid">
              <div className="meta-item">
                <div className="meta-icon">
                  <User className="w-5 h-5" />
                </div>
                <div className="meta-content">
                  <div className="meta-label">Name</div>
                  <div className="meta-value">{message.full_name}</div>
                </div>
              </div>

              <div className="meta-item">
                <div className="meta-icon">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="meta-content">
                  <div className="meta-label">Email</div>
                  <div className="meta-value">{message.email}</div>
                </div>
              </div>

              {message.phone && (
                <div className="meta-item">
                  <div className="meta-icon">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="meta-content">
                    <div className="meta-label">Phone</div>
                    <div className="meta-value">{message.phone}</div>
                  </div>
                </div>
              )}

              <div className="meta-item">
                <div className="meta-icon">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="meta-content">
                  <div className="meta-label">Inquiry Type</div>
                  <div className="meta-value">{message.inquiry_type}</div>
                </div>
              </div>

              <div className="meta-item">
                <div className="meta-icon">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="meta-content">
                  <div className="meta-label">Received</div>
                  <div className="meta-value">{new Date(message.created_at).toLocaleString()}</div>
                </div>
              </div>

              {message.updated_at && message.updated_at !== message.created_at && (
                <div className="meta-item">
                  <div className="meta-icon">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="meta-content">
                    <div className="meta-label">Last Updated</div>
                    <div className="meta-value">{new Date(message.updated_at).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="tip-banner">
          ℹ️ <strong>Tip:</strong> Direct email integration is coming soon. For now, use "Reply via Email" to respond using your email client.
        </div>
      </div>
    </>
  );
}