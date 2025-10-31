// src/admin/pages/Reviews.tsx
import { useEffect, useState } from "react";

export default function Reviews(){
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("pending");

  async function load(){
    const r = await fetch(`/.netlify/functions/admin-reviews?status=${status}`);
    const j = await r.json();
    setRows(j.data || []);
  }

  useEffect(()=>{ load(); }, [status]);

  async function moderate(id:string, action:"approve"|"reject"){
    const r = await fetch("/.netlify/functions/moderate-review", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ id, action })
    });
    if(!r.ok){ alert(await r.text()); return; }
    await load();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Reviews</h1>
        <select className="ml-auto border px-3 py-2 rounded" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="text-left border-b">
          <th className="py-2">Product</th><th>Reviewer</th><th>Rating</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} className="border-b align-top">
              <td className="py-2">{r.product?.name || r.product_id}<div className="text-xs text-gray-500">{r.product?.slug}</div></td>
              <td>{r.name}<div className="text-xs text-gray-500">{r.title}</div></td>
              <td>{r.rating}★</td>
              <td>{r.status}</td>
              <td className="space-x-2">
                {r.status === "pending" && <>
                  <button className="px-3 py-1 rounded bg-black text-white" onClick={()=>moderate(r.id,"approve")}>Approve</button>
                  <button className="px-3 py-1 rounded border" onClick={()=>moderate(r.id,"reject")}>Reject</button>
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

