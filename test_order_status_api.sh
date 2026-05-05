#!/bin/bash

# Test Order Status Update API
# This script tests if the status update API is working

ORDER_ID="your-order-id-here"
NEW_STATUS="packed"
API_URL="https://yvmnedjybrpvlupygusf.supabase.co/functions/v1/simple-order-status"

echo "🧪 Testing Order Status Update API"
echo "Order ID: $ORDER_ID"
echo "New Status: $NEW_STATUS"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDk2NDMsImV4cCI6MjA3NDE4NTY0M30.jyT8CC7oRMCg4vnMVmeRc0lZ_Ct7VANuRIfx20qx8aE" \
  -d "{\"id\": \"$ORDER_ID\", \"status\": \"$NEW_STATUS\"}" \
  --verbose

echo ""
echo "✅ Test completed"