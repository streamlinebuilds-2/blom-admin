import React, { useState, useEffect } from "react";
import { settingsStore } from "../components/settingsStore";
import { useToast } from "../components/ui/Toast";
import { Save, Bell, TestTube } from "lucide-react";

export default function NotificationsSettings() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    newOrder: true,
    lowStock: true,
    review: true,
    payout: true
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const settings = settingsStore.get();
    setFormData(settings.notifications);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSaving(true);
    
    const success = settingsStore.update('notifications', formData);
    
    setTimeout(() => {
      setIsSaving(false);
      if (success) {
        showToast('success', 'Notification settings saved');
      } else {
        showToast('error', 'Failed to save settings');
      }
    }, 300);
  };

  const handleTestNotification = () => {
    showToast('info', 'Test notification: This is how notifications will appear');
  };

  const toggleSetting = (key) => {
    setFormData({...formData, [key]: !formData[key]});
  };

  return (
    <>
      <style>{`
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
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

        .btn-test {
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
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }

        .settings-form {
          background: var(--card);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
          max-width: 800px;
        }

        .toggle-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .toggle-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          background: var(--bg);
          border-radius: 12px;
        }

        .toggle-info {
          flex: 1;
        }

        .toggle-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .toggle-description {
          font-size: 13px;
          color: var(--text-muted);
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
        <div className="header-left">
          <div className="settings-icon">
            <Bell className="w-6 h-6" />
          </div>
          <div className="settings-title-group">
            <h1 className="settings-title">Notifications</h1>
            <p className="settings-subtitle">Manage your notification preferences</p>
          </div>
        </div>
        <button className="btn-test" onClick={handleTestNotification}>
          <TestTube className="w-5 h-5" />
          Test Notification
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="settings-form">
          <div className="toggle-list">
            <div className="toggle-item">
              <div className="toggle-info">
                <div className="toggle-title">New Order</div>
                <div className="toggle-description">Get notified when a new order is placed</div>
              </div>
              <div 
                className={`toggle-switch ${formData.newOrder ? 'active' : ''}`}
                onClick={() => toggleSetting('newOrder')}
              >
                <div className="toggle-slider" />
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <div className="toggle-title">Low Stock Alert</div>
                <div className="toggle-description">Alert when product stock falls below 5 units</div>
              </div>
              <div 
                className={`toggle-switch ${formData.lowStock ? 'active' : ''}`}
                onClick={() => toggleSetting('lowStock')}
              >
                <div className="toggle-slider" />
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <div className="toggle-title">Review Submitted</div>
                <div className="toggle-description">Get notified when a new review needs moderation</div>
              </div>
              <div 
                className={`toggle-switch ${formData.review ? 'active' : ''}`}
                onClick={() => toggleSetting('review')}
              >
                <div className="toggle-slider" />
              </div>
            </div>

            <div className="toggle-item">
              <div className="toggle-info">
                <div className="toggle-title">Payout Received</div>
                <div className="toggle-description">Notification when a payment payout is received</div>
              </div>
              <div 
                className={`toggle-switch ${formData.payout ? 'active' : ''}`}
                onClick={() => toggleSetting('payout')}
              >
                <div className="toggle-slider" />
              </div>
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