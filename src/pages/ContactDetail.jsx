// src/pages/ContactDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/ToastProvider";

export default function ContactDetail(){
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
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

  async function moderate(action){
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

  if (loading) return <div className="p-6" style={{ color: 'var(--text)' }}>Loading...</div>;
  if (!data) return <div className="p-6" style={{ color: 'var(--text)' }}>Message not found</div>;

  return (
    <div className="p-6 space-y-4" style={{ color: 'var(--text)' }}>
      <div className="flex items-center gap-4">
        <button
          onClick={()=>navigate("/messages")}
          style={{
            padding: '4px 12px',
            border: '1px solid var(--card)',
            background: 'var(--card)',
            color: 'var(--text)',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
        <h1 className="text-xl font-semibold">Contact Message</h1>
        <div className="ml-auto flex gap-2">
          {data.status !== "handled" && (
            <button
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={()=>moderate("handled")}
            >
              Mark Handled
            </button>
          )}
          {data.status !== "spam" && (
            <button
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={()=>moderate("spam")}
            >
              Mark Spam
            </button>
          )}
          {data.status !== "new" && (
            <button
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid var(--card)',
                background: 'var(--card)',
                color: 'var(--text)',
                cursor: 'pointer'
              }}
              onClick={()=>moderate("new")}
            >
              Mark New
            </button>
          )}
        </div>
      </div>

      <div style={{
        border: '1px solid var(--card)',
        borderRadius: '8px',
        padding: '24px',
        background: 'var(--card)'
      }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Name</label>
            <div className="mt-1">{data.name}</div>
          </div>
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Status</label>
            <div className="mt-1">
              <span style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                background: data.status === "new" ? '#fef3c7' : data.status === "handled" ? '#d1fae5' : '#f3f4f6',
                color: data.status === "new" ? '#92400e' : data.status === "handled" ? '#065f46' : '#1f2937'
              }}>
                {data.status}
              </span>
            </div>
          </div>
          {data.email && (
            <div>
              <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Email</label>
              <div className="mt-1"><a href={`mailto:${data.email}`} style={{ color: 'var(--accent)' }}>{data.email}</a></div>
            </div>
          )}
          {data.phone && (
            <div>
              <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Phone</label>
              <div className="mt-1"><a href={`tel:${data.phone}`} style={{ color: 'var(--accent)' }}>{data.phone}</a></div>
            </div>
          )}
          {data.subject && (
            <div>
              <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Subject</label>
              <div className="mt-1">{data.subject}</div>
            </div>
          )}
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Source</label>
            <div className="mt-1">{data.source || "website"}</div>
          </div>
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Date</label>
            <div className="mt-1">{new Date(data.created_at).toLocaleString()}</div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Message</label>
          <div className="mt-2 p-4 rounded" style={{
            background: 'var(--bg)',
            whiteSpace: 'pre-wrap'
          }}>
            {data.message}
          </div>
        </div>

        {data.images && Array.isArray(data.images) && data.images.length > 0 && (
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Images</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {data.images.map((url, i) => (
                <img key={i} src={url} alt="" style={{
                  width: '100%',
                  height: '128px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid var(--card)'
                }} />
              ))}
            </div>
          </div>
        )}

        {data.product_slug && (
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Product</label>
            <div className="mt-1">{data.product_slug}</div>
          </div>
        )}

        {data.order_id && (
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Order ID</label>
            <div className="mt-1">{data.order_id}</div>
          </div>
        )}

        {data.meta && Object.keys(data.meta).length > 0 && (
          <div>
            <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Metadata</label>
            <div className="mt-2 p-4 rounded" style={{ background: 'var(--bg)' }}>
              <pre className="text-xs">{JSON.stringify(data.meta, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
