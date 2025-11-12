#!/bin/bash

# Test admin-order endpoint

ORDER_ID="80979094-3b39-4ad2-bfae-9a549eac083c"

echo "🔍 TESTING ADMIN-ORDER ENDPOINT"
echo "========================================"
echo "Order ID: $ORDER_ID"
echo ""

# Test what the admin panel would call
curl -s "https://blom-admin-1.netlify.app/.netlify/functions/admin-order?id=${ORDER_ID}" | jq '.'

echo ""
echo "========================================"
