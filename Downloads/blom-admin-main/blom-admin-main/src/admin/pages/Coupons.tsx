import React, { useEffect, useState } from "react";

function toISO(d?: string){ return d ? new Date(d).toISOString().slice(0,16) : ''; }

export default function CouponsPage(){
  const [rows,setRows]=useState<any[]>([]);
  const [edit,setEdit]=useState<any|null>(null);
  const [usage,setUsage]=useState<any[]>([]);

  async function load(){
    const r = await fetch('/.netlify/functions/admin-coupons'); const j = await r.json();
    setRows(j.data||[]);
  }
  useEffect(()=>{load()},[]);

  async function save(c:any){
    const r = await fetch('/.netlify/functions/admin-coupon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(c)});
    if(!r.ok){ alert(await r.text()); return; }
    setEdit(null); load();
  }
  async function openUsage(id:string){
    const r = await fetch(`/.netlify/functions/admin-coupon-usage?couponId=${id}`);
    const j = await r.json(); setUsage(j.data||[]);
  }

  return <div className="page-container">
    <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
        Coupons
      </h1>
      <button className="btn-primary flex items-center gap-2" onClick={()=>setEdit({ code:'', type:'percent', value:10, is_active:true })}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        New Coupon
      </button>
    </div>
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 20,
        boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
        overflow: 'hidden',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Code</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Value</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Uses</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Active</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Window</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c:any)=>(
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500, fontFamily: 'monospace' }}>{c.code}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{c.type}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{c.type==='percent' ? `${c.value}%` : `R ${Number(c.value||0).toFixed(2)}`}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{c.uses}{c.max_uses?` / ${c.max_uses}`:''}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`status-badge status-${c.is_active ? 'active' : 'archived'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>{c.starts_at?new Date(c.starts_at).toLocaleDateString():'-'} → {c.ends_at?new Date(c.ends_at).toLocaleDateString():'-'}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <button className="link mr-3" onClick={()=>{setEdit(c);}} style={{ color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>Edit</button>
                  <button className="link" onClick={()=>openUsage(c.id)} style={{ color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>Usage</button>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={7} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    {edit && (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <div className="rounded-lg p-6 w-[640px] space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.75rem', boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{edit.id?'Edit':'New'} Coupon</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Code
              <input className="input mt-1" value={edit.code} onChange={e=>setEdit({...edit, code:e.target.value.toUpperCase()})} placeholder="BLOM10"/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Type
              <select className="input mt-1" value={edit.type} onChange={e=>setEdit({...edit, type:e.target.value})}>
                <option value="percent">percent</option>
                <option value="fixed">fixed</option>
              </select>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Value
              <input type="number" className="input mt-1" value={edit.value} onChange={e=>setEdit({...edit, value:Number(e.target.value)})}/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Min order total
              <input type="number" className="input mt-1" value={edit.min_order_total||0} onChange={e=>setEdit({...edit, min_order_total:Number(e.target.value)})}/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Max uses
              <input type="number" className="input mt-1" value={edit.max_uses||''} onChange={e=>setEdit({...edit, max_uses: e.target.value?Number(e.target.value):null})}/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Active
              <select className="input mt-1" value={edit.is_active?'1':'0'} onChange={e=>setEdit({...edit, is_active:e.target.value==='1'})}>
                <option value="1">Yes</option><option value="0">No</option>
              </select>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Starts
              <input type="datetime-local" className="input mt-1" value={toISO(edit.starts_at)} onChange={e=>setEdit({...edit, starts_at:e.target.value?new Date(e.target.value).toISOString():null})}/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Ends
              <input type="datetime-local" className="input mt-1" value={toISO(edit.ends_at)} onChange={e=>setEdit({...edit, ends_at:e.target.value?new Date(e.target.value).toISOString():null})}/>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="btn-icon" onClick={()=>setEdit(null)}>Cancel</button>
            <button className="btn-primary" onClick={()=>save(edit)}>Save</button>
          </div>
        </div>
      </div>
    )}

    {usage.length>0 && (
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 20,
          boxShadow: '8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light)',
          overflow: 'hidden',
          marginTop: '2rem'
        }}
      >
        <div className="p-6">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Usage</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>When</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Order</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Total</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u:any)=>(
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{new Date(u.used_at).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500, fontFamily: 'monospace' }}>{u.orders?.m_payment_id||'-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{u.buyer_email||'-'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 500 }}>{u.orders?`R ${Number(u.orders.total||0).toFixed(2)}`:'-'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`status-badge status-${u.orders?.status || 'active'}`}>
                        {u.orders?.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </div>
}
