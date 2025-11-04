import React from 'react';
import { Product } from '@/types/product';

export default function ProductPagePreview({ p }: { p: Product }) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <div className="rounded-xl bg-gray-100 overflow-hidden">
          {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : null}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {p.badges?.map((b) => (
              <span key={b} className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{b}</span>
            ))}
          </div>
          <h1 className="text-2xl font-bold mt-2">{p.name || 'Product name'}</h1>
          {p.subtitle ? <p className="text-gray-600">{p.subtitle}</p> : null}
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-2xl font-bold">R{Number(p.price || 0).toFixed(2)}</div>
            {p.compare_at_price ? (
              <div className="line-through text-gray-500">R{Number(p.compare_at_price).toFixed(2)}</div>
            ) : null}
          </div>
          {p.short_description ? <p className="mt-4 text-gray-700">{p.short_description}</p> : null}
          {p.claims?.length ? (
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {p.claims.map((c) => <li key={c} className="text-gray-700">• {c}</li>)}
            </ul>
          ) : null}
          {p.features?.length ? (
            <div className="mt-4">
              <h3 className="font-semibold">Features</h3>
              <ul className="list-disc ml-5 text-gray-700">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-6 pb-6">
        {p.long_description ? (
          <>
            <h3 className="font-semibold mb-1">Details</h3>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: p.long_description }} />
          </>
        ) : null}
        {p.how_to_use ? (
          <>
            <h3 className="font-semibold mt-6 mb-1">How to use</h3>
            <p className="text-gray-700">{p.how_to_use}</p>
          </>
        ) : null}
        {(p.size || p.shelf_life) ? (
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            {p.size ? <div><div className="text-gray-500">Size</div><div className="font-medium">{p.size}</div></div> : null}
            {p.shelf_life ? <div><div className="text-gray-500">Shelf life</div><div className="font-medium">{p.shelf_life}</div></div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

