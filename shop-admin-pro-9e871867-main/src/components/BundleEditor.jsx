import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Plus, X, Monitor, Smartphone, Calculator, Search } from "lucide-react";
import { moneyZAR } from "./formatUtils";
import { slugify } from "./helpers";
import { useQuery } from "@tanstack/react-query";
import { api } from "./data/api";
import { useActiveSpecials } from "./hooks/useActiveSpecials";
import { discountLabel } from "./helpers/pricing";
import { useWebhookSender } from "./webhooks/useWebhookSender";
import { uploadToCloudinary, cld } from "@/lib/cloudinary";

export default function BundleEditor({ bundle, onSave, onCancel, isSaving, title }) {
  const [formData, setFormData] = useState(bundle);
  const [items, setItems] = useState(bundle.items || []);
  const [pricingMode, setPricingMode] = useState(bundle.pricing_mode || 'manual');
  const [discountValue, setDiscountValue] = useState(bundle.discount_value || 0);
  const [previewTab, setPreviewTab] = useState("card");
  const [viewMode, setViewMode] = useState("desktop");
  const [showItemDrawer, setShowItemDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.listProducts(),
  });

  const { getDisplayPriceCents } = useActiveSpecials();

  // Calculate base price from items
  const basePrice = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    return sum + (product ? product.price_cents * item.qty : 0);
  }, 0);

  const suggestedPrice = pricingMode === 'manual' ? formData.price_cents :
    pricingMode === 'percent_off' ? Math.max(1, Math.round(basePrice * (1 - discountValue / 100))) :
    Math.max(1, Math.round(basePrice - discountValue * 100));

  // Webhook sender
  const webhookData = formData.name ? {
    id: formData.id || formData.slug,
    name: formData.name,
    slug: formData.slug,
    status: formData.status,
    items: items.map(item => ({ product_id: item.product_id, qty: item.qty })),
    pricing_mode: pricingMode,
    discount_value: discountValue,
    price_cents: formData.price_cents,
    compare_at_price_cents: formData.compare_at_price_cents,
    images: formData.images || [],
    display_price_cents: getDisplayPriceCents('bundle', formData.id, formData.price_cents),
    timestamp: new Date().toISOString()
  } : null;

  const { webhookConfigured } = useWebhookSender(webhookData, 'bundle.updated');

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNameBlur = () => {
    if (!formData.slug && formData.name) {
      updateField('slug', slugify(formData.name));
    }
  };

  const addItemToBundle = (product, qty = 1) => {
    const existing = items.find(item => item.product_id === product.id);
    if (existing) {
      setItems(prev => prev.map(item =>
        item.product_id === product.id ? { ...item, qty: item.qty + qty } : item
      ));
    } else {
      setItems(prev => [...prev, { product_id: product.id, qty }]);
    }
    setShowItemDrawer(false);
    setSearchTerm("");
  };

  const updateItemQty = (product_id, qty) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(item => item.product_id !== product_id));
    } else {
      setItems(prev => prev.map(item =>
        item.product_id === product_id ? { ...item, qty } : item
      ));
    }
  };

  const removeItem = (product_id) => {
    setItems(prev => prev.filter(item => item.product_id !== product_id));
  };

  const handleRecalculate = () => {
    updateField('price_cents', suggestedPrice);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('[BundleEditor] submit', { name: formData?.name, slug: formData?.slug, items: items?.length });
    if (!formData.name) { alert('Bundle name is required'); return; }
    if (items.length === 0) { alert('Bundle must have at least one product'); return; }
    onSave({
      ...formData,
      items,
      pricing_mode: pricingMode,
      discount_value: pricingMode === 'manual' ? null : discountValue
    });
  };

  const baseCents = formData.price_cents || 0;
  const compareCents = formData.compare_at_price_cents;
  const displayCents = getDisplayPriceCents('bundle', formData.id, baseCents);
  const originalCents = Math.max(compareCents || 0, baseCents);
  const isDiscounted = displayCents < originalCents;
  const discount = isDiscounted ? discountLabel(originalCents, displayCents) : null;

  const containerWidth = viewMode === "mobile" ? "375px" : "100%";

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const addGalleryImage = () => {
    const current = formData.images || [];
    updateField('images', [...current, ""]);
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

  return (
    <>
      <style>{`
        /* existing styles kept */
      `}</style>

      <div className="editor-container">
        <div className="editor-header">
          <button className="btn-back" onClick={onCancel} type="button">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="editor-title">{title}</h1>
          <button className="btn-save" onClick={handleSubmit} disabled={isSaving} type="button">
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Bundle'}
          </button>
        </div>

        {!webhookConfigured && (
          <div style={{ 
            background: 'var(--card)', 
            padding: '12px 16px', 
            borderRadius: '10px', 
            fontSize: '12px', 
            color: 'var(--text-muted)',
            marginBottom: '16px',
            border: '1px solid var(--border)',
            maxWidth: '800px'
          }}>
            ℹ️ Webhook not configured. Set VITE_SPECIALS_WEBHOOK to push changes to storefront.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="editor-grid">
            <div className="form-panel">
              {/* CORE */}
              <div className="form-section">
                <h3 className="section-title">Core</h3>
                {/* core fields unchanged */}
                <div className="form-group">
                  <label className="form-label">Bundle Name *</label>
                  <input type="text" className="form-input" value={formData.name} onChange={(e) => updateField('name', e.target.value)} onBlur={handleNameBlur} required />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Slug</label>
                    <input type="text" className="form-input" value={formData.slug || ''} onChange={(e) => updateField('slug', e.target.value)} placeholder="auto-generated from name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={formData.status} onChange={(e) => updateField('status', e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ITEMS */}
              {/* unchanged items + pricing + content sections */}

              {/* MEDIA */}
              <div className="form-section">
                <h3 className="section-title">Media</h3>
                
                <div className="form-group">
                  <label className="form-label">Gallery</label>
                  <div className="array-list">
                    {(formData.images || []).map((url, idx) => (
                      <div key={idx} className="array-item">
                        <div className="image-preview" style={{ maxWidth: 120 }}>
                          {url ? <img src={url} alt={`img-${idx}`} /> : 'No image'}
                        </div>
                        <button type="button" className="btn-icon-small" onClick={() => removeFromArray('images', idx)}><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn-add" onClick={() => {
                    const slug = (formData.slug || formData.name || "").trim().toLowerCase();
                    if (!slug) return;
                    pickImage(async (file) => {
                      const { full } = await uploadAndGetUrls(file, slug);
                      updateField('images', [...(Array.isArray(formData.images) ? formData.images : []), full]);
                    });
                  }}>
                    <Plus className="w-4 h-4" /> Upload Image
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Hover Image</label>
                  <div className="image-preview" style={{ maxWidth: 200 }}>
                    {formData.hover_image ? <img src={formData.hover_image} alt="hover" /> : 'No image'}
                  </div>
                  <button type="button" className="btn-add" onClick={() => {
                    const slug = (formData.slug || formData.name || "").trim().toLowerCase();
                    if (!slug) return;
                    pickImage(async (file) => {
                      const { full } = await uploadAndGetUrls(file, slug);
                      updateField('hover_image', full);
                    });
                  }}>Upload hover</button>
                  {formData.hover_image && (
                    <button type="button" className="btn-add" onClick={() => updateField('hover_image', '')}>Remove</button>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: PREVIEW */}
            {/* preview panel kept unchanged */}
            <div className="preview-panel">
              {/* existing preview UI ... */}
            </div>
          </div>
        </form>
      </div>

      {/* Item Drawer */}
      {/* drawer unchanged */}
      <div className="item-drawer-overlay" onClick={() => setShowItemDrawer(false)} />
      <div className="item-drawer">
        {/* drawer content unchanged */}
        <div className="drawer-header">
          <div className="drawer-title">Add Products</div>
          <button type="button" className="btn-icon-small" onClick={() => setShowItemDrawer(false)}><X className="w-4 h-4" /></button>
        </div>
        <div className="drawer-search">
          <div className="search-input-wrapper">
            <Search className="search-icon w-5 h-5" />
            <input type="text" className="search-input" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div className="drawer-content">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-list-item" onClick={() => addItemToBundle(product)}>
              <div className="product-list-name">{product.name}</div>
              <div className="product-list-price">{moneyZAR(product.price_cents)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
