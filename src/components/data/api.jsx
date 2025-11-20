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
  }
};

export function setAPI(next) {
  api = { ...api, ...next };
}