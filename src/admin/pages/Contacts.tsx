// src/admin/pages/Contacts.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Contacts(){
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("new");
  const navigate = useNavigate();

  async function load(){
    const url = status ? `/.netlify/functions/admin-contacts?status=${status}` : `/.netlify/functions/admin-contacts`;
    const r = await fetch(url);
    const j = await r.json();
    setRows(j.data || []);
  }

  useEffect(()=>{ load(); }, [status]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Contact Messages</h1>
        <select className="ml-auto border px-3 py-2 rounded" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="new">New</option>
          <option value="handled">Handled</option>
          <option value="spam">Spam</option>
        </select>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="text-left border-b">
          <th className="py-2">Date</th><th>Name</th><th>Email</th><th>Subject</th><th>Source</th><th>Status</th>
        </tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} className="border-b align-top cursor-pointer hover:bg-gray-50" onClick={()=>navigate(`/admin/contacts/${r.id}`)}>
              <td className="py-2">{new Date(r.created_at).toLocaleDateString()}</td>
              <td>{r.name}</td>
              <td className="text-xs text-gray-500">{r.email || "-"}</td>
              <td>{r.subject || "-"}</td>
              <td className="text-xs text-gray-500">{r.source || "website"}</td>
              <td><span className={`px-2 py-1 rounded text-xs ${r.status === "new" ? "bg-yellow-100 text-yellow-800" : r.status === "handled" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="text-center text-gray-500 py-8">No messages found</div>}
    </div>
  );
}

