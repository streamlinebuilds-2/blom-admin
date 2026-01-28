import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { useToast } from "../components/ui/ToastProvider";
import { api } from "../components/data/api";
import { supabase } from "@/lib/supabase";

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const COURSE_TEMPLATES = [
  {
    label: "Professional Acrylic Training",
    template_key: "professional-acrylic-training",
    title: "Professional Acrylic Training",
    slug: "professional-acrylic-training",
    description:
      "Master the art of acrylic nail application with hands-on training in Randfontein. Master prep, application, structure & finishing in 5 days.",
    price: "7200.00",
    compare_at_price: "",
    image_url: "/professional-acrylic-training-hero.webp",
    duration: "5 Days",
    level: "Beginner to Intermediate",
    course_type: "in-person",
    is_active: true,
  },
  {
    label: "Online Watercolour Workshop",
    template_key: "online-watercolour-workshop",
    title: "Online Watercolour Workshop",
    slug: "online-watercolour-workshop",
    description: "Learn how to create soft, dreamy watercolour designs from the comfort of your home.",
    price: "480.00",
    compare_at_price: "",
    image_url: "/online-watercolor-card.webp",
    duration: "Self-Paced",
    level: "All Levels",
    course_type: "online",
    is_active: true,
  },
  {
    label: "Christmas Watercolor Workshop",
    template_key: "christmas-watercolor-workshop",
    title: "Christmas Watercolor Workshop",
    slug: "christmas-watercolor-workshop",
    description:
      "Paint festive watercolor nail art for the holidays! Learn Christmas tree designs, snowflakes, and winter wonderland techniques.",
    price: "450.00",
    compare_at_price: "",
    image_url: "/christmas-watercolor-card.webp",
    duration: "Self-Paced",
    level: "All Levels",
    course_type: "online",
    is_active: true,
  },
];

const initialFormState = {
  template_key: "",
  title: "",
  slug: "",
  description: "",
  price: "",
  compare_at_price: "",
  duration: "",
  level: "",
  course_type: "in-person",
  is_active: true,
  image_url: "",
};

export default function CourseEdit() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(initialFormState);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCourse() {
      if (isNew) {
        setLoading(false);
        return;
      }
      if (!api?.getCourse) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const course = await api.getCourse(id);
        if (!isMounted) return;
        if (!course) {
          showToast("error", "Course not found");
          setLoading(false);
          return;
        }
        setForm({
          id: course.id,
          template_key: course.template_key || "",
          title: course.title || "",
          slug: course.slug || "",
          description: course.description || "",
          price: course.price != null ? String(course.price) : "",
          compare_at_price: course.compare_at_price != null ? String(course.compare_at_price) : "",
          duration: course.duration || "",
          level: course.level || "",
          course_type: course.course_type || "in-person",
          is_active: course.is_active !== false,
          image_url: course.image_url || "",
        });
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load course:", error);
        showToast("error", "Failed to load course");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCourse();
    return () => {
      isMounted = false;
    };
  }, [id, isNew, showToast]);

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTitleChange = (value) => {
    update("title", value);
    if (!slugTouched) {
      update("slug", slugify(value));
    }
  };

  const canUpload = useMemo(() => {
    return Boolean(form.slug && form.slug.trim());
  }, [form.slug]);

  const uploadCourseImage = async (file) => {
    if (!supabase) throw new Error("Supabase client not configured");
    if (!file) throw new Error("No file selected");
    if (!canUpload) throw new Error("Please set a slug before uploading");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${form.slug}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from("course-images").upload(path, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });
    if (error) throw error;

    const { data } = supabase.storage.from("course-images").getPublicUrl(path);
    if (!data?.publicUrl) throw new Error("Failed to generate public URL");
    return data.publicUrl;
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      setServerError("");
      showToast("info", "Uploading image...");
      const url = await uploadCourseImage(file);
      update("image_url", url);
      showToast("success", "Image uploaded");
    } catch (err) {
      showToast("error", err?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const title = String(form.title || "").trim();
    const slug = String(form.slug || "").trim();
    const courseType = String(form.course_type || "").trim();
    if (!title) {
      setServerError("Title is required");
      return;
    }
    if (!slug) {
      setServerError("Slug is required");
      return;
    }
    if (courseType !== "online" && courseType !== "in-person") {
      setServerError("Course Type is required");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: isNew ? undefined : form.id,
        title,
        slug,
        description: form.description,
        price: form.price,
        compare_at_price: form.compare_at_price,
        duration: form.duration,
        level: form.level,
        is_active: form.is_active,
        image_url: form.image_url,
        course_type: courseType,
        template_key: form.template_key || null,
      };

      if (!api?.upsertCourse) {
        throw new Error("Courses API not available");
      }

      await api.upsertCourse(payload);
      showToast("success", isNew ? "Course created" : "Course updated");
      navigate("/courses");
    } catch (err) {
      setServerError(err?.message || "Failed to save course");
      showToast("error", err?.message || "Failed to save course");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div
          style={{
            width: "32px",
            height: "32px",
            border: "4px solid var(--card)",
            borderTopColor: "var(--accent)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        ></div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .topbar {
          padding: 24px 32px;
          border-bottom: 2px solid var(--border);
          background: var(--card);
          margin-bottom: 24px;
        }
        .content-area {
          padding: 0 32px 32px;
          overflow-y: auto;
        }
        .product-form-input, .product-form-textarea {
          width: 100%;
          padding: 14px 18px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 15px;
          font-family: inherit;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
          transition: box-shadow .2s;
        }
        .product-form-input:focus, .product-form-textarea:focus {
          outline: none;
          box-shadow: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light);
        }
        .product-form-textarea {
          min-height: 120px;
          resize: vertical;
        }
        .product-form-section {
          background: var(--card);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          margin-bottom: 24px;
        }
        .product-form-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: .05em;
        }
        .product-btn-primary {
          padding: 12px 28px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          transition: transform 0.2s;
        }
        .product-btn-primary:disabled {
          opacity: .6;
          cursor: not-allowed;
        }
        .product-btn-primary:not(:disabled):hover {
          transform: translateY(-2px);
        }
        .product-btn-secondary {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
        }
        .product-btn-secondary:hover {
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }
        .upload-btn {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 3px 3px 6px var(--shadow-dark);
        }
        .image-preview {
          margin-top: 12px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--bg);
          width: 180px;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>

      <div className="topbar">
        <button
          type="button"
          className="product-btn-secondary"
          onClick={() => navigate("/courses")}
          disabled={isSubmitting}
        >
          <span className="inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </span>
        </button>
      </div>

      <div className="content-area">
        <form onSubmit={handleSubmit}>
          <section className="product-form-section">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isNew ? (
                <div className="md:col-span-2">
                  <label className="product-form-label" htmlFor="template_key">
                    Start from Template
                  </label>
                  <select
                    id="template_key"
                    className="product-form-input"
                    value={form.template_key}
                    onChange={(e) => {
                      const key = e.target.value;
                      if (!key) {
                        update("template_key", "");
                        return;
                      }
                      const template = COURSE_TEMPLATES.find((t) => t.template_key === key);
                      if (!template) return;
                      setSlugTouched(true);
                      setForm((prev) => ({
                        ...prev,
                        template_key: template.template_key,
                        title: template.title,
                        slug: template.slug,
                        description: template.description,
                        price: template.price,
                        compare_at_price: template.compare_at_price,
                        image_url: template.image_url,
                        duration: template.duration,
                        level: template.level,
                        is_active: template.is_active,
                        course_type: template.course_type,
                      }));
                    }}
                  >
                    <option value="">None</option>
                    {COURSE_TEMPLATES.map((t) => (
                      <option key={t.template_key} value={t.template_key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="product-form-label" htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  className="product-form-input"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Course title"
                />
              </div>

              <div>
                <label className="product-form-label" htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  id="slug"
                  className="product-form-input"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("slug", slugify(e.target.value));
                  }}
                  placeholder="online-acrylic-workshop"
                />
              </div>

              <div className="md:col-span-2">
                <label className="product-form-label" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  className="product-form-textarea"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Course description"
                />
              </div>
            </div>
          </section>

          <section className="product-form-section">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div>
                <label className="product-form-label" htmlFor="price">
                  Price
                </label>
                <input
                  id="price"
                  type="number"
                  step="0.01"
                  className="product-form-input"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="product-form-label" htmlFor="compare_at_price">
                  Compare at Price
                </label>
                <input
                  id="compare_at_price"
                  type="number"
                  step="0.01"
                  className="product-form-input"
                  value={form.compare_at_price}
                  onChange={(e) => update("compare_at_price", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="product-form-label" htmlFor="duration">
                  Duration
                </label>
                <input
                  id="duration"
                  className="product-form-input"
                  value={form.duration}
                  onChange={(e) => update("duration", e.target.value)}
                  placeholder="Online • 8 hours"
                />
              </div>

              <div>
                <label className="product-form-label" htmlFor="level">
                  Level
                </label>
                <input
                  id="level"
                  className="product-form-input"
                  value={form.level}
                  onChange={(e) => update("level", e.target.value)}
                  placeholder="Beginner"
                />
              </div>

              <div>
                <label className="product-form-label" htmlFor="course_type">
                  Course Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="course_type"
                  className="product-form-input"
                  value={form.course_type}
                  onChange={(e) => update("course_type", e.target.value)}
                >
                  <option value="online">Online</option>
                  <option value="in-person">In-Person</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center gap-3 text-sm font-medium text-[var(--text)]" htmlFor="is_active">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => update("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--card)]"
                />
                Active
              </label>
            </div>
          </section>

          <section className="product-form-section">
            <div className="flex flex-col gap-3">
              <div>
                <label className="product-form-label">Image</label>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="upload-btn">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Upload Image"}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading || !canUpload}
                      onChange={(e) => handleImageFile(e.target.files?.[0])}
                      style={{ display: "none" }}
                    />
                  </label>
                  {!canUpload && (
                    <div className="text-sm text-[var(--text-muted)]">Set a slug before uploading</div>
                  )}
                </div>
              </div>

              {form.image_url ? (
                <div>
                  <div className="text-sm text-[var(--text-muted)] break-all">{form.image_url}</div>
                  <div className="image-preview">
                    <img src={form.image_url} alt={form.title || "Course image"} />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {serverError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 mb-6">
              {serverError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="product-btn-secondary"
              onClick={() => navigate("/courses")}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="product-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isNew ? "Create Course" : "Update Course"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
