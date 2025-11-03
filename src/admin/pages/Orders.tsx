// src/admin/pages/Orders.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";

export default function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [fulfillment, setFulfillment] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  async function load() {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("size", "50");
    if (status) params.set("status", status);
    if (fulfillment) params.set("fulfillment", fulfillment);
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

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);

  // Polling (every 10s when page focused)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hasFocus()) {
        load();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [status, fulfillment, search, page]);

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

  useEffect(() => { load(); }, [status, fulfillment, search, page]);

  const moneyZAR = (n: number) => `R${(n || 0).toFixed(2)}`;
  const formatDate = (d: string) => {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">Orders</h1>
        <button
          onClick={() => load()}
          className="ml-auto text-sm px-3 py-1 border rounded hover:bg-gray-100"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search (ref, email, name, phone)..."
          className="border px-3 py-2 rounded flex-1 min-w-[200px]"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <select className="border px-3 py-2 rounded" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="placed">Placed</option>
          <option value="paid">Paid</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <select className="border px-3 py-2 rounded" value={fulfillment} onChange={e => { setFulfillment(e.target.value); setPage(1); }}>
          <option value="">All Fulfillment</option>
          <option value="delivery">Delivery</option>
          <option value="collection">Collection</option>
        </select>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="text-left border-b">
          <th className="py-2">Short Code</th>
          <th>Buyer</th>
          <th>Fulfillment</th>
          <th>Status</th>
          <th>Items</th>
          <th>Total</th>
          <th>Placed At</th>
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
                {r.fulfillment_type ? (
                  <span className={`px-2 py-1 rounded text-xs ${
                    r.fulfillment_type === 'delivery' ? 'bg-teal-100 text-teal-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {r.fulfillment_type}
                  </span>
                ) : "-"}
              </td>
              <td>
                <select
                  className="text-xs border px-2 py-1 rounded"
                  value={r.status || "placed"}
                  onChange={e => updateStatus(r.id, e.target.value)}
                >
                  <option value="placed">Placed</option>
                  <option value="paid">Paid</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </td>
              <td>{r.item_count || 0}</td>
              <td>{moneyZAR(r.total)}</td>
              <td className="text-xs text-gray-500">{formatDate(r.placed_at || r.created_at)}</td>
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
