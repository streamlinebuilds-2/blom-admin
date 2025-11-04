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

  return <div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Coupons</h1>
      <button className="px-3 py-2 bg-emerald-600 text-white rounded" onClick={()=>setEdit({ code:'', type:'percent', value:10, is_active:true })}>New Coupon</button>
    </div>
    <table className="w-full text-sm">
      <thead><tr className="text-left border-b">
        <th>Code</th><th>Type</th><th>Value</th><th>Uses</th><th>Active</th><th>Window</th><th></th>
      </tr></thead>
      <tbody>
        {rows.map((c:any)=>(
          <tr key={c.id} className="border-b">
            <td className="font-mono">{c.code}</td>
            <td>{c.type}</td>
            <td>{c.type==='percent' ? `${c.value}%` : `R ${Number(c.value||0).toFixed(2)}`}</td>
            <td>{c.uses}{c.max_uses?` / ${c.max_uses}`:''}</td>
            <td>{c.is_active?'Yes':'No'}</td>
            <td className="text-xs">{c.starts_at?new Date(c.starts_at).toLocaleDateString():'-'} → {c.ends_at?new Date(c.ends_at).toLocaleDateString():'-'}</td>
            <td className="text-right">
              <button className="text-blue-600 underline mr-3" onClick={()=>{setEdit(c);}}>Edit</button>
              <button className="text-slate-600 underline" onClick={()=>openUsage(c.id)}>Usage</button>
            </td>
          </tr>
        ))}
        {rows.length===0 && <tr><td colSpan={7} className="py-4 text-gray-500">No coupons yet.</td></tr>}
      </tbody>
    </table>

    {edit && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-[640px] space-y-3">
          <h3 className="text-lg font-semibold">{edit.id?'Edit':'New'} Coupon</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Code
              <input className="w-full border rounded px-3 py-2" value={edit.code} onChange={e=>setEdit({...edit, code:e.target.value.toUpperCase()})} placeholder="BLOM10"/>
            </label>
            <label className="text-sm">Type
              <select className="w-full border rounded px-3 py-2" value={edit.type} onChange={e=>setEdit({...edit, type:e.target.value})}>
                <option value="percent">percent</option>
                <option value="fixed">fixed</option>
              </select>
            </label>
            <label className="text-sm">Value
              <input type="number" className="w-full border rounded px-3 py-2" value={edit.value} onChange={e=>setEdit({...edit, value:Number(e.target.value)})}/>
            </label>
            <label className="text-sm">Min order total
              <input type="number" className="w-full border rounded px-3 py-2" value={edit.min_order_total||0} onChange={e=>setEdit({...edit, min_order_total:Number(e.target.value)})}/>
            </label>
            <label className="text-sm">Max uses
              <input type="number" className="w-full border rounded px-3 py-2" value={edit.max_uses||''} onChange={e=>setEdit({...edit, max_uses: e.target.value?Number(e.target.value):null})}/>
            </label>
            <label className="text-sm">Active
              <select className="w-full border rounded px-3 py-2" value={edit.is_active?'1':'0'} onChange={e=>setEdit({...edit, is_active:e.target.value==='1'})}>
                <option value="1">Yes</option><option value="0">No</option>
              </select>
            </label>
            <label className="text-sm">Starts
              <input type="datetime-local" className="w-full border rounded px-3 py-2" value={toISO(edit.starts_at)} onChange={e=>setEdit({...edit, starts_at:e.target.value?new Date(e.target.value).toISOString():null})}/>
            </label>
            <label className="text-sm">Ends
              <input type="datetime-local" className="w-full border rounded px-3 py-2" value={toISO(edit.ends_at)} onChange={e=>setEdit({...edit, ends_at:e.target.value?new Date(e.target.value).toISOString():null})}/>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button className="px-3 py-2 border rounded" onClick={()=>setEdit(null)}>Cancel</button>
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={()=>save(edit)}>Save</button>
          </div>
        </div>
      </div>
    )}

    {usage.length>0 && (
      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Usage</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b"><th>When</th><th>Order</th><th>Email</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {usage.map((u:any)=>(
              <tr key={u.id} className="border-b">
                <td>{new Date(u.used_at).toLocaleString()}</td>
                <td className="font-mono">{u.orders?.m_payment_id||'-'}</td>
                <td>{u.buyer_email||'-'}</td>
                <td>{u.orders?`R ${Number(u.orders.total||0).toFixed(2)}`:'-'}</td>
                <td>{u.orders?.status||'-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
}
