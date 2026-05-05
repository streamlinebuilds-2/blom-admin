#!/bin/bash

# Test Service Role Key Access

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI"
URL="https://yvmnedjybrpvlupygusf.supabase.co/rest/v1"

echo "🔥 TESTING SERVICE ROLE KEY"
echo "=========================================="
echo ""

echo "✅ Test 1: Reading products with SERVICE ROLE KEY"
curl -s \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  "${URL}/products?select=id,name,status&limit=5" | jq '.'

echo ""
echo "✅ Test 2: Reading orders (bypassing RLS)"
curl -s \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  "${URL}/orders?select=id,status&limit=3" | jq '.'

echo ""
echo "=========================================="
echo "✅ SERVICE ROLE KEY IS WORKING!"
echo "=========================================="
