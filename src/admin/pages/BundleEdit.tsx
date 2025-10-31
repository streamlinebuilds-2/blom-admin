import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ImageUploader } from "@/components/ImageUploader";
import { PreviewBar } from "@/components/PreviewBar";
import { publishPR } from "@/lib/publish";

type Item = { product_id: string; quantity: number; product?: any };

function slugifyClient(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function triggerPreview(branch: string, slug: string, title: string) {
  const url =
    import.meta.env.VITE_FLOW_D_BUNDLES_PREVIEW ||
    import.meta.env.VITE_FLOW_B_PRODUCTS_PREVIEW || // fallback if you reuse Flow B
    "/.netlify/functions/trigger-flow-b";
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchClean: branch, slug, title, templateType: "bundle" }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function BundleEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === "new";

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<any>({
    id: undefined,
    name: "",
    slug: "",
    price: 0,
    active: true,
    subtitle: "",
    heroImage: "",
    images: [] as string[],
    descriptionHtml: "",
    seo: {} as any,
    items: [] as Item[],
  });

  const [pr, setPr] = useState<{
    prUrl?: string | null;
    prNumber?: number | null;
    previewUrl?: string | null;
    branch?: string | null;
  }>({});

  // Load products + existing bundle (if editing)
  useEffect(() => {
    (async () => {
      const p = await fetch("/.netlify/functions/admin-products?pageSize=1000");
      const pj = await p.json();
      setAllProducts(pj.data || []);

      if (!isNew) {
        const b = await fetch(`/.netlify/functions/admin-bundle?id=${id}`);
        const bj = await b.json();
        setForm({
          id: bj.bundle?.id,
          name: bj.bundle?.name || "",
          slug: bj.bundle?.slug || "",
          price: Number(bj.bundle?.price || 0),
          active: !!bj.bundle?.active,
          subtitle: bj.bundle?.subtitle || "",
          heroImage: bj.bundle?.heroImage || "",
          images: Array.isArray(bj.bundle?.images) ? bj.bundle.images : [],
          descriptionHtml: bj.bundle?.descriptionHtml || "",
          seo: bj.bundle?.seo || {},
          items: (bj.items || []).map((it: any) => ({
            product_id: it.product_id,
            quantity: Number(it.quantity || 1),
            product: it.product,
          })),
        });
      }
    })().catch((e) => console.error(e));
  }, [id, isNew]);

  // Auto-slug on name change (only when slug empty or auto)
  useEffect(() => {
    setForm((f: any) => {
      if (!f) return f;
      if (!f.name) return f;
      const should = !f.slug || f.slug === "auto-generated from name";
      return should ? { ...f, slug: slugifyClient(f.name) } : f;
    });
  }, [form.name]);

  function addItem() {
    setForm((f: any) => ({ ...f, items: [...f.items, { product_id: "", quantity: 1 }] }));
  }
  function updateItem(ix: number, patch: Partial<Item>) {
    setForm((f: any) => ({
      ...f,
      items: f.items.map((it: Item, i: number) => (i === ix ? { ...it, ...patch } : it)),
    }));
  }
  function removeItem(ix: number) {
    setForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== ix) }));
  }

  async function save() {
    if (!form.name) return alert("Bundle Name is required.");
    setBusy(true);
    try {
      const res = await fetch("/.netlify/functions/save-bundle-and-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          name: String(form.name || "").trim(),
          slug: String(form.slug || "").trim(),
          price: Number(form.price || 0),
          active: !!form.active,
          items: (form.items || [])
            .filter((x: Item) => x.product_id)
            .map((x: Item) => ({ product_id: x.product_id, quantity: Number(x.quantity || 1) })),
          subtitle: form.subtitle,
          heroImage: form.heroImage,
          images: form.images || [],
          descriptionHtml: form.descriptionHtml,
          seo: form.seo || {},
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error("Save failed: " + t);
      }
      const out = await res.json(); // { bundleId, prUrl, previewUrl, branch }

      // if new, navigate to edit route
      if (isNew && out.bundleId) {
        setTimeout(() => nav(`/admin/bundles/${out.bundleId}`), 0);
      }

      // Try to trigger preview (Flow D)
      try {
        const prev = await triggerPreview(out.branch, form.slug, form.name);
        setPr((p) => ({
          ...p,
          prUrl: prev.prUrl || out.prUrl || p?.prUrl || null,
          previewUrl: prev.previewUrl || out.previewUrl || p?.previewUrl || null,
          branch: prev.branch || out.branch || p?.branch || null,
          prNumber: prev.prNumber || p?.prNumber || null,
        }));
      } catch (e: any) {
        console.warn("Preview trigger error:", e.message);
        setPr((p) => ({
          ...p,
          prUrl: out.prUrl || p?.prUrl || null,
          previewUrl: out.previewUrl || p?.previewUrl || null,
          branch: out.branch || p?.branch || null,
        }));
      }
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const previewThumbs = useMemo(() => form.images || [], [form.images]);

  return (
    <div className="p-6 grid grid-cols-12 gap-6 min-h-[calc(100vh-110px)]">
      {/* Left = form */}
      <div className="col-span-7 flex flex-col gap-4 overflow-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => nav("/admin/bundles")}
            className="px-3 py-2 border rounded"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold">{isNew ? "New Bundle" : `Edit Bundle`}</h1>
          <div className="ml-auto" />
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save Bundle"}
          </button>
        </div>

        {/* REMOVE legacy webhook banner */}
        {/* (That old 'VITE_SPECIALS_WEBHOOK' notice came from previous UI; not needed here.) */}

        <section className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span>Bundle Name *</span>
            <input
              className="border px-3 py-2 rounded"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Slug</span>
            <input
              className="border px-3 py-2 rounded"
              value={form.slug || ""}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Price (ZAR)</span>
            <input
              type="number"
              step="0.01"
              className="border px-3 py-2 rounded"
              value={form.price || 0}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-2 mt-8">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span>Active</span>
          </label>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Bundle Items</h2>
            <button className="px-3 py-1 border rounded" onClick={addItem}>
              + Add item
            </button>
          </div>
          {(form.items || []).map((it: Item, ix: number) => (
            <div key={ix} className="flex gap-2 items-center">
              <select
                className="border px-3 py-2 rounded w-72"
                value={it.product_id}
                onChange={(e) => updateItem(ix, { product_id: e.target.value })}
              >
                <option value="">Select product…</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — R {Number(p.price).toFixed(2)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="border px-3 py-2 rounded w-24"
                value={it.quantity}
                onChange={(e) => updateItem(ix, { quantity: Number(e.target.value) })}
              />
              <button className="px-3 py-2 border rounded" onClick={() => removeItem(ix)}>
                Remove
              </button>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Images</h2>
          <div className="flex gap-2">
            <ImageUploader
              slug={form.slug || "temp"}
              onAdd={(img) =>
                setForm((f: any) => ({
                  ...f,
                  heroImage: f.heroImage || img.hero,
                  images: Array.isArray(f.images) ? [...f.images, img.hero] : [img.hero],
                }))
              }
              label="Upload image"
            />
          </div>
          {!!previewThumbs?.length && (
            <div className="grid grid-cols-4 gap-3">
              {previewThumbs.map((u: string, i: number) => (
                <div key={i} className="border rounded overflow-hidden">
                  <img src={u} alt={`img-${i}`} className="w-full h-28 object-cover" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Content</h2>
          <label className="flex flex-col gap-1">
            <span>Subtitle</span>
            <input
              className="border px-3 py-2 rounded"
              value={form.subtitle || ""}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Long Description (HTML)</span>
            <textarea
              className="border px-3 py-2 rounded min-h-[120px]"
              value={form.descriptionHtml || ""}
              onChange={(e) => setForm({ ...form, descriptionHtml: e.target.value })}
            />
          </label>
        </section>
      </div>

      {/* Right = meta / preview controls */}
      <aside className="col-span-5 flex flex-col gap-4">
        <div className="border rounded p-3">
          <h3 className="font-semibold mb-2">PR / Preview / Publish</h3>
          <PreviewBar
            prNumber={pr?.prNumber}
            prUrl={pr?.prUrl}
            previewUrl={pr?.previewUrl}
            branch={pr?.branch}
            onPublish={async (num) => {
              try {
                const r = await publishPR(num);
                if (r?.liveUrl) window.open(r.liveUrl, "_blank");
                else alert("Published. Site will rebuild shortly.");
              } catch (e: any) {
                alert(e.message || "Publish failed");
              }
            }}
          />
        </div>

        <div className="border rounded p-3">
          <h3 className="font-semibold mb-2">Hero Preview</h3>
          {form.heroImage ? (
            <img src={form.heroImage} className="w-full rounded" />
          ) : (
            <div className="text-sm text-gray-500">No hero image yet.</div>
          )}
        </div>
      </aside>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ImageUploader } from "@/components/ImageUploader";

type Item = { product_id: string; quantity: number; product?: any };

export default function BundleEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === "new";

  const [form, setForm] = useState<any>({
    name: "",
    slug: "",
    price: 0,
    active: true,
    items: [] as Item[],
    subtitle: "",
    heroImage: "",
    images: [],
    descriptionHtml: "",
    seo: {},
  });
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [pr, setPr] = useState<{ prUrl?: string; previewUrl?: string; branch?: string }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Load products for picker
        const res = await fetch("/.netlify/functions/admin-products?pageSize=1000");
        if (!res.ok) throw new Error("Failed to fetch products");
        const json = await res.json();
        setAllProducts(json.data || []);

        // Load bundle if editing
        if (!isNew && id) {
          const res2 = await fetch(`/.netlify/functions/admin-bundle?id=${id}`);
          if (!res2.ok) throw new Error("Failed to fetch bundle");
          const json2 = await res2.json();
          setForm({
            ...json2.bundle,
            items: (json2.items || []).map((it: any) => ({
              product_id: it.product_id,
              quantity: it.quantity,
              product: it.product,
            })),
          });
        }
      } catch (e: any) {
        console.error("Error loading data:", e);
      }
    })();
  }, [id, isNew]);

  function addItem() {
    setForm((f: any) => ({
      ...f,
      items: [...f.items, { product_id: "", quantity: 1 }],
    }));
  }

  function updateItem(ix: number, patch: Partial<Item>) {
    setForm((f: any) => ({
      ...f,
      items: f.items.map((it: Item, i: number) =>
        i === ix ? { ...it, ...patch } : it
      ),
    }));
  }

  function removeItem(ix: number) {
    setForm((f: any) => ({
      ...f,
      items: f.items.filter((_: any, i: number) => i !== ix),
    }));
  }

  async function save() {
    setLoading(true);
    try {
      const res = await fetch("/.netlify/functions/save-bundle-and-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          name: form.name,
          slug: form.slug,
          price: Number(form.price),
          active: !!form.active,
          items: form.items
            .filter((x: Item) => x.product_id)
            .map((x: Item) => ({
              product_id: x.product_id,
              quantity: Number(x.quantity || 1),
            })),
          subtitle: form.subtitle,
          heroImage: form.heroImage,
          images: form.images,
          descriptionHtml: form.descriptionHtml,
          seo: form.seo,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert("Save failed: " + text);
        return;
      }

      const output = await res.json();
      setPr(output);
      if (isNew) nav(`/admin/bundles/${output.bundleId}`);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-xl font-semibold">
        {isNew ? "New Bundle" : `Edit: ${form.name}`}
      </h1>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Name</span>
          <input
            className="border px-3 py-2 rounded"
            value={form.name || ""}
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
            value={form.price || 0}
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Items</h2>
          <button
            onClick={addItem}
            className="px-3 py-1 border rounded bg-gray-50 text-sm"
          >
            + Add item
          </button>
        </div>

        <div className="space-y-2">
          {form.items.map((it: Item, ix: number) => (
            <div key={ix} className="flex gap-2 items-center">
              <select
                className="border px-3 py-2 rounded flex-1"
                value={it.product_id}
                onChange={(e) =>
                  updateItem(ix, { product_id: e.target.value })
                }
              >
                <option value="">Select product…</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — R {Number(p.price).toFixed(2)}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                className="border px-3 py-2 rounded w-24"
                value={it.quantity}
                onChange={(e) =>
                  updateItem(ix, { quantity: Number(e.target.value) })
                }
              />

              <button
                onClick={() => removeItem(ix)}
                className="px-3 py-2 border rounded text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <ImageUploader
          slug={form.slug || "temp"}
          onAdd={(img) => {
            if (!form.heroImage) setForm((f: any) => ({ ...f, heroImage: img.thumb }));
            setForm((f: any) => ({ ...f, images: [...(Array.isArray(f.images) ? f.images : []), img.hero] }));
          }}
          label="Upload image"
        />
        {form.heroImage && (
          <img src={form.heroImage} alt="hero" className="w-14 h-14 rounded object-cover border" />
        )}
      </div>

      {Array.isArray(form.images) && form.images.length > 0 && (
        <div className="grid grid-cols-6 gap-2 mt-2">
          {form.images.map((url: string, i: number) => (
            <img key={i} src={url} className="w-24 h-24 object-cover rounded border" />
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-6">
        <button
          onClick={save}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save"}
        </button>

        <a href="/admin/bundles" className="px-4 py-2 rounded border">
          Back
        </a>

        {pr.prUrl && (
          <a
            className="px-4 py-2 rounded border bg-blue-50"
            href={pr.prUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open PR
          </a>
        )}

        {pr.previewUrl && (
          <a
            className="px-4 py-2 rounded border bg-purple-50"
            href={pr.previewUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open Preview
          </a>
        )}

        {pr.branch && (
          <span className="px-4 py-2 rounded border bg-gray-50 text-xs text-gray-600 font-mono">
            {pr.branch}
          </span>
        )}
      </div>
    </div>
  );
}
