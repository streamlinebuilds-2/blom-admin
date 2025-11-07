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
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Product Reviews</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="border px-3 py-2 rounded w-64"
          />
          <select
            className="border px-3 py-2 rounded"
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

      <div className="section-card" style={{ background: "var(--card)", borderRadius: 12 }}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div
              className="w-8 h-8 border-4 rounded-full animate-spin"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No reviews found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Reviewer</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Rating</th>
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3">Comment</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2 px-3">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="py-2 px-3 font-medium">{r.reviewer_name}</td>
                    <td className="py-2 px-3 text-xs text-gray-500">{r.reviewer_email}</td>
                    <td className="py-2 px-3">{r.rating}</td>
                    <td className="py-2 px-3">{r.title ?? "-"}</td>
                    <td className="py-2 px-3">
                      <div className="max-w-[420px] whitespace-pre-wrap text-gray-700">
                        {r.comment ?? "-"}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          r.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : r.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-2 justify-end">
                        {r.status !== "approved" && (
                          <button
                            onClick={() => moderate(r.id, "approve")}
                            className="px-3 py-1 rounded bg-green-600 text-white"
                          >
                            Approve
                          </button>
                        )}
                        {r.status !== "rejected" && (
                          <button
                            onClick={() => moderate(r.id, "reject")}
                            className="px-3 py-1 rounded bg-red-600 text-white"
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
        )}
      </div>
    </div>
  );
}