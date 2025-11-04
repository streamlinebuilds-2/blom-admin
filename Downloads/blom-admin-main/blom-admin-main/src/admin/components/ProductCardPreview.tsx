import React from 'react';
import { Product } from '@/types/product';

export default function ProductCardPreview({ p }: { p: Product }) {
  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
        {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : null}
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-2 flex-wrap">
          {p.badges?.map((b) => (
            <span key={b} className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{b}</span>
          ))}
        </div>
        <h3 className="mt-2 font-semibold">{p.name || 'Product name'}</h3>
        {p.subtitle ? <p className="text-sm text-gray-600">{p.subtitle}</p> : null}
        <div className="mt-2 flex items-baseline gap-2">
          <div className="font-bold">R{Number(p.price || 0).toFixed(2)}</div>
          {p.compare_at_price ? (
            <div className="line-through text-sm text-gray-500">R{Number(p.compare_at_price).toFixed(2)}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

