import { formatZAR } from './currency';

/**
 * Convert form state to Card Preview payload
 */
export function toCardPreview(form: any): any {
  const images = [
    form.thumbnail_url,
    ...(form.hover_image_url ? [form.hover_image_url] : []),
    ...(form.gallery_urls || [])
  ].filter(Boolean);

  return {
    id: form.id || 'new',
    name: form.name || '',
    slug: form.slug || '',
    price: typeof form.price === 'number' ? form.price : parseFloat(form.price || '0'),
    images: images,
    inStock: form.status === 'archived' ? false : !form.out_of_stock,
    badges: form.badges || [],
    shortDescription: form.short_description || ''
  };
}

/**
 * Convert form state to Page Preview payload
 */
export function toPagePreview(form: any): any {
  const images = [
    form.thumbnail_url,
    ...(form.hover_image_url ? [form.hover_image_url] : []),
    ...(form.gallery_urls || [])
  ].filter(Boolean);

  const out_of_stock = form.status === 'archived' ? true : !!form.out_of_stock;
  const stock = out_of_stock ? 'Out of Stock' : 'In Stock';

  return {
    name: form.name || '',
    slug: form.slug || '',
    category: form.category || '',
    shortDescription: form.short_description || '',
    overview: form.overview || form.description || '',
    price: formatZAR(form.price),
    stock,
    out_of_stock,
    images: images,
    features: form.features || [],
    howToUse: form.how_to_use || [],
    ingredients: {
      inci: form.inci_ingredients || [],
      key: form.key_ingredients || []
    },
    details: {
      size: form.size || '',
      shelfLife: form.shelf_life || '',
      claims: form.claims || []
    },
    variants: (form.variants || []).map((v: any) => v.title || '').filter(Boolean),
    seo: {
      title: form.meta_title || form.name || '',
      description: form.meta_description || form.short_description || ''
    }
  };
}

