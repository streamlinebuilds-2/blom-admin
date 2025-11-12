// src/pages/MessageDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { ArrowLeft, Mail, MessageCircle, CheckCircle, Trash2 } from "lucide-react";

export default function MessageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/.netlify/functions/admin-message?id=${id}`);
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      const j = await r.json();
      if (j.ok) {
        setMessage(j.message);
      } else {
        setError(j.error || "Failed to load message");
        showToast('error', j.error || "Failed to load message");
      }
    } catch (err) {
      const errMsg = err.message || "Failed to fetch message";
      setError(errMsg);
      showToast('error', errMsg);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus) {
    if (!id) return;
    setUpdating(true);
    try {
      const r = await fetch("/.netlify/functions/admin-message-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      const j = await r.json();
      if (j.ok) {
        showToast('success', `Status updated to ${newStatus}`);
        await load();
      } else {
        showToast('error', j.error || "Failed to update status");
      }
    } catch (err) {
      showToast('error', err.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const r = await fetch("/.netlify/functions/admin-message-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      const j = await r.json();
      if (j.ok) {
        showToast('success', 'Message deleted successfully');
        navigate('/messages');
      } else {
        showToast('error', j.error || "Failed to delete message");
      }
    } catch (err) {
      showToast('error', err.message || "Failed to delete message");
    } finally {
      setDeleting(false);
    }
  }

  function handleEmailReply() {
    if (!message?.email) {
      showToast('error', 'No email address available');
      return;
    }
    const subject = message.subject ? `Re: ${message.subject}` : 'Re: Your inquiry';
    window.open(`mailto:${message.email}?subject=${encodeURIComponent(subject)}`, '_blank');
  }

  function handleWhatsAppReply() {
    if (!message?.phone) {
      showToast('error', 'No phone number available');
      return;
    }
    const cleanPhone = message.phone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('27') ? cleanPhone : `27${cleanPhone}`;
    const text = `Hi ${message.name || 'there'}, `;
    window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  useEffect(() => { load(); }, [id]);

  const formatDate = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6" style={{ color: 'var(--text)' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  if (error && !message) {
    return (
      <div className="p-6" style={{ color: 'var(--text)' }}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-red-600 dark:text-red-400 font-semibold mb-2">Error</div>
          <div className="text-sm text-red-500 dark:text-red-300">{error}</div>
          <button
            onClick={() => navigate('/messages')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Messages
          </button>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="p-6" style={{ color: 'var(--text)' }}>
        Message not found
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text)' }}>
      <style>{`
        .detail-container {
          background: var(--bg);
          color: var(--text);
        }
        .detail-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .detail-button {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 16px;
          transition: all 0.2s;
          cursor: pointer;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .detail-button:hover:not(:disabled) {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .detail-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .detail-button-primary {
          background: linear-gradient(135deg, var(--accent), #0ea5e9);
          color: white;
          border: none;
        }
        .detail-button-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #0ea5e9, var(--accent));
        }
        .detail-button-success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
        }
        .detail-button-success:hover:not(:disabled) {
          background: linear-gradient(135deg, #059669, #10b981);
        }
        .detail-button-danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border: none;
        }
        .detail-button-danger:hover:not(:disabled) {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
        }
        .detail-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .detail-value {
          color: var(--text);
          font-size: 15px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
        }
        .status-new {
          background: rgba(239, 68, 68, 0.2);
          color: #dc2626;
        }
        .status-handled {
          background: rgba(16, 185, 129, 0.2);
          color: #059669;
        }
        .message-text {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 14px;
        }
        .image-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .image-item {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
      `}</style>

      <div className="detail-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/messages")}
              className="detail-button"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-2xl font-bold">Message Details</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {message.status === "new" && (
              <button
                onClick={() => updateStatus("handled")}
                disabled={updating}
                className="detail-button detail-button-success"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Answered
              </button>
            )}
            {message.email && (
              <button
                onClick={handleEmailReply}
                className="detail-button detail-button-primary"
              >
                <Mail className="w-4 h-4" />
                Reply via Email
              </button>
            )}
            {message.phone && (
              <button
                onClick={handleWhatsAppReply}
                className="detail-button detail-button-primary"
              >
                <MessageCircle className="w-4 h-4" />
                Reply via WhatsApp
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="detail-button detail-button-danger"
              title="Delete message"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Main Details Card */}
        <div className="detail-card space-y-6">
          {/* Status and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="detail-label">Status</div>
              <div>
                <span className={`status-badge status-${message.status}`}>
                  {message.status === "new" ? "Unanswered" : "Answered"}
                </span>
              </div>
            </div>
            <div>
              <div className="detail-label">Received</div>
              <div className="detail-value">{formatDate(message.created_at)}</div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="detail-label">Name</div>
              <div className="detail-value font-semibold">{message.name || "-"}</div>
            </div>
            <div>
              <div className="detail-label">Email</div>
              <div className="detail-value">
                {message.email ? (
                  <a href={`mailto:${message.email}`} className="hover:underline" style={{ color: 'var(--accent)' }}>
                    {message.email}
                  </a>
                ) : "-"}
              </div>
            </div>
            <div>
              <div className="detail-label">Phone</div>
              <div className="detail-value">
                {message.phone ? (
                  <a href={`tel:${message.phone}`} className="hover:underline" style={{ color: 'var(--accent)' }}>
                    {message.phone}
                  </a>
                ) : "-"}
              </div>
            </div>
          </div>

          {/* Subject */}
          {message.subject && (
            <div>
              <div className="detail-label">Subject</div>
              <div className="detail-value font-semibold text-lg">{message.subject}</div>
            </div>
          )}

          {/* Message */}
          <div>
            <div className="detail-label">Message</div>
            <div className="message-text">{message.message || "(No message content)"}</div>
          </div>

          {/* Images */}
          {message.images && Array.isArray(message.images) && message.images.length > 0 && (
            <div>
              <div className="detail-label">Images ({message.images.length})</div>
              <div className="image-gallery">
                {message.images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Attachment ${i + 1}`} className="image-item" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="detail-label">Source</div>
              <div className="detail-value">{message.source || "website"}</div>
            </div>
            {message.product_slug && (
              <div>
                <div className="detail-label">Product</div>
                <div className="detail-value">{message.product_slug}</div>
              </div>
            )}
            {message.order_id && (
              <div>
                <div className="detail-label">Order ID</div>
                <div className="detail-value">{message.order_id}</div>
              </div>
            )}
          </div>

          {/* Status Update Dropdown */}
          <div className="pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="detail-label">Update Status</div>
            <select
              value={message.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updating}
              className="detail-button"
              style={{ width: 'auto', minWidth: '200px' }}
            >
              <option value="new">Unanswered</option>
              <option value="handled">Answered</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
