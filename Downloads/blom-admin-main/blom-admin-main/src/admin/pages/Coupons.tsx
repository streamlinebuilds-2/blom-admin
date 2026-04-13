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

  return <div className="page-container bg-gray-900 text-gray-100 min-h-screen p-6">
    <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
      <h1 className="text-2xl font-bold text-white">
        Coupons
      </h1>
      <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2" onClick={()=>setEdit({ code:'', type:'percent', value:10, is_active:true })}>
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
      className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Code</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Value</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Uses</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Active</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Window</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {rows.map((c:any)=>(
              <tr key={c.id} className="hover:bg-gray-700 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white font-mono">{c.code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{c.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{c.type==='percent' ? `${c.value}%` : `R ${Number(c.value||0).toFixed(2)}`}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{c.uses}{c.max_uses?` / ${c.max_uses}`:''}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`status-badge ${c.is_active ? 'bg-green-600' : 'bg-red-600'} text-white px-2 py-1 rounded-full text-xs font-medium`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{c.starts_at?new Date(c.starts_at).toLocaleDateString():'-'} → {c.ends_at?new Date(c.ends_at).toLocaleDateString():'-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-500 hover:text-blue-400 underline cursor-pointer bg-transparent border-none p-0 mr-3" onClick={()=>{setEdit(c);}}>Edit</button>
                  <button className="text-blue-500 hover:text-blue-400 underline cursor-pointer bg-transparent border-none p-0" onClick={()=>openUsage(c.id)}>Usage</button>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>

    {edit && (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
        <div className="bg-gray-800 rounded-lg p-6 w-[640px] space-y-4 shadow-lg">
          <h3 className="text-lg font-semibold text-white">{edit.id?'Edit':'New'} Coupon</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm text-gray-400">
              Code
              <input className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500 mt-1" value={edit.code} onChange={e=>setEdit({...edit, code:e.target.value.toUpperCase()})} placeholder="BLOM10"/>
            </label>
            <label className="text-sm text-gray-400">
              Type
              <select className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500 mt-1" value={edit.type} onChange={e=>setEdit({...edit, type:e.target.value})}>
                <option value="percent">percent</option>
                <option value="fixed">fixed</option>
              </select>
            </label>
            <label className="text-sm text-gray-400">
              Value
              <input type="number" className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500 mt-1" value={edit.value} onChange={e=>setEdit({...edit, value:Number(e.target.value)})}/>
            </label>
            <label className="text-sm text-gray-400">
              Min order total
              <input type="number" className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500 mt-1" value={edit.min_order_total||0} onChange={e=>setEdit({...edit, min_order_total:Number(e.target.value)})}/>
            </label>
            <label className="text-sm text-gray-400">
              Max uses
              <input type="number" className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500 mt-1" value={edit.max_uses||''} onChange={e=>setEdit({...edit, max_uses: e.target.value?Number(e.target.value):null})}/>
            </label>
            <label className="text-sm text-gray-400">
              Active
              <select className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500 mt-1" value={edit.is_active?'1':'0'} onChange={e=>setEdit({...edit, is_active:e.target.value==='1'})}>
                <option value="1">Yes</option><option value="0">No</option>
              </select>
            </label>
            <label className="text-sm text-gray-400">
              Starts
              <input type="datetime-local" className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500 mt-1" value={toISO(edit.starts_at)} onChange={e=>setEdit({...edit, starts_at:e.target.value?new Date(e.target.value).toISOString():null})}/>
            </label>
            <label className="text-sm text-gray-400">
              Ends
              <input type="datetime-local" className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500 mt-1" value={toISO(edit.ends_at)} onChange={e=>setEdit({...edit, ends_at:e.target.value?new Date(e.target.value).toISOString():null})}/>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded" onClick={()=>setEdit(null)}>Cancel</button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={()=>save(edit)}>Save</button>
          </div>
        </div>
      </div>
    )}

    {usage.length>0 && (
      <div
        className="bg-gray-800 rounded-lg shadow-lg overflow-hidden mt-8"
      >
        <div className="p-6">
          <h3 className="font-semibold mb-4 text-white">Usage</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">When</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Order</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {usage.map((u:any)=>(
                  <tr key={u.id} className="hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{new Date(u.used_at).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">{u.orders?.m_payment_id||'-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{u.buyer_email||'-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{u.orders?`R ${Number(u.orders.total||0).toFixed(2)}`:'-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`status-badge ${u.orders?.status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'} text-white px-2 py-1 rounded-full text-xs font-medium`}>
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
