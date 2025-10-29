import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
  });
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    try {
      const res = await fetch("/.netlify/functions/save-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error("Save failed: " + text);
      }
      const { product } = await res.json();
      nav(`/admin/products/${product.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (error && isNew === false) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-semibold">
        {isNew ? "New Product" : `Edit: ${form.name}`}
      </h1>

      {error && <div className="text-red-600 text-sm">{error}</div>}

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

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>
        <a href="/admin/products" className="px-4 py-2 rounded border">
          Back
        </a>
      </div>

      {!isNew && (
        <div className="mt-8">
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
