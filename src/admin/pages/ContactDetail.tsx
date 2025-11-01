// src/admin/pages/ContactDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";

export default function ContactDetail(){
  const { id } = useParams<{id: string}>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  async function load(){
    if (!id) return;
    setLoading(true);
    const r = await fetch(`/.netlify/functions/admin-contact?id=${id}`);
    const j = await r.json();
    setData(j.data);
    setLoading(false);
  }

  useEffect(()=>{ load(); }, [id]);

  async function moderate(action:"handled"|"spam"|"new"){
    if (!id) return;
    const r = await fetch("/.netlify/functions/moderate-contact", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ id, action })
    });
    if(!r.ok){ 
      showToast('error', await r.text()); 
      return; 
    }
    showToast('success', `Marked as ${action}`);
    await load();
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6">Message not found</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={()=>navigate("/admin/contacts")} className="px-3 py-1 border rounded">← Back</button>
        <h1 className="text-xl font-semibold">Contact Message</h1>
        <div className="ml-auto flex gap-2">
          {data.status !== "handled" && (
            <button className="px-3 py-1 rounded bg-green-600 text-white" onClick={()=>moderate("handled")}>Mark Handled</button>
          )}
          {data.status !== "spam" && (
            <button className="px-3 py-1 rounded bg-red-600 text-white" onClick={()=>moderate("spam")}>Mark Spam</button>
          )}
          {data.status !== "new" && (
            <button className="px-3 py-1 rounded border" onClick={()=>moderate("new")}>Mark New</button>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-500">Name</label>
            <div className="mt-1">{data.name}</div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-500">Status</label>
            <div className="mt-1">
              <span className={`px-2 py-1 rounded text-xs ${data.status === "new" ? "bg-yellow-100 text-yellow-800" : data.status === "handled" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {data.status}
              </span>
            </div>
          </div>
          {data.email && (
            <div>
              <label className="text-sm font-semibold text-gray-500">Email</label>
              <div className="mt-1"><a href={`mailto:${data.email}`} className="text-blue-600">{data.email}</a></div>
            </div>
          )}
          {data.phone && (
            <div>
              <label className="text-sm font-semibold text-gray-500">Phone</label>
              <div className="mt-1"><a href={`tel:${data.phone}`} className="text-blue-600">{data.phone}</a></div>
            </div>
          )}
          {data.subject && (
            <div>
              <label className="text-sm font-semibold text-gray-500">Subject</label>
              <div className="mt-1">{data.subject}</div>
            </div>
          )}
          <div>
            <label className="text-sm font-semibold text-gray-500">Source</label>
            <div className="mt-1">{data.source || "website"}</div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-500">Date</label>
            <div className="mt-1">{new Date(data.created_at).toLocaleString()}</div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-500">Message</label>
          <div className="mt-2 p-4 bg-gray-50 rounded whitespace-pre-wrap">{data.message}</div>
        </div>

        {data.images && Array.isArray(data.images) && data.images.length > 0 && (
          <div>
            <label className="text-sm font-semibold text-gray-500">Images</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {data.images.map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded border" />
              ))}
            </div>
          </div>
        )}

        {data.product_slug && (
          <div>
            <label className="text-sm font-semibold text-gray-500">Product</label>
            <div className="mt-1">{data.product_slug}</div>
          </div>
        )}

        {data.order_id && (
          <div>
            <label className="text-sm font-semibold text-gray-500">Order ID</label>
            <div className="mt-1">{data.order_id}</div>
          </div>
        )}

        {data.meta && Object.keys(data.meta).length > 0 && (
          <div>
            <label className="text-sm font-semibold text-gray-500">Metadata</label>
            <div className="mt-2 p-4 bg-gray-50 rounded">
              <pre className="text-xs">{JSON.stringify(data.meta, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

