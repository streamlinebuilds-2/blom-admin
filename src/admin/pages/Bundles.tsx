import { useEffect, useState } from "react";

export default function BundlesPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/.netlify/functions/admin-bundles");
        if (!res.ok) throw new Error("Failed to fetch bundles");
        const json = await res.json();
        setRows(json.data || []);
      } catch (e: any) {
        console.error("Error loading bundles:", e);
      }
    })();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-2">
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
