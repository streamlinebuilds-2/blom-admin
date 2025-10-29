import React, { useState, useEffect } from "react";
import { settingsStore } from "../components/settingsStore";
import { useToast } from "../components/ui/ToastProvider";
import { Save, Plug, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

export default function IntegrationsSettings() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    specialsWebhook: '',
    shiplogicWebhook: '',
    payfast: {
      merchantId: '',
      passphrase: ''
    },
    shiplogic: {
      apiKey: '',
      accountCode: ''
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPayfast, setShowPayfast] = useState(false);
  const [showShiplogic, setShowShiplogic] = useState(false);

  // Check for actual env secrets
  const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
  const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    const settings = settingsStore.get();
    setFormData(settings.integrations);
    setShowPayfast(!!settings.integrations.payfast?.merchantId || !!settings.integrations.payfast?.passphrase);
    setShowShiplogic(!!settings.integrations.shiplogic?.apiKey || !!settings.integrations.shiplogic?.accountCode);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSaving(true);
    
    const success = settingsStore.update('integrations', formData);
    
    setTimeout(() => {
      setIsSaving(false);
      if (success) {
        showToast('success', 'Integrations settings saved');
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

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .section-toggle {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
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

        .form-input {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
        }

        .form-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .readonly-field {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 12px;
          background: var(--bg);
          color: var(--text-muted);
          font-size: 14px;
          font-family: monospace;
        }

        .status-icon {
          flex-shrink: 0;
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
        }

        .btn-save:not(:disabled):hover {
          transform: translateY(-2px);
        }
      `}</style>

      <div className="settings-header">
        <div className="settings-icon">
          <Plug className="w-6 h-6" />
        </div>
        <div className="settings-title-group">
          <h1 className="settings-title">Integrations</h1>
          <p className="settings-subtitle">Configure external services and webhooks</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="settings-form">
          <div className="form-section">
            <h3 className="section-title">Supabase (Read-Only)</h3>
            
            <div className="form-group">
              <label className="form-label">Supabase URL</label>
              <div className="readonly-field">
                {hasSupabaseUrl ? <CheckCircle className="w-5 h-5 status-icon" style={{color: '#10b981'}} /> : <XCircle className="w-5 h-5 status-icon" style={{color: '#ef4444'}} />}
                {hasSupabaseUrl ? 'Configured' : 'Not set'}
              </div>
              <div className="form-hint">Set via environment variables in deployment settings</div>
            </div>

            <div className="form-group">
              <label className="form-label">Anon Key</label>
              <div className="readonly-field">
                {hasSupabaseKey ? <CheckCircle className="w-5 h-5 status-icon" style={{color: '#10b981'}} /> : <XCircle className="w-5 h-5 status-icon" style={{color: '#ef4444'}} />}
                {hasSupabaseKey ? 'Configured' : 'Not set'}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Webhooks</h3>
            
            <div className="form-group">
              <label className="form-label">Specials Webhook</label>
              <input
                type="url"
                className="form-input"
                value={formData.specialsWebhook}
                onChange={(e) => setFormData({...formData, specialsWebhook: e.target.value})}
                placeholder="https://example.com/webhook/specials"
              />
              <div className="form-hint">Receives updates when specials are created or modified</div>
            </div>

            <div className="form-group">
              <label className="form-label">ShipLogic Webhook</label>
              <input
                type="url"
                className="form-input"
                value={formData.shiplogicWebhook}
                onChange={(e) => setFormData({...formData, shiplogicWebhook: e.target.value})}
                placeholder="https://example.com/webhook/shiplogic"
              />
              <div className="form-hint">Receives shipping status updates</div>
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h3 className="section-title">PayFast</h3>
              <button 
                type="button"
                className="section-toggle"
                onClick={() => setShowPayfast(!showPayfast)}
              >
                {showPayfast ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showPayfast && (
              <>
                <div className="form-group">
                  <label className="form-label">Merchant ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.payfast.merchantId}
                    onChange={(e) => setFormData({
                      ...formData,
                      payfast: {...formData.payfast, merchantId: e.target.value}
                    })}
                    placeholder="10000100"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Passphrase</label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.payfast.passphrase}
                    onChange={(e) => setFormData({
                      ...formData,
                      payfast: {...formData.payfast, passphrase: e.target.value}
                    })}
                    placeholder="Your secure passphrase"
                  />
                </div>
              </>
            )}
          </div>

          <div className="form-section">
            <div className="section-header">
              <h3 className="section-title">ShipLogic</h3>
              <button 
                type="button"
                className="section-toggle"
                onClick={() => setShowShiplogic(!showShiplogic)}
              >
                {showShiplogic ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showShiplogic && (
              <>
                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.shiplogic.apiKey}
                    onChange={(e) => setFormData({
                      ...formData,
                      shiplogic: {...formData.shiplogic, apiKey: e.target.value}
                    })}
                    placeholder="Your ShipLogic API key"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.shiplogic.accountCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      shiplogic: {...formData.shiplogic, accountCode: e.target.value}
                    })}
                    placeholder="Account code"
                  />
                </div>
              </>
            )}
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