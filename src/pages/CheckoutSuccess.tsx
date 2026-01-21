import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { cartStore } from '../lib/cart';
import { Download, CheckCircle, Clock, Package, User, MapPin, RefreshCw } from 'lucide-react';

export default function CheckoutSuccess() {
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'not-found'>('checking');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const checkStatus = useCallback(async (orderId: string) => {
    setStatus('checking');
    // Poll for 45 seconds (30 attempts x 1.5s)
    for (let i = 0; i < 30; i++) {
      const { data } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
      
      if (data && (data.status === 'paid' || data.payment_status === 'paid' || data.payment_status === 'complete')) {
        setStatus('paid');
        setOrderDetails(data);
        cartStore.clearCart();

        // 1) order-status: webhook (n8n) + invoice; uses m_payment_id
        if (data.m_payment_id) {
          fetch('/.netlify/functions/order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ m_payment_id: data.m_payment_id, status: 'paid' })
          }).catch(console.warn);
        }
        // 2) invoice-pdf by order_id as backup (if order-status failed or m_payment_id missing)
        fetch('/.netlify/functions/invoice-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: data.id })
        }).catch(console.warn);

        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    setStatus('pending');
  }, [retryCount]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order');
    if (orderId) checkStatus(orderId);
    else setStatus('not-found');
  }, [checkStatus]);

  const downloadReceipt = async () => {
    if (!orderDetails) return;
    setLoading(true);
    try {
        const res = await fetch('/.netlify/functions/invoice-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderDetails.id, download: true })
        });
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `Invoice-${orderDetails.order_number}.pdf`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
        }
    } catch (e) { alert('Download failed. Please try again.'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showMobileMenu={true} />
      <main className="section-padding py-12">
        <Container>
          <div className="max-w-3xl mx-auto space-y-8">
            <Card className="text-center shadow-lg border-t-4 border-t-pink-400">
              <CardContent className="pt-10 pb-10">
                {status === 'paid' ? (
                  <>
                    <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
                    <p className="text-gray-600">Your payment was successful.</p>
                    <Button onClick={downloadReceipt} disabled={loading} variant="outline" className="mt-6 gap-2">
                        <Download className="h-4 w-4" /> {loading ? 'Generating...' : 'Download Receipt'}
                    </Button>
                  </>
                ) : status === 'pending' ? (
                  <>
                    <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                      <Clock className="h-10 w-10 text-yellow-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Pending</h1>
                    <p className="text-gray-600 mb-6">We are waiting for the bank confirmation.</p>
                    <Button onClick={() => setRetryCount(c => c + 1)} variant="outline" className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Check Again
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mb-6"></div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment...</h1>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}