(function () {
  if (typeof window === 'undefined') return;
  const origFetch = window.fetch as any;
  (window as any).fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    const url = String(typeof input === 'string' ? input : (input as any)?.url || '');
    if (url.includes('supabase.co/rest/v1/')) {
      console.error('ðŸš« Blocked client REST write/read. Use Netlify functions.');
      throw new Error('Client-side Supabase REST blocked. Use /.netlify/functions/* instead.');
    }
    return origFetch.call(window, input as any, init);
  };
})();
