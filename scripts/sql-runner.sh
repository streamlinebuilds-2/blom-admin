#!/bin/bash

# Supabase SQL Query Runner
# Usage: ./sql-runner.sh "SELECT * FROM products LIMIT 5"

SUPABASE_URL="https://yvmnedjybrpvlupygusf.supabase.co"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDk2NDMsImV4cCI6MjA3NDE4NTY0M30.jyT8CC7oRMCg4vnMVmeRc0lZ_Ct7VANuRIfx20qx8aE"

if [ -z "$1" ]; then
  echo "Usage: $0 <table> <select> [filters]"
  echo ""
  echo "Examples:"
  echo "  $0 products 'id,name,price' '&limit=5'"
  echo "  $0 orders '*' '&status=eq.paid'"
  echo ""
  exit 1
fi

TABLE=$1
SELECT=${2:-"*"}
FILTERS=${3:-""}

echo "🔍 Querying: $TABLE"
echo "   Select: $SELECT"
echo "   Filters: $FILTERS"
echo ""

curl -s \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY" \
  "$SUPABASE_URL/rest/v1/$TABLE?select=$SELECT$FILTERS" | jq '.'

echo ""
