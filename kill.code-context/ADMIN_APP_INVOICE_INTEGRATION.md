# 🎯 Admin App Invoice Integration Guide

## 📋 New Admin Orders API with Invoice Support

I've created a new API endpoint specifically for your admin app at:
```
https://blom-cosmetics.co.za/.netlify/functions/admin-orders
```

This API includes **invoice URLs** in all order payloads and provides invoice management functionality.

---

## 🚀 API Usage Examples

### 1. **List All Orders with Invoice Status**
```javascript
// GET request
const response = await fetch('https://blom-cosmetics.co.za/.netlify/functions/admin-orders');
const data = await response.json();

console.log('Orders:', data.orders.map(order => ({
  id: order.id,
  order_number: order.order_number,
  customer: order.buyer_name,
  status: order.status,
  has_invoice: order.has_invoice,
  invoice_url: order.invoice_url
})));
```

**Response includes:**
```json
{
  "orders": [
    {
      "id": "4fc6796e-3b62-4890-8d8d-0e645f6599a3",
      "order_number": "BL-MIJ9P3QJ",
      "buyer_name": "Ezanne Brink",
      "status": "paid",
      "payment_status": "paid",
      "invoice_url": "https://yvmnedjybrpvlupygusf.supabase.co/storage/v1/object/public/invoices/BL-19ACBFB542B.pdf",
      "has_invoice": true,
      "invoice_ready": true,
      "order_items": [...]
    }
  ],
  "count": 25,
  "has_invoices": 18
}
```

### 2. **Get Specific Order with Full Invoice Info**
```javascript
// GET request with order_id parameter
const response = await fetch('https://blom-cosmetics.co.za/.netlify/functions/admin-orders?order_id=4fc6796e-3b62-4890-8d8d-0e645f6599a3');
const data = await response.json();

console.log('Order Details:', data.order);
console.log('Invoice Info:', data.invoice_info);
```

**Response includes:**
```json
{
  "order": {
    "id": "4fc6796e-3b62-4890-8d8d-0e645f6599a3",
    "order_number": "BL-MIJ9P3QJ",
    "m_payment_id": "BL-19ACBFB542B",
    "invoice_url": "https://...",
    "order_items": [...]
  },
  "invoice_info": {
    "has_invoice": true,
    "invoice_url": "https://...",
    "can_generate_invoice": true,
    "needs_manual_generation": false
  }
}
```

### 3. **Filter Orders by Status**
```javascript
// Get only paid orders
const response = await fetch('https://blom-cosmetics.co.za/.netlify/functions/admin-orders?status=paid&limit=10');
const data = await response.json();
```

### 4. **Generate Invoice for Order (Admin Action)**
```javascript
// POST request to generate invoice
const response = await fetch('https://blom-cosmetics.co.za/.netlify/functions/admin-orders?action=generate-invoice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_id: '4fc6796e-3b62-4890-8d8d-0e645f6599a3',
    m_payment_id: 'BL-19ACBFB542B'
  })
});
const result = await response.json();

console.log('Invoice Generated:', result.invoice_url);
```

---

## 🎯 Admin App Integration Examples

### **React/Vue Component Example**
```jsx
const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('https://blom-cosmetics.co.za/.netlify/functions/admin-orders');
      const data = await response.json();
      setOrders(data.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (orderId, mPaymentId) => {
    try {
      const response = await fetch('https://blom-cosmetics.co.za/.netlify/functions/admin-orders?action=generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, m_payment_id: mPaymentId })
      });
      const result = await response.json();
      
      if (result.success) {
        alert('Invoice generated successfully!');
        fetchOrders(); // Refresh list
      }
    } catch (error) {
      console.error('Invoice generation failed:', error);
    }
  };

  if (loading) return <div>Loading orders...</div>;

  return (
    <div className="orders-grid">
      {orders.map(order => (
        <div key={order.id} className="order-card">
          <h3>Order #{order.order_number}</h3>
          <p>Customer: {order.buyer_name}</p>
          <p>Status: {order.status}</p>
          
          <div className="invoice-section">
            {order.has_invoice ? (
              <div>
                <span className="invoice-badge">✅ Invoice Ready</span>
                <a 
                  href={order.invoice_url} 
                  target="_blank" 
                  rel="noopener"
                  className="btn btn-primary"
                >
                  View Invoice
                </a>
              </div>
            ) : (
              <div>
                <span className="invoice-badge">❌ No Invoice</span>
                <button 
                  onClick={() => generateInvoice(order.id, order.m_payment_id)}
                  className="btn btn-secondary"
                >
                  Generate Invoice
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### **Order Detail View Example**
```jsx
const OrderDetail = ({ orderId }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      const response = await fetch(`https://blom-cosmetics.co.za/.netlify/functions/admin-orders?order_id=${orderId}`);
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="order-detail">
      <h2>Order #{order.order.order_number}</h2>
      
      {/* Invoice Section */}
      <div className="invoice-section">
        <h3>Invoice Information</h3>
        
        {order.invoice_info.has_invoice ? (
          <div className="invoice-ready">
            <p>✅ Invoice is available</p>
            <a 
              href={order.invoice_info.invoice_url} 
              target="_blank" 
              rel="noopener"
              className="btn btn-primary"
            >
              View/Download Invoice PDF
            </a>
          </div>
        ) : (
          <div className="invoice-missing">
            <p>❌ No invoice available</p>
            
            {order.invoice_info.can_generate_invoice ? (
              <button 
                onClick={() => generateInvoice(order.order.id, order.order.m_payment_id)}
                className="btn btn-primary"
              >
                Generate Invoice Now
              </button>
            ) : (
              <p className="warning">Order needs to be marked as paid first</p>
            )}
          </div>
        )}
      </div>
      
      {/* Order Items */}
      <div className="order-items">
        <h3>Order Items</h3>
        {order.order.order_items.map(item => (
          <div key={item.id} className="order-item">
            <span>{item.product_name}</span>
            <span>Qty: {item.quantity}</span>
            <span>R{item.unit_price}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🎯 Invoice Status Indicators

The API provides clear invoice status for your admin UI:

| Status | Meaning | UI Indicator |
|--------|---------|--------------|
| `has_invoice: true` | Invoice exists | ✅ Green badge + "View Invoice" button |
| `has_invoice: false` | No invoice | ❌ Red badge + "Generate Invoice" button |
| `can_generate_invoice: true` | Order ready for invoice | Generate button enabled |
| `needs_manual_generation: true` | Order needs manual intervention | Show warning message |

---

## 🔧 URL Patterns for Your Admin App

**For Order List:**
```
https://blom-cosmetics.co.za/.netlify/functions/admin-orders
```

**For Specific Order:**
```
https://blom-cosmetics.co.za/.netlify/functions/admin-orders?order_id=4fc6796e-3b62-4890-8d8d-0e645f6599a3
```

**For Invoice Generation:**
```
POST https://blom-cosmetics.co.za/.netlify/functions/admin-orders?action=generate-invoice
```

---

## ✅ What This Solves

1. **✅ Invoice URLs in Payload**: All order data now includes `invoice_url`
2. **✅ Invoice Status**: Clear indicators for invoice availability 
3. **✅ Admin Actions**: Generate invoices directly from admin interface
4. **✅ Full Order Data**: Complete order information with items and customer details
5. **✅ Error Handling**: Proper error messages for failed operations

Your admin app can now display and manage invoices for all orders! 🎉