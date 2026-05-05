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

  // Base44 styling CSS
  const base44Styles = `
    .message-detail-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
    }

    .btn-back {
      padding: 12px;
      border-radius: 12px;
      border: none;
      background: var(--card);
      color: var(--text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
      transition: all 0.2s ease;
    }

    .btn-back:hover {
      box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
      color: var(--accent);
    }

    .message-title-section {
      flex: 1;
    }

    .message-title {
      font-size: 28px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }

    .message-date {
      color: var(--text-muted);
      font-size: 14px;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-primary {
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
      transition: all 0.3s ease;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      background: var(--card);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
      color: var(--accent);
    }

    .btn-danger {
      padding: 12px 24px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
      transition: all 0.3s ease;
    }

    .btn-danger:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
    }

    .section-card {
      background: var(--card);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .info-value {
      color: var(--text);
      font-weight: 600;
      font-size: 14px;
    }

    .info-link {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .info-link:hover {
      color: var(--accent-2);
      text-decoration: underline;
    }

    .status-badge {
      display: inline-flex;
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
    }

    .status-new {
      background: #ef444420;
      color: #ef4444;
    }

    .status-handled {
      background: #10b98120;
      color: #10b981;
    }

    .message-content {
      background: var(--bg);
      border-radius: 12px;
      padding: 20px;
      white-space: pre-wrap;
      line-height: 1.6;
      font-size: 14px;
      color: var(--text);
      box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
    }

    .image-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .image-item {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 12px;
      box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
      transition: transform 0.2s ease;
      cursor: pointer;
    }

    .image-item:hover {
      transform: scale(1.05);
    }

    .status-select {
      padding: 12px 16px;
      border-radius: 12px;
      border: none;
      background: var(--card);
      color: var(--text);
      font-size: 14px;
      cursor: pointer;
      box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
      min-width: 200px;
    }

    .loading-state, .error-state {
      text-align: center;
      padding: 80px 20px;
      color: var(--text-muted);
      font-size: 16px;
    }

    .error-state {
      color: #ef4444;
    }

    @media (max-width: 768px) {
      .message-detail-container {
        padding: 20px;
      }
      .message-header {
        flex-direction: column;
        align-items: stretch;
        gap: 16px;
      }
      .action-buttons {
        justify-content: center;
      }
      .info-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
  `;

  if (loading) {
    return (
      <>
        <style>{base44Styles}</style>
        <div className="loading-state">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
          <div>Loading message...</div>
        </div>
      </>
    );
  }

  if (error && !message) {
    return (
      <>
        <style>{base44Styles}</style>
        <div className="error-state">
          <div className="font-semibold mb-2">Error loading message</div>
          <div className="text-sm">{error}</div>
          <button onClick={() => navigate('/messages')} className="btn-secondary mt-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Messages
          </button>
        </div>
      </>
    );
  }

  if (!message) {
    return (
      <>
        <style>{base44Styles}</style>
        <div className="loading-state">
          Message not found
        </div>
      </>
    );
  }

  return (
    <>
      <style>{base44Styles}</style>
      <div className="message-detail-container">
        {/* Header */}
        <div className="message-header">
          <button onClick={() => navigate('/messages')} className="btn-back">
            <ArrowLeft size={20} />
          </button>
          <div className="message-title-section">
            <h1 className="message-title">
              Message Details
              <span className={`status-badge status-${message.status}`}>
                {message.status === "new" ? "Unanswered" : "Answered"}
              </span>
            </h1>
            <p className="message-date">
              Received on {formatDate(message.created_at)}
            </p>
          </div>
        </div>

        <div className="action-buttons">
          {message.status === "new" && (
            <button
              onClick={() => updateStatus("handled")}
              disabled={updating}
              className="btn-primary"
            >
              <CheckCircle size={18} />
              {updating ? 'Updating...' : 'Mark as Answered'}
            </button>
          )}
          {message.email && (
            <button
              onClick={handleEmailReply}
              className="btn-primary"
            >
              <Mail size={18} />
              Reply via Email
            </button>
          )}
          {message.phone && (
            <button
              onClick={handleWhatsAppReply}
              className="btn-primary"
            >
              <MessageCircle size={18} />
              Reply via WhatsApp
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-danger"
            title="Delete message"
          >
            <Trash2 size={18} />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        {/* Contact Information */}
        <div className="section-card">
          <h3 className="section-title">
            Contact Information
          </h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Name</div>
              <div className="info-value">{message.name || "-"}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Email</div>
              <div className="info-value">
                {message.email ? (
                  <a href={`mailto:${message.email}`} className="info-link">
                    {message.email}
                  </a>
                ) : "-"}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Phone</div>
              <div className="info-value">
                {message.phone ? (
                  <a href={`tel:${message.phone}`} className="info-link">
                    {message.phone}
                  </a>
                ) : "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Subject and Message */}
        {message.subject && (
          <div className="section-card">
            <h3 className="section-title">Subject</h3>
            <div className="info-value" style={{ fontSize: '18px' }}>{message.subject}</div>
          </div>
        )}

        <div className="section-card">
          <h3 className="section-title">Message</h3>
          <div className="message-content">{message.message || "(No message content)"}</div>
        </div>

        {/* Images */}
        {message.images && Array.isArray(message.images) && message.images.length > 0 && (
          <div className="section-card">
            <h3 className="section-title">Images ({message.images.length})</h3>
            <div className="image-gallery">
              {message.images.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Attachment ${i + 1}`} className="image-item" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="section-card">
          <h3 className="section-title">Additional Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Source</div>
              <div className="info-value">{message.source || "website"}</div>
            </div>
            {message.product_slug && (
              <div className="info-item">
                <div className="info-label">Product</div>
                <div className="info-value">{message.product_slug}</div>
              </div>
            )}
            {message.order_id && (
              <div className="info-item">
                <div className="info-label">Order ID</div>
                <div className="info-value">{message.order_id}</div>
              </div>
            )}
          </div>
        </div>

        {/* Status Update */}
        <div className="section-card">
          <h3 className="section-title">Update Status</h3>
          <select
            value={message.status}
            onChange={(e) => updateStatus(e.target.value)}
            disabled={updating}
            className="status-select"
          >
            <option value="new">Unanswered</option>
            <option value="handled">Answered</option>
          </select>
        </div>
      </div>
    </>
  );
}
