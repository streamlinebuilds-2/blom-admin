import { useRef, useEffect } from "react";

export function useWebhookSender(data, type) {
  const timeoutRef = useRef(null);
  const webhookUrl = import.meta.env.VITE_SPECIALS_WEBHOOK;

  useEffect(() => {
    if (!data || !webhookUrl) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce for 800ms
    timeoutRef.current = setTimeout(async () => {
      try {
        const payload = {
          ...data,
          type,
          timestamp: new Date().toISOString()
        };

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          console.log('Webhook sent successfully');
        } else {
          console.error('Webhook failed:', response.status);
        }
      } catch (err) {
        console.error('Webhook error:', err);
      }
    }, 800);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, type, webhookUrl]);

  return { webhookConfigured: !!webhookUrl };
}