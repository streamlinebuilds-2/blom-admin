import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { ImageUploader } from "@/components/ImageUploader";
import { supabase } from "@/components/supabaseClient";
import { WebhookStatus } from "@/components/WebhookStatus";

const FLOW_C_URL = 'https://dockerfile-1n82.onrender.com/webhook/bundles-intake';

type BundleProduct = {
  id: string;
  name: string;
  price: number;
  thumbnail_url?: string;
};

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
    bundle_products: [] as BundleProduct[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fireFlow, setFireFlow] = useState(true);
  const [lastWebhookStatus, setLastWebhookStatus] = useState<string>('');

  // Product search state
  const [allProducts, setAllProducts] = useState<BundleProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Load all products for the selector
  useEffect(() => {
    async function loadProducts() {
      try {
        const { data } = await supabase
          .from('products')
          .select('id, name, price, thumbnail_url')
          .in('status', ['active', 'published'])
          .order('name');
        if (data) setAllProducts(data as BundleProduct[]);
      } catch (e) {
        console.warn('Failed to load products for bundle selector', e);
      }
    }
    loadProducts();
  }, []);

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
          price: (data.price_cents || 0) / 100,
          compare_at_price: data.compare_at_price_cents ? (data.compare_at_price_cents / 100) : null,
          short_description: data.short_desc || data.short_description || '',
          long_description: data.long_desc || data.long_description || '',
          images: data.images || [],
          hover_image: data.hover_image || '',
          bundle_products: Array.isArray(data.bundle_products) ? data.bundle_products : [],
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

  function addProductToBundle(product: BundleProduct) {
    if (form.bundle_products.some(p => p.id === product.id)) return;
    setForm(prev => ({
      ...prev,
      bundle_products: [...prev.bundle_products, product],
    }));
    setProductSearch('');
  }

  function removeProductFromBundle(productId: string) {
    setForm(prev => ({
      ...prev,
      bundle_products: prev.bundle_products.filter(p => p.id !== productId),
    }));
  }

  const filteredProducts = allProducts.filter(p =>
    !form.bundle_products.some(bp => bp.id === p.id) &&
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

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
        bundle_products: form.bundle_products,
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
            bundle_products: form.bundle_products,
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
      <>
        <div className="topbar">
          <div className="font-bold">{isNew ? "New Bundle" : `Edit: ${form.name || 'Bundle'}`}</div>
        </div>
        <div className="content-area">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="font-bold">{isNew ? "New Bundle" : `Edit: ${form.name || 'Bundle'}`}</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => nav('/bundles')}
            className="btn-primary"
            style={{ background: 'var(--accent-2)' }}
          >
            Back
          </button>
        </div>
      </div>

      <div className="content-area">
        {error && (
          <div className="section-card" style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}>
          <div className="form-col">
            <div className="section-card">
              <div className="label">Basic Info</div>
              <div className="form-grid">
                <div>
                  <div className="label">Name *</div>
                  <input
                    type="text"
                    required
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="label">Slug *</div>
                  <input
                    type="text"
                    required
                    className="input"
                    value={form.slug}
                    onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="label">Price (ZAR) *</div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="input"
                    value={form.price}
                    onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <div className="label">Compare At Price</div>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={form.compare_at_price ?? ''}
                    onChange={(e) => setForm(prev => ({ ...prev, compare_at_price: e.target.value ? Number(e.target.value) : null }))}
                  />
                </div>
                <div>
                  <div className="label">Status</div>
                  <select
                    className="select"
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bundle Products */}
            <div className="section-card">
              <div className="label">Bundle Products</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
                Add the products that are included in this bundle.
              </div>

              {/* Search + add */}
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Search products to add..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                {productSearch && filteredProducts.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    zIndex: 50,
                    maxHeight: '240px',
                    overflowY: 'auto',
                  }}>
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductToBundle(p)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '10px 14px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderBottom: '1px solid var(--border)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        {p.thumbnail_url && (
                          <img
                            src={p.thumbnail_url}
                            alt={p.name}
                            style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>R {Number(p.price).toFixed(2)}</div>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>+ Add</span>
                      </button>
                    ))}
                  </div>
                )}
                {productSearch && filteredProducts.length === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    zIndex: 50,
                  }}>
                    No active products found
                  </div>
                )}
              </div>

              {/* Selected products list */}
              {form.bundle_products.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                  No products added yet. Search above to add products.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.bundle_products.map((p, i) => (
                    <div key={p.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', minWidth: '20px' }}>{i + 1}.</span>
                      {p.thumbnail_url && (
                        <img
                          src={p.thumbnail_url}
                          alt={p.name}
                          style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>R {Number(p.price).toFixed(2)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProductFromBundle(p.id)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {form.bundle_products.length} product{form.bundle_products.length !== 1 ? 's' : ''} in bundle
                  </div>
                </div>
              )}
            </div>

            <div className="section-card">
              <div className="label">Descriptions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div className="label">Short Description</div>
                  <textarea
                    className="textarea"
                    value={form.short_description}
                    onChange={(e) => setForm(prev => ({ ...prev, short_description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <div className="label">Long Description</div>
                  <textarea
                    className="textarea"
                    value={form.long_description}
                    onChange={(e) => setForm(prev => ({ ...prev, long_description: e.target.value }))}
                    rows={6}
                  />
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="label">Images</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div className="label">Bundle Images (one URL per line)</div>
                  <textarea
                    className="textarea"
                    rows={4}
                    value={form.images.join('\n')}
                    onChange={(e) => setForm(prev => ({ ...prev, images: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <div className="label">Hover Image URL</div>
                  <input
                    type="text"
                    className="input"
                    value={form.hover_image}
                    onChange={(e) => setForm(prev => ({ ...prev, hover_image: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="label">Settings</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text)' }}>
                  <input
                    type="checkbox"
                    checked={fireFlow}
                    onChange={(e) => setFireFlow(e.target.checked)}
                    style={{ borderRadius: '4px' }}
                  />
                  <span>Fire Flow C (PR/Preview) after save</span>
                </label>
                <WebhookStatus status={lastWebhookStatus} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Saving..." : "Save Bundle"}
              </button>
              <button
                type="button"
                onClick={() => nav('/bundles')}
                className="btn-primary"
                style={{ background: 'var(--accent-2)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
