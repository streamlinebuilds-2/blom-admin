// src/admin/pages/Orders.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";

export default function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();
  const { showToast } = useToast();

  async function load() {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", "50");
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    
    const url = `/.netlify/functions/admin-orders?${params}`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.ok) {
      setRows(j.data || []);
      setTotal(j.total || 0);
    } else {
      showToast('error', j.error || "Failed to load orders");
    }
  }

  async function updateStatus(orderId: string, newStatus: string) {
    const r = await fetch(`/.netlify/functions/admin-order-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status: newStatus })
    });
    const j = await r.json();
    if (j.ok) {
      showToast('success', "Order status updated");
      load();
    } else {
      showToast('error', j.error || "Failed to update status");
    }
  }

  useEffect(() => { load(); }, [status, page, search]);

  const moneyZAR = (n: number) => `R${(n || 0).toFixed(2)}`;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">Orders</h1>
        <input
          type="text"
          placeholder="Search..."
          className="ml-auto border px-3 py-2 rounded flex-1 max-w-xs"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="border px-3 py-2 rounded" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="text-left border-b">
          <th className="py-2">Short Code</th>
          <th>Buyer</th>
          <th>Status</th>
          <th>Total</th>
          <th>Items</th>
          <th>Placed</th>
          <th>Action</th>
        </tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b align-top hover:bg-gray-50">
              <td className="py-2 font-mono text-xs">{r.short_code || "-"}</td>
              <td>
                <div>{r.buyer_name || "-"}</div>
                <div className="text-xs text-gray-500">{r.buyer_email || "-"}</div>
              </td>
              <td>
                <select
                  className="text-xs border px-2 py-1 rounded"
                  value={r.status || "pending"}
                  onChange={e => updateStatus(r.id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </td>
              <td>{moneyZAR(r.total)}</td>
              <td>{r.item_count || 0}</td>
              <td className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
              <td>
                <button
                  onClick={() => navigate(`/admin/orders/${r.id}`)}
                  className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                >
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="text-center text-gray-500 py-8">No orders found</div>}
      
      {total > 50 && (
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm">Page {page} of {Math.ceil(total / 50)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 50)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

