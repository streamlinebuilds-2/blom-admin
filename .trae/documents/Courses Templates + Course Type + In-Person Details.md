## Updated Requirements (Incorporating Your Note)
- Admin must NOT manage instructor fields at all.
- Keep `instructor_name` / `instructor_bio` columns in Supabase for compatibility, but do not read/write them in Admin.
- Admin must support editing:
  - `course_type`
  - `deposit_amount`
  - `available_dates`
  - `packages` (name, price, kit_value, popular, features[])
  - `key_details`
- Templates must NOT prefill instructor info.

## Current State (What Exists Already)
- Course Type select exists in [CourseEdit.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/pages/CourseEdit.jsx).
- Start-from-template dropdown exists (create-only), but templates currently only set the basic fields and do not include in-person JSON fields.
- Backend `save-course.ts` and adapters do not yet accept/store the in-person fields.
- SQL script currently DROPS instructor columns (needs to change).

## Database (SQL) Work
Update [SUPABASE_COURSES_SETUP.sql](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/SUPABASE_COURSES_SETUP.sql) to be idempotent and compatible:
- Keep/ensure these columns exist (compat only):
  - `instructor_name` (text)
  - `instructor_bio` (text)
  - Do NOT enforce NOT NULL in this repo/script.
- Add the in-person editable columns:
  - `deposit_amount numeric(10,2)`
  - `available_dates jsonb`
  - `packages jsonb`
  - `key_details jsonb`
- Remove the existing statements that drop instructor columns.

## Netlify Function (Writes): `save-course.ts`
Update [save-course.ts](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/netlify/functions/save-course.ts) to:
- Accept and store the new fields:
  - `deposit_amount`, `available_dates`, `packages`, `key_details`
- Validate:
  - `title` required
  - `slug` required
  - `course_type` must be `online` or `in-person`
  - If `course_type === 'in-person'`:
    - `deposit_amount` required and > 0
    - `available_dates` required and non-empty string array
    - `packages` required and non-empty array
    - each package must include: `name` (string), `price` (number), `features` (string[])
    - `kit_value` optional number (but stored if provided)
    - `popular` optional boolean (default false)
  - If `course_type === 'online'`: allow those fields to be null/empty.
- Explicitly do NOT read/write instructor fields.

## Admin Data Adapter Updates
Update adapters to send/read only the supported editable fields:
- [supabaseAdapter.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/components/data/supabaseAdapter.jsx)
  - Extend `upsertCourse()` payload with `deposit_amount`, `available_dates`, `packages`, `key_details`.
  - Do not include instructor fields.
- [mockAdapter.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/components/data/mockAdapter.jsx)
  - Persist those new fields in mock create/update so local testing behaves consistently.

## Admin UI Updates: Course Create/Edit
Update [CourseEdit.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/pages/CourseEdit.jsx)
- Extend `initialFormState` + edit-load mapping to include:
  - `deposit_amount` (string in inputs; normalized on save)
  - `available_dates` (string[])
  - `packages` (array of objects)
  - `key_details` (string[])
- Add an “In-Person Details” section shown only when `course_type === 'in-person'`:
  - Deposit amount input
  - Available dates editor (add/remove date strings)
  - Packages editor (add/remove packages; each package has name, price, kit_value, popular, features editor)
  - Key details editor (optional bullet strings)
- Add client-side validation consistent with the server:
  - For in-person courses, block save if deposit/dates/packages missing.
- Keep the existing styling/classes/components (same neumorphic inputs/buttons).

## Templates (Re-check and Update)
In [CourseEdit.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/pages/CourseEdit.jsx) `COURSE_TEMPLATES`:
- Ensure templates prefill ONLY:
  - `course_type`, `template_key`, `title`, `slug`, `description`, `price`, `image_url`, `duration`, `level`, `is_active`
- For **Professional Acrylic Training** (in-person) also prefill:
  - `deposit_amount`, `available_dates`, `packages`, `key_details`
- For the two online templates:
  - do not prefill in-person fields (leave empty/null)
- No instructor fields included in any template.

## Courses List Page
- Confirm [Courses.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/pages/Courses.jsx) already has a “Type” column; adjust only if needed (no layout changes).

## Verification
- Run `npm run build` to confirm no TypeScript/JS errors.
- Manual checks:
  - Create new course from in-person template → verify deposit/dates/packages/key_details auto-fill.
  - Save in-person course → verify validation works and DB stores JSON correctly.
  - Create online template course → verify in-person fields are not required.
  - Edit an existing in-person course → verify all nested editors persist.

If you confirm, I’ll implement these updates, run build, and commit/push.