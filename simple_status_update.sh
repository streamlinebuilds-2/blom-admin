#!/bin/bash

# Simple Order Status Update via Direct Supabase API
# Bypasses the broken Netlify function

ORDER_ID="4fc6796e-3b62-4890-8d8d-0e645f6599a3"
NEW_STATUS="packed"
TIMESTAMP=$(date -Iseconds)

echo "🧪 Updating Order Status Directly"
echo "Order ID: $ORDER_ID"
echo "New Status: $NEW_STATUS"
echo ""

curl -X PATCH "https://yvmnedjybrpvlupygusf.supabase.co/rest/v1/orders?id=eq.${ORDER_ID}" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"status\": \"${NEW_STATUS}\",
    \"updated_at\": \"${TIMESTAMP}\",
    \"order_packed_at\": \"${TIMESTAMP}\"
  }"

echo ""
echo "✅ Status update command executed!"
echo ""
echo "📋 To test other statuses, change NEW_STATUS to:"
echo "  - out_for_delivery"
echo "  - delivered" 
echo "  - collected"
echo ""
echo "🎯 This bypasses the broken Netlify function completely!"