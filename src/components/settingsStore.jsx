// Settings store with localStorage persistence
const STORAGE_KEY = 'blom.settings.v1';

const defaultSettings = {
  general: {
    brandName: 'BLOM Admin',
    supportEmail: '',
    currency: 'ZAR',
    timezone: 'Africa/Johannesburg',
    storefrontUrl: '',
    address: ''
  },
  branding: {
    logoUrl: '',
    faviconUrl: '',
    primary: '#6EC1FF',
    accent: '#FF77E9',
    dark: true,
    sidebarDensity: 'cozy'
  },
  users: [
    { email: 'admin@example.com', role: 'owner', status: 'active' }
  ],
  integrations: {
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
  },
  notifications: {
    newOrder: true,
    lowStock: true,
    review: true,
    payout: true
  },
  shipping: {
    freeShippingThreshold: 50000, // R500 in cents
    liquidSurcharge: 2000, // R20 in cents
    ruralSurcharge: 3000 // R30 in cents
  }
};

export const settingsStore = {
  get() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaultSettings;
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch (err) {
      console.error('Failed to load settings:', err);
      return defaultSettings;
    }
  },

  set(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch (err) {
      console.error('Failed to save settings:', err);
      return false;
    }
  },

  update(section, data) {
    const current = this.get();
    const updated = {
      ...current,
      [section]: { ...current[section], ...data }
    };
    return this.set(updated);
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return defaultSettings;
  }
};