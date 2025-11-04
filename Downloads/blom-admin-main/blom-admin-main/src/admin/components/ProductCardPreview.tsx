import React from 'react';
import { formatZAR } from '@/lib/currency';

/**
 * Card Preview - matches exact shape from spec
 */
export default function ProductCardPreview({ card }: { card: any }) {
  const images = card.images || [];
  const primaryImage = images[0] || null;

  return (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="aspect-square overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--input-bg)' }}>
        {primaryImage ? (
          <img src={primaryImage} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            No image
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-2 flex-wrap">
          {card.badges?.map((b: string) => (
            <span key={b} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fce7f3', color: '#9f1239' }}>
              {b}
            </span>
          ))}
        </div>
        <h3 className="mt-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{card.name || 'Product name'}</h3>
        {card.shortDescription ? (
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{card.shortDescription}</p>
        ) : null}
        <div className="mt-2 flex items-baseline gap-2">
          <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatZAR(card.price)}</div>
        </div>
        <div className="mt-1 text-xs" style={{ color: card.inStock ? '#10b981' : '#ef4444' }}>
          {card.inStock ? 'In Stock' : 'Out of Stock'}
        </div>
      </div>
    </div>
  );
}
