import React, { useState } from "react";
import { ArrowLeft, Save, Plus, X, Monitor, Smartphone } from "lucide-react";
import { moneyZAR } from "./formatUtils";
import { slugify } from "./helpers";
import PriceDropdown from "./PriceDropdown";
import { useActiveSpecials } from "./hooks/useActiveSpecials";
import { discountLabel } from "./helpers/pricing";
import { useWebhookSender } from "./webhooks/useWebhookSender";
import { uploadToCloudinary, cld } from "@/lib/cloudinary";

export default function ProductEditor({ product, onSave, onCancel, isSaving, title }) {
  const [formData, setFormData] = useState(product);
  const [previewTab, setPreviewTab] = useState("card");
  const [viewMode, setViewMode] = useState("desktop");
  const categoryOptions = [
    { label: "Prep & Finishing", slug: "prep-finishing" },
    { label: "Gel System", slug: "gel-system" },
    { label: "Tools & Essentials", slug: "tools-essentials" },
    { label: "Acrylic System", slug: "acrylic-system" },
    { label: "Furniture", slug: "furniture" },
    { label: "Archived", slug: "archived" },
    { label: "Coming Soon", slug: "coming-soon" },
  ];
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  const { getDisplayPriceCents } = useActiveSpecials();

  const webhookData = formData.name ? {
    id: formData.id || formData.slug,
    name: formData.name,
    slug: formData.slug,
    status: formData.status,
    price_cents: formData.price,
    compare_at_price_cents: formData.compare_at_price,
    stock_qty: formData.stock,
    short_description: formData.short_description,
    long_description: formData.long_description,
    features: formData.features,
    how_to_use: formData.how_to_use,
    ingredients_inci: formData.ingredients_inci,
    key_ingredients: formData.key_ingredients,
    claims: formData.claims,
    images: formData.gallery || [],
    hover_image: formData.hover_image,
    variants: formData.variants || [],
    display_price_cents: getDisplayPriceCents('product', formData.id, formData.price)
  } : null;

  const { webhookConfigured } = useWebhookSender(webhookData, 'product.updated');

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNameBlur = () => {
    if (!formData.slug && formData.name) {
      updateField('slug', slugify(formData.name));
    }
  };

  const addToArray = (field) => {
    const current = formData[field] || [];
    updateField(field, [...current, ""]);
  };

  const updateArrayItem = (field, index, value) => {
    const current = formData[field] || [];
    const updated = [...current];
    updated[index] = value;
    updateField(field, updated);
  };

  const removeFromArray = (field, index) => {
    const current = formData[field] || [];
    updateField(field, current.filter((_, i) => i !== index));
  };

  const addVariant = () => {
    const current = formData.variants || [];
    updateField('variants', [...current, { name: "", image_url: "" }]);
  };

  const updateVariant = (index, field, value) => {
    const current = formData.variants || [];
    const updated = [...current];
    updated[index] = { ...updated[index], [field]: value };
    updateField('variants', updated);
  };

  const removeVariant = (index) => {
    const current = formData.variants || [];
    updateField('variants', current.filter((_, i) => i !== index));
  };

  const addGalleryImage = () => {
    const current = formData.gallery || [];
    updateField('gallery', [...current, ""]);
  };

  function pickImage(onFile) {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => { const f = input.files?.[0]; if (f) onFile(f); };
    input.click();
  }

  async function uploadAndGetUrls(file, slug) {
    const up = await uploadToCloudinary(file, { slug });
    return {
      full: cld(up.public_id, { w: 1200 }),
      thumb: cld(up.public_id, { w: 600, h: 600, fit: "fill" }),
    };
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('[ProductEditor] submit', { name: formData?.name, slug: formData?.slug });
    onSave(formData);
  };

  const baseCents = formData.price || 0;
  const compareCents = formData.compare_at_price;
  const displayCents = getDisplayPriceCents('product', formData.id, baseCents);
  const originalCents = Math.max(compareCents || 0, baseCents);
  const isDiscounted = displayCents < originalCents;
  const discount = isDiscounted ? discountLabel(originalCents, displayCents) : null;

  const containerWidth = viewMode === "mobile" ? "375px" : "100%";

  const handleAddFeatures = () => addToArray('features');
  const handleAddHowToUse = () => addToArray('how_to_use');
  const handleAddIngredients = () => addToArray('ingredients_inci');
  const handleAddKeyIngredients = () => addToArray('key_ingredients');
  const handleAddClaims = () => addToArray('claims');

  return (
    <>
      <style>{`
        .editor-container {
          max-width: 1600px;
          margin: 0 auto;
        }
        .editor-grid {
          display: grid;
          grid-template-columns: 500px 1fr;
          gap: 32px;
        }
        @media (max-width: 1200px) {
          .editor-grid { grid-template-columns: 1fr; }
        }
        .form-panel {
          background: var(--card);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          min-height: calc(100vh - 96px);
          overflow-y: auto;
        }
        .editor-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; }
        .editor-title { font-size: 28px; font-weight: 700; color: var(--text); flex: 1; }
        .btn-back, .btn-save { padding: 12px 28px; border-radius: 12px; border: none; cursor: pointer; }
        .form-section { margin-bottom: 32px; padding-bottom: 32px; border-bottom: 2px solid var(--border); }
        .form-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .section-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 20px; text-transform: uppercase; }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 13px; font-weight: 700; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; }
        .form-input, .form-textarea, .form-select { width: 100%; padding: 14px 18px; border-radius: 12px; border: none; background: var(--card); color: var(--text); font-size: 15px; box-shadow: inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light); }
        .btn-add { padding: 10px 16px; border-radius: 10px; border: none; background: var(--card); color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light); margin-top: 8px; }
        .preview-panel { display: flex; flex-direction: column; gap: 24px; }
        .image-preview { width: 100%; max-width: 200px; aspect-ratio: 1; border-radius: 12px; overflow: hidden; margin-top: 8px; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #999; }
        .image-preview img { width: 100%; height: 100%; object-fit: cover; }
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; margin-top: 12px; }
      `}</style>

      <div className="editor-container">
        <div className="editor-header">
          <button className="btn-back" onClick={onCancel} type="button">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="editor-title">{title} 🔴 UPDATED</h1>
          <button className="btn-save" onClick={handleSubmit} disabled={isSaving} type="button">
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Product'}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="editor-grid">
            <div className="form-panel">
              <div className="form-section">
                <h3 className="section-title">Core</h3>
                {/* ... unchanged core fields ... */}
              </div>

              <div className="form-section">
                <h3 className="section-title">Classification</h3>
                
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      className="form-select"
                      value={showCustomCategory ? "__custom" : (formData.category || "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__custom") {
                          setShowCustomCategory(true);
                        } else {
                          setShowCustomCategory(false);
                          setCustomCategory("");
                          updateField('category', v);
                        }
                      }}
                    >
                      <option value="">Select category…</option>
                      {categoryOptions.map(c => (
                        <option key={c.slug} value={c.slug}>{c.label}</option>
                      ))}
                      <option value="__custom">+ Add new category…</option>
                    </select>
                  </div>
                  {showCustomCategory && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      <input
                        className="form-input"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Enter new category slug"
                      />
                      <button
                        type="button"
                        className="btn-add"
                        onClick={() => {
                          const slug = (customCategory || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
                          if (!slug) return;
                          updateField('category', slug);
                          setShowCustomCategory(false);
                          setCustomCategory("");
                        }}
                      >Add</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Media</h3>
                
                <div className="form-group">
                  <label className="form-label">Thumbnail</label>
                  {formData.image_url ? (
                    <div className="image-preview"><img src={formData.image_url} alt="Thumbnail" /></div>
                  ) : (
                    <div className="image-preview">No image</div>
                  )}
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn-add" onClick={() => {
                      const slug = (formData.slug || formData.name || "").trim().toLowerCase();
                      if (!slug) return;
                      pickImage(async (file) => {
                        const { thumb, full } = await uploadAndGetUrls(file, slug);
                        updateField('image_url', thumb);
                        const gallery = Array.isArray(formData.gallery) ? formData.gallery : [];
                        if (gallery.length === 0) updateField('gallery', [full]);
                      });
                    }}>Upload thumbnail</button>
                    {formData.image_url && (
                      <button type="button" className="btn-add" onClick={() => updateField('image_url', '')}>Remove</button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Images</label>
                  <div className="gallery-grid">
                    {(formData.gallery || []).map((url, idx) => (
                      <div key={idx} className="image-preview">
                        {url ? <img src={url} alt={`Gallery ${idx + 1}`} /> : 'No image'}
                        <button type="button" className="btn-icon-small" onClick={() => removeFromArray('gallery', idx)}><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn-add" onClick={() => {
                      const slug = (formData.slug || formData.name || "").trim().toLowerCase();
                      if (!slug) return;
                      pickImage(async (file) => {
                        const { full, thumb } = await uploadAndGetUrls(file, slug);
                        updateField('gallery', [...(Array.isArray(formData.gallery) ? formData.gallery : []), full]);
                        if (!formData.image_url) updateField('image_url', thumb);
                      });
                    }}>
                      Upload image
                    </button>
                    {(Array.isArray(formData.gallery) && formData.gallery.length > 0) && (
                      <button type="button" className="btn-add" onClick={() => { updateField('gallery', []); updateField('image_url', ''); }}>Clear all</button>
                    )}
                  </div>
                </div>
              </div>

              {/* ... rest of sections (content, variants, inventory) remain unchanged ... */}
            </div>

            {/* preview panel remains unchanged */}
            <div className="preview-panel">
              {!webhookConfigured && (
                <div style={{ 
                  background: 'var(--card)', 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  fontSize: '12px', 
                  color: 'var(--text-muted)',
                  marginBottom: '16px',
                  border: '1px solid var(--border)'
                }}>
                  ℹ️ Webhook not configured. Set VITE_SPECIALS_WEBHOOK to push changes to storefront.
                </div>
              )}
              {/* existing preview controls and containers are unchanged */}
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
