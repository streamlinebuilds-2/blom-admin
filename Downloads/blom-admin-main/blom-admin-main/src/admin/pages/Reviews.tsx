import React, { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";

type ReviewRow = {
  id: string;
  product_id: string;
  reviewer_name: string;
  reviewer_email: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  source?: string | null;
};

const statusOptions = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const statusClassMap: Record<ReviewRow["status"], string> = {
  approved: "status-active",
  rejected: "status-archived",
  pending: "status-draft",
};

export default function Reviews() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("pending");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const url = status
        ? `/.netlify/functions/admin-reviews?status=${encodeURIComponent(status)}`
        : `/.netlify/functions/admin-reviews`;
      const r = await fetch(url);
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`List failed: ${t}`);
      }
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      showToast?.("error", err?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => {
      return (
        r.reviewer_name?.toLowerCase().includes(s) ||
        r.reviewer_email?.toLowerCase().includes(s) ||
        r.title?.toLowerCase().includes(s) ||
        r.comment?.toLowerCase().includes(s) ||
        r.id?.toLowerCase().includes(s)
      );
    });
  }, [rows, search]);

  async function moderate(id: string, action: "approve" | "reject") {
    try {
      const endpoint =
        action === "approve"
          ? "/.netlify/functions/reviews-approve"
          : "/.netlify/functions/reviews-reject";
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const text = await r.text();
      if (!r.ok) throw new Error(text || `Failed to ${action}`);
      showToast?.("success", `Review ${action}d`);
      await load();
    } catch (err: any) {
      console.error(err);
      showToast?.("error", err?.message || `Failed to ${action}`);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="font-bold">Product Reviews</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews…"
            className="input"
            style={{ width: 240 }}
          />
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="content-area">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
            <div
              className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="section-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No reviews found</div>
        ) : (
          <div className="section-card">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Reviewer</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Email</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Rating</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Title</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Comment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                        {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 600 }}>{r.reviewer_name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>{r.reviewer_email}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{r.rating}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text)' }}>{r.title ?? "-"}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text)' }}>
                        <div style={{ maxWidth: 420, whiteSpace: 'pre-wrap' }}>
                          {r.comment ?? "-"}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`status-badge ${statusClassMap[r.status]}`}>{r.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          {r.status !== "approved" && (
                            <button
                              onClick={() => moderate(r.id, "approve")}
                              className="btn-primary"
                              style={{ background: '#10B981' }}
                            >
                              Approve
                            </button>
                          )}
                          {r.status !== "rejected" && (
                            <button
                              onClick={() => moderate(r.id, "reject")}
                              className="btn-primary"
                              style={{ background: '#EF4444' }}
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}