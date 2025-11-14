import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { ImageUploader } from "@/components/ImageUploader";
import { ProductPreview } from "@/components/ProductPreview";
import { publishPR } from "@/lib/publish";
import { supabase } from "@/components/supabaseClient";
import { rowToForm, formToPayload, emptyProduct, saveProduct } from "@/lib/products";

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
      className="product-btn-delete"
      disabled={!canDelete || busy}
      onClick={onDelete}
      title={!canDelete ? 'Save once first to get an id/slug' : 'Delete product'}
    >
      {busy ? 'Deleting…' : 'Delete Product'}
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

    try {
      // Convert form to payload
      const payload = formToPayload(form);
      console.log('[SAVE→fn]', payload);

      // Save via service-role Netlify function
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
    <>
      <style>{`
        /* Product Form Styling - Matching ProductNew */
        .topbar {
          padding: 24px 32px;
          border-bottom: 2px solid var(--border);
          background: var(--card);
          margin-bottom: 24px;
        }
        .content-area {
          padding: 0 32px 32px;
          overflow-y: auto;
        }
        .product-form-input, .product-form-textarea, .product-form-select {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
          transition: box-shadow .2s;
        }
        .product-form-input:focus, .product-form-textarea:focus, .product-form-select:focus {
          outline: none;
          box-shadow: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light);
        }
        .product-form-textarea {
          min-height: 100px;
          resize: vertical;
          position: relative;
          z-index: 1;
        }
        .product-form-section {
          background: var(--card);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          margin-bottom: 24px;
        }
        .product-btn-primary {
          padding: 12px 28px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          transition: transform 0.2s;
        }
        .product-btn-primary:disabled {
          opacity: .6;
          cursor: not-allowed;
        }
        .product-btn-primary:not(:disabled):hover {
          transform: translateY(-2px);
        }
        .product-btn-secondary {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }
        .product-btn-secondary:hover {
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }
        .product-btn-delete {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: #dc2626;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }
        .product-btn-delete:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
        .product-btn-delete:hover:not(:disabled) {
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }
        .space-y-1 > * + * { margin-top: 0.25rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .grid { display: grid; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      `}</style>
      <div className="flex h-full flex-col">
        <div className="topbar">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-lg">{isNew ? "New Product" : `Edit Product`}</div>
              <div className="text-sm text-[var(--text-muted)]">
                {isNew ? "Create a new product" : `Editing: ${form.name || 'Product'}`}
              </div>
            </div>
            <button
              onClick={() => nav('/products')}
              className="product-btn-secondary"
            >
              Back to Products
            </button>
          </div>
        </div>

        <div className="content-area">
          {error && (
            <div style={{
              marginBottom: '24px',
              background: 'var(--card)',
              border: '2px solid #dc2626',
              borderRadius: '12px',
              padding: '16px',
              color: '#dc2626',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }} className="space-y-4">
            {/* Basic Info Section */}
            <section className="product-form-section">
              <header className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text)]">Basic Information</h2>
                <p className="text-sm text-[var(--text-muted)]">Product name, slug, and identification.</p>
              </header>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[var(--text)]" htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="product-form-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[var(--text)]" htmlFor="slug">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="slug"
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                    className="product-form-input"
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                  />
                </div>
              </div>
            </section>

            {/* Pricing & Stock Section */}
            <section className="product-form-section">
              <header className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text)]">Pricing &amp; Stock</h2>
                <p className="text-sm text-[var(--text-muted)]">Control pricing and inventory.</p>
              </header>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[var(--text)]" htmlFor="price">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
                    className="product-form-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[var(--text)]" htmlFor="compare_at_price">
                    Compare at Price
                  </label>
                  <input
                    id="compare_at_price"
                    type="number"
                    step="0.01"
                    value={form.compare_at_price ?? ''}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      compare_at_price: e.target.value ? Number(e.target.value) : null
                    }))}
                    className="product-form-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[var(--text)]" htmlFor="stock">
                    Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="stock"
                    type="number"
                    required
                    value={form.stock}
                    onChange={(e) => setForm(prev => ({ ...prev, stock: Number(e.target.value) || 0 }))}
                    className="product-form-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[var(--text)]" htmlFor="status">
                    Status
                  </label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className="product-form-select"
                  >
                    <option value="active">Active</option>
                    <option value="published">Published</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Descriptions Section */}
            <section className="product-form-section">
              <header className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text)]">Descriptions</h2>
                <p className="text-sm text-[var(--text-muted)]">Short and detailed product descriptions.</p>
              </header>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[var(--text)]" htmlFor="short_description">
                    Short Description
                  </label>
                  <textarea
                    id="short_description"
                    rows={3}
                    value={form.short_description}
                    onChange={(e) => setForm(prev => ({ ...prev, short_description: e.target.value }))}
                    className="product-form-textarea"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-[var(--text)]" htmlFor="long_description">
                    Long Description
                  </label>
                  <textarea
                    id="long_description"
                    rows={8}
                    value={form.long_description}
                    onChange={(e) => setForm(prev => ({ ...prev, long_description: e.target.value }))}
                    className="product-form-textarea"
                  />
                </div>
              </div>
            </section>

            {/* Images Section */}
            <section className="product-form-section">
              <header className="mb-4">
                <h2 className="text-lg font-semibold text-[var(--text)]">Images</h2>
                <p className="text-sm text-[var(--text-muted)]">Product images and gallery.</p>
              </header>
              <div>
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
            </section>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="product-btn-secondary"
                onClick={() => nav('/products')}
                disabled={loading}
              >
                Cancel
              </button>
              {!isNew && <DeleteProductButton form={form} onDeleted={() => nav('/products')} />}
              <button
                type="submit"
                disabled={loading}
                className="product-btn-primary"
              >
                {loading ? "Saving..." : isNew ? "Create Product" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
