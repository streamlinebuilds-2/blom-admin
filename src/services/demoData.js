// Demo data service for fallback when backend is unavailable
export const demoOrders = [
  {
    id: 'demo-order-1',
    order_number: 'BLM-2025-001',
    status: 'paid',
    buyer_name: 'Sarah Johnson',
    buyer_email: 'sarah@example.com',
    buyer_phone: '+27 82 123 4567',
    created_at: '2025-11-28T08:00:00Z',
    subtotal_cents: 245000, // R2,450.00
    shipping_cents: 5000, // R50.00
    discount_cents: 0,
    total_cents: 250000, // R2,500.00
    fulfillment_type: 'delivery',
    shipping_address: '123 Main Street\nCape Town\n8001\nSouth Africa',
    items: [
      {
        id: 1,
        name: 'Hydrating Face Serum',
        variant: '30ml',
        quantity: 2,
        unit_price_cents: 125000,
        line_total_cents: 250000
      }
    ]
  },
  {
    id: 'demo-order-2',
    order_number: 'BLM-2025-002',
    status: 'packed',
    buyer_name: 'Michael Smith',
    buyer_email: 'michael@example.com',
    buyer_phone: '+27 83 987 6543',
    created_at: '2025-11-27T15:30:00Z',
    subtotal_cents: 89000, // R890.00
    shipping_cents: 0, // Free shipping over R2000
    discount_cents: 5000, // R50.00 coupon
    total_cents: 84000, // R840.00
    fulfillment_type: 'collection',
    shipping_address: null,
    items: [
      {
        id: 2,
        name: 'Anti-Aging Night Cream',
        variant: '50ml',
        quantity: 1,
        unit_price_cents: 89000,
        line_total_cents: 89000
      }
    ]
  },
  {
    id: 'demo-order-3',
    order_number: 'BLM-2025-003',
    status: 'out_for_delivery',
    buyer_name: 'Emily Davis',
    buyer_email: 'emily@example.com',
    buyer_phone: '+27 84 555 0123',
    created_at: '2025-11-27T10:15:00Z',
    subtotal_cents: 375000, // R3,750.00
    shipping_cents: 0, // Free shipping
    discount_cents: 15000, // R150.00 bulk discount
    total_cents: 360000, // R3,600.00
    fulfillment_type: 'delivery',
    shipping_address: '456 Beach Road\nDurban\n4001\nSouth Africa',
    items: [
      {
        id: 3,
        name: 'Complete Skincare Set',
        variant: 'Full Collection',
        quantity: 1,
        unit_price_cents: 375000,
        line_total_cents: 375000
      }
    ]
  },
  {
    id: 'demo-order-4',
    order_number: 'BLM-2025-004',
    status: 'delivered',
    buyer_name: 'James Wilson',
    buyer_email: 'james@example.com',
    buyer_phone: '+27 85 234 5678',
    created_at: '2025-11-26T14:20:00Z',
    subtotal_cents: 195000, // R1,950.00
    shipping_cents: 5000, // R50.00
    discount_cents: 0,
    total_cents: 200000, // R2,000.00
    fulfillment_type: 'delivery',
    shipping_address: '789 Garden Avenue\nJohannesburg\n2196\nSouth Africa',
    items: [
      {
        id: 4,
        name: 'Vitamin C Brightening Serum',
        variant: '20ml',
        quantity: 1,
        unit_price_cents: 195000,
        line_total_cents: 195000
      }
    ]
  }
];

export const demoProducts = [
  {
    id: 'prod-1',
    name: 'Hydrating Face Serum',
    price: 125000,
    status: 'active',
    stock_quantity: 25,
    category: 'Skincare'
  },
  {
    id: 'prod-2',
    name: 'Anti-Aging Night Cream',
    price: 89000,
    status: 'active',
    stock_quantity: 12,
    category: 'Skincare'
  },
  {
    id: 'prod-3',
    name: 'Complete Skincare Set',
    price: 375000,
    status: 'active',
    stock_quantity: 8,
    category: 'Bundles'
  },
  {
    id: 'prod-4',
    name: 'Vitamin C Brightening Serum',
    price: 195000,
    status: 'active',
    stock_quantity: 18,
    category: 'Skincare'
  }
];

export const demoContacts = [
  {
    id: 'contact-1',
    name: 'Customer Support',
    email: 'support@blomcosmetics.co.za',
    phone: '+27 21 555 0123',
    created_at: '2025-11-28T08:00:00Z'
  }
];

export const demoReviews = [
  {
    id: 'review-1',
    product_name: 'Hydrating Face Serum',
    rating: 5,
    comment: 'Amazing product! My skin feels so much better.',
    author: 'Sarah J.',
    created_at: '2025-11-27T16:30:00Z'
  }
];

export const demoMessages = [
  {
    id: 'msg-1',
    subject: 'Order Inquiry',
    message: 'When will my order be shipped?',
    customer_name: 'Michael Smith',
    status: 'pending',
    created_at: '2025-11-27T12:00:00Z'
  }
];

export const demoBundles = [
  {
    id: 'bundle-1',
    name: 'Complete Skincare Set',
    price: 375000,
    status: 'active',
    created_at: '2025-11-25T10:00:00Z'
  }
];

export const demoStockMovements = [
  {
    id: 'move-1',
    product_name: 'Hydrating Face Serum',
    movement_type: 'sale',
    quantity: -2,
    reason: 'Order BLM-2025-001',
    created_at: '2025-11-28T08:15:00Z'
  }
];

export const getDemoOrderById = (id) => {
  const order = demoOrders.find(o => o.id === id);
  if (!order) return null;

  // Return order with items array
  return {
    order,
    items: order.items
  };
};

export const isDemoMode = () => {
  return import.meta.env.VITE_DEMO_MODE === 'true' || 
         !import.meta.env.VITE_BASE44_BACKEND_URL ||
         import.meta.env.VITE_BASE44_BACKEND_URL.includes('localhost');
};