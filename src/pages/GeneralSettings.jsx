import React, { useState, useEffect } from "react";
import { settingsStore } from "../components/settingsStore";
import { useToast } from "../components/ui/ToastProvider";
import { Save, Building2 } from "lucide-react";

export default function GeneralSettings() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    brandName: '',
    supportEmail: '',
    currency: 'ZAR',
    timezone: 'Africa/Johannesburg',
    storefrontUrl: '',
    address: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const settings = settingsStore.get();
    setFormData(settings.general);
  }, []);

  const validateEmail = (email) => {
    return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateUrl = (url) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.brandName.trim()) {
      showToast('error', 'Brand name is required');
      return;
    }

    if (formData.supportEmail && !validateEmail(formData.supportEmail)) {
      showToast('error', 'Invalid email address');
      return;
    }

    if (formData.storefrontUrl && !validateUrl(formData.storefrontUrl)) {
      showToast('error', 'Invalid storefront URL');
      return;
    }

    setIsSaving(true);
    
    const success = settingsStore.update('general', formData);
    
    setTimeout(() => {
      setIsSaving(false);
      if (success) {
        showToast('success', 'General settings saved');
      } else {
        showToast('error', 'Failed to save settings');
      }
    }, 300);
  };

  return (
    <>
      <style>{`
        .settings-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .settings-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .settings-title-group {
          flex: 1;
        }

        .settings-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }

        .settings-subtitle {
          font-size: 14px;
          color: var(--text-muted);
        }

        .settings-form {
          background: var(--card);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          max-width: 800px;
        }

        .form-section {
          margin-bottom: 32px;
          padding-bottom: 32px;
          border-bottom: 2px solid var(--border);
        }

        .form-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
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
          letter-spacing: 0.05em;
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
          transition: box-shadow 0.2s;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          outline: none;
          box-shadow: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light);
        }

        .form-textarea {
          min-height: 100px;
          resize: vertical;
        }

        .form-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 6px;
        }

        .form-actions {
          position: sticky;
          bottom: 24px;
          background: var(--card);
          padding: 20px;
          border-radius: 12px;
          margin-top: 32px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          display: flex;
          justify-content: flex-end;
          z-index: 10;
        }

        .btn-save {
          padding: 14px 32px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          transition: all 0.2s;
        }

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-save:not(:disabled):hover {
          transform: translateY(-2px);
        }
      `}</style>

      <div className="settings-header">
        <div className="settings-icon">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="settings-title-group">
          <h1 className="settings-title">General Settings</h1>
          <p className="settings-subtitle">Configure your store's basic information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="settings-form">
          <div className="form-section">
            <h3 className="section-title">Brand Information</h3>
            
            <div className="form-group">
              <label className="form-label">Brand Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.brandName}
                onChange={(e) => setFormData({...formData, brandName: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Support Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.supportEmail}
                onChange={(e) => setFormData({...formData, supportEmail: e.target.value})}
                placeholder="support@example.com"
              />
              <div className="form-hint">Customer inquiries will be sent here</div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Localization</h3>
            
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                className="form-select"
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
              >
                <option value="ZAR">ZAR - South African Rand</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select
                className="form-select"
                value={formData.timezone}
                onChange={(e) => setFormData({...formData, timezone: e.target.value})}
              >
                <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                <option value="Africa/Cape_Town">Africa/Cape_Town</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Store Details</h3>
            
            <div className="form-group">
              <label className="form-label">Storefront URL</label>
              <input
                type="url"
                className="form-input"
                value={formData.storefrontUrl}
                onChange={(e) => setFormData({...formData, storefrontUrl: e.target.value})}
                placeholder="https://yourstore.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Business Address</label>
              <textarea
                className="form-textarea"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="123 Main St, City, Province, Postal Code"
                rows="3"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-save" disabled={isSaving}>
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </>
  );
}