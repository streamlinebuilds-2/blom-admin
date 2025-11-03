export type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'draft';
  price: number;
  compare_at_price: number | null;
  stock: number;
  short_description: string;
  long_description: string;
  image_url: string;
  gallery: string[];
};

export const emptyProduct = (): ProductForm => ({
  name: '',
  slug: '',
  status: 'active',
  price: 0,
  compare_at_price: null,
  stock: 0,
  short_description: '',
  long_description: '',
  image_url: '',
  gallery: [],
});

// Normalize DB row → form
export function rowToForm(r: any): ProductForm {
  return {
    id: r.id,
    name: r.name ?? '',
    slug: r.slug ?? '',
    status: (r.status ?? 'active') as ProductForm['status'],
    price: Number(r.price ?? r.price_cents ? (r.price_cents / 100) : 0),
    compare_at_price: r.compare_at_price != null
      ? Number(r.compare_at_price)
      : (r.compare_at_price_cents != null ? Number(r.compare_at_price_cents) / 100 : null),
    stock: Number(r.stock_on_hand ?? r.stock ?? r.stock_qty ?? 0),
    short_description: r.short_description ?? r.short_desc ?? '',
    long_description: r.long_description ?? '',
    image_url: r.image_url ?? '',
    gallery: Array.isArray(r.gallery) ? r.gallery : [],
  };
}

// Form → payload for Netlify save-product
export function formToPayload(f: ProductForm) {
  return {
    id: f.id,
    name: f.name,
    slug: f.slug,
    status: f.status,
    price: Number(f.price),
    compare_at_price: f.compare_at_price == null ? null : Number(f.compare_at_price),
    stock_on_hand: Number(f.stock),
    short_description: f.short_description,
    long_description: f.long_description,
    image_url: f.image_url,
    gallery: f.gallery,
  };
}

// Helper to save via Netlify function
export async function saveProduct(payload: any) {
  const res = await fetch('/.netlify/functions/save-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`save-product failed: ${res.status} ${text}`);
  }
  return res.json();
}
