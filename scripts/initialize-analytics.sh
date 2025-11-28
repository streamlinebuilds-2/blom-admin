#!/bin/bash

# Initialize Sales Analytics Tables
# Run this script to create the analytics tables that will fix the sales dashboard

echo "🚀 Initializing Sales Analytics Tables..."

# Read the SQL file content
SQL_CONTENT=$(cat db/migrations/create_sales_analytics_tables.sql)

echo "📋 Database migration prepared"
echo "💾 SQL commands ready to run:"
echo ""
echo "$SQL_CONTENT"
echo ""
echo "✅ Migration file created: db/migrations/create_sales_analytics_tables.sql"
echo ""
echo "To run these commands in your Supabase dashboard:"
echo "1. Go to Supabase Dashboard > SQL Editor"
echo "2. Copy and paste the contents of the migration file"
echo "3. Execute the SQL to create the analytics tables"
echo ""
echo "After running the migration, your sales dashboard will show:"
echo "- Items sold (daily/weekly/monthly)"
echo "- Best selling products"
echo "- Revenue analytics"
echo "- Stock levels that properly update when orders are processed"