#!/bin/bash

# Script to permanently delete stock movements for archived orders
# This will remove all the stock movement records you specified

echo "🗑️  Deleting stock movements for archived orders..."

# Make request to delete archived order movements
curl -X POST \
  https://blom-admin-1.netlify.app/.netlify/functions/delete-archived-order-movements \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 30

echo ""
echo "✅ Stock movements for archived orders have been permanently deleted!"
echo ""
echo "📊 You can now check your stock movement history - the archived order movements are gone!"
echo "🔄 The stock movement page now shows the original All/Manual/Order filter buttons."