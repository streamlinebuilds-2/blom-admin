#!/bin/bash

# Fix sign-up coupons in the database
# This script updates all BLOM####-XXXXXX coupons to have:
# - type: 'percentage'
# - value: 10
# - max_uses: 1

echo "Fixing sign-up coupons in database..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run the migration
npx supabase db execute --file db/migrations/fix_signup_coupons.sql

echo "Done! Check the output above for results."
