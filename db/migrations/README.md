# Database Migrations

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and run the SQL

### Option 2: Supabase CLI
```bash
supabase db push
```

## Current Migrations

### `add_updated_at_to_product_reviews.sql`
**Purpose**: Adds `updated_at` column to `product_reviews` table

**Why needed**: The database has a trigger that expects `updated_at` to exist, but the original schema didn't include it. This was causing 500 errors when approving/rejecting reviews.

**What it does**:
- Adds `updated_at` timestamptz column with default value of `now()`
- Creates a trigger function to automatically update `updated_at` on any UPDATE
- Creates a trigger on `product_reviews` table to call this function

**To apply**: Run this SQL in your Supabase SQL Editor

---

## Troubleshooting

If you get permission errors, make sure you're using a user with sufficient privileges or run as the postgres user.
