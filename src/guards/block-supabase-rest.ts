(function () {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch;
  (window as any).fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : (input as Request)?.url?.toString() || '';
    const method = (init?.method || (input as Request)?.method || 'GET').toUpperCase();
    
    // Only block WRITES (POST, PATCH, PUT, DELETE) to Supabase REST, allow GET (reads)
    if (url.includes('.supabase.co/rest/v1') && method !== 'GET') {
      console.warn('[Guard] blocked client REST write:', method, url);
      throw new Error('Blocked client-side write to Supabase REST. Use Netlify functions.');
    }
    
    return originalFetch.call(window, input as any, init);
  };
})();

