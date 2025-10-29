import { useEffect, useState } from "react";

export default function BundlesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");

  async function load() {
    try {
      const res = await fetch("/.netlify/functions/admin-bundles");
      if (!res.ok) throw new Error("Failed to fetch bundles");
      const json = await res.json();
      let data = json.data || [];

      // Filter by active status
      if (active === "true") data = data.filter((b: any) => b.active);
      if (active === "false") data = data.filter((b: any) => !b.active);

      // Filter by search
      if (q) {
        data = data.filter((b: any) =>
          b.name.toLowerCase().includes(q.toLowerCase())
        );
      }

      setRows(data);
    } catch (e: any) {
      console.error("Error loading bundles:", e);
    }
  }

  useEffect(() => {
    load();
  }, [q, active]);

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
          href="/admin/bundles/new"
          className="ml-auto px-4 py-2 rounded bg-black text-white"
        >
          + New Bundle
        </a>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Name</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-b">
              <td className="py-2">{b.name}</td>
              <td>R {Number(b.price).toFixed(2)}</td>
              <td>{b.active ? "Active" : "Inactive"}</td>
              <td>
                <a className="underline" href={`/admin/bundles/${b.id}`}>
                  Edit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <p className="text-center text-gray-500 py-4">No bundles found</p>
      )}
    </div>
  );
}
