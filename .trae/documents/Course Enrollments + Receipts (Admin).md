## What Will Work (and What We’ll Keep)
- **No new invoice/receipt type**: we’ll keep using the existing invoice PDF system and link to `orders.invoice_url`.
- **Courses are still purchased via `orders` + `order_items`**: the new admin feature will read from `course_purchases` only.
- **Admin reads via Netlify functions (service role)**: the new enrollments endpoint will follow the existing `admin-*` function pattern already in this repo.
- **UI option chosen**: **Option A — New top-level page “Course Bookings”** (simplest, doesn’t touch CourseEdit).

## Database (STORE Supabase) — Migrations to Ensure
I will add a migration SQL file (in existing `db/migrations/`) containing idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` statements for `course_purchases`, plus a safe update for `orders.fulfillment_method` to allow `digital`.
- **Allow `digital` fulfillment**
  - Add/replace a check constraint (best-effort with `DROP CONSTRAINT IF EXISTS ...`) so `fulfillment_method` includes `digital`.
- **Extend `course_purchases`**
  - `course_title text`
  - `course_type text`
  - `selected_package text`
  - `selected_date text`
  - `amount_paid_cents int`
  - `payment_kind text` (`full` | `deposit`)
  - `details jsonb`

Notes:
- Admin will **not** write to these fields; it only reads.
- Because this repo’s Netlify `exec_sql` RPC helper isn’t installed in your DB, these migrations will still be run in Supabase SQL editor (or your normal migration process). The repo will just keep the migration script for tracking.

## Netlify Function (Admin READ): `admin-course-purchases.ts`
Add a new GET endpoint under `netlify/functions/`.
- **Method**: `GET`
- **Auth**: match existing `admin-*` pattern in this repo (no new auth mechanism; same CORS/headers style).
- **DB access**: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- **Pagination**: `page`, `pageSize` (defaults like other admin endpoints)
- **Filters** (query params):
  - `course_slug`
  - `buyer_email`
  - `invitation_status`
  - date range: `created_from`, `created_to`, and optionally `invited_from`, `invited_to` (using `created_at` / `invited_at`)
- **Response**:
  ```ts
  {
    items: CoursePurchaseRow[],
    total: number,
    page: number,
    pageSize: number
  }
  ```
- **Optional receipt link**: include `invoice_url` by fetching `orders.invoice_url` for returned `order_id`s and merging in-memory (no DB secrets; no full `details` by default).

## Admin Data Adapter
Update the admin data layer to call the new function and expose:
- `listCoursePurchases(filters)`
- `listCoursePurchasesByCourse(course_slug)`

Implementation detail:
- Use `fetch('/.netlify/functions/admin-course-purchases?...')` (not direct client-side Supabase reads) to align with your constraint.
- Add a mock adapter stub returning `[]` for local fallback.

## Admin UI (New “Course Bookings” Page)
Add a new page that reuses the same styling approach as existing list pages (inline `<style>` blocks and existing table layout patterns).
- **Route**: `/course-bookings`
- **Sidebar**: add a nav item “Course Bookings” (no layout rewrite).
- **Table columns**:
  - Course (title + slug)
  - Type (online/in-person)
  - Customer (name, email, phone)
  - Package
  - Date/Access
  - Payment (ZAR formatting from `amount_paid_cents`, plus `payment_kind`)
  - Status (`invitation_status`)
  - Created / Invited timestamps
- **Actions**:
  - Copy email
  - View Receipt (opens `invoice_url` when present)

## Verification Checklist (How We’ll Confirm It Works)
- Confirm STORE DB has `course_purchases` rows being created after payment confirmation (outside admin).
- Hit the endpoint directly:
  - `/.netlify/functions/admin-course-purchases?page=1&pageSize=20`
  - Test filters: `course_slug=...`, `buyer_email=...`
- Open Admin UI:
  - Course Bookings page loads
  - Filters work
  - Receipt link opens the existing invoice PDF via `orders.invoice_url`

## Files That Will Be Touched (No folder structure changes)
- Add: `netlify/functions/admin-course-purchases.ts`
- Update: `src/components/data/supabaseAdapter.jsx`
- Update: `src/components/data/mockAdapter.jsx`
- Add: `src/pages/CourseBookings.jsx`
- Update: `src/App.jsx` (route)
- Update: `src/Layout.jsx` (sidebar nav item)
- Add: `db/migrations/<new_course_purchases_migration>.sql`

If you confirm this plan, I’ll implement it exactly within these constraints.