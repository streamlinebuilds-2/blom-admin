/**
 * Centralized admin route paths
 */
export const adminPaths = {
  products: '/products',
  productNew: '/products/new',
  productEdit: (id: string) => `/products/edit?id=${id}`,
  bulkPrice: '/bulk-price-updates',
  bundles: '/bundles',
  bundleNew: '/bundles/new',
  bundleEdit: (id: string) => `/bundles/edit?id=${id}`,
  orders: '/orders',
  orderDetail: (id: string) => `/orders/${id}`,
  reviews: '/reviews',
  messages: '/messages',
  messageDetail: (id: string) => `/messages/${id}`,
  finance: '/finance',
  coupons: '/coupons',
  discounts: '/discounts',
  settings: '/settings',
};

