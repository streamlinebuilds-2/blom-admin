#!/bin/bash

# Quick Order Status Update Test
# Replace ORDER_ID with an actual order ID from your database

# Configuration
SUPABASE_URL="https://yvmnedjybrpvlupygusf.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDk2NDMsImV4cCI6MjA3NDE4NTY0M30.jyT8CC7oRMCg4vnMVmeRc0lZ_Ct7VANuRIfx20qx8aE"

# You need to replace this with an actual order ID
ORDER_ID="REPLACE_WITH_ACTUAL_ORDER_ID"
NEW_STATUS="packed"

echo "🧪 Testing Order Status Update Functionality"
echo "=================================================="
echo "Order ID: $ORDER_ID"
echo "New Status: $NEW_STATUS"
echo ""

# Test the status update API
echo "📤 Sending status update request..."
curl -X POST "$SUPABASE_URL/functions/v1/simple-order-status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d "{\"id\": \"$ORDER_ID\", \"status\": \"$NEW_STATUS\"}" \
  --max-time 30

echo ""
echo ""
echo "✅ Test completed!"
echo ""
echo "📋 Next steps:"
echo "1. Replace ORDER_ID with actual order ID"
echo "2. Run this script"
echo "3. Check if status actually changed in your admin interface"
echo "4. Verify with database query if needed"