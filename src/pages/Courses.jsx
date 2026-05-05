import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import { api } from "../components/data/api";
import { useToast } from "../components/ui/ToastProvider";
import { ConfirmDialog } from "../components/ui/dialog";
import { dateShort, moneyZAR } from "../components/formatUtils";

export default function Courses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, course: null });
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      if (!api?.listCourses) return [];
      return await api.listCourses();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter((c) => {
      const title = String(c.title || "").toLowerCase();
      const slug = String(c.slug || "").toLowerCase();
      return title.includes(term) || slug.includes(term);
    });
  }, [courses, searchTerm]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch("/.netlify/functions/delete-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to delete course");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      showToast("success", "Course deleted successfully");
    },
    onError: (error) => {
      showToast("error", error.message || "Failed to delete course");
    },
  });

  const handleDelete = (course) => {
    setConfirmDialog({ isOpen: true, course });
  };

  const confirmDelete = () => {
    if (!confirmDialog.course?.id) return;
    deleteMutation.mutate(confirmDialog.course.id);
  };

  return (
    <>
      <style>{`
        .products-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .products-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
        }

        .header-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          width: 240px;
          max-width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border-radius: 12px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 14px;
          box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light);
        }

        .search-input:focus {
          outline: none;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .btn-primary {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
        }

        .products-table {
          background: var(--card);
          border-radius: 20px;
          padding: 0;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          overflow: hidden;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 20px 24px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border);
          background: var(--card);
        }

        td {
          padding: 20px 24px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr {
          transition: all 0.2s ease;
        }

        tbody tr:hover {
          background: rgba(110, 193, 255, 0.05);
        }

        .product-name {
          font-weight: 600;
        }

        .product-sku {
          font-size: 12px;
          color: var(--text-muted);
        }

        .status-badge {
          display: inline-flex;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .status-active {
          background: #10b98120;
          color: #10b981;
        }

        .status-archived {
          background: #6b728020;
          color: #6b7280;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          min-width: 44px;
          min-height: 44px;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .btn-icon:hover {
          color: var(--accent);
        }

        .btn-icon:active {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }

        .btn-icon-danger:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
        }

        .btn-icon-danger:active {
          background: rgba(239, 68, 68, 0.2);
          border-color: #dc2626;
        }

        .price-cell {
          font-weight: 600;
        }

        .empty-state {
          padding: 80px 20px;
          text-align: center;
          color: var(--text-muted);
        }

        .empty-state-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
        }

        @media (max-width: 768px) {
          .products-header {
            flex-direction: column;
            align-items: stretch;
            margin-bottom: 16px;
            gap: 8px;
          }

          .header-actions {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .search-box {
            width: 100%;
            max-width: 100%;
          }

          .search-input {
            padding: 10px 14px 10px 40px;
            font-size: 16px;
          }
        }
      `}</style>

      <div className="products-header">
        <h1 className="products-title">Courses</h1>
        <div className="header-actions">
          <div className="search-box">
            <Search className="search-icon w-5 h-5" />
            <input
              type="text"
              className="search-input"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Link to="/courses/new" className="btn-primary">
            <Plus className="w-5 h-5" />
            New Course
          </Link>
        </div>
      </div>

      <div className="products-table">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Status</th>
                <th>Type</th>
                <th>Price</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Loading courses...
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    <div className="empty-state-title">No courses found</div>
                    <div>{searchTerm ? "Try adjusting your search" : "Create your first course to get started"}</div>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => {
                  const isActive = course.is_active !== false;
                  const statusClass = isActive ? "active" : "archived";
                  const courseType = course.course_type === "online" ? "online" : "in-person";
                  const priceCents =
                    course.price == null || course.price === ""
                      ? null
                      : Math.round(Number(course.price) * 100);

                  return (
                    <tr key={course.id}>
                      <td>
                        <div className="product-name">{course.title}</div>
                        {course.slug && <div className="product-sku">Slug: {course.slug}</div>}
                      </td>
                      <td>
                        <span className={`status-badge status-${statusClass}`}>
                          {isActive ? "active" : "inactive"}
                        </span>
                      </td>
                      <td>{courseType === "online" ? "Online" : "In-Person"}</td>
                      <td className="price-cell">{priceCents == null ? "—" : moneyZAR(priceCents)}</td>
                      <td>{dateShort(course.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <Link to={`/courses/${course.id}`}>
                            <button className="btn-icon" type="button">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </Link>
                          <button
                            className="btn-icon btn-icon-danger"
                            type="button"
                            onClick={() => handleDelete(course)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, course: null })}
        onConfirm={confirmDelete}
        title="Delete Course"
        description={
          confirmDialog.course?.title
            ? `Permanently delete "${confirmDialog.course.title}"? This action cannot be undone and will remove the course from Supabase completely.`
            : "Permanently delete this course? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
