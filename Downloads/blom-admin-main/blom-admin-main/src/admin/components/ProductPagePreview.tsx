import React from 'react';
import { ProductPageTemplate } from '../../../ProductPageTemplate';

/**
 * Page Preview - matches exact shape from spec
 */
export default function ProductPagePreview({ page }: { page: any }) {
  const images = page.images || [];
  const primaryImage = images[0] || null;

  // Transform the page data to match ProductPageTemplate interface
  const templateData = {
    name: page.name || 'Product Name',
    slug: page.slug || 'product-slug',
    category: page.category || 'Category',
    shortDescription: page.shortDescription || page.short_desc || '',
    overview: page.overview || page.description || '',
    price: page.price || 'R0.00',
    compareAtPrice: page.compareAtPrice || page.compare_at_price,
    stock: page.stock || 'In Stock',
    images: images,
    features: page.features || [],
    howToUse: page.howToUse || page.how_to_use || [],
    ingredients: {
      inci: page.ingredients?.inci || page.inci_ingredients || [],
      key: page.ingredients?.key || page.key_ingredients || []
    },
    details: {
      size: page.details?.size || page.size || '',
      shelfLife: page.details?.shelfLife || page.shelf_life || '',
      claims: page.details?.claims || page.claims || []
    },
    variants: page.variants || [],
    related: page.related || [],
    rating: page.rating || 4.5,
    reviewCount: page.reviewCount || 124,
    reviews: page.reviews || [],
    seo: {
      title: page.seo?.title || page.name || 'Product',
      description: page.seo?.description || page.shortDescription || ''
    }
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="p-4">
        <div className="text-sm text-gray-600 mb-2">Desktop Preview</div>
        <div className="border rounded-lg overflow-hidden" style={{ height: '400px', transform: 'scale(0.3)', transformOrigin: 'top left', width: '333.33%' }}>
          <ProductPageTemplate product={templateData} />
        </div>
      </div>
      <div className="border-t p-4">
        <div className="text-sm text-gray-600 mb-2">Mobile Preview</div>
        <div className="border rounded-lg overflow-hidden mx-auto" style={{ height: '600px', width: '375px', transform: 'scale(0.4)', transformOrigin: 'top center' }}>
          <ProductPageTemplate product={templateData} />
        </div>
      </div>
    </div>
  );
}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--input-bg)' }}>
          {primaryImage ? (
            <img src={primaryImage} alt={page.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full aspect-square flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              No image
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {page.details?.claims?.map((c: string) => (
              <span key={c} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fce7f3', color: '#9f1239' }}>
                {c}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{page.name || 'Product name'}</h1>
          <div className="mt-3 flex items-baseline gap-2">
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{page.price}</div>
          </div>
          <div className="mt-2 text-sm" style={{ 
            color: page.stock === 'Archived' ? 'var(--text-muted)' : 
                   page.stock === 'Out of Stock' ? '#ef4444' : '#10b981' 
          }}>
            {page.stock}
          </div>
          {page.shortDescription ? (
            <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>{page.shortDescription}</p>
          ) : null}
          {page.category ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Category: {page.category}</p>
          ) : null}
          {page.features?.length ? (
            <div className="mt-4">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Features</h3>
              <ul className="list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
                {page.features.map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          ) : null}
          {page.howToUse?.length ? (
            <div className="mt-4">
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>How to Use</h3>
              <ol className="list-decimal ml-5" style={{ color: 'var(--text-secondary)' }}>
                {page.howToUse.map((step: string, i: number) => <li key={i}>{step}</li>)}
              </ol>
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-6 pb-6">
        {page.overview ? (
          <>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Overview</h3>
            <div className="prose max-w-none" style={{ color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: page.overview }} />
          </>
        ) : null}
        
        {page.ingredients?.inci?.length || page.ingredients?.key?.length ? (
          <div className="mt-6">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Ingredients</h3>
            {page.ingredients.key?.length ? (
              <div className="mb-2">
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Key Ingredients:</p>
                <p style={{ color: 'var(--text-secondary)' }}>{page.ingredients.key.join(', ')}</p>
              </div>
            ) : null}
            {page.ingredients.inci?.length ? (
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>INCI:</p>
                <p style={{ color: 'var(--text-secondary)' }}>{page.ingredients.inci.join(', ')}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {(page.details?.size || page.details?.shelfLife) ? (
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            {page.details.size ? (
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Size</div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{page.details.size}</div>
              </div>
            ) : null}
            {page.details.shelfLife ? (
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Shelf Life</div>
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{page.details.shelfLife}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {page.variants?.length ? (
          <div className="mt-6">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Variants</h3>
            <ul className="list-disc ml-5" style={{ color: 'var(--text-secondary)' }}>
              {page.variants.map((v: string, i: number) => <li key={i}>{v}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
