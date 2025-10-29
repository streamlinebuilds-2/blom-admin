export const ID = 'string';

// Type definitions (for documentation - JS doesn't enforce these)
/*
export type Product = {
  id: ID;
  name: string;
  slug: string;
  status: 'draft' | 'active' | 'archived';
  price_cents: number;
  compare_at_price_cents?: number | null;
  stock_qty: number;
  short_desc?: string | null;
  category_id?: ID | null;
  updated_at?: string;
};

export type StockMovement = {
  id: ID;
  product_id: ID;
  delta: number;
  reason?: string | null;
  created_at: string;
};

export type Special = {
  id: ID;
  scope: 'product' | 'bundle' | 'sitewide';
  ref_id?: ID | null;
  discount_type: 'percent' | 'amount_off' | 'fixed_price';
  value: number;
  starts_at: string;
  ends_at?: string | null;
  status: 'active' | 'scheduled' | 'expired';
};

export type BundleItem = {
  product_id: ID;
  qty: number;
};

export type Bundle = {
  id: ID;
  name: string;
  slug: string;
  status: 'draft' | 'active';
  items: BundleItem[];
  pricing_mode: 'manual' | 'percent_off' | 'amount_off';
  discount_value?: number | null;
  price_cents: number;
  compare_at_price_cents?: number | null;
  short_desc?: string | null;
  long_desc?: string | null;
  images: string[];
  hover_image?: string | null;
  updated_at?: string;
};

export type Order = {
  id: ID;
  order_number?: string | null;
  status: 'unpaid' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'refunded' | 'canceled';
  total_cents: number;
  created_at: string;
};

export type Payment = {
  id: ID;
  order_id: ID;
  provider: string;
  amount_cents: number;
  status: 'succeeded' | 'pending' | 'failed';
  created_at: string;
  raw?: any;
};

export type Message = {
  id: ID;
  full_name: string;
  email: string;
  phone?: string | null;
  inquiry_type: 'general' | 'order' | 'shipping' | 'returns' | 'wholesale' | 'other';
  subject: string;
  body: string;
  attachments?: { url: string; name: string }[];
  status: 'new' | 'open' | 'closed';
  created_at: string;
  updated_at?: string;
  assignee?: string | null;
};

export type Review = {
  id: ID;
  product_id: ID;
  product_name?: string;
  author_name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string | null;
  body: string;
  image_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};
*/