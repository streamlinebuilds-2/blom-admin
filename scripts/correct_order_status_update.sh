#!/bin/bash

# Correct Order Status Update Script
# This script updates ONLY the status field, leaving payment_status unchanged

ORDER_ID="4fc6796e-3b62-4890-8d8d-0e645f6599a3"
NEW_STATUS="packed"
SUPABASE_URL="https://yvmnedjybrpvlupygusf.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI"

echo "🔧 Updating order status correctly..."
echo "Order ID: $ORDER_ID"
echo "New Status: $NEW_STATUS"
echo ""

# Update ONLY the status field, don't touch payment_status
curl -X PATCH "$SUPABASE_URL/rest/v1/orders?id=eq.$ORDER_ID" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{
    \"status\": \"$NEW_STATUS\",
    \"updated_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
    \"order_packed_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
  }"

echo ""
echo "✅ Status update completed!"
echo "📝 Note: payment_status was NOT changed - it should remain as 'paid', 'unpaid', or 'pending'"