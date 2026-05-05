#!/bin/bash

# Check orders table schema

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI"
URL="https://yvmnedjybrpvlupygusf.supabase.co/rest/v1"

echo "🔍 CHECKING ORDERS TABLE COLUMNS"
echo "========================================"
echo ""

# Get one order to see all columns
curl -s \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  "${URL}/orders?limit=1" | jq '.[0] | keys | sort'

echo ""
echo "========================================"
echo ""
echo "🔍 SAMPLE ORDER DATA:"
echo ""

curl -s \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  "${URL}/orders?limit=1" | jq '.[0]'
