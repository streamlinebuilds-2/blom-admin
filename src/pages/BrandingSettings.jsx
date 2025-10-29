import React, { useState, useEffect } from "react";
import { settingsStore } from "../components/settingsStore";
import { useToast } from "../components/ui/Toast";
import { Save, Palette, Sun, Moon } from "lucide-react";

export default function BrandingSettings() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    logoUrl: '',
    faviconUrl: '',
    primary: '#6EC1FF',
    accent: '#FF77E9',
    dark: true,
    sidebarDensity: 'cozy'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const settings = settingsStore.get();
    setFormData(settings.branding);
  }, []);

  const validateUrl = (url) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateHex = (color) => {
    return /^#[0-9A-F]{6}$/i.test(color);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.logoUrl && !validateUrl(formData.logoUrl)) {
      showToast('error', 'Invalid logo URL');
      return;
    }

    if (formData.faviconUrl && !validateUrl(formData.faviconUrl)) {
      showToast('error', 'Invalid favicon URL');
      return;
    }

    if (!validateHex(formData.primary)) {
      showToast('error', 'Invalid primary color (use hex format)');
      return;
    }

    if (!validateHex(formData.accent)) {
      showToast('error', 'Invalid accent color (use hex format)');
      return;
    }

    setIsSaving(true);
    
    const success = settingsStore.update('branding', formData);
    
    // Apply theme changes
    document.documentElement.setAttribute('data-theme', formData.dark ? 'dark' : 'light');
    
    setTimeout(() => {
      setIsSaving(false);
      if (success) {
        showToast('success', 'Branding settings saved');
      } else {
        showToast('error', 'Failed to save settings');
      }
    }, 300);
  };

  const handleThemeToggle = () => {
    const newDark = !formData.dark;
    setFormData({...formData, dark: newDark});
    document.documentElement.setAttribute('data-theme', newDark ? 'dark' : 'light');
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

        .form-input, .form-select {
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

        .color-input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .color-input {
          flex: 1;
        }

        .color-preview {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          border: 2px solid var(--border);
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }

        .toggle-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--bg);
          border-radius: 12px;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }

        .toggle-switch {
          position: relative;
          width: 56px;
          height: 32px;
          background: var(--card);
          border-radius: 16px;
          cursor: pointer;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
          transition: all 0.3s;
        }

        .toggle-switch.active {
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
        }

        .toggle-slider {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
          box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }

        .toggle-switch.active .toggle-slider {
          transform: translateX(24px);
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
          <Palette className="w-6 h-6" />
        </div>
        <div className="settings-title-group">
          <h1 className="settings-title">Branding Settings</h1>
          <p className="settings-subtitle">Customize your store's appearance</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="settings-form">
          <div className="form-section">
            <h3 className="section-title">Logos</h3>
            
            <div className="form-group">
              <label className="form-label">Logo URL</label>
              <input
                type="url"
                className="form-input"
                value={formData.logoUrl}
                onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Favicon URL</label>
              <input
                type="url"
                className="form-input"
                value={formData.faviconUrl}
                onChange={(e) => setFormData({...formData, faviconUrl: e.target.value})}
                placeholder="https://example.com/favicon.ico"
              />
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Colors</h3>
            
            <div className="form-group">
              <label className="form-label">Primary Color</label>
              <div className="color-input-group">
                <input
                  type="text"
                  className="form-input color-input"
                  value={formData.primary}
                  onChange={(e) => setFormData({...formData, primary: e.target.value})}
                  placeholder="#6EC1FF"
                />
                <input
                  type="color"
                  className="color-preview"
                  value={formData.primary}
                  onChange={(e) => setFormData({...formData, primary: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Accent Color</label>
              <div className="color-input-group">
                <input
                  type="text"
                  className="form-input color-input"
                  value={formData.accent}
                  onChange={(e) => setFormData({...formData, accent: e.target.value})}
                  placeholder="#FF77E9"
                />
                <input
                  type="color"
                  className="color-preview"
                  value={formData.accent}
                  onChange={(e) => setFormData({...formData, accent: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Appearance</h3>
            
            <div className="form-group">
              <div className="toggle-group">
                <div className="toggle-label">
                  {formData.dark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  Dark Mode
                </div>
                <div 
                  className={`toggle-switch ${formData.dark ? 'active' : ''}`}
                  onClick={handleThemeToggle}
                >
                  <div className="toggle-slider" />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Sidebar Density</label>
              <select
                className="form-select"
                value={formData.sidebarDensity}
                onChange={(e) => setFormData({...formData, sidebarDensity: e.target.value})}
              >
                <option value="compact">Compact</option>
                <option value="cozy">Cozy</option>
              </select>
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