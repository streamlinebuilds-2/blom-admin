import { useEffect, useState } from "react";

export default function ProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);

  async function load() {
    const qs = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q) qs.set("q", q);
    if (active) qs.set("active", active);
    const res = await fetch(`/.netlify/functions/admin-products?${qs.toString()}`);
    const json = await res.json();
    setRows(json.data || []);
  }

  useEffect(() => {
    load();
  }, [q, active, page]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2">
        <input
          className="border px-3 py-2 rounded w-64"
          placeholder="Search name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="border px-3 py-2 rounded"
          value={active}
          onChange={(e) => setActive(e.target.value as any)}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <a
          href="/admin/products/new"
          className="ml-auto px-4 py-2 rounded bg-black text-white"
        >
          + New Product
        </a>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Name</th>
            <th>SKU</th>
            <th>Price</th>
            <th>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.name}</td>
              <td>{p.sku || "-"}</td>
              <td>R {Number(p.price).toFixed(2)}</td>
              <td>{p.product_type || "simple"}</td>
              <td>{p.active ? "Active" : "Inactive"}</td>
              <td className="space-x-2">
                <a className="underline" href={`/admin/products/${p.id}`}>
                  Edit
                </a>
                <a className="underline" href={`/admin/price-history/${p.id}`}>
                  Prices
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Basic pagination */}
      <div className="flex items-center gap-2">
        <button
          className="border px-3 py-1 rounded"
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span>Page {page}</span>
        <button
          className="border px-3 py-1 rounded"
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
