import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { ImageUploader } from "@/components/ImageUploader";
import { publishPR } from "@/lib/publish";
import { saveProduct } from "@/lib/products";

export default function ProductEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === "new";
  const [form, setForm] = useState<any>({
    name: "",
    slug: "",
    sku: "",
    price: 0,
    product_type: "simple",
    active: true,
    subtitle: "",
    currency: "ZAR",
    stock: 0,
    stock_qty: 0,
    cost_price: 0,
    reorder_point: 0,
    reorder_qty: 0,
    badges: [],
    category: "",
    tags: [],
    thumbnail: "",
    images: [],
    shortDescription: "",
    descriptionHtml: "",
    seo: { title: "", description: "" },
  });
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveResult, setSaveResult] = useState<any>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/products/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Map loaded product to form shape
        setForm((prev:any)=>({
          ...prev,
          id: data.id,
          name: data.name || '',
          slug: data.slug || '',
          price: Number(data.price ?? data.price_cents ? (data.price_cents/100) : 0) || 0,
          stock: Number(data.stock_on_hand ?? data.stock_qty ?? data.stock ?? 0) || 0,
          shortDescription: data.short_description ?? '',
          descriptionHtml: data.long_description ?? data.description ?? '',
          thumbnail: data.image_url ?? '',
          images: Array.isArray(data.gallery) ? data.gallery : (Array.isArray(data.images)?data.images:[]),
          active: (data.status ?? 'active') === 'active'
        }));
      } catch (err) {
        setError("Failed to fetch product.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    const interval = setInterval(fetchProduct, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [id]);

  async function save() {
    setLoading(true);
    setError("");
    setSaveResult(null);
    try {
      const payload: any = {
        id: form.id,
        name: String(form.name || "").trim(),
        slug: String(form.slug || "").trim(),
        status: form.active === false ? 'draft' : 'active',
        price: Number(form.price || 0),
        compare_at_price: form.compare_at_price != null ? Number(form.compare_at_price) : null,
        stock: Number(form.stock ?? form.stock_qty ?? 0) || 0,
        short_description: form.shortDescription ?? null,
        long_description: form.descriptionHtml ?? null,
        image_url: form.thumbnail ?? null,
        gallery: Array.isArray(form.images) ? form.images : [],
      };

      // 1) Save via service-role Netlify function
      const saved = await saveProduct(payload);

      // 2) Kick Flow A via proxy (branch/PR), include the saved id and parse response
      const prox = await fetch("/.netlify/functions/products-intake-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: saved.id })
      });
      const text = await prox.text();
      let j: any = null; try { j = JSON.parse(text); } catch {}

      // 3) Inform user and capture PR data if present
      toast({ title: "Product Saved", description: `Saved ${payload.name} (${saved.slug})` });
      if (j) {
        setSaveResult({
          prUrl: j.prUrl || j.pr || null,
          previewUrl: j.previewUrl || j.preview || null,
          prNumber: j.prNumber || j.pr_num || null,
          branch: j.branch || j.ref || null,
        });
      }

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !form?.name) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!form) {
    return <div>Product not found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Product: {form.name || 'New'}</h1>
      <ImageUploader
        onAdd={(img) => setForm((p:any)=>({ ...p, thumbnail: img.hero, images: [...(p.images||[]), img.original] }))}
        slug={form.slug || 'new'}
      />
      <form onSubmit={(e) => {
        e.preventDefault();
        save();
      }} className="mt-6">
        <div className="grid gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700">
              Price
            </label>
            <input
              type="number"
              id="price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={form.descriptionHtml}
              onChange={(e) => setForm({ ...form, descriptionHtml: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            >
              <option value="">Select a category</option>
              <option value="Electronics">Electronics</option>
              <option value="Clothing">Clothing</option>
              <option value="Books">Books</option>
              <option value="Home & Garden">Home & Garden</option>
              <option value="Sports">Sports</option>
            </select>
          </div>
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
              Stock
            </label>
            <input
              type="number"
              id="stock"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Save Result: Show PR/Preview buttons */}
      {saveResult && (
        <div className="bg-green-50 border border-green-200 rounded p-4 space-y-3">
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
