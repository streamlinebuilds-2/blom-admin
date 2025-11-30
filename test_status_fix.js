// Quick test to verify order status fix works
const testOrderId = '4fc6796e-3b62-4890-8d8d-0e645f6599a3';
const newStatus = 'packed';

console.log('🧪 Testing Order Status Fix...');
console.log('Order ID:', testOrderId);
console.log('New Status:', newStatus);

// Test the simple-order-status function
fetch('/.netlify/functions/simple-order-status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: testOrderId,
    status: newStatus
  })
})
.then(response => {
  console.log('Response status:', response.status);
  return response.json();
})
.then(result => {
  console.log('✅ Test Result:', result);
  if (result.ok) {
    console.log('🎉 Order status update successful!');
    console.log('Status changed from:', result.statusChange.from);
    console.log('Status changed to:', result.statusChange.to);
    console.log('Update method used:', result.updateMethod);
    console.log('Webhook called:', result.webhook.called);
  } else {
    console.log('❌ Test failed:', result.error);
  }
})
.catch(error => {
  console.error('❌ Network error:', error);
});