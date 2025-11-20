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
  },

  // 5. List Products
  async listProducts() {
    const response = await fetch('/.netlify/functions/admin-products');
    if (!response.ok) throw new Error("Failed to fetch products.");
    const result = await response.json();
    return result.ok ? result.data : [];
  },

  // 6. List Orders
  async listOrders() {
    const response = await fetch('/.netlify/functions/admin-orders');
    if (!response.ok) throw new Error("Failed to fetch orders.");
    const result = await response.json();
    return result.ok ? result.data : [];
  },

  // 7. List Reviews
  async listReviews(status = 'pending') {
    const response = await fetch(`/.netlify/functions/admin-reviews?status=${status}`);
    if (!response.ok) throw new Error("Failed to fetch reviews.");
    const result = await response.json();
    return result.ok ? result.data : [];
  }
};

export function setAPI(next) {
  api = { ...api, ...next };
}