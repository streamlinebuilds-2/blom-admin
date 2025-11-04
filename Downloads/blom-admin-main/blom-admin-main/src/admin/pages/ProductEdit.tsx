import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product } from '@/types/product';
import { emptyProduct } from '@/lib/productDefaults';
import ProductCardPreview from '@/admin/components/ProductCardPreview';
import ProductPagePreview from '@/admin/components/ProductPagePreview';

async function saveProduct(payload: Product) {
  const r = await fetch('/.netlify/functions/save-product', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ product: payload })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function deleteProduct(productId: string) {
  const r = await fetch('/.netlify/functions/delete-product', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ id: productId })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function triggerFlowA(product: Product) {
  // direct POST to your Flow A webhook
  const url = import.meta.env.VITE_FLOW_A_PRODUCTS_INTAKE
    || (window as any).FLOW_A_PRODUCTS_INTAKE
    || 'https://dockerfile-1n82.onrender.com/webhook/products-intake';

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        action: 'product_upsert',
        product: {
          id: product.id,
          name: product.name,
          subtitle: product.subtitle,
          slug: product.slug,
          status: product.status,
          category: product.category,
          tags: product.tags,
          badges: product.badges,
          claims: product.claims,
          price: product.price,
          compare_at_price: product.compare_at_price,
          stock: product.stock,
          short_description: product.short_description,
          long_description: product.long_description,
          how_to_use: product.how_to_use,
          size: product.size,
          shelf_life: product.shelf_life,
          features: product.features,
          image_url: product.image_url,
          gallery: product.gallery,
          variants: product.variants,
          seo: product.seo,
        }
      })
    });
    // don't throw if non-200; we still saved to DB
    const text = await r.text();
    console.log('[FLOW A] status', r.status, text);
  } catch (err) {
    console.warn('[FLOW A] error', err);
  }
}

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isCreate = !id || id === 'new';

  const [form, setForm] = useState<Product>(() => emptyProduct());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load existing for edit
  useEffect(() => {
    let ignore = false;
    async function run() {
      setError(null);
      if (!isCreate) {
        try {
          const r = await fetch(`/.netlify/functions/admin-product?id=${id}`);
          if (!r.ok) throw new Error(await r.text());
          const data = await r.json();
          if (!ignore) {
            // Map database row to Product type
            const product = data.product || data;
            setForm(emptyProduct({
              id: product.id,
              name: product.name || '',
              subtitle: product.subtitle || '',
              slug: product.slug || '',
              status: product.status || 'draft',
              category: product.category || '',
              tags: Array.isArray(product.tags) ? product.tags : [],
              badges: Array.isArray(product.badges) ? product.badges : [],
              claims: Array.isArray(product.claims) ? product.claims : [],
              price: product.price || product.price_cents ? (product.price_cents / 100) : 0,
              compare_at_price: product.compare_at_price || (product.compare_at_price_cents ? (product.compare_at_price_cents / 100) : null),
              stock: product.stock || product.stock_on_hand || product.stock_qty || 0,
              short_description: product.short_description || product.short_desc || '',
              long_description: product.long_description || '',
              how_to_use: product.how_to_use || '',
              size: product.size || '',
              shelf_life: product.shelf_life || '',
              features: Array.isArray(product.features) ? product.features : [],
              image_url: product.image_url || '',
              gallery: Array.isArray(product.gallery) ? product.gallery : [],
              variants: Array.isArray(product.variants) ? product.variants : [],
              seo: product.seo || { title: '', description: '' },
            }));
          }
        } catch (e:any) {
          if (!ignore) setError(e.message || 'Failed to load product');
        }
      } else {
        setForm(emptyProduct());
      }
    }
    run();
    return () => { ignore = true; };
  }, [id, isCreate]);

  const onChange = (patch: Partial<Product>) => setForm(prev => ({ ...prev, ...patch }));

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      // basic validation
      if (!form.name?.trim()) throw new Error('Name is required');
      if (!form.slug?.trim()) onChange({ slug: form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g,'') });

      const { product } = await saveProduct(form);
      setForm(product);

      // fire Flow A (non-blocking)
      triggerFlowA(product);

      // navigate to edit route if newly created
      if (isCreate && product.id) navigate(`/products/${product.id}`);
    } catch (e:any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!confirm('Delete this product?')) return;
    setSaving(true);
    try {
      await deleteProduct(form.id);
      navigate('/products');
    } catch (e:any) {
      setError(e.message || 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  // derived helpers
  const cardPreview = useMemo(() => <ProductCardPreview p={form} />, [form]);
  const pagePreview = useMemo(() => <ProductPagePreview p={form} />, [form]);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isCreate ? 'New Product' : 'Edit Product'}</h1>
        <div className="flex items-center gap-2">
          {!isCreate && (
            <button onClick={handleDelete} className="px-3 py-2 rounded bg-red-600 text-white">
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded bg-rose-600 text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: FORM */}
        <div className="rounded-2xl border bg-white p-5 space-y-6">
          {/* Basics */}
          <section className="space-y-3">
            <h2 className="font-semibold">Basics</h2>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Name"
                value={form.name} onChange={e=>onChange({name:e.target.value})}/>
              <input className="input" placeholder="Subtitle"
                value={form.subtitle} onChange={e=>onChange({subtitle:e.target.value})}/>
              <input className="input" placeholder="Slug"
                value={form.slug} onChange={e=>onChange({slug:e.target.value})}/>
              <select className="input" value={form.status} onChange={e=>onChange({status:e.target.value as any})}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <input className="input" placeholder="Category"
                value={form.category} onChange={e=>onChange({category:e.target.value})}/>
              <input className="input" placeholder="Tags (comma separated)"
                value={form.tags?.join(', ') || ''}
                onChange={e=>onChange({tags:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
            </div>
          </section>

          {/* Pricing & Stock */}
          <section className="space-y-3">
            <h2 className="font-semibold">Pricing & Stock</h2>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" className="input" placeholder="Price (ZAR)"
                value={form.price} onChange={e=>onChange({price:Number(e.target.value)})}/>
              <input type="number" className="input" placeholder="Compare at price"
                value={form.compare_at_price ?? ''} onChange={e=>onChange({compare_at_price:e.target.value?Number(e.target.value):null})}/>
              <input type="number" className="input" placeholder="Stock"
                value={form.stock} onChange={e=>onChange({stock:Number(e.target.value)})}/>
            </div>
          </section>

          {/* Content */}
          <section className="space-y-3">
            <h2 className="font-semibold">Content</h2>
            <textarea className="input" placeholder="Short description"
              value={form.short_description} onChange={e=>onChange({short_description:e.target.value})}/>
            <textarea className="input" placeholder="Long description (HTML allowed)"
              value={form.long_description} onChange={e=>onChange({long_description:e.target.value})}/>
            <textarea className="input" placeholder="How to use"
              value={form.how_to_use} onChange={e=>onChange({how_to_use:e.target.value})}/>
          </section>

          {/* Specs */}
          <section className="space-y-3">
            <h2 className="font-semibold">Specs</h2>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Size (e.g., 30ml)"
                value={form.size} onChange={e=>onChange({size:e.target.value})}/>
              <input className="input" placeholder="Shelf life"
                value={form.shelf_life} onChange={e=>onChange({shelf_life:e.target.value})}/>
            </div>
            <input className="input" placeholder="Claims (comma separated: Vegan, Cruelty-free, …)"
              value={form.claims?.join(', ') || ''}
              onChange={e=>onChange({claims:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
            <input className="input" placeholder="Features (comma separated bullets)"
              value={form.features?.join(', ') || ''}
              onChange={e=>onChange({features:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
          </section>

          {/* Media */}
          <section className="space-y-3">
            <h2 className="font-semibold">Media</h2>
            <input className="input" placeholder="Main image URL"
              value={form.image_url} onChange={e=>onChange({image_url:e.target.value})}/>
            <textarea className="input" placeholder="Gallery (one URL per line)"
              value={(form.gallery || []).join('\n')}
              onChange={e=>onChange({gallery:e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)})}/>
          </section>

          {/* Badges */}
          <section className="space-y-3">
            <h2 className="font-semibold">Badges</h2>
            <input className="input" placeholder="Badges (comma separated: New, Bestseller)"
              value={form.badges?.join(', ') || ''}
              onChange={e=>onChange({badges:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}/>
          </section>

          {/* Variants (simple) */}
          <section className="space-y-3">
            <h2 className="font-semibold">Variants</h2>
            <button type="button" className="px-2 py-1 rounded bg-gray-200" onClick={() => onChange({variants:[...(form.variants||[]), { name:'', price: form.price, stock: 0 }]})}>Add variant</button>
            <div className="space-y-2">
              {(form.variants || []).map((v, i) => (
                <div key={i} className="grid grid-cols-5 gap-2">
                  <input className="input" placeholder="Name" value={v.name} onChange={e=>{
                    const variants = [...(form.variants||[])]; variants[i] = {...v, name:e.target.value}; onChange({variants});
                  }}/>
                  <input className="input" placeholder="SKU" value={v.sku||''} onChange={e=>{
                    const variants = [...(form.variants||[])]; variants[i] = {...v, sku:e.target.value}; onChange({variants});
                  }}/>
                  <input type="number" className="input" placeholder="Price" value={v.price ?? ''} onChange={e=>{
                    const variants = [...(form.variants||[])]; variants[i] = {...v, price:e.target.value?Number(e.target.value):undefined}; onChange({variants});
                  }}/>
                  <input type="number" className="input" placeholder="Compare at" value={v.compare_at_price ?? ''} onChange={e=>{
                    const variants = [...(form.variants||[])]; variants[i] = {...v, compare_at_price:e.target.value?Number(e.target.value):undefined}; onChange({variants});
                  }}/>
                  <input type="number" className="input" placeholder="Stock" value={v.stock ?? 0} onChange={e=>{
                    const variants = [...(form.variants||[])]; variants[i] = {...v, stock:Number(e.target.value)}; onChange({variants});
                  }}/>
                </div>
              ))}
            </div>
          </section>

          {/* SEO */}
          <section className="space-y-3">
            <h2 className="font-semibold">SEO</h2>
            <input className="input" placeholder="SEO title"
              value={form.seo?.title || ''} onChange={e=>onChange({seo:{...(form.seo||{}), title:e.target.value}})}/>
            <textarea className="input" placeholder="SEO description"
              value={form.seo?.description || ''} onChange={e=>onChange({seo:{...(form.seo||{}), description:e.target.value}})}/>
          </section>
        </div>

        {/* RIGHT: PREVIEW */}
        <div className="space-y-6">
          <div>
            <h2 className="font-semibold mb-2">Card Preview</h2>
            {cardPreview}
          </div>
          <div>
            <h2 className="font-semibold mb-2">Product Page Preview</h2>
            {pagePreview}
          </div>
        </div>
      </div>
    </div>
  );
}
