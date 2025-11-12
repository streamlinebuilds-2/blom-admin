#!/bin/bash

# Query orders with all requested fields

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI"
URL="https://yvmnedjybrpvlupygusf.supabase.co/rest/v1"

echo "🔍 QUERYING ORDERS TABLE"
echo "========================================"
echo ""

curl -s \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  "${URL}/orders?select=id,order_number,m_payment_id,buyer_name,customer_name,status,fulfillment_type,created_at,total,payment_status,buyer_email&order=created_at.desc&limit=10" | jq '.'

echo ""
echo "========================================"
