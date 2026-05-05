import React from 'react';

interface ProductPreviewProps {
  product: {
    name?: string;
    slug?: string;
    price?: number;
    compare_at_price?: number | null;
    short_description?: string;
    image_url?: string;
    gallery?: string[];
    status?: string;
    inci_ingredients?: string;
    how_to_use?: string;
    shipping_info?: string;
    description?: string;
  };
}

export function ProductPreview({ product }: ProductPreviewProps) {
  const { name, price, compare_at_price, short_description, image_url, status, inci_ingredients, how_to_use, shipping_info, description } = product;
  
  // Helper function to check if content exists (strips HTML tags)
  const hasContent = (content: string | undefined): boolean => {
    if (!content) return false;
    const strippedContent = content.replace(/<[^>]*>/g, '');
    return strippedContent.trim() !== '';
  };

  const displayPrice = price ? `R ${price.toFixed(2)}` : 'R 0.00';
  const displayComparePrice = compare_at_price ? `R ${compare_at_price.toFixed(2)}` : null;
  const hasDiscount = compare_at_price && price && compare_at_price > price;

  // Check if content exists for each tab
  const hasIngredients = hasContent(inci_ingredients);
  const hasHowToUse = hasContent(how_to_use);
  const hasShippingInfo = hasContent(shipping_info);
  const hasDescription = hasContent(description);

  // Check if any tabs have content
  const hasAnyTabs = hasIngredients || hasHowToUse || hasShippingInfo || hasDescription;

  return (
    <div className="space-y-6">
      {/* Desktop Preview */}
      <div className="bg-white border rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Desktop Preview</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {status || 'active'}
          </span>
        </div>
        
        <div className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
          {/* Product Image */}
          <div className="aspect-square bg-gray-100 relative">
            {image_url ? (
              <img 
                src={image_url} 
                alt={name || 'Product'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="p-4">
            <h4 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
              {name || 'Product Name'}
            </h4>
            
            {short_description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {short_description}
              </p>
            )}
            
            {/* Price */}
            <div className="flex items-center gap-2">
              {hasDiscount && displayComparePrice && (
                <span className="text-sm text-gray-500 line-through">
                  {displayComparePrice}
                </span>
              )}
              <span className="text-xl font-bold text-gray-900">
                {displayPrice}
              </span>
              {hasDiscount && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                  Sale
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Preview */}
      <div className="bg-white border rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Mobile Preview</h3>
          <span className="text-xs text-gray-400">375px</span>
        </div>
        
        <div className="max-w-[200px] mx-auto bg-gray-50 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          {/* Mobile Product Image */}
          <div className="aspect-square bg-gray-100 relative">
            {image_url ? (
              <img 
                src={image_url} 
                alt={name || 'Product'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Mobile Product Info */}
          <div className="p-3">
            <h4 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-2">
              {name || 'Product Name'}
            </h4>
            
            {/* Mobile Price */}
            <div className="flex items-center gap-1.5">
              {hasDiscount && displayComparePrice && (
                <span className="text-xs text-gray-500 line-through">
                  {displayComparePrice}
                </span>
              )}
              <span className="text-base font-bold text-gray-900">
                {displayPrice}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Product Details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Slug:</dt>
            <dd className="font-mono text-gray-900 text-xs">{product.slug || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Status:</dt>
            <dd className="text-gray-900 capitalize">{status || 'active'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Price:</dt>
            <dd className="text-gray-900 font-semibold">{displayPrice}</dd>
          </div>
          {product.gallery && product.gallery.length > 0 && (
            <div className="flex justify-between">
              <dt className="text-gray-600">Gallery:</dt>
              <dd className="text-gray-900">{product.gallery.length} image{product.gallery.length !== 1 ? 's' : ''}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Product Information Section - Only shown if any tabs have content */}
      {hasAnyTabs && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Product Information</h3>
          <div className="space-y-4">
            {/* Description Tab */}
            {hasDescription && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                <div className="text-sm text-gray-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: description || '' }} />
              </div>
            )}

            {/* Ingredients Tab */}
            {hasIngredients && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Ingredients</h4>
                <div className="text-sm text-gray-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: inci_ingredients || '' }} />
              </div>
            )}

            {/* How to Use Tab */}
            {hasHowToUse && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">How to Use</h4>
                <div className="text-sm text-gray-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: how_to_use || '' }} />
              </div>
            )}

            {/* Shipping Info Tab */}
            {hasShippingInfo && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Shipping Info</h4>
                <div className="text-sm text-gray-600 prose max-w-none" dangerouslySetInnerHTML={{ __html: shipping_info || '' }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

