import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { ImageUploader } from "@/components/ImageUploader";
import { supabase } from "@/components/supabaseClient";
import { WebhookStatus } from "@/components/WebhookStatus";

const FLOW_C_URL = 'https://dockerfile-1n82.onrender.com/webhook/bundles-intake';

export default function BundleEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState({
    id: '',
    name: '',
    slug: '',
    status: 'active',
    price: 0,
    compare_at_price: null as number | null,
    short_description: '',
    long_description: '',
    images: [] as string[],
    hover_image: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fireFlow, setFireFlow] = useState(true);
  const [lastWebhookStatus, setLastWebhookStatus] = useState<string>('');

  useEffect(() => {
    if (isNew || !id) return;
    
    const loadBundle = async () => {
      try {
        setLoading(true);
        setError("");
        const { data, error: fetchError } = await supabase
          .from('bundles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError) throw fetchError;
        if (!data) throw new Error('Bundle not found');
        
        setForm({
          id: data.id,
          name: data.name || '',
          slug: data.slug || '',
          status: data.status || 'active',
          price: (data.price_cents || data.price || 0) / 100,
          compare_at_price: data.compare_at_price_cents ? (data.compare_at_price_cents / 100) : null,
          short_description: data.short_desc || data.short_description || '',
          long_description: data.long_desc || data.long_description || '',
          images: data.images || [],
          hover_image: data.hover_image || '',
        });
      } catch (err: any) {
        console.error("Failed to load bundle:", err);
        setError(err?.message || "Failed to load bundle");
      } finally {
        setLoading(false);
      }
    };
    
    loadBundle();
  }, [id, isNew]);

  async function onSave() {
    console.log('[SAVE→fn]', form);
    setLoading(true);
    setError("");
    
    try {
      const payload = {
        id: form.id || undefined,
        name: form.name,
        slug: form.slug,
        status: form.status,
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        short_description: form.short_description,
        long_description: form.long_description,
        images: form.images,
        hover_image: form.hover_image,
      };

      const res = await fetch('/.netlify/functions/save-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const saved = await res.json();
      console.log('[SAVE OK]', saved);

      if (!res.ok || !saved?.ok) {
        throw new Error(saved?.error || 'Save failed');
      }

      if (!saved.bundle) {
        throw new Error('Save failed: no bundle in response');
      }

      // Webhook call
      if (fireFlow) {
        const bundleId = saved.bundle?.id ?? form.id ?? null;
        const webhookPayload = {
          action: 'create_or_update_bundle',
          bundle: {
            id: bundleId,
            name: form.name,
            slug: form.slug,
            price: Number(form.price),
            status: form.status,
            short_description: form.short_description,
            long_description: form.long_description,
            images: form.images,
          },
        };

        fetch(FLOW_C_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
        })
          .then(async (r2) => {
            const text = await r2.text();
            const status = `Flow C → ${r2.status} ${r2.ok ? 'OK' : 'ERR'} — ${text.slice(0, 200)}`;
            setLastWebhookStatus(status);
            console.log('[WEBHOOK→n8n]', FLOW_C_URL);
            console.log('[WEBHOOK RESP]', r2.status, text.slice(0, 200));
          })
          .catch((webhookErr) => {
            const status = `Flow C → ERROR — ${webhookErr?.message || String(webhookErr)}`;
            setLastWebhookStatus(status);
            console.warn("Webhook call failed (non-critical):", webhookErr);
          });
      } else {
        setLastWebhookStatus('');
      }

      if (isNew && saved.bundle?.id) {
        setForm(prev => ({ ...prev, id: saved.bundle.id }));
      }

      toast({ 
        title: "Bundle Saved", 
        description: `Saved ${form.name} (${form.slug})` 
      });
      
    } catch (err: any) {
      console.error('[SAVE ERROR]', err);
      setError(err?.message || "Save failed");
      toast({ 
        title: "Error", 
        description: err?.message || "Failed to save bundle",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading && !form.name && !isNew) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isNew ? "New Bundle" : `Edit: ${form.name || 'Bundle'}`}</h1>
        <button
          onClick={() => nav('/bundles')}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Back
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.price}
              onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
          <textarea
            value={form.short_description}
            onChange={(e) => setForm(prev => ({ ...prev, short_description: e.target.value }))}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Long Description</label>
          <textarea
            value={form.long_description}
            onChange={(e) => setForm(prev => ({ ...prev, long_description: e.target.value }))}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            rows={6}
          />
        </div>

        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fireFlow}
              onChange={(e) => setFireFlow(e.target.checked)}
              className="rounded"
            />
            <span>Fire Flow C (PR/Preview) after save</span>
          </label>
          <WebhookStatus status={lastWebhookStatus} />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Bundle"}
          </button>
          <button
            type="button"
            onClick={() => nav('/bundles')}
            className="px-6 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

