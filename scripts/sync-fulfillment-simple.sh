#!/bin/bash

# Simple bulk update: Copy fulfillment_method to fulfillment_type

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI"
URL="https://yvmnedjybrpvlupygusf.supabase.co/rest/v1"

echo "🔄 SYNCING FULFILLMENT_TYPE FROM FULFILLMENT_METHOD"
echo "========================================"
echo ""

# Get all orders that need updating
echo "📊 Fetching orders with null fulfillment_type..."
ORDERS=$(curl -s \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  "${URL}/orders?select=id,fulfillment_method&fulfillment_type=is.null&limit=100")

COUNT=$(echo "$ORDERS" | jq '. | length')
echo "   Found $COUNT orders to update"
echo ""

if [ "$COUNT" -eq 0 ]; then
  echo "✅ No orders need updating!"
  exit 0
fi

echo "🔧 Updating orders one by one..."
UPDATED=0

echo "$ORDERS" | jq -c '.[]' | while read -r order; do
  ID=$(echo "$order" | jq -r '.id')
  METHOD=$(echo "$order" | jq -r '.fulfillment_method // empty')

  if [ -n "$METHOD" ] && [ "$METHOD" != "null" ]; then
    echo "   Updating $ID: setting fulfillment_type = '$METHOD'"

    RESULT=$(curl -s -X PATCH \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "{\"fulfillment_type\": \"${METHOD}\"}" \
      "${URL}/orders?id=eq.${ID}")

    UPDATED=$((UPDATED + 1))
  else
    echo "   Skipping $ID: no fulfillment_method"
  fi
done

echo ""
echo "========================================"
echo "✅ Updated $UPDATED orders!"
echo "========================================"
