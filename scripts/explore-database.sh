#!/bin/bash

# Supabase Database Explorer Script
# This script uses curl to query your Supabase database

SUPABASE_URL="https://yvmnedjybrpvlupygusf.supabase.co"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDk2NDMsImV4cCI6MjA3NDE4NTY0M30.jyT8CC7oRMCg4vnMVmeRc0lZ_Ct7VANuRIfx20qx8aE"

echo "🚀 SUPABASE DATABASE EXPLORER"
echo "=" | tr -d '\n' && printf '%.0s=' {1..60} && echo ""
echo "📡 Project: yvmnedjybrpvlupygusf"
echo "=" | tr -d '\n' && printf '%.0s=' {1..60} && echo ""
echo ""

# Function to query Supabase
query() {
  local table=$1
  local select=$2
  local extra=$3

  curl -s \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY" \
    "$SUPABASE_URL/rest/v1/$table?select=$select$extra"
}

# Function to count records
count_table() {
  local table=$1
  curl -s \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Prefer: count=exact" \
    "$SUPABASE_URL/rest/v1/$table?select=count" | jq -r '.[].count // 0'
}

echo "📊 TABLE RECORD COUNTS:"
echo ""

tables=("products" "orders" "order_items" "bundles" "bundle_items" "product_reviews" "payments" "stock_movements" "restocks" "operating_costs")

for table in "${tables[@]}"; do
  count=$(count_table "$table" 2>/dev/null || echo "0")
  printf "   %-25s %s records\n" "$table:" "$count"
done

echo ""
echo "📦 SAMPLE PRODUCTS (First 5):"
echo ""
query "products" "id,name,slug,status,price,stock" "&limit=5" | jq -r '.[] | "   • \(.name) (\(.slug))\n     Status: \(.status) | Price: R\(.price // "N/A") | Stock: \(.stock // 0)"'

echo ""
echo "🛒 RECENT ORDERS (First 5):"
echo ""
query "orders" "id,m_payment_id,status,total,buyer_name,created_at" "&order=created_at.desc&limit=5" | jq -r '.[] | "   • Order \(.m_payment_id // .id)\n     Customer: \(.buyer_name // "N/A") | Total: R\(.total // "N/A") | Status: \(.status)"'

echo ""
echo "⭐ PRODUCT REVIEWS:"
echo ""
query "product_reviews" "id,reviewer_name,rating,status,created_at" "&limit=5" | jq -r '.[] | "   • \(.reviewer_name) - \(.rating)★ (\(.status))"'

echo ""
echo "=" | tr -d '\n' && printf '%.0s=' {1..60} && echo ""
echo "✅ EXPLORATION COMPLETE"
echo "=" | tr -d '\n' && printf '%.0s=' {1..60} && echo ""
