import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function BundleEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === "new";

  const [form, setForm] = useState<any>({
    name: "",
    slug: "",
    price: 0,
    active: true,
  });
  const [items, setItems] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load products for picker
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/.netlify/functions/admin-products?pageSize=1000");
        if (!res.ok) throw new Error("Failed to fetch products");
        const json = await res.json();
        setAllProducts(json.data || []);
      } catch (e: any) {
        console.error("Error loading products:", e);
      }
    })();
  }, []);

  // Load bundle if editing
  useEffect(() => {
    if (!isNew && id) {
      (async () => {
        setLoading(true);
        try {
          const res = await fetch(`/.netlify/functions/admin-bundle?id=${id}`);
          if (!res.ok) throw new Error("Failed to fetch bundle");
          const json = await res.json();
          setForm(json.bundle);
          setItems(json.items || []);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, isNew]);

  function addItem() {
    setItems([
      ...items,
      { id: `temp-${Date.now()}`, product_id: "", quantity: 1, product: null },
    ]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: string, value: any) {
    const updated = [...items];
    if (field === "product_id") {
      const product = allProducts.find((p) => p.id === value);
      updated[idx] = { ...updated[idx], product_id: value, product };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setItems(updated);
  }

  async function save() {
    setLoading(true);
    setError("");
    try {
      const payload = {
        id: form.id || undefined,
        name: form.name.trim(),
        slug: form.slug?.trim() || undefined,
        price: Number(form.price),
        active: form.active,
        items: items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
        })),
      };

      const res = await fetch("/.netlify/functions/save-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error("Save failed: " + text);
      }

      const { bundleId } = await res.json();
      nav(`/admin/bundles/${bundleId}`);
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
        {isNew ? "New Bundle" : `Edit: ${form.name}`}
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
          <span className="font-medium">Price (ZAR)</span>
          <input
            type="number"
            step="0.01"
            className="border px-3 py-2 rounded"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
        </label>

        <label className="flex items-center gap-2 mt-8">
          <input
            type="checkbox"
            checked={!!form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          <span className="font-medium">Active</span>
        </label>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Bundle Items</h2>
          <button
            onClick={addItem}
            className="px-3 py-1 rounded border bg-gray-50 text-sm"
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-3 border rounded p-4 bg-gray-50">
          {items.length === 0 ? (
            <p className="text-gray-500 text-sm">No items yet</p>
          ) : (
            items.map((item, idx) => (
              <div key={item.id} className="flex gap-2 items-end">
                <label className="flex flex-col gap-1 flex-1">
                  <span className="text-xs font-medium">Product</span>
                  <select
                    className="border px-2 py-2 rounded text-sm"
                    value={item.product_id}
                    onChange={(e) => updateItem(idx, "product_id", e.target.value)}
                  >
                    <option value="">Select product...</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (R {Number(p.price).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 w-24">
                  <span className="text-xs font-medium">Qty</span>
                  <input
                    type="number"
                    min="1"
                    className="border px-2 py-2 rounded text-sm"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(idx, "quantity", Number(e.target.value))
                    }
                  />
                </label>

                <button
                  onClick={() => removeItem(idx)}
                  className="px-3 py-2 rounded border text-red-600 text-sm"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Bundle"}
        </button>
        <a href="/admin/bundles" className="px-4 py-2 rounded border">
          Back
        </a>
      </div>
    </div>
  );
}
