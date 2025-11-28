#!/bin/bash

# Curl command to update order status via Netlify function
# Order ID: 3b360af7-5b6a-48d8-aaf2-f8000e84b414 (BL-MIJA07IB)

echo "🔄 Updating order BL-MIJA07IB to 'paid' status..."

curl -X POST "http://localhost:8888/.netlify/functions/simple-order-status" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "3b360af7-5b6a-48d8-aaf2-f8000e84b414",
    "status": "paid"
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "✅ Order status update request sent!"
echo "📋 Check the response above for success/error details."
echo ""
echo "🔍 To verify the update worked, run this query:"
echo "SELECT order_number, status, updated_at, paid_at FROM orders WHERE order_number = 'BL-MIJA07IB';"

# For production environment, use this URL instead:
# curl -X POST "https://blom-cosmetics.co.za/.netlify/functions/simple-order-status" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "id": "3b360af7-5b6a-48d8-aaf2-f8000e84b414",
#     "status": "paid"
#   }'