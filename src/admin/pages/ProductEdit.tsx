import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { ImageUploader } from "@/components/ImageUploader";
import { publishPR } from "@/lib/publish";
import { supabase } from "@/components/supabaseClient";
import { rowToForm, formToPayload, emptyProduct, saveProduct, type ProductForm } from "@/lib/products";

export default function ProductEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState<ProductForm>(emptyProduct());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveResult, setSaveResult] = useState<any>(null);

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
      } catch (err: any) {
        console.error("Failed to load product:", err);
        setError(err?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [id, isNew]);

  async function onSave() {
    setLoading(true);
    setError("");
    setSaveResult(null);
    
    try {
      // Convert form to payload
      const payload = formToPayload(form);
      
      // 1) Save via service-role Netlify function
      const saved = await saveProduct(payload);
      
      if (!saved?.ok || !saved?.product) {
        throw new Error(saved?.error || 'Save failed');
      }

      // 2) Kick Flow A via proxy (branch/PR), optional
      try {
        const prox = await fetch("/.netlify/functions/products-intake-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: form.slug, name: form.name, image_url: form.image_url, id: saved.product.id })
        });
        const text = await prox.text();
        let j: any = null;
        try { j = JSON.parse(text); } catch {}
        
        if (j) {
          setSaveResult({
            prUrl: j.prUrl || j.pr || null,
            previewUrl: j.previewUrl || j.preview || null,
            prNumber: j.prNumber || j.pr_num || null,
            branch: j.branch || j.ref || null,
          });
        }
      } catch (proxyErr) {
        console.warn("Proxy call failed (non-critical):", proxyErr);
      }

      // Update form with saved product ID if new
      if (isNew && saved.product?.id) {
        setForm(prev => ({ ...prev, id: saved.product.id }));
      }

      toast({ 
        title: "Product Saved", 
        description: `Saved ${form.name} (${form.slug})` 
      });
      
    } catch (e: any) {
      setError(e?.message || "Save failed");
      toast({ 
        title: "Error", 
        description: e?.message || "Failed to save product",
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

  if (error && !isNew) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => nav('/products')}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isNew ? "New Product" : `Edit: ${form.name || 'Product'}`}</h1>
        <button
          onClick={() => nav('/products')}
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

      <div className="mb-6">
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
        {form.image_url && (
          <div className="mt-2">
            <img src={form.image_url} alt="Preview" className="h-32 object-cover rounded" />
          </div>
        )}
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
          </div>
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              type="text"
              id="slug"
              required
              value={form.slug}
              onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price *
            </label>
            <input
              type="number"
              step="0.01"
              id="price"
              required
              value={form.price}
              onChange={(e) => setForm(prev => ({ ...prev, price: Number(e.target.value) || 0 }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
          </div>
          <div>
            <label htmlFor="compare_at_price" className="block text-sm font-medium text-gray-700 mb-1">
              Compare At Price
            </label>
            <input
              type="number"
              step="0.01"
              id="compare_at_price"
              value={form.compare_at_price ?? ''}
              onChange={(e) => setForm(prev => ({ 
                ...prev, 
                compare_at_price: e.target.value ? Number(e.target.value) : null 
              }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
          </div>
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Stock *
            </label>
            <input
              type="number"
              id="stock"
              required
              value={form.stock}
              onChange={(e) => setForm(prev => ({ ...prev, stock: Number(e.target.value) || 0 }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as ProductForm['status'] }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-1">
            Short Description
          </label>
          <textarea
            id="short_description"
            rows={2}
            value={form.short_description}
            onChange={(e) => setForm(prev => ({ ...prev, short_description: e.target.value }))}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
          />
        </div>

        <div>
          <label htmlFor="long_description" className="block text-sm font-medium text-gray-700 mb-1">
            Long Description
          </label>
          <textarea
            id="long_description"
            rows={6}
            value={form.long_description}
            onChange={(e) => setForm(prev => ({ ...prev, long_description: e.target.value }))}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Product"}
          </button>
          <button
            type="button"
            onClick={() => nav('/products')}
            className="px-6 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Save Result: Show PR/Preview buttons */}
      {saveResult && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded p-4 space-y-3">
          <p className="text-green-800 font-medium">✓ Product saved successfully!</p>
          <div className="flex gap-2 flex-wrap">
            {saveResult.prUrl && (
              <a
                href={saveResult.prUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Open PR →
              </a>
            )}
            {saveResult.previewUrl && (
              <a
                href={saveResult.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
              >
                Open Preview →
              </a>
            )}
            {saveResult.prNumber && (
              <button
                className="px-4 py-2 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                onClick={async ()=>{
                  try {
                    const out = await publishPR(Number(saveResult.prNumber));
                    alert("Published! Netlify deploy will start now.");
                  } catch (e:any) {
                    alert(e.message||'Publish failed');
                  }
                }}
              >
                Publish
              </button>
            )}
            {saveResult.branch && (
              <span className="px-4 py-2 rounded bg-gray-100 text-gray-700 text-sm font-mono">
                {saveResult.branch}
              </span>
            )}
          </div>
          <button
            onClick={() => setSaveResult(null)}
            className="text-sm text-gray-600 underline"
          >
            Continue editing
          </button>
        </div>
      )}
    </div>
  );
}
