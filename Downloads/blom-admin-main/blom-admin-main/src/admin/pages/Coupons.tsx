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

  return <div className="p-6 space-y-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh' }}>
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Coupons</h1>
      <button className="px-3 py-2 rounded-lg text-white font-medium" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }} onClick={()=>setEdit({ code:'', type:'percent', value:10, is_active:true })}>New Coupon</button>
    </div>
    <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
      <table className="w-full text-sm dark-table">
        <thead><tr className="text-left border-b" style={{ borderBottomColor: 'var(--border-color)' }}>
          <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Code</th>
          <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Type</th>
          <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Value</th>
          <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Uses</th>
          <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Active</th>
          <th className="pb-3" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Window</th>
          <th className="pb-3"></th>
        </tr></thead>
        <tbody>
          {rows.map((c:any)=>(
            <tr key={c.id} className="border-b" style={{ borderBottomColor: 'var(--border-color)' }}>
              <td className="py-3 font-mono" style={{ color: 'var(--text-primary)' }}>{c.code}</td>
              <td className="py-3" style={{ color: 'var(--text-primary)' }}>{c.type}</td>
              <td className="py-3" style={{ color: 'var(--text-primary)' }}>{c.type==='percent' ? `${c.value}%` : `R ${Number(c.value||0).toFixed(2)}`}</td>
              <td className="py-3" style={{ color: 'var(--text-primary)' }}>{c.uses}{c.max_uses?` / ${c.max_uses}`:''}</td>
              <td className="py-3" style={{ color: 'var(--text-primary)' }}>{c.is_active?'Yes':'No'}</td>
              <td className="py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{c.starts_at?new Date(c.starts_at).toLocaleDateString():'-'} → {c.ends_at?new Date(c.ends_at).toLocaleDateString():'-'}</td>
              <td className="py-3 text-right">
                <button className="underline mr-3" style={{ color: '#3b82f6' }} onClick={()=>{setEdit(c);}}>Edit</button>
                <button className="underline" style={{ color: 'var(--text-secondary)' }} onClick={()=>openUsage(c.id)}>Usage</button>
              </td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan={7} className="py-4" style={{ color: 'var(--text-muted)' }}>No coupons yet.</td></tr>}
        </tbody>
      </table>
    </div>

    {edit && (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <div className="rounded-lg p-6 w-[640px] space-y-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{edit.id?'Edit':'New'} Coupon</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Code
              <input className="input" value={edit.code} onChange={e=>setEdit({...edit, code:e.target.value.toUpperCase()})} placeholder="BLOM10"/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Type
              <select className="input" value={edit.type} onChange={e=>setEdit({...edit, type:e.target.value})}>
                <option value="percent">percent</option>
                <option value="fixed">fixed</option>
              </select>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Value
              <input type="number" className="input" value={edit.value} onChange={e=>setEdit({...edit, value:Number(e.target.value)})}/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Min order total
              <input type="number" className="input" value={edit.min_order_total||0} onChange={e=>setEdit({...edit, min_order_total:Number(e.target.value)})}/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Max uses
              <input type="number" className="input" value={edit.max_uses||''} onChange={e=>setEdit({...edit, max_uses: e.target.value?Number(e.target.value):null})}/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active
              <select className="input" value={edit.is_active?'1':'0'} onChange={e=>setEdit({...edit, is_active:e.target.value==='1'})}>
                <option value="1">Yes</option><option value="0">No</option>
              </select>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Starts
              <input type="datetime-local" className="input" value={toISO(edit.starts_at)} onChange={e=>setEdit({...edit, starts_at:e.target.value?new Date(e.target.value).toISOString():null})}/>
            </label>
            <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ends
              <input type="datetime-local" className="input" value={toISO(edit.ends_at)} onChange={e=>setEdit({...edit, ends_at:e.target.value?new Date(e.target.value).toISOString():null})}/>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button className="px-3 py-2 rounded-lg" style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)', backgroundColor: 'transparent' }} onClick={()=>setEdit(null)}>Cancel</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={()=>save(edit)}>Save</button>
          </div>
        </div>
      </div>
    )}

    {usage.length>0 && (
      <div className="card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Usage</h3>
        <table className="w-full text-sm dark-table">
          <thead><tr className="text-left border-b" style={{ borderBottomColor: 'var(--border-color)' }}><th style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>When</th><th style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Order</th><th style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Email</th><th style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Total</th><th style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>Status</th></tr></thead>
          <tbody>
            {usage.map((u:any)=>(
              <tr key={u.id} className="border-b" style={{ borderBottomColor: 'var(--border-color)' }}>
                <td className="py-3" style={{ color: 'var(--text-primary)' }}>{new Date(u.used_at).toLocaleString()}</td>
                <td className="py-3 font-mono" style={{ color: 'var(--text-primary)' }}>{u.orders?.m_payment_id||'-'}</td>
                <td className="py-3" style={{ color: 'var(--text-primary)' }}>{u.buyer_email||'-'}</td>
                <td className="py-3" style={{ color: 'var(--text-primary)' }}>{u.orders?`R ${Number(u.orders.total||0).toFixed(2)}`:'-'}</td>
                <td className="py-3" style={{ color: 'var(--text-primary)' }}>{u.orders?.status||'-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
}
