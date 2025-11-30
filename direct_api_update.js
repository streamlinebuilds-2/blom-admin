// Direct Order Status Update - Bypass Netlify Function
// Use this to update order status directly via Supabase REST API

const SUPABASE_URL = "https://yvmnedjybrpvlupygusf.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI";

// Function to update order status directly
async function updateOrderStatus(orderId, newStatus) {
  const timestamp = new Date().toISOString();
  
  // Build update object based on status
  const updateData = {
    status: newStatus,
    updated_at: timestamp
  };
  
  // Add status-specific timestamps
  if (newStatus === 'packed') {
    updateData.order_packed_at = timestamp;
  } else if (newStatus === 'out_for_delivery') {
    updateData.order_out_for_delivery_at = timestamp;
  } else if (newStatus === 'delivered' || newStatus === 'collected') {
    updateData.fulfilled_at = timestamp;
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Order status updated successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Failed to update order status:', error);
    throw error;
  }
}

// Usage examples:
updateOrderStatus('4fc6796e-3b62-4890-8d8d-0e645f6599a3', 'packed')
  .then(() => console.log('Success!'))
  .catch(err => console.error('Error:', err));

// Alternative statuses:
// updateOrderStatus('ORDER_ID', 'out_for_delivery')
// updateOrderStatus('ORDER_ID', 'delivered') 
// updateOrderStatus('ORDER_ID', 'collected')