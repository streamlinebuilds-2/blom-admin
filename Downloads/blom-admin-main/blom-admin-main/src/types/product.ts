export type ProductVariant = {
  sku?: string;
  name: string;
  price?: number;
  compare_at_price?: number | null;
  stock?: number;
  options?: Record<string, string>; // e.g. { color: 'Pink', size: '30ml' }
};

export type ProductSEO = {
  title?: string;
  description?: string;
};

export type Product = {
  id?: string;
  name: string;
  subtitle?: string;
  slug: string;
  status: 'draft' | 'active' | 'archived';
  category?: string;
  tags?: string[];
  badges?: string[]; // e.g. ["New", "Bestseller"]
  claims?: string[]; // e.g. ["Vegan", "Cruelty-free"]
  price: number; // ZAR decimal
  compare_at_price?: number | null;
  stock: number;
  short_description?: string;
  long_description?: string;
  how_to_use?: string;
  size?: string;
  shelf_life?: string;
  features?: string[]; // bullet points for cards
  image_url?: string; // primary image
  gallery?: string[]; // additional images
  variants?: ProductVariant[];
  seo?: ProductSEO;
  // system fields
  created_at?: string;
  updated_at?: string;
};

