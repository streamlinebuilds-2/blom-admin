// src/pages/Messages.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";
import { RefreshCw, MessageSquare } from "lucide-react";

export default function Messages() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
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
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);

      const url = `/.netlify/functions/admin-messages?${params}`;
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
        const errMsg = j.error || "Failed to load messages";
        setError(errMsg);
        showToast('error', errMsg);
        console.error('Function error:', j);
      }
    } catch (err) {
      const errMsg = err.message || "Failed to fetch messages";
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

  useEffect(() => { load(); }, [statusFilter, search, page]);

  const formatDate = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadgeClass = (status) => {
    if (status === "new") return "bg-red-500/20 text-red-700 dark:text-red-400";
    if (status === "handled") return "bg-green-500/20 text-green-700 dark:text-green-400";
    return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  };

  return (
    <div className="p-6 space-y-6" style={{ color: 'var(--text)' }}>
      <style>{`
        .messages-container {
          background: var(--bg);
          color: var(--text);
        }
        .messages-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .messages-input {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 14px;
        }
        .messages-input::placeholder {
          color: var(--text-muted);
        }
        .messages-select {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 14px;
        }
        .messages-button {
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--text);
          border-radius: 8px;
          padding: 10px 16px;
          transition: all 0.2s;
          cursor: pointer;
        }
        .messages-button:hover {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .messages-table {
          width: 100%;
          border-collapse: collapse;
        }
        .messages-table thead {
          background: var(--card);
          border-bottom: 2px solid var(--border);
        }
        .messages-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: var(--text);
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .messages-table td {
          padding: 14px 12px;
          border-bottom: 1px solid var(--border);
          color: var(--text);
        }
        .messages-table tbody tr {
          cursor: pointer;
          transition: background 0.2s;
        }
        .messages-table tbody tr:hover {
          background: var(--card);
        }
        .messages-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>

      <div className="messages-container">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text)' }}>
            <MessageSquare className="w-7 h-7" />
            Messages
          </h1>
          <button
            onClick={() => load()}
            className="messages-button flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="messages-card mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by name, email, subject..."
              className="messages-input flex-1 min-w-[250px]"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <select className="messages-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Messages</option>
              <option value="new">Unanswered</option>
              <option value="handled">Answered</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="messages-card text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent)' }}></div>
            <div style={{ color: 'var(--text-muted)' }}>Loading messages...</div>
          </div>
        )}

        {error && !loading && (
          <div className="messages-card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="text-red-600 dark:text-red-400 font-semibold mb-2">Error loading messages</div>
            <div className="text-sm text-red-500 dark:text-red-300">{error}</div>
            <button onClick={() => load()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="messages-card overflow-x-auto">
            <table className="messages-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                <tr key={r.id} onClick={() => navigate(`/messages/${r.id}`)}>
                  <td className="font-medium">{r.name || "-"}</td>
                  <td>
                    <div className="text-sm opacity-70" style={{ color: 'var(--text-muted)' }}>{r.email || "-"}</div>
                  </td>
                  <td className="font-medium">{r.subject || "(No subject)"}</td>
                  <td>
                    <span className={`messages-badge ${getStatusBadgeClass(r.status)}`}>
                      {r.status === "new" ? "Unanswered" : "Answered"}
                    </span>
                  </td>
                  <td className="text-xs opacity-70" style={{ color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/messages/${r.id}`); }}
                      className="messages-button text-xs px-3 py-1.5"
                    >
                      View
                    </button>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="text-center py-12 opacity-50" style={{ color: 'var(--text-muted)' }}>
                <div className="text-lg font-semibold mb-2">No messages found</div>
                <div className="text-sm">Contact messages will appear here</div>
              </div>
            )}
          </div>
        )}

        {total > 50 && (
          <div className="flex items-center gap-4 justify-center mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="messages-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              Page {page} of {Math.ceil(total / 50)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 50)}
              className="messages-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
