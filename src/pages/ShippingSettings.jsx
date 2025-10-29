import React, { useState, useEffect } from "react";
import { settingsStore } from "../components/settingsStore";
import { api } from "../components/data/api";
import { useToast } from "../components/ui/ToastProvider";
import { Save, Truck, Calculator } from "lucide-react";
import { moneyZAR } from "../components/formatUtils";

export default function ShippingSettings() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState({
    integrations: {
      shiplogic: {
        apiKey: '',
        accountCode: ''
      }
    },
    shipping: {
      freeShippingThreshold: 50000,
      liquidSurcharge: 2000,
      ruralSurcharge: 3000
    }
  });

  const [calculator, setCalculator] = useState({
    suburb: '',
    postalCode: '',
    weightGrams: '',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    subtotal: ''
  });

  const [rates, setRates] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = settingsStore.get();
    setSettings({
      integrations: stored.integrations || settings.integrations,
      shipping: stored.shipping || settings.shipping
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const success = settingsStore.update('integrations', settings.integrations) &&
                   settingsStore.update('shipping', settings.shipping);

    setTimeout(() => {
      setIsSaving(false);
      if (success) {
        showToast('success', 'Shipping settings saved');
      } else {
        showToast('error', 'Failed to save settings');
      }
    }, 300);
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setCalculating(true);

    try {
      const estimatedRates = await api.estimateShipping({
        suburb: calculator.suburb,
        postal_code: calculator.postalCode,
        weight_grams: parseInt(calculator.weightGrams) || 0,
        length_cm: parseFloat(calculator.lengthCm) || 0,
        width_cm: parseFloat(calculator.widthCm) || 0,
        height_cm: parseFloat(calculator.heightCm) || 0
      });

      // Apply free shipping threshold
      const subtotalCents = parseInt(calculator.subtotal) * 100 || 0;
      const freeShipping = subtotalCents >= settings.shipping.freeShippingThreshold;

      const adjustedRates = estimatedRates.map(rate => ({
        ...rate,
        finalCost: freeShipping ? 0 : rate.cost_cents,
        wasFree: freeShipping
      }));

      setRates(adjustedRates);
    } catch (error) {
      showToast('error', error.message || 'Failed to calculate rates');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <>
      <style>{`
        .shipping-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .shipping-icon {
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

        .shipping-title-group {
          flex: 1;
        }

        .shipping-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }

        .shipping-subtitle {
          font-size: 14px;
          color: var(--text-muted);
        }

        .shipping-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 80px;
        }

        @media (max-width: 1024px) {
          .shipping-grid {
            grid-template-columns: 1fr;
          }
        }

        .shipping-card {
          background: var(--card);
          border-radius: 16px;
          padding: 32px;
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        .card-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-section {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 2px solid var(--border);
        }

        .form-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .section-label {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
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

        .form-input:focus {
          outline: none;
        }

        .input-hint {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 6px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 640px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .btn-calculate {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          margin-top: 20px;
        }

        .btn-calculate:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-calculate:not(:disabled):hover {
          transform: translateY(-2px);
        }

        .rates-list {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rate-card {
          background: var(--bg);
          border-radius: 12px;
          padding: 16px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .rate-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .rate-service {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
        }

        .rate-price {
          font-size: 18px;
          font-weight: 700;
          color: var(--accent);
        }

        .rate-price.free {
          color: #10b981;
        }

        .rate-price.free::after {
          content: ' (Free)';
          font-size: 12px;
          font-weight: 600;
        }

        .rate-eta {
          font-size: 13px;
          color: var(--text-muted);
        }

        .sticky-save {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--card);
          padding: 20px 32px;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
          display: flex;
          justify-content: flex-end;
          z-index: 100;
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

        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-save:not(:disabled):hover {
          transform: translateY(-2px);
        }
      `}</style>

      <div className="shipping-header">
        <div className="shipping-icon">
          <Truck className="w-6 h-6" />
        </div>
        <div className="shipping-title-group">
          <h1 className="shipping-title">Shipping Settings</h1>
          <p className="shipping-subtitle">Configure shipping carriers and calculate rates</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="shipping-grid">
          <div className="shipping-card">
            <h2 className="card-title">
              <Truck className="w-5 h-5" />
              Carrier Configuration
            </h2>

            <div className="form-section">
              <div className="section-label">ShipLogic Integration</div>
              
              <div className="form-group">
                <label className="form-label">API Key</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.integrations.shiplogic.apiKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      shiplogic: { ...settings.integrations.shiplogic, apiKey: e.target.value }
                    }
                  })}
                  placeholder="Enter ShipLogic API key"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.integrations.shiplogic.accountCode}
                  onChange={(e) => setSettings({
                    ...settings,
                    integrations: {
                      ...settings.integrations,
                      shiplogic: { ...settings.integrations.shiplogic, accountCode: e.target.value }
                    }
                  })}
                  placeholder="Enter account code"
                />
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">Shipping Rules</div>
              
              <div className="form-group">
                <label className="form-label">Free Shipping Threshold (R)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.shipping.freeShippingThreshold / 100}
                  onChange={(e) => setSettings({
                    ...settings,
                    shipping: { ...settings.shipping, freeShippingThreshold: Math.round(parseFloat(e.target.value) * 100) }
                  })}
                  step="0.01"
                  min="0"
                />
                <div className="input-hint">Orders above this amount ship free</div>
              </div>

              <div className="form-group">
                <label className="form-label">Liquid Surcharge (R)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.shipping.liquidSurcharge / 100}
                  onChange={(e) => setSettings({
                    ...settings,
                    shipping: { ...settings.shipping, liquidSurcharge: Math.round(parseFloat(e.target.value) * 100) }
                  })}
                  step="0.01"
                  min="0"
                />
                <div className="input-hint">Additional charge for liquid products</div>
              </div>

              <div className="form-group">
                <label className="form-label">Rural Surcharge (R)</label>
                <input
                  type="number"
                  className="form-input"
                  value={settings.shipping.ruralSurcharge / 100}
                  onChange={(e) => setSettings({
                    ...settings,
                    shipping: { ...settings.shipping, ruralSurcharge: Math.round(parseFloat(e.target.value) * 100) }
                  })}
                  step="0.01"
                  min="0"
                />
                <div className="input-hint">Additional charge for rural areas</div>
              </div>
            </div>
          </div>

          <div className="shipping-card">
            <h2 className="card-title">
              <Calculator className="w-5 h-5" />
              Rate Calculator
            </h2>

            <div className="form-section">
              <div className="section-label">Destination</div>
              
              <div className="form-group">
                <label className="form-label">Suburb</label>
                <input
                  type="text"
                  className="form-input"
                  value={calculator.suburb}
                  onChange={(e) => setCalculator({ ...calculator, suburb: e.target.value })}
                  placeholder="e.g., Sandton"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Postal Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={calculator.postalCode}
                  onChange={(e) => setCalculator({ ...calculator, postalCode: e.target.value })}
                  placeholder="e.g., 2196"
                />
              </div>
            </div>

            <div className="form-section">
              <div className="section-label">Package Details</div>
              
              <div className="form-group">
                <label className="form-label">Weight (grams)</label>
                <input
                  type="number"
                  className="form-input"
                  value={calculator.weightGrams}
                  onChange={(e) => setCalculator({ ...calculator, weightGrams: e.target.value })}
                  placeholder="e.g., 500"
                  min="0"
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Length (cm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={calculator.lengthCm}
                    onChange={(e) => setCalculator({ ...calculator, lengthCm: e.target.value })}
                    placeholder="20"
                    step="0.1"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Width (cm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={calculator.widthCm}
                    onChange={(e) => setCalculator({ ...calculator, widthCm: e.target.value })}
                    placeholder="15"
                    step="0.1"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Height (cm)</label>
                <input
                  type="number"
                  className="form-input"
                  value={calculator.heightCm}
                  onChange={(e) => setCalculator({ ...calculator, heightCm: e.target.value })}
                  placeholder="10"
                  step="0.1"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Order Subtotal (R) - for free shipping check</label>
                <input
                  type="number"
                  className="form-input"
                  value={calculator.subtotal}
                  onChange={(e) => setCalculator({ ...calculator, subtotal: e.target.value })}
                  placeholder="e.g., 450"
                  step="0.01"
                  min="0"
                />
                <div className="input-hint">
                  Free shipping applies at {moneyZAR(settings.shipping.freeShippingThreshold)}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-calculate"
              onClick={handleCalculate}
              disabled={calculating}
            >
              <Calculator className="w-5 h-5" />
              {calculating ? 'Calculating...' : 'Get Rates'}
            </button>

            {rates.length > 0 && (
              <div className="rates-list">
                {rates.map((rate, idx) => (
                  <div key={idx} className="rate-card">
                    <div className="rate-header">
                      <div className="rate-service">{rate.service}</div>
                      <div className={`rate-price ${rate.wasFree ? 'free' : ''}`}>
                        {moneyZAR(rate.finalCost)}
                      </div>
                    </div>
                    <div className="rate-eta">Estimated delivery: {rate.eta}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky-save">
          <button
            type="submit"
            className="btn-save"
            disabled={isSaving}
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </>
  );
}