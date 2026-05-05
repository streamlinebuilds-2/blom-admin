#!/bin/bash

# Sync fulfillment_type from fulfillment_method for all existing orders

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bm1lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI"
URL="https://yvmnedjybrpvlupygusf.supabase.co/rest/v1"

echo "🔄 SYNCING FULFILLMENT_TYPE FROM FULFILLMENT_METHOD"
echo "========================================"
echo ""

# First, check how many orders need updating
echo "📊 Checking orders with null fulfillment_type..."
COUNT=$(curl -s \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Prefer: count=exact" \
  "${URL}/orders?select=count&fulfillment_type=is.null" | jq '.[].count')

echo "   Found $COUNT orders with null fulfillment_type"
echo ""

if [ "$COUNT" -eq 0 ]; then
  echo "✅ No orders need updating!"
  exit 0
fi

echo "🔧 Updating orders..."
echo ""

# Get all orders with null fulfillment_type
ORDERS=$(curl -s \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  "${URL}/orders?select=id,fulfillment_method&fulfillment_type=is.null")

# Update each order
echo "$ORDERS" | jq -c '.[]' | while read -r order; do
  ID=$(echo "$order" | jq -r '.id')
  FULFILLMENT_METHOD=$(echo "$order" | jq -r '.fulfillment_method')

  if [ "$FULFILLMENT_METHOD" != "null" ] && [ -n "$FULFILLMENT_METHOD" ]; then
    echo "   Updating order $ID: fulfillment_type = $FULFILLMENT_METHOD"

    curl -s -X PATCH \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"fulfillment_type\": \"$FULFILLMENT_METHOD\"}" \
      "${URL}/orders?id=eq.${ID}" > /dev/null
  fi
done

echo ""
echo "========================================"
echo "✅ SYNC COMPLETE!"
echo "========================================"
echo ""

# Verify the update
echo "📊 Verification - checking if any null fulfillment_type remain..."
NEW_COUNT=$(curl -s \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Prefer: count=exact" \
  "${URL}/orders?select=count&fulfillment_type=is.null" | jq '.[].count')

echo "   Remaining orders with null fulfillment_type: $NEW_COUNT"
echo ""

if [ "$NEW_COUNT" -eq 0 ]; then
  echo "🎉 All orders successfully synced!"
else
  echo "⚠️  $NEW_COUNT orders still have null fulfillment_type"
fi
