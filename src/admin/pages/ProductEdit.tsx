import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { ImageUploader } from "@/components/ImageUploader";

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
    // website-specific fields
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
    (async () => {
      if (!id || id === "new") return;
      setLoading(true);
      try {
        const qs = new URLSearchParams({ id }).toString();
        const r = await fetch(`/.netlify/functions/admin-product?${qs}`);
        if (!r.ok) { throw new Error(await r.text()); }
        const { product } = await r.json();

        const images = Array.isArray(product.images) ? product.images : [];
        const mergedImages = (images.length === 0 && product.thumbnail) ? [product.thumbnail] : images;

        setForm({
          id: product.id,
          name: product.title || product.name || "",
          slug: product.slug || "",
          price: Number(product.price || 0),
          currency: product.currency || "ZAR",
          active: (product.status || "active") !== "draft",
          sku: product.sku || "",
          thumbnail: product.thumbnail || "",
          images: mergedImages,
          shortDescription: product.shortDescription || "",
          descriptionHtml: product.descriptionHtml || "",
          seo: product.seo || {},
          stock: product.stock ?? product.stock_qty ?? 0,
          stock_qty: product.stock_qty ?? product.stock ?? 0,
          cost_price: product.cost_price ?? 0,
          reorder_point: product.reorder_point ?? 0,
          reorder_qty: product.reorder_qty ?? 0,
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })().catch(console.error);
  }, [id]);

  async function save() {
    setLoading(true);
    setError("");
    setSaveResult(null);
    try {
      const res = await fetch("/.netlify/functions/save-product-and-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error("Save failed: " + text);
      }
      const result = await res.json();
      const { product, prUrl, previewUrl, branch } = result;

      // Show toast with branch info
      if (branch) {
        toast({
          title: "Product Saved",
          description: `Committed to branch: ${branch}`,
        });
      }

      setSaveResult({ product, prUrl, previewUrl, branch });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (error && !isNew) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <h1 className="text-xl font-semibold">
        {isNew ? "New Product" : `Edit: ${form.name}`}
      </h1>

      {error && <div className="text-red-600 text-sm">{error}</div>}

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

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Name</span>
          <input
            className="border px-3 py-2 rounded"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Slug</span>
          <input
            className="border px-3 py-2 rounded"
            value={form.slug || ""}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">SKU</span>
          <input
            className="border px-3 py-2 rounded"
            value={form.sku || ""}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Price (ZAR)</span>
          <input
            type="number"
            step="0.01"
            className="border px-3 py-2 rounded"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Cost Price (ZAR)</span>
          <input
            type="number"
            step="0.01"
            className="border px-3 py-2 rounded"
            value={form.cost_price || 0}
            onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Stock On Hand</span>
          <input
            type="number"
            className="border px-3 py-2 rounded bg-gray-50"
            value={form.stock_qty || 0}
            readOnly
            disabled
          />
          <span className="text-xs text-gray-500">Read-only (calculated from movements)</span>
        </label>

        {(form.cost_price > 0 && form.price > 0) && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">Margin Preview</span>
            <div className="border px-3 py-2 rounded bg-blue-50">
              <div className="text-sm">
                <div>Margin: R{(form.price - form.cost_price).toFixed(2)}</div>
                <div>Margin %: {(((form.price - form.cost_price) / form.price) * 100).toFixed(1)}%</div>
              </div>
            </div>
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-medium">Reorder Point</span>
          <input
            type="number"
            className="border px-3 py-2 rounded"
            value={form.reorder_point || 0}
            onChange={(e) => setForm({ ...form, reorder_point: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Reorder Quantity</span>
          <input
            type="number"
            className="border px-3 py-2 rounded"
            value={form.reorder_qty || 0}
            onChange={(e) => setForm({ ...form, reorder_qty: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Type</span>
          <select
            className="border px-3 py-2 rounded"
            value={form.product_type || "simple"}
            onChange={(e) =>
              setForm({ ...form, product_type: e.target.value })
            }
          >
            <option value="simple">Simple</option>
            <option value="course">Course</option>
            <option value="accessory">Accessory</option>
            <option value="bundle" disabled>
              Bundle (edit via Bundles)
            </option>
          </select>
        </label>

        <label className="flex items-center gap-2 mt-8">
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={(e) =>
              setForm({ ...form, active: e.target.checked })
            }
          />
          <span className="font-medium">Active</span>
        </label>
      </div>

      {/* Website-Specific Fields */}
      <div className="grid grid-cols-2 gap-4 mt-6 border-t pt-6">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Subtitle</span>
          <input
            className="border px-3 py-2 rounded"
            value={form.subtitle || ""}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            placeholder="Optional product tagline"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Currency</span>
          <select
            className="border px-3 py-2 rounded"
            value={form.currency || "ZAR"}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
          >
            <option value="ZAR">ZAR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Stock</span>
          <input
            type="number"
            min="0"
            className="border px-3 py-2 rounded"
            value={form.stock || 0}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Category</span>
          <input
            className="border px-3 py-2 rounded"
            value={form.category || ""}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g. Skincare, Makeup"
          />
        </label>

        <div className="col-span-2 flex items-center gap-3">
          <ImageUploader
            slug={form.slug || "temp"}
            onAdd={(img) => {
              if (!form.thumbnail) setForm((f: any) => ({ ...f, thumbnail: img.thumb }));
              setForm((f: any) => ({ ...f, images: [...(Array.isArray(f.images) ? f.images : []), img.hero] }));
            }}
            label="Upload image"
          />
          {form.thumbnail && (
            <img src={form.thumbnail} alt="thumb" className="w-14 h-14 rounded object-cover border" />
          )}
        </div>

        {Array.isArray(form.images) && form.images.length > 0 && (
          <div className="col-span-2 grid grid-cols-6 gap-2">
            {form.images.map((url: string, i: number) => (
              <div key={i} className="relative">
                <img src={url} className="w-24 h-24 object-cover rounded border" />
              </div>
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1 col-span-2">
          <span className="font-medium">Short Description</span>
          <textarea
            className="border px-3 py-2 rounded"
            rows={3}
            value={form.shortDescription || ""}
            onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
            placeholder="Brief description for product listing"
          />
        </label>

        <label className="flex flex-col gap-1 col-span-2">
          <span className="font-medium">Long Description (HTML)</span>
          <textarea
            className="border px-3 py-2 rounded font-mono text-xs"
            rows={5}
            value={form.descriptionHtml || ""}
            onChange={(e) =>
              setForm({ ...form, descriptionHtml: e.target.value })
            }
            placeholder="<p>Detailed product description...</p>"
          />
        </label>

        <label className="flex flex-col gap-1 col-span-2">
          <span className="font-medium">SEO Title</span>
          <input
            className="border px-3 py-2 rounded"
            value={form.seo?.title || ""}
            onChange={(e) =>
              setForm({
                ...form,
                seo: { ...form.seo, title: e.target.value },
              })
            }
            placeholder="Max 60 characters"
          />
        </label>

        <label className="flex flex-col gap-1 col-span-2">
          <span className="font-medium">SEO Description</span>
          <textarea
            className="border px-3 py-2 rounded"
            rows={2}
            value={form.seo?.description || ""}
            onChange={(e) =>
              setForm({
                ...form,
                seo: { ...form.seo, description: e.target.value },
              })
            }
            placeholder="Max 160 characters"
          />
        </label>

        <label className="flex flex-col gap-1 col-span-2">
          <span className="font-medium">Tags (comma-separated)</span>
          <input
            className="border px-3 py-2 rounded"
            value={Array.isArray(form.tags) ? form.tags.join(", ") : ""}
            onChange={(e) =>
              setForm({
                ...form,
                tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
              })
            }
            placeholder="tag1, tag2, tag3"
          />
        </label>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={save}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Product"}
        </button>
        <a href="/admin/products" className="px-4 py-2 rounded border">
          Back
        </a>
      </div>

      {!isNew && (
        <div className="mt-8 border-t pt-6">
          <h2 className="font-semibold mb-2">Recent Prices</h2>
          {prices.length > 0 ? (
            <ul className="text-sm space-y-1">
              {prices.map((p: any) => (
                <li key={p.id}>
                  R {Number(p.price).toFixed(2)} —{" "}
                  {new Date(p.effective_at).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No price history</p>
          )}
        </div>
      )}
    </div>
  );
}
