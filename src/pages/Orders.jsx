// src/admin/pages/Orders.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { RefreshCw } from "lucide-react";

export default function Orders() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [fulfillment, setFulfillment] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { showToast } = useToast();
  const searchTimeoutRef = useRef(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("size", "50");
      if (status) params.set("status", status);
      if (fulfillment) params.set("fulfillment", fulfillment);
      if (search) params.set("search", search);
      
      const url = `/.netlify/functions/admin-orders?${params}`;
      const r = await fetch(url);
      
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }
      
      const j = await r.json();
      if (j.ok) {
        setRows(j.data || []);
        setTotal(j.total || 0);
        if (j.error) {
          console.warn('Function returned ok but with error:', j.error);
        }
      } else {
        const errMsg = j.error || "Failed to load orders";
        setError(errMsg);
        showToast('error', errMsg);
        console.error('Function error:', j);
      }
    } catch (err) {
      const errMsg = err.message || "Failed to fetch orders";
      setError(errMsg);
      showToast('error', errMsg);
      console.error('Load error:', err);
    } finally {
      setLoading(false);
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

  // Polling (every 10s when page focused) - disabled for now to avoid spam
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (document.hasFocus()) {
  //       load();
  //     }
  //   }, 10000);
  //   return () => clearInterval(interval);
  // }, [status, fulfillment, search, page]);

  async function updateStatus(orderId, newStatus) {
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

  const moneyZAR = (n) => `R${(n || 0).toFixed(2)}`;
  const formatDate = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (s) => {
    const colors = {
      paid: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      packed: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
      collected: "bg-green-500/20 text-green-700 dark:text-green-400",
      out_for_delivery: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
      delivered: "bg-green-500/20 text-green-700 dark:text-green-400"
    };
    return colors[s] || colors.paid;
  };

  const getFulfillmentColor = (f) => {
    if (f === 'delivery') return "bg-teal-500/20 text-teal-700 dark:text-teal-400";
    if (f === 'collection') return "bg-purple-500/20 text-purple-700 dark:text-purple-400";
    return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  };

  const getActionButtonText = (order) => {
    const status = order.status || 'paid';
    const fulfillment = order.fulfillment_type || 'delivery';
    
    if (status === 'packed' && fulfillment === 'collection') {
      return 'Ready for Collection';
    }
    if (status === 'packed' && fulfillment === 'delivery') {
      return 'Out for Delivery';
    }
    return 'View Details';
  };

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text)' }}>
      <style>{`
        .orders-container {
          background: var(--bg);
          color: var(--text);
        }
        .orders-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .orders-input {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 14px;
        }
        .orders-input::placeholder {
          color: var(--text-muted);
        }
        .orders-select {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 14px;
        }
        .orders-button {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 16px;
          transition: all 0.2s;
        }
        .orders-button:hover {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .orders-table {
          width: 100%;
          border-collapse: collapse;
        }
        .orders-table thead {
          background: var(--card);
          border-bottom: 2px solid var(--border);
        }
        .orders-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: var(--text);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .orders-table td {
          padding: 14px 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
        }
        .orders-table tbody tr:hover {
          background: var(--card);
        }
        .orders-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>

      <div className="orders-container">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Orders</h1>
          <button
            onClick={() => load()}
            className="orders-button flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="orders-card mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search (ref, email, name, phone)..."
              className="orders-input flex-1 min-w-[250px]"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <select className="orders-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="packed">Packed</option>
              <option value="collected">Collected</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
            </select>
            <select className="orders-select" value={fulfillment} onChange={e => { setFulfillment(e.target.value); setPage(1); }}>
              <option value="">All Fulfillment</option>
              <option value="delivery">Delivery</option>
              <option value="collection">Collection</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="orders-card text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
            <div style={{ color: 'var(--text-muted)' }}>Loading orders...</div>
          </div>
        )}

        {error && !loading && (
          <div className="orders-card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="text-red-600 dark:text-red-400 font-semibold mb-2">Error loading orders</div>
            <div className="text-sm text-red-500 dark:text-red-300">{error}</div>
            <button onClick={() => load()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="orders-card overflow-x-auto">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Short Code</th>
                  <th>Buyer</th>
                  <th>Fulfillment</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Placed At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                <tr key={r.id}>
                  <td className="font-mono text-xs font-medium">{r.short_code || "-"}</td>
                  <td>
                    <div className="font-medium">{r.buyer_name || "-"}</div>
                    <div className="text-xs opacity-70" style={{ color: 'var(--text-muted)' }}>{r.buyer_email || "-"}</div>
                  </td>
                  <td>
                    {r.fulfillment_type ? (
                      <span className={`orders-badge ${getFulfillmentColor(r.fulfillment_type)}`}>
                        {r.fulfillment_type === 'delivery' ? '🚚' : '📦'} {r.fulfillment_type}
                      </span>
                    ) : (
                      <span className="opacity-50">-</span>
                    )}
                  </td>
                  <td>
                    <select
                      className="orders-select text-xs py-1 px-2 min-w-[100px]"
                      value={r.status || "paid"}
                      onChange={e => updateStatus(r.id, e.target.value)}
                    >
                      {r.fulfillment_type === 'collection' ? (
                        <>
                          <option value="paid">Paid</option>
                          <option value="packed">Packed</option>
                          <option value="collected">Collected</option>
                        </>
                      ) : (
                        <>
                          <option value="paid">Paid</option>
                          <option value="packed">Packed</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                        </>
                      )}
                    </select>
                  </td>
                  <td className="text-center font-medium">{r.item_count || 0}</td>
                  <td className="font-semibold">{moneyZAR(r.total)}</td>
                  <td className="text-xs opacity-70" style={{ color: 'var(--text-muted)' }}>{formatDate(r.placed_at || r.created_at)}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/orders/${r.id}`)}
                      className="orders-button text-xs px-3 py-1.5"
                    >
                      {getActionButtonText(r)}
                    </button>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="text-center py-12 opacity-50" style={{ color: 'var(--text-muted)' }}>
                <div className="text-lg font-semibold mb-2">No orders found</div>
                <div className="text-sm">Orders will appear here when they are created</div>
              </div>
            )}
          </div>
        )}
        
        {total > 50 && (
          <div className="flex items-center gap-4 justify-center mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="orders-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              Page {page} of {Math.ceil(total / 50)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 50)}
              className="orders-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
