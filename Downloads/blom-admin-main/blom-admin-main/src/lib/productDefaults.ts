import { Product } from '@/types/product';

export const emptyProduct = (partial?: Partial<Product>): Product => ({
  name: '',
  subtitle: '',
  slug: '',
  status: 'draft',
  category: '',
  tags: [],
  badges: [],
  claims: [],
  price: 0,
  compare_at_price: null,
  stock: 0,
  short_description: '',
  long_description: '',
  how_to_use: '',
  size: '',
  shelf_life: '',
  features: [],
  image_url: '',
  gallery: [],
  variants: [],
  seo: { title: '', description: '' },
  ...partial,
});

