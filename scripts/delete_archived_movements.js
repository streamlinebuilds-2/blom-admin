// Node.js script to delete archived order stock movements
// This will permanently remove the specific stock movements you requested

import https from 'https';

const url = 'https://blom-admin-1.netlify.app/.netlify/functions/delete-archived-order-movements';

const postData = '{}';

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🗑️  Deleting stock movements for archived orders...');

const req = https.request(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📊 Response Status:', res.statusCode);
    console.log('📋 Response Data:', data);
    
    if (res.statusCode === 200) {
      console.log('\n✅ Success! Stock movements for archived orders have been permanently deleted!');
      console.log('🔄 The stock movement history is now clean - those specific movements are gone!');
      console.log('📈 Your stock movement page now shows the original All/Manual/Order filter buttons.');
    } else {
      console.log('\n❌ Error occurred while deleting movements');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error);
});

req.write(postData);
req.end();