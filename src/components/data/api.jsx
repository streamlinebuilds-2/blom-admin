// DataAPI interface
export let api = {
  // 1. Add listContacts to list all customers from the new table
  async listContacts() {
      // Note: The /admin-contacts.ts function will handle searching and sorting on the backend.
      const url = '/.netlify/functions/admin-contacts';
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch contact list.");
      return response.json();
  },

  // 2. Add getContactDetail to fetch a single customer and related data
  async getContactDetail(userId) {
      // This relies on a new custom Netlify function to join data
      const url = `/.netlify/functions/admin-contact-detail?user_id=${userId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch customer history.");
      return response.json();
  },

  // 3. Adjust Stock
  async adjustStock(payload) {
    const response = await fetch('/.netlify/functions/adjust-stock', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'Update failed');
    return result;
  },

  // 4. Get Stock Movements
  async getStockMovements() {
    const response = await fetch('/.netlify/functions/admin-stock-movements');
    const result = await response.json();
    if (!response.ok) throw new Error("Failed to fetch stock movements.");
    return result.data || [];
  }
};

export function setAPI(next) {
  api = { ...api, ...next };
}