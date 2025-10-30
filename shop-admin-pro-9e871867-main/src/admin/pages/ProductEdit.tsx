import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function safeBranch(input: string) {
    const s = (input || "").toLowerCase();
    return s
      .replace(/[^a-z0-9._\/-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function createPreview(branchClean: string, slug: string, title: string) {
    const res = await fetch("/.netlify/functions/trigger-flow-b", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchClean, slug, title, templateType: "product" }),
    });
    const out = await res.json();
    if (!res.ok || !out.previewUrl) throw new Error(out.error || "Preview failed");
    if (out.prUrl) window.open(out.prUrl, "_blank");
    window.open(out.previewUrl, "_blank");

    // return payload for state sync
    return out;
  }

  async function triggerPreview() {
    const slug = (form.slug || form.name || "").trim().toLowerCase();
    if (!slug) {
      setError("Please enter a product name or slug first.");
      return;
    }
    setPreviewLoading(true);
    setError("");
    try {
      const branchClean = (saveResult?.branch) || safeBranch(slug);
      const out = await createPreview(branchClean, slug, form.name || slug);
      setSaveResult({
        ...saveResult,
        prUrl: out?.prUrl || saveResult?.prUrl,
        previewUrl: out?.previewUrl || saveResult?.previewUrl,
        branch: branchClean,
      });
      toast({ title: "Preview triggered", description: `Branch: ${branchClean}` });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  function getPrNumberFromUrl(url?: string): number | null {
    if (!url) return null;
    const m = url.match(/\/pull\/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  async function publishPR() {
    const prNumber = getPrNumberFromUrl(saveResult?.prUrl);
    if (!prNumber) {
      setError("No PR number found. Save first to create a PR.");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/.netlify/functions/publish-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prNumber }),
      });
      const out = await res.json();
      if (!res.ok || !out?.ok) throw new Error(out?.error || "Publish failed");
      toast({ title: "Published", description: `PR #${prNumber} merged` });
      if (out?.liveUrl) window.open(out.liveUrl, "_blank");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    if (!isNew && id) {
      (async () => {
        setLoading(true);
        try {
          const res = await fetch(`/.netlify/functions/admin-product?id=${id}`);
          if (!res.ok) throw new Error("Failed to fetch product");
          const json = await res.json();
          setForm(json.product);
          setPrices(json.prices || []);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, isNew]);

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
            <button
              onClick={triggerPreview}
              disabled={previewLoading}
              className="px-4 py-2 rounded bg-black text-white text-sm font-medium disabled:opacity-50"
            >
              {previewLoading ? "Triggering…" : "Create/Refresh Preview"}
            </button>
            {saveResult?.prUrl && (
              <button
                onClick={publishPR}
                disabled={publishing}
                className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish"}
              </button>
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
            value={form.category || ""
}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g. Skincare, Makeup"
          />
        </label>

        <label className="flex flex-col gap-1 col-span-2">
          <span className="font-medium">Thumbnail URL</span>
          <input
            className="border px-3 py-2 rounded"
            value={form.thumbnail || ""}
            onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
            placeholder="https://..."
          />
        </label>

        <label className="flex flex-col gap-1 col-span-2">
          <span className="font-medium">Additional Images (URLs, one per line)</span>
          <textarea
            className="border px-3 py-2 rounded"
            rows={3}
            value={Array.isArray(form.images) ? form.images.join("\n") : ""}
            onChange={(e) =>
              setForm({
                ...form,
                images: e.target.value.split("\n").filter((url) => url.trim()),
              })
            }
            placeholder="https://image1.jpg&#10;https://image2.jpg"
          />
        </label>

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
        <button
          onClick={triggerPreview}
          disabled={previewLoading}
          className="px-4 py-2 rounded border disabled:opacity-50"
        >
          {previewLoading ? "Triggering…" : "Create/Refresh Preview"}
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
