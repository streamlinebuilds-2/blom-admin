(function () {
  if (typeof window === 'undefined') return;
  const origFetch = window.fetch;
  (window as any).fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    const url = String(typeof input === 'string' ? input : (input as Request)?.url || '');
    // Only block WRITES (POST, PATCH, PUT, DELETE) to Supabase REST, allow GET (reads)
    if (url.includes('supabase.co/rest/v1/')) {
      const method = (init?.method || (input as Request)?.method || 'GET').toUpperCase();
      if (method !== 'GET') {
        console.error('🚫 Blocked client REST WRITE. Use Netlify functions.');
        throw new Error('Client-side Supabase REST writes blocked. Use /.netlify/functions/* instead.');
      }
      // Allow GET requests for reads
    }
    return origFetch.call(window, input as any, init);
  };
})();

