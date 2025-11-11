import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { ImageUploader } from "@/components/ImageUploader";
import { ProductPreview } from "@/components/ProductPreview";
import { WebhookStatus } from "@/components/WebhookStatus";
import { publishPR } from "@/lib/publish";
import { supabase } from "@/components/supabaseClient";
import { rowToForm, formToPayload, emptyProduct, saveProduct } from "@/lib/products";

const FLOW_A_URL = 'https://dockerfile-1n82.onrender.com/webhook/products-intake';

function DeleteProductButton({ form, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const canDelete = !!(form?.id || form?.slug);

  const onDelete = async () => {
    if (!canDelete) {
      alert('No id or slug on this product.');
      return;
    }
    if (!confirm('Delete this product? This cannot be undone.')) return;

    try {
      setBusy(true);
      const res = await fetch('/.netlify/functions/delete-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: form.id ?? null, slug: form.slug ?? null }),
      });
      const a = await res.json().catch(() => ({}));
      if (!res.ok || !a?.ok) {
        throw new Error(a?.error || 'Delete failed');
      }
      toast({
        title: "Product Deleted",
        description: "Product has been deleted successfully"
      });
      onDeleted();
    } catch (err) {
      console.error('[DELETE ERROR]', err);
      toast({
        title: "Error",
        description: err?.message || "Failed to delete product",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      style={{
        padding: '8px 12px',
        background: '#dc2626',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        opacity: !canDelete || busy ? 0.5 : 1,
        cursor: !canDelete || busy ? 'not-allowed' : 'pointer'
      }}
      disabled={!canDelete || busy}
      onClick={onDelete}
      title={!canDelete ? 'Save once first to get an id/slug' : 'Delete product'}
    >
      {busy ? 'Deleting…' : 'Delete'}
    </button>
  );
}

export default function ProductEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState(emptyProduct());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveResult, setSaveResult] = useState(null);
  const [fireFlow, setFireFlow] = useState(true);
  const [lastWebhookStatus, setLastWebhookStatus] = useState('');

  useEffect(() => {
    if (isNew || !id) return;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('id,name,slug,status,price,price_cents,compare_at_price,compare_at_price_cents,stock_on_hand,stock,stock_qty,short_description,short_desc,long_description,image_url,gallery')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error('Product not found');

        setForm(rowToForm(data));
      } catch (err) {
        console.error("Failed to load product:", err);
        setError(err?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, isNew]);

  async function onSave() {
    // Diagnostic logging
    console.log('[SAVE] typeof form:', typeof form);
    console.log('[SAVE] typeof setForm:', typeof setForm);
    console.log('[SAVE] form:', form);

    setLoading(true);
    setError("");
    setSaveResult(null);

    try {
      // Convert form to payload
      const payload = formToPayload(form);
      console.log('[SAVE→fn]', payload);

      // 1) Save via service-role Netlify function
      const saved = await saveProduct(payload);
      console.log('[SAVE OK]', saved.product?.id || saved.product?.slug || 'unknown');

      // Handle response structure: { ok: true, product: {...} } or direct product
      if (!saved) {
        throw new Error('Save failed: no response');
      }

      if (!saved.ok) {
        throw new Error(saved.error || 'Save failed');
      }

      if (!saved.product) {
        throw new Error('Save failed: no product in response');
      }

      // 2) DIRECT webhook call (no Netlify proxy) - fire and log, non-blocking
      if (fireFlow) {
        const productId = saved.product?.id ?? form.id ?? null;
        const payload = {
          action: 'create_or_update_product',
          product: {
            id: productId,
            name: form.name,
            slug: form.slug,
            image_url: form.image_url,
            gallery: form.gallery || [],
            price: Number(form.price ?? 0),
            compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
            stock: Number(form.stock ?? 0),
            status: form.status || 'active',
            short_description: form.short_description || '',
            long_description: form.long_description || '',
            category: form.category || '',
          },
        };

        fetch(FLOW_A_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
          .then(async (r2) => {
            const text = await r2.text(); // n8n may return text
            const status = `Flow A → ${r2.status} ${r2.ok ? 'OK' : 'ERR'} — ${text.slice(0, 200)}`;
            setLastWebhookStatus(status);
            console.log('[WEBHOOK→n8n]', FLOW_A_URL);
            console.log('[WEBHOOK RESP]', r2.status, text.slice(0, 200));

            // Try to parse response for PR/preview data
            if (r2.ok) {
              try {
                const j = JSON.parse(text);
                const response = j?.data || j;
                if (response) {
                  setSaveResult({
                    prUrl: response.prUrl || response.pr || null,
                    previewUrl: response.previewUrl || response.preview || null,
                    prNumber: response.prNumber || response.pr_num || null,
                    branch: response.branch || response.ref || null,
                  });
                }
              } catch {
                // Non-JSON response, continue
              }
            }
          })
          .catch((webhookErr) => {
            const status = `Flow A → ERROR — ${webhookErr?.message || String(webhookErr)}`;
            setLastWebhookStatus(status);
            console.warn("Webhook call failed (non-critical):", webhookErr);
          });
      } else {
        setLastWebhookStatus(''); // Clear status if Flow A is disabled
      }

      // Update form with saved product ID if new
      if (isNew && saved.product?.id) {
        setForm(prev => ({ ...prev, id: saved.product.id }));
      }

      toast({
        title: "Product Saved",
        description: `Saved ${form.name} (${form.slug})`
      });

    } catch (err) {
      console.error('[SAVE ERROR]', err);
      setError(err?.message || "Save failed");
      toast({
        title: "Error",
        description: err?.message || "Failed to save product",
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
          <div style={{
            width: '32px',
            height: '32px',
            border: '4px solid var(--card)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </div>
    );
  }

  if (error && !isNew) {
    return (
      <div className="container mx-auto p-4">
        <div style={{
          background: 'var(--card)',
          border: '1px solid #dc2626',
          borderRadius: '6px',
          padding: '16px',
          color: '#dc2626'
        }}>
          <p style={{ fontWeight: 600 }}>Error</p>
          <p style={{ fontSize: '14px', marginTop: '4px' }}>{error}</p>
          <button
            onClick={() => nav('/products')}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ color: 'var(--text)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{isNew ? "New Product" : `Edit: ${form.name || 'Product'}`}</h1>
        <button
          onClick={() => nav('/products')}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--card)',
            background: 'var(--card)',
            color: 'var(--text)',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: '16px',
          background: 'var(--card)',
          border: '1px solid #dc2626',
          borderRadius: '6px',
          padding: '16px',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Two Column Layout: Form (Left) + Preview (Right) */}
      <div className="flex gap-6">
        {/* Left Column: Form (2/3 width) */}
        <div className="w-2/3">
          <form onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }} className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="text-sm">Product Image</label>
              <ImageUploader
                onAdd={(img) => {
                  setForm(prev => ({
                    ...prev,
                    image_url: img.hero,
                    gallery: [...(prev.gallery || []), img.original]
                  }));
                }}
                slug={form.slug || 'new'}
              />
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Name *
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input"
                  style={{
                    width: '100%',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    border: '1px solid var(--card)',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
              </label>
              <label className="text-sm">Slug *
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                  className="input"
                  style={{
                    width: '100%',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    border: '1px solid var(--card)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                />
              </label>
              <label className="text-sm">Price *
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                  className="input"
                  style={{
                    width: '100%',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    border: '1px solid var(--card)',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
              </label>
              <label className="text-sm">Compare At Price
                <input
                  type="number"
                  step="0.01"
                  value={form.compare_at_price ?? ''}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    compare_at_price: e.target.value ? Number(e.target.value) : null
                  }))}
                  className="input"
                  style={{
                    width: '100%',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    border: '1px solid var(--card)',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
              </label>
              <label className="text-sm">Stock *
                <input
                  type="number"
                  required
                  value={form.stock}
                  onChange={(e) => setForm(prev => ({ ...prev, stock: Number(e.target.value) || 0 }))}
                  className="input"
                  style={{
                    width: '100%',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    border: '1px solid var(--card)',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
              </label>
              <label className="text-sm">Status
                <select
                  value={form.status}
                  onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="select"
                  style={{
                    width: '100%',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    border: '1px solid var(--card)',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            </div>

            {/* Descriptions */}
            <label className="text-sm">Short Description
              <textarea
                rows={3}
                value={form.short_description}
                onChange={(e) => setForm(prev => ({ ...prev, short_description: e.target.value }))}
                style={{
                  width: '100%',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  border: '1px solid var(--card)',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}
              />
            </label>

            <label className="text-sm">Long Description
              <textarea
                rows={8}
                value={form.long_description}
                onChange={(e) => setForm(prev => ({ ...prev, long_description: e.target.value }))}
                style={{
                  width: '100%',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  border: '1px solid var(--card)',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}
              />
            </label>

            {/* Webhook Toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={fireFlow}
                  onChange={(e) => setFireFlow(e.target.checked)}
                  className="rounded"
                />
                <span>Fire Flow A (PR/Preview) after save</span>
              </label>
              <WebhookStatus status={lastWebhookStatus} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  padding: '8px 12px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? "Saving..." : "Save"}
              </button>
              {!isNew && <DeleteProductButton form={form} onDeleted={() => nav('/products')} />}
              <button
                type="button"
                onClick={() => nav('/products')}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--card)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Preview (1/3 width) */}
        <div className="w-1/3">
          <div className="sticky top-6">
            <ProductPreview product={form} />
          </div>
        </div>
      </div>

      {/* Save Result: Show PR/Preview buttons */}
      {saveResult && (
        <div style={{
          marginTop: '24px',
          background: 'var(--card)',
          border: '1px solid var(--card)',
          borderRadius: '6px',
          padding: '16px'
        }}>
          <p style={{ fontWeight: 600 }}>✓ Product saved successfully!</p>
          <div className="flex gap-2 flex-wrap" style={{ marginTop: '12px' }}>
            {saveResult.prUrl && (
              <a
                href={saveResult.prUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '8px 12px',
                  background: 'var(--accent)',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                Open PR →
              </a>
            )}
            {saveResult.previewUrl && (
              <a
                href={saveResult.previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '8px 12px',
                  background: '#9333ea',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                Open Preview →
              </a>
            )}
            {saveResult.prNumber && (
              <button
                style={{
                  padding: '8px 12px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
                onClick={async ()=>{
                  try {
                    const out = await publishPR(Number(saveResult.prNumber));
                    alert("Published! Netlify deploy will start now.");
                  } catch (e) {
                    alert(e.message||'Publish failed');
                  }
                }}
              >
                Publish
              </button>
            )}
            {saveResult.branch && (
              <span style={{
                padding: '8px 12px',
                background: 'var(--bg)',
                color: 'var(--text-muted)',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}>
                {saveResult.branch}
              </span>
            )}
          </div>
          <button
            onClick={() => setSaveResult(null)}
            style={{
              marginTop: '12px',
              fontSize: '14px',
              color: 'var(--text-muted)',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Continue editing
          </button>
        </div>
      )}
    </div>
  );
}
