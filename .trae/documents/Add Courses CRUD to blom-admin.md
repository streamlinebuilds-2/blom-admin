## Compatibility (Backend ↔ Frontend)
- We keep the `courses` table exactly per admin spec (`image_url`, `duration` TEXT, `level` TEXT, `price`, `slug`, `is_active`, etc.).
- Online vs in-person categorization will be derived in the frontend using a predictable convention that the admin already controls:
  - Primary rule: `slug` prefix (recommended):
    - Online Workshops: `slug` starts with `online-`
    - In-Person Training: everything else
  - Fallback rule: `duration` text contains `online` (case-insensitive) if you prefer not to enforce slug prefixes.

## 1) Database SQL (provide only, no execution)
- Create `courses` table with the required fields.
- Enable RLS on `courses`.
- RLS policies:
  - Public read: allow `SELECT` only when `is_active = true`.
  - Writes: handled via service-role Netlify functions (no need to open write access broadly).
- Storage:
  - Create bucket `course-images` with public read.
  - Policies:
    - Public read objects in `course-images`.
    - Authenticated users can upload objects to `course-images`.

## 2) Data Layer (mirror Products patterns)
- Update [supabaseAdapter.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/components/data/supabaseAdapter.jsx) to add:
  - `listCourses()` (select from `courses`, order by `created_at desc`).
  - `getCourse(id)` (single by `id`).
  - `upsertCourse(course)` (POST to `/.netlify/functions/save-course`).
- Update [mockAdapter.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/components/data/mockAdapter.jsx) to include a mock `courses` dataset + `listCourses/getCourse/upsertCourse` so local fallback works.

## 3) Netlify Functions (server-side writes, consistent with existing write-guard)
- Add `netlify/functions/save-course.ts`:
  - POST only.
  - Validate required: `title`, `slug`.
  - Insert/update row in `courses` (including `image_url`, `duration`, `level`, `is_active`, `price`).
- Add `netlify/functions/delete-course.ts`:
  - POST only.
  - Delete from `courses` by `id`.

## 4) Admin UI Pages
### Courses list
- Create [Courses.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/pages/Courses.jsx):
  - Match [Products.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/pages/Products.jsx) layout/styling patterns.
  - Fetch via `api.listCourses()` using react-query.
  - Actions: Edit (to `/courses/{id}`), Delete (confirm dialog → `delete-course` function).
  - “New Course” CTA to `/courses/new`.

### Course edit/create
- Create [CourseEdit.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/pages/CourseEdit.jsx):
  - One page handles both create and edit:
    - `id === 'new'` → create mode
    - otherwise → load by id
  - Form fields (exactly per requirements): Title, Slug (auto from title but editable), Description, Price, Duration, Level, Active toggle, Image uploader.
  - Image uploader:
    - Upload to Supabase Storage bucket `course-images`.
    - Save the resulting public URL into `courses.image_url`.

## 5) Routing
- Update [App.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/App.jsx):
  - Add explicit canonical routes:
    - `/courses` → list
    - `/courses/:id` → edit/create (supports `/courses/new`)
  - Add `courses` to the skip list for dynamic pages routing.

## 6) Navigation
- Update [Layout.jsx](file:///c:/Users/User/Desktop/Blom%20Cosmetics/Blom-Admin-Trae/blom-admin/src/Layout.jsx):
  - Add a “Courses” item in the same group/placement style as Products.

## 7) Verification
- Confirm:
  - Courses list loads.
  - Create/edit saves via Netlify functions.
  - Delete works with confirmation.
  - Image uploads to `course-images` and persists URL.
  - Frontend can categorize using `slug` prefix convention (`online-`).
