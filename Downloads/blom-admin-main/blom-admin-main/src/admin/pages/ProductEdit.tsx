import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { slugify } from '@/lib/slugify';
import { toCardPreview, toPagePreview } from '@/lib/toTemplatePayload';
import ProductCardPreview from '@/admin/components/ProductCardPreview';
import ProductPagePreview from '@/admin/components/ProductPagePreview';

// Form state type matching the spec
type ProductForm = {
  id?: string;
  // Section 1: Basic Info
  name: string;
  slug: string;
  sku: string;
  category: string;
  // Section 2: Pricing & Stock
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number;
  track_inventory: boolean;
  // Section 3: Images
  thumbnail_url: string;
  hover_image_url: string;
  gallery_urls: string[];
  // Section 4: Descriptions
  short_description: string;
  description: string;
  overview: string;
  // Section 5: Product Details
  size: string;
  shelf_life: string;
  weight: number | null;
  barcode: string;
  // Section 6: Features & Usage
  features: string[];
  how_to_use: string[];
  // Section 7: Ingredients
  inci_ingredients: string[];
  key_ingredients: string[];
  // Section 8: Claims
  claims: string[];
  // Section 9: Variants
  variants: Array<{
    title: string;
    price?: number;
    compare_at_price?: number | null;
    sku: string;
    option1?: string;
    option2?: string;
    option3?: string;
    inventory_quantity: number;
    weight?: number | null;
    is_active: boolean;
  }>;
  // Section 10: SEO
  meta_title: string;
  meta_description: string;
  // Section 11: Display Settings
  is_active: boolean;
  is_featured: boolean;
  status: 'draft' | 'published' | 'archived';
  badges: string[];
  // Section 12: Related
  related: string[];
};

const emptyForm = (): ProductForm => ({
  name: '',
  slug: '',
  sku: '',
  category: '',
  price: 0,
  compare_at_price: null,
  inventory_quantity: 0,
  track_inventory: true,
  thumbnail_url: '',
  hover_image_url: '',
  gallery_urls: [],
  short_description: '',
  description: '',
  overview: '',
  size: '',
  shelf_life: '',
  weight: null,
  barcode: '',
  features: [],
  how_to_use: [],
  inci_ingredients: [],
  key_ingredients: [],
  claims: [],
  variants: [],
  meta_title: '',
  meta_description: '',
  is_active: true,
  is_featured: false,
  status: 'draft',
  badges: [],
  related: [],
});

async function saveProduct(form: ProductForm) {
  const r = await fetch('/.netlify/functions/save-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || 'Save failed');
  }
  return r.json();
}

async function deleteProduct(productId: string) {
  const r = await fetch('/.netlify/functions/delete-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: productId })
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || 'Delete failed');
  }
  return r.json();
}

async function triggerFlowA(form: ProductForm, savedId: string) {
  try {
    const images = [
      form.thumbnail_url,
      ...(form.hover_image_url ? [form.hover_image_url] : []),
      ...(form.gallery_urls || [])
    ].filter(Boolean);

    const payload = {
      action: 'create_or_update',
      product: {
        id: savedId,
        name: form.name,
        slug: form.slug,
        price: form.price,
        compare_at_price: form.compare_at_price ?? null,
        image_url: form.thumbnail_url,
        gallery: images,
        category: form.category,
        short_description: form.short_description,
        seo: {
          title: form.meta_title || form.name,
          description: form.meta_description || form.short_description
        }
      }
    };

    const r = await fetch('/.netlify/functions/products-intake-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await r.json();
    console.log('[FLOW A]', r.status, result);
  } catch (err) {
    console.warn('[FLOW A] error', err);
  }
}

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isCreate = !id || id === 'new';

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // Load existing product
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (isCreate) {
        setForm(emptyForm());
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/.netlify/functions/admin-product?id=${id}`);
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        if (ignore) return;
        const p = data.product || data;
        setForm({
          id: p.id,
          name: p.name || '',
          slug: p.slug || '',
          sku: p.sku || '',
          category: p.category || '',
          price: p.price || (p.price_cents ? p.price_cents / 100 : 0),
          compare_at_price: p.compare_at_price || (p.compare_at_price_cents ? p.compare_at_price_cents / 100 : null),
          inventory_quantity: p.inventory_quantity ?? p.stock_on_hand ?? p.stock_qty ?? 0,
          track_inventory: p.track_inventory !== false,
          thumbnail_url: p.thumbnail_url || p.image_url || '',
          hover_image_url: p.hover_image_url || '',
          gallery_urls: Array.isArray(p.gallery_urls) ? p.gallery_urls : (Array.isArray(p.gallery) ? p.gallery : []),
          short_description: p.short_description || p.short_desc || '',
          description: p.description || p.long_description || '',
          overview: p.overview || p.description || p.long_description || '',
          size: p.size || '',
          shelf_life: p.shelf_life || '',
          weight: p.weight ?? null,
          barcode: p.barcode || '',
          features: Array.isArray(p.features) ? p.features : [],
          how_to_use: Array.isArray(p.how_to_use) ? p.how_to_use : [],
          inci_ingredients: Array.isArray(p.inci_ingredients) ? p.inci_ingredients : [],
          key_ingredients: Array.isArray(p.key_ingredients) ? p.key_ingredients : [],
          claims: Array.isArray(p.claims) ? p.claims : [],
          variants: Array.isArray(p.variants) ? p.variants : [],
          meta_title: p.meta_title || p.seo?.title || '',
          meta_description: p.meta_description || p.seo?.description || '',
          is_active: p.is_active !== false,
          is_featured: p.is_featured === true,
          status: p.status || 'draft',
          badges: Array.isArray(p.badges) ? p.badges : [],
          related: Array.isArray(p.related) ? p.related : [],
        });
      } catch (e: any) {
        if (!ignore) setError(e.message || 'Failed to load product');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [id, isCreate]);

  // Load all products for related dropdown (GET only - client-side read OK)
  useEffect(() => {
    async function loadProducts() {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase.from('products').select('id,name').order('name');
        if (data) setAllProducts(data);
      } catch (e) {
        console.warn('Failed to load products for related dropdown', e);
      }
    }
    loadProducts();
  }, []);

  const updateForm = useCallback((patch: Partial<ProductForm>) => {
    setForm(prev => ({ ...prev, ...patch }));
  }, []);

  // Auto-slugify name when name changes (unless slug was manually edited)
  useEffect(() => {
    if (!slugTouched && form.name) {
      const newSlug = slugify(form.name);
      if (newSlug && newSlug !== form.slug) {
        updateForm({ slug: newSlug });
      }
    }
  }, [form.name, slugTouched]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Validation
      if (!form.name?.trim()) throw new Error('Name is required');
      if (!form.slug?.trim()) throw new Error('Slug is required');
      if (!form.sku?.trim()) throw new Error('SKU is required');
      if (!form.category?.trim()) throw new Error('Category is required');
      if (!form.price || form.price <= 0) throw new Error('Price must be greater than 0');
      if (!form.thumbnail_url?.trim()) throw new Error('Thumbnail image is required');
      if (!form.short_description?.trim()) throw new Error('Short description is required');
      if (form.short_description.length > 200) throw new Error('Short description must be 200 characters or less');
      if (form.meta_title.length > 60) throw new Error('Meta title must be 60 characters or less');
      if (form.meta_description.length > 160) throw new Error('Meta description must be 160 characters or less');

      const result = await saveProduct(form);
      if (!result.ok) throw new Error(result.error || 'Save failed');

      const savedId = result.id || result.product?.id || form.id;
      if (!savedId) throw new Error('No ID returned from save');

      // Update form with saved ID
      if (isCreate) {
        updateForm({ id: savedId });
        navigate(`/products/${savedId}`);
      }

      // Fire Flow A (non-blocking)
      triggerFlowA(form, savedId).catch(console.error);

      // Show success (could use toast here)
      alert('Product saved successfully!');
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteProduct(form.id);
      navigate('/products');
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  // Preview payloads
  const cardPreview = useMemo(() => toCardPreview(form), [form]);
  const pagePreview = useMemo(() => toPagePreview(form), [form]);

  // Helper to parse comma-separated values
  const parseArray = (value: string): string[] => {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="p-6" style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--text-primary)' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {isCreate ? 'New Product' : 'Edit Product'}
        </h1>
        <div className="flex items-center gap-2">
          {!isCreate && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: '#ef4444' }}
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: FORM (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Basic Info */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Basic Info</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => updateForm({ name: e.target.value })}
                  placeholder="Product name"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Slug *</label>
                <input
                  className="input"
                  value={form.slug}
                  onChange={e => { setSlugTouched(true); updateForm({ slug: e.target.value }); }}
                  placeholder="product-slug"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>SKU *</label>
                <input
                  className="input"
                  value={form.sku}
                  onChange={e => updateForm({ sku: e.target.value })}
                  placeholder="SKU-001"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Category *</label>
                <input
                  className="input"
                  value={form.category}
                  onChange={e => updateForm({ category: e.target.value })}
                  placeholder="Tools & Essentials"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Stock */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Pricing & Stock</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Price (ZAR) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.price}
                  onChange={e => updateForm({ price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Compare At Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.compare_at_price ?? ''}
                  onChange={e => updateForm({ compare_at_price: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Inventory Quantity *</label>
                <input
                  type="number"
                  className="input"
                  value={form.inventory_quantity}
                  onChange={e => updateForm({ inventory_quantity: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Track Inventory</label>
                <select
                  className="input"
                  value={form.track_inventory ? '1' : '0'}
                  onChange={e => updateForm({ track_inventory: e.target.value === '1' })}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Images */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Images</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Thumbnail URL *</label>
                <input
                  className="input"
                  value={form.thumbnail_url}
                  onChange={e => updateForm({ thumbnail_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Hover Image URL</label>
                <input
                  className="input"
                  value={form.hover_image_url}
                  onChange={e => updateForm({ hover_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Gallery URLs (one per line)</label>
                <textarea
                  className="input"
                  rows={4}
                  value={form.gallery_urls.join('\n')}
                  onChange={e => updateForm({ gallery_urls: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                  placeholder="https://...\nhttps://..."
                />
              </div>
            </div>
          </div>

          {/* Section 4: Descriptions */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Descriptions</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Short Description * (max 200 chars)
                </label>
                <textarea
                  className="input"
                  rows={3}
                  maxLength={200}
                  value={form.short_description}
                  onChange={e => updateForm({ short_description: e.target.value })}
                />
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {form.short_description.length}/200
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Description (Rich Text)</label>
                <textarea
                  className="input"
                  rows={6}
                  value={form.description}
                  onChange={e => updateForm({ description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Overview</label>
                <textarea
                  className="input"
                  rows={6}
                  value={form.overview}
                  onChange={e => updateForm({ overview: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Product Details */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Product Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Size</label>
                <input
                  className="input"
                  value={form.size}
                  onChange={e => updateForm({ size: e.target.value })}
                  placeholder="30ml"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Shelf Life</label>
                <input
                  className="input"
                  value={form.shelf_life}
                  onChange={e => updateForm({ shelf_life: e.target.value })}
                  placeholder="24 months"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Weight (grams)</label>
                <input
                  type="number"
                  className="input"
                  value={form.weight ?? ''}
                  onChange={e => updateForm({ weight: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Barcode</label>
                <input
                  className="input"
                  value={form.barcode}
                  onChange={e => updateForm({ barcode: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 6: Features & Usage */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Features & Usage</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Features (comma separated)</label>
                <input
                  className="input"
                  value={form.features.join(', ')}
                  onChange={e => updateForm({ features: parseArray(e.target.value) })}
                  placeholder="Feature 1, Feature 2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>How to Use (one per line, ordered)</label>
                <textarea
                  className="input"
                  rows={4}
                  value={form.how_to_use.join('\n')}
                  onChange={e => updateForm({ how_to_use: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                  placeholder="Step 1\nStep 2\nStep 3"
                />
              </div>
            </div>
          </div>

          {/* Section 7: Ingredients */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Ingredients</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>INCI Ingredients (comma separated)</label>
                <input
                  className="input"
                  value={form.inci_ingredients.join(', ')}
                  onChange={e => updateForm({ inci_ingredients: parseArray(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Key Ingredients (comma separated)</label>
                <input
                  className="input"
                  value={form.key_ingredients.join(', ')}
                  onChange={e => updateForm({ key_ingredients: parseArray(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Section 8: Claims */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Claims & Certifications</h2>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Claims (comma separated)</label>
              <input
                className="input"
                value={form.claims.join(', ')}
                onChange={e => updateForm({ claims: parseArray(e.target.value) })}
                placeholder="Vegan, Cruelty-Free, HEMA-Free"
              />
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Common: Vegan, Cruelty-Free, HEMA-Free, Paraben-Free, Toxic-Free
              </div>
            </div>
          </div>

          {/* Section 9: Variants */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Variants (Optional)</h2>
            <button
              type="button"
              className="px-3 py-2 rounded-lg mb-3"
              style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              onClick={() => updateForm({
                variants: [...form.variants, {
                  title: '',
                  sku: '',
                  inventory_quantity: 0,
                  is_active: true
                }]
              })}
            >
              + Add Variant
            </button>
            <div className="space-y-3">
              {form.variants.map((v, i) => (
                <div key={i} className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Variant {i + 1}</span>
                    <button
                      type="button"
                      className="text-xs"
                      style={{ color: '#ef4444' }}
                      onClick={() => updateForm({ variants: form.variants.filter((_, idx) => idx !== i) })}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" placeholder="Title *" value={v.title} onChange={e => {
                      const variants = [...form.variants];
                      variants[i] = { ...v, title: e.target.value };
                      updateForm({ variants });
                    }} />
                    <input className="input" placeholder="SKU *" value={v.sku} onChange={e => {
                      const variants = [...form.variants];
                      variants[i] = { ...v, sku: e.target.value };
                      updateForm({ variants });
                    }} />
                    <input type="number" className="input" placeholder="Price" value={v.price ?? ''} onChange={e => {
                      const variants = [...form.variants];
                      variants[i] = { ...v, price: e.target.value ? parseFloat(e.target.value) : undefined };
                      updateForm({ variants });
                    }} />
                    <input type="number" className="input" placeholder="Compare At" value={v.compare_at_price ?? ''} onChange={e => {
                      const variants = [...form.variants];
                      variants[i] = { ...v, compare_at_price: e.target.value ? parseFloat(e.target.value) : null };
                      updateForm({ variants });
                    }} />
                    <input className="input" placeholder="Option 1" value={v.option1 || ''} onChange={e => {
                      const variants = [...form.variants];
                      variants[i] = { ...v, option1: e.target.value };
                      updateForm({ variants });
                    }} />
                    <input className="input" placeholder="Option 2" value={v.option2 || ''} onChange={e => {
                      const variants = [...form.variants];
                      variants[i] = { ...v, option2: e.target.value };
                      updateForm({ variants });
                    }} />
                    <input type="number" className="input" placeholder="Inventory Qty" value={v.inventory_quantity} onChange={e => {
                      const variants = [...form.variants];
                      variants[i] = { ...v, inventory_quantity: parseInt(e.target.value) || 0 };
                      updateForm({ variants });
                    }} />
                    <select className="input" value={v.is_active ? '1' : '0'} onChange={e => {
                      const variants = [...form.variants];
                      variants[i] = { ...v, is_active: e.target.value === '1' };
                      updateForm({ variants });
                    }}>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 10: SEO */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>SEO</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Meta Title (max 60 chars)
                </label>
                <input
                  className="input"
                  maxLength={60}
                  value={form.meta_title}
                  onChange={e => updateForm({ meta_title: e.target.value })}
                />
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {form.meta_title.length}/60
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Meta Description (max 160 chars)
                </label>
                <textarea
                  className="input"
                  rows={3}
                  maxLength={160}
                  value={form.meta_description}
                  onChange={e => updateForm({ meta_description: e.target.value })}
                />
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {form.meta_description.length}/160
                </div>
              </div>
            </div>
          </div>

          {/* Section 11: Display Settings */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Display Settings</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={e => updateForm({ status: e.target.value as any })}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Active</label>
                <select
                  className="input"
                  value={form.is_active ? '1' : '0'}
                  onChange={e => updateForm({ is_active: e.target.value === '1' })}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Featured</label>
                <select
                  className="input"
                  value={form.is_featured ? '1' : '0'}
                  onChange={e => updateForm({ is_featured: e.target.value === '1' })}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Badges (comma separated)</label>
                <input
                  className="input"
                  value={form.badges.join(', ')}
                  onChange={e => updateForm({ badges: parseArray(e.target.value) })}
                  placeholder="Bestseller, New, Sale"
                />
              </div>
            </div>
          </div>

          {/* Section 12: Related */}
          <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Related Products</h2>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Related Product IDs (comma separated)</label>
              <input
                className="input"
                value={form.related.join(', ')}
                onChange={e => updateForm({ related: parseArray(e.target.value) })}
                placeholder="id1, id2, id3"
              />
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {allProducts.length > 0 && (
                  <select
                    className="input mt-2"
                    onChange={e => {
                      if (e.target.value && !form.related.includes(e.target.value)) {
                        updateForm({ related: [...form.related, e.target.value] });
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Add related product...</option>
                    {allProducts.filter(p => p.id !== form.id).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: PREVIEW (1/3 width, sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Card Preview</h2>
              <ProductCardPreview card={cardPreview} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Page Preview</h2>
              <ProductPagePreview page={pagePreview} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
