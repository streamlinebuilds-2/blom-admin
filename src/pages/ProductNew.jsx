import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { ProductPageTemplate } from "../../ProductPageTemplate";
import { useToast } from "../components/ui/ToastProvider";
import { supabase } from "../components/supabaseClient";

const CATEGORIES = [
  'Bundle Deals',
  'Acrylic System',
  'Prep & Finish',
  'Gel System',
  'Tools & Essentials',
  'Furniture',
  'Courses',
  'Workshops',
  'Coming Soon'
];

// Helper function to determine stock type based on category
const getStockTypeFromCategory = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('course') || cat.includes('workshop') || cat.includes('training')) {
    return 'unlimited';
  }
  if (cat.includes('furniture')) {
    return 'made_on_demand';
  }
  return 'tracked';
};

const slugify = (value) =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const generateSKU = (category) => {
  const prefix = category?.substring(0, 3).toUpperCase() || 'PRD';
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
};

const generateBarcode = () => {
  return `BC${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

const initialFormState = {
  name: "",
  category: "",
  price: "",
  compare_at_price: "",
  cost_price: "",
  inventory_quantity: "0",
  track_inventory: true,
  weight: "",
  short_description: "",
  overview: "",
  thumbnail_url: "",
  hover_url: "",
  variants: [{ name: "", image: "", price_cents: null }],
  features: [""],
  how_to_use: [""],
  inci_ingredients: [""],
  key_ingredients: [""],
  size: "",
  shelf_life: "",
  claims: [""],
  status: "active",
  badges: [""],
  related: [],
};

const ensureList = (value) => {
  if (Array.isArray(value) && value.length > 0) return value;
  return [""];
};

// Helper function to validate image URLs
const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  
  // Check if it's a valid URL format
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
};

// Helper function to determine if an image is from Cloudinary
const isCloudinaryImage = (url) => {
  return url && typeof url === 'string' && url.includes('res.cloudinary.com');
};

// Helper function to clean and validate image URLs before saving
const sanitizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  
  // Only return URLs that are valid
  if (isValidImageUrl(trimmed)) {
    return trimmed;
  }
  return '';
};

export default function ProductNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [previewTab, setPreviewTab] = useState("card");
  const [viewMode, setViewMode] = useState("desktop");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  
  // Track which variants are being edited
  const [editingVariantPrice, setEditingVariantPrice] = useState({});

  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();

      // Validate response
      if (!response.ok) {
        throw new Error(data.error?.message || `Upload failed with status ${response.status}`);
      }

      if (data.error) {
        throw new Error(data.error.message || 'Cloudinary returned an error');
      }

      if (!data.secure_url) {
        throw new Error('No secure URL returned from Cloudinary');
      }

      // Validate the URL is actually from Cloudinary
      if (!data.secure_url.includes('res.cloudinary.com')) {
        throw new Error('Invalid URL format received');
      }

      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };

  const handleVariantImageUpload = async (index, file) => {
    if (!file) return;

    try {
      showToast('info', 'Uploading variant image...');
      const url = await uploadToCloudinary(file);

      const current = form.variants[index];
      const updated = typeof current === "string"
        ? { name: current, image: url }
        : { ...current, image: url };

      updateArr("variants", index, updated);
      showToast('success', 'Variant image uploaded');
    } catch (error) {
      showToast('error', 'Image upload failed');
      console.error('Variant image upload error:', error);
    }
  };

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setAllProducts(data || []);
    }
    loadProducts();
  }, []);

  const update = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const getArrayFromPrevious = (previous, field) => {
    const current = previous[field];
    if (Array.isArray(current) && current.length > 0) {
      return [...current];
    }
    return [""];
  };

  const updateArr = (field, index, value) => {
    setForm((previous) => {
      const next = getArrayFromPrevious(previous, field);
      next[index] = value;
      return { ...previous, [field]: next };
    });
  };

  const addRow = (field) => {
    setForm((previous) => {
      const next = getArrayFromPrevious(previous, field);
      if (field === "variants") {
        next.push({ name: "", image: "", price_cents: null });
      } else if (field === "related") {
        next.push("");
      } else {
        next.push("");
      }
      return { ...previous, [field]: next };
    });
  };

  const removeRow = (field, index) => {
    setForm((previous) => {
      const next = getArrayFromPrevious(previous, field);
      next.splice(index, 1);
      if (field === "variants") {
        return { ...previous, [field]: next.length ? next : [{ name: "", image: "", price_cents: null }] };
      } else if (field === "related") {
        return { ...previous, [field]: next.length ? next : [] };
      }
      return { ...previous, [field]: next.length ? next : [""] };
    });
  };

  const moveVariant = (field, index, direction) => {
    setForm((previous) => {
      const next = getArrayFromPrevious(previous, field);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Check bounds
      if (targetIndex < 0 || targetIndex >= next.length) {
        return previous;
      }
      
      // Swap positions
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      
      return { ...previous, [field]: next };
    });
  };

  const updateVariantPrice = (index, priceCents) => {
    setForm((previous) => {
      const next = [...previous.variants];
      
      // Ensure the array is large enough
      if (index >= next.length) {
        // Fill array with empty variants up to the index
        while (next.length <= index) {
          next.push({ name: "", image: "", price_cents: null });
        }
      }
      
      const current = next[index];
      
      // Handle undefined or null current variant
      if (!current) {
        const newVariant = { name: "", image: "", price_cents: priceCents };
        next[index] = newVariant;
      } else if (typeof current === "string") {
        const updated = { name: current, image: "", price_cents: priceCents };
        next[index] = updated;
      } else {
        const updated = { ...current, price_cents: priceCents };
        next[index] = updated;
      }
      
      return { ...previous, variants: next };
    });
  };

  const getVariantDisplayPrice = (variant) => {
    // Add robust null/undefined check
    if (!variant || typeof variant !== 'object') {
      return `R${(parseFloat(form.price || 0)).toFixed(2)} (Default)`;
    }
    // Safely access price_cents with fallback
    const priceCents = variant.price_cents ?? null;
    if (priceCents && priceCents > 0) {
      return `R${(priceCents / 100).toFixed(2)}`;
    }
    return `R${(parseFloat(form.price || 0)).toFixed(2)} (Default)`;
  };

  const hasCustomPrice = (variant) => {
    // Add robust null/undefined check
    if (!variant || typeof variant !== 'object') {
      return false;
    }
    // Safely access price_cents with fallback
    const priceCents = variant.price_cents ?? null;
    return priceCents && priceCents > 0;
  };

  const startEditingVariantPrice = (index) => {
    setEditingVariantPrice(prev => ({ ...prev, [index]: true }));
  };

  const cancelEditingVariantPrice = (index) => {
    setEditingVariantPrice(prev => ({ ...prev, [index]: false }));
  };

  const saveVariantPrice = (index, priceValue) => {
    const priceNumber = parseFloat(priceValue);
    if (Number.isFinite(priceNumber) && priceNumber >= 0) {
      const priceCents = Math.round(priceNumber * 100);
      updateVariantPrice(index, priceCents);
      cancelEditingVariantPrice(index);
      showToast('success', `Variant ${index + 1} price updated to R${priceNumber.toFixed(2)}`);
    } else {
      showToast('error', 'Please enter a valid price');
    }
  };

  const resetToDefaultPrice = (index) => {
    updateVariantPrice(index, null);
    cancelEditingVariantPrice(index);
    showToast('success', `Variant ${index + 1} price reset to default`);
  };

  const getVariantPriceInput = (index) => {
    // Add bounds checking to prevent undefined access
    if (index < 0 || index >= variants.length) {
      return (
        <div className="flex items-center gap-2">
          <span className="variant-price-display variant-price-default">
            R{(parseFloat(form.price || 0)).toFixed(2)} (Default)
          </span>
        </div>
      );
    }
    
    const variant = variants[index];
    const isEditing = editingVariantPrice[index];
    
    // Additional safety check for undefined variant
    if (!variant || typeof variant !== 'object') {
      return (
        <div className="flex items-center gap-2">
          <span className="variant-price-display variant-price-default">
            R{(parseFloat(form.price || 0)).toFixed(2)} (Default)
          </span>
          <button
            type="button"
            onClick={() => startEditingVariantPrice(index)}
            className="product-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            title="Set custom price"
          >
            ✏️ Custom
          </button>
        </div>
      );
    }
    
    const currentPrice = hasCustomPrice(variant) 
      ? (variant.price_cents / 100).toFixed(2)
      : (parseFloat(form.price || 0)).toFixed(2);
    
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            defaultValue={currentPrice}
            className="price-edit-input"
            placeholder="0.00"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveVariantPrice(index, e.target.value);
              } else if (e.key === 'Escape') {
                cancelEditingVariantPrice(index);
              }
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={(e) => {
              const input = e.target.parentElement.querySelector('input');
              saveVariantPrice(index, input.value);
            }}
            className="product-btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px' }}
          >
            ✓ Save
          </button>
          <button
            type="button"
            onClick={() => cancelEditingVariantPrice(index)}
            className="product-btn-secondary"
            style={{ padding: '6px 10px', fontSize: '12px' }}
          >
            ✕ Cancel
          </button>
          {hasCustomPrice(variant) && (
            <button
              type="button"
              onClick={() => resetToDefaultPrice(index)}
              className="product-btn-secondary"
              style={{ padding: '6px 10px', fontSize: '12px', background: 'var(--accent)', color: 'white' }}
            >
              🎯 Default
            </button>
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <span 
          className={`variant-price-display ${hasCustomPrice(variant) ? 'variant-price-custom' : 'variant-price-default'}`}
        >
          {getVariantDisplayPrice(variant)}
        </span>
        <button
          type="button"
          onClick={() => startEditingVariantPrice(index)}
          className="product-btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px' }}
          title={hasCustomPrice(variant) ? 'Edit custom price' : 'Set custom price'}
        >
          ✏️ {hasCustomPrice(variant) ? 'Edit' : 'Custom'}
        </button>
      </div>
    );
  };

  const priceNumber = useMemo(() => {
    const parsed = parseFloat(form.price);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }, [form.price]);

  const compareAtNumber = useMemo(() => {
    const parsed = parseFloat(form.compare_at_price);
    return Number.isFinite(parsed) ? parsed : null;
  }, [form.compare_at_price]);

  const inventoryQuantityNumber = useMemo(() => {
    const parsed = Number(form.inventory_quantity);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }, [form.inventory_quantity]);

  const weightNumber = useMemo(() => {
    if (form.weight === "" || form.weight === null || form.weight === undefined) return null;
    const parsed = parseFloat(form.weight);
    return Number.isFinite(parsed) ? parsed : null;
  }, [form.weight]);

  const badges = useMemo(
    () => ensureList(form.badges).map((item) => item.trim()).filter(Boolean),
    [form.badges]
  );

  const claims = useMemo(
    () => ensureList(form.claims).map((item) => item.trim()).filter(Boolean),
    [form.claims]
  );

  const related = useMemo(
    () => Array.isArray(form.related) ? form.related.filter(Boolean) : [],
    [form.related]
  );

  const variants = useMemo(() => {
    const list = ensureList(form.variants);
    return list
      .map((item) => {
        if (typeof item === "string") {
          return item.trim() ? { name: item.trim(), image: "", price_cents: null } : null;
        }
        // Allow variants that have at least a name (image and price are optional)
        const name = item?.name?.trim() || "";
        const image = item?.image?.trim() || "";
        const price_cents = item?.price_cents ?? null;
        
        // Only filter out completely empty variants (no name AND no image AND no price)
        if (!name && !image && price_cents === null) return null;
        
        return {
          name: name,
          image: image,
          price_cents: price_cents
        };
      })
      .filter(Boolean);
  }, [form.variants]);

  const features = useMemo(
    () => ensureList(form.features).map((item) => item.trim()).filter(Boolean),
    [form.features]
  );

  const howToUse = useMemo(
    () => ensureList(form.how_to_use).map((item) => item.trim()).filter(Boolean),
    [form.how_to_use]
  );

  const inciIngredients = useMemo(
    () => ensureList(form.inci_ingredients).map((item) => item.trim()).filter(Boolean),
    [form.inci_ingredients]
  );

  const keyIngredients = useMemo(
    () => ensureList(form.key_ingredients).map((item) => item.trim()).filter(Boolean),
    [form.key_ingredients]
  );

  const inStock = useMemo(() => inventoryQuantityNumber > 0, [inventoryQuantityNumber]);

  const images = useMemo(() => {
    const primary = form.thumbnail_url?.trim();
    const hover = form.hover_url?.trim();
    const list = [primary, hover].filter(Boolean);
    return list;
  }, [form.thumbnail_url, form.hover_url]);

  const previewImages = useMemo(
    () => (images.length ? images : ["data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800'%3E%3Crect fill='%23f0f0f0' width='800' height='800'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='24' font-family='system-ui'%3ENo Image%3C/text%3E%3C/svg%3E"]),
    [images]
  );

  const stockLabel = useMemo(() => {
    if (form.status === "archived") return "Archived";
    if (inStock) return "In Stock";
    return "Out of Stock";
  }, [form.status, inStock]);

  const priceString = useMemo(() => {
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) return "R0";
    return `R${Math.round(priceNumber)}`;
  }, [priceNumber]);

  const cardModel = useMemo(
    () => ({
      id: "new-product-preview",
      name: form.name || "New Product",
      slug: form.slug || "new-product",
      price_cents: Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : 0,
      compare_at_price_cents: compareAtNumber ? Math.round(compareAtNumber * 100) : undefined,
      short_desc: form.short_description || "",
      images: previewImages,
      stock_qty: form.status !== "archived" && inStock ? inventoryQuantityNumber : 0,
      badges,
    }),
    [badges, form.name, form.short_description, form.slug, form.status, inStock, inventoryQuantityNumber, previewImages, priceNumber, compareAtNumber]
  );

  const pageModel = useMemo(
    () => ({
      name: form.name || "New Product",
      slug: form.slug || "new-product",
      category: form.category || "",
      shortDescription: form.short_description || "",
      overview: form.overview || "",
      price: priceString,
      compareAtPrice: compareAtNumber ? `R${Math.round(compareAtNumber)}` : undefined,
      stock: stockLabel,
      images: previewImages,
      features,
      howToUse,
      ingredients: {
        inci: inciIngredients,
        key: keyIngredients,
      },
      details: {
        size: form.size || "",
        shelfLife: form.shelf_life || "",
        claims,
      },
      variants,
      related,
      rating: 4.8,
      reviewCount: 124,
      reviews: [],
      seo: {
        title: form.name || "",
        description: form.short_description
          ? `${form.short_description.substring(0, 150)}...`
          : `Buy ${form.name} online at BLOM Cosmetics`,
      },
    }),
    [
      claims,
      compareAtNumber,
      features,
      form.category,
      form.name,
      form.overview,
      form.short_description,
      form.size,
      form.shelf_life,
      howToUse,
      inciIngredients,
      keyIngredients,
      previewImages,
      priceString,
      related,
      stockLabel,
      variants,
    ]
  );

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.category.trim()) nextErrors.category = "Category is required";

    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      nextErrors.price = "Price must be greater than 0";
    }

    if (!Number.isFinite(inventoryQuantityNumber) || inventoryQuantityNumber < 0) {
      nextErrors.inventory_quantity = "Inventory must be zero or greater";
    }

    // Images are now optional - no validation required
    // Users can add images later if needed for display

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");

    if (!validate()) {
      showToast("error", "Please fix the highlighted fields");
      return;
    }

    // Auto-generate fields
    const slug = slugify(form.name);
    const sku = generateSKU(form.category);
    const barcode = generateBarcode();
    const meta_title = form.name;
    const meta_description = form.short_description
      ? `${form.short_description.substring(0, 150)}...`
      : `Buy ${form.name} online at BLOM Cosmetics`;
    const stockType = getStockTypeFromCategory(form.category);

    const payload = {
      name: form.name.trim(),
      slug: slug,
      sku: sku,
      category: form.category.trim(),
      stock_type: stockType,
      status: form.status || 'active',
      price: Number.isFinite(priceNumber) ? priceNumber : 0,
      compare_at_price: Number.isFinite(compareAtNumber ?? Number.NaN) ? compareAtNumber : null,
      cost_price_cents: form.cost_price ? Math.round(parseFloat(form.cost_price) * 100) : 0,
      inventory_quantity: Number.isFinite(inventoryQuantityNumber) ? inventoryQuantityNumber : 0,
      track_inventory: Boolean(form.track_inventory),
      weight: weightNumber,
      barcode: barcode,
      short_description: form.short_description,
      overview: form.overview,
      description: form.overview,
      thumbnail_url: sanitizeImageUrl(form.thumbnail_url),
      hover_url: sanitizeImageUrl(form.hover_url),
      gallery_urls: [],
      variants,
      features,
      how_to_use: howToUse,
      inci_ingredients: inciIngredients,
      key_ingredients: keyIngredients,
      size: form.size,
      shelf_life: form.shelf_life,
      claims,
      meta_title: meta_title,
      meta_description: meta_description,
      is_active: true,
      is_featured: false,
      badges,
      related,
      stock_label: stockLabel,
      price_string: priceString,
      images: previewImages,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch("/.netlify/functions/save-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_product", payload }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        const message = data?.error || data?.message || "Failed to create product";
        setServerError(message);
        showToast("error", message);
        return;
      }

      showToast("success", "Product created successfully");

      const createdId = data?.id || data?.product?.id || null;

      if (createdId) {
        navigate(`/products/${createdId}`);
      } else {
        navigate("/products");
      }
    } catch (error) {
      const message = error?.message || "Failed to create product";
      setServerError(message);
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderArrayField = (field, label, placeholder, addLabel, errorKey) => {
    const items = ensureList(form[field]);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-[var(--text)]">{label}</label>
          {errorKey && errors[errorKey] ? (
            <span className="text-xs font-medium text-red-500">{errors[errorKey]}</span>
          ) : null}
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${field}-${index}`} className="flex gap-2">
              <input
                type="text"
                className="product-form-input flex-1"
                value={item}
                placeholder={placeholder}
                onChange={(event) => updateArr(field, index, event.target.value)}
              />
              <button
                type="button"
                onClick={() => removeRow(field, index)}
                className="product-btn-secondary"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => addRow(field)}
          className="product-btn-add"
        >
          + {addLabel}
        </button>
        {errorKey && errors[errorKey] ? (
          <p className="text-xs text-red-500">{errors[errorKey]}</p>
        ) : null}
      </div>
    );
  };

  const inputClass = (hasError) => `product-form-input${hasError ? " border-red-500 focus:ring-rose-500" : ""}`;
  const textareaClass = (hasError) => `product-form-textarea${hasError ? " border-red-500 focus:ring-rose-500" : ""}`;

  return (
    <>
      <style>{`
        /* Product Form Styling - Matching BundleEditor */
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
        .product-form-input, .product-form-textarea, .product-form-select {
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
        .product-form-input:focus, .product-form-textarea:focus, .product-form-select:focus {
          outline: none;
          box-shadow: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light);
        }
        .product-form-textarea {
          min-height: 100px;
          resize: vertical;
          position: relative;
          z-index: 1;
        }
        .product-form-section {
          background: var(--card);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 8px 8px 16px var(--shadow-dark), -8px -8px 16px var(--shadow-light);
          margin-bottom: 24px;
        }
        .product-section-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
        }
        .product-section-desc {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 20px;
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
        .product-btn-secondary:active {
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }
        .product-btn-add {
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          background: var(--card);
          color: var(--text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 3px 3px 6px var(--shadow-dark), -3px -3px 6px var(--shadow-light);
          margin-top: 8px;
        }
        .product-btn-add:hover {
          box-shadow: 4px 4px 8px var(--shadow-dark), -4px -4px 8px var(--shadow-light);
        }
        .product-error-text {
          color: #ef4444;
          font-size: 12px;
          margin-top: 4px;
        }
        .product-required {
          color: #ef4444;
        }
        /* Variant Styles */
        .variant-row {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          padding: 1rem;
          background: var(--bg);
          border-radius: 12px;
          box-shadow: inset 2px 2px 4px var(--shadow-dark), inset -2px -2px 4px var(--shadow-light);
        }
        .variant-image-upload {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-shrink: 0;
        }
        .upload-btn {
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 2px 2px 4px var(--shadow-dark);
          transition: transform 0.2s;
        }
        .upload-btn:hover {
          transform: translateY(-1px);
        }
        .variant-thumbnail {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 8px;
          border: 2px solid var(--border);
          box-shadow: 2px 2px 4px var(--shadow-dark);
        }
        .variant-price-display {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border);
        }
        .variant-price-custom {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .variant-price-default {
          background: var(--bg);
          color: var(--text-muted);
        }
        .price-edit-input {
          width: 80px;
          padding: 4px 6px;
          font-size: 12px;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--text);
        }
        /* Utility Classes */
        .space-y-1 > * + * { margin-top: 0.25rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .space-y-6 > * + * { margin-top: 1.5rem; }
        .grid { display: grid; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        .flex { display: flex; }
        .flex-1 { flex: 1 1 0%; }
        .hidden { display: none; }
        .cursor-pointer { cursor: pointer; }
        @media (min-width: 768px) {
          .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (min-width: 1280px) {
          .xl\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        /* Fullscreen Preview Styles */
        .preview-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 9999;
          overflow-y: auto;
          padding: 0;
        }

        .preview-fullscreen .desktop-preview {
          max-width: 1200px;
          margin: 0 auto;
        }

        .preview-fullscreen .mobile-preview {
          max-width: 375px;
          margin: 0 auto;
        }

        /* Mobile responsive styles - vertical layout */
        @media (max-width: 768px) {
          .topbar {
            padding: 16px 20px;
            margin-bottom: 16px;
          }

          .content-area {
            padding: 0 16px 32px;
          }

          /* Stack form sections vertically */
          .content-area.grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .product-form-section {
            padding: 20px !important;
            margin-bottom: 16px !important;
          }

          /* Better form inputs for mobile */
          .product-form-input,
          .product-form-textarea,
          .product-form-select {
            font-size: 16px !important;
            padding: 12px 16px !important;
          }

          /* Stack grid elements vertically */
          .grid.gap-4.md\:grid-cols-2 {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          /* Stack flex elements vertically */
          .flex.gap-2 {
            flex-direction: column !important;
            gap: 12px !important;
          }

          /* Better variant rows for mobile */
          .variant-row {
            flex-direction: column !important;
            gap: 12px !important;
            padding: 16px !important;
          }

          .variant-row input,
          .variant-row .product-form-input {
            width: 100% !important;
          }

          .variant-row .price-edit-input {
            width: 100% !important;
          }

          .variant-image-upload {
            justify-content: flex-start !important;
            width: 100% !important;
          }

          .variant-price-display {
            font-size: 13px !important;
            padding: 6px 10px !important;
          }

          /* Mobile-friendly buttons */
          .flex.items-center.justify-end.gap-3 {
            flex-direction: column !important;
            gap: 12px !important;
          }

          .flex.items-center.justify-end.gap-3 button {
            width: 100% !important;
          }

          /* Touch optimization */
          button,
          input,
          select,
          textarea {
            touch-action: manipulation;
          }

          /* Prevent zoom on input focus */
          input[type="text"],
          input[type="number"],
          input[type="email"],
          input[type="tel"],
          input[type="url"],
          textarea,
          select {
            font-size: 16px !important;
          }
        }
      `}</style>
      <div className="flex h-full flex-col">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => navigate('/products')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--bg)',
                boxShadow: '2px 2px 4px var(--shadow-dark), -2px -2px 4px var(--shadow-light)',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text)' }} />
            </button>
            <div className="font-bold text-lg">New Product</div>
          </div>
          <div className="text-sm text-[var(--text-muted)]">Create a new product and preview the merchandising experience.</div>
        </div>

        <div className="content-area grid grid-cols-1 gap-6 xl:grid-cols-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Basic Information</h2>
              <p className="text-sm text-[var(--text-muted)]">Name and classification for the product.</p>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="product-form-input"
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Base 44 Nail Strengthener"
                />
                {errors.name ? <p className="text-xs text-red-500">{errors.name}</p> : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  className="product-form-select"
                  value={form.category}
                  onChange={(event) => {
                    if (event.target.value === '__custom__') {
                      setShowCustomCategory(true);
                      update('category', '');
                    } else {
                      setShowCustomCategory(false);
                      update('category', event.target.value);
                    }
                  }}
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__custom__">+ Add New Category</option>
                </select>
                {showCustomCategory && (
                  <input
                    type="text"
                    placeholder="Enter new category name"
                    value={form.category}
                    onChange={(event) => update('category', event.target.value)}
                    className="product-form-input mt-2"
                  />
                )}
                {errors.category ? <p className="text-xs text-red-500">{errors.category}</p> : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="status">
                  Status
                </label>
                <select
                  id="status"
                  className="product-form-select"
                  value={form.status}
                  onChange={(event) => update("status", event.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              {renderArrayField("badges", "Badges", "e.g. Best Seller", "Add badge")}
            </div>
          </section>

          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Pricing &amp; Stock</h2>
              <p className="text-sm text-[var(--text-muted)]">Control pricing, inventory and identifiers.</p>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="price">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="product-form-input"
                  value={form.price}
                  onChange={(event) => update("price", event.target.value)}
                  placeholder="199"
                />
                {errors.price ? <p className="text-xs text-red-500">{errors.price}</p> : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="compare_at_price">
                  Compare at Price
                </label>
                <input
                  id="compare_at_price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="product-form-input"
                  value={form.compare_at_price}
                  onChange={(event) => update("compare_at_price", event.target.value)}
                  placeholder="249"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="cost_price">
                  Cost Price (R)
                </label>
                <input
                  id="cost_price"
                  type="number"
                  min="0"
                  step="0.01"
                  className="product-form-input"
                  value={form.cost_price}
                  onChange={(event) => update("cost_price", event.target.value)}
                  placeholder="150.00"
                />
                <small className="text-xs text-[var(--text-muted)]">What you pay for the product</small>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="inventory_quantity">
                  Inventory Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  id="inventory_quantity"
                  type="number"
                  min="0"
                  step="1"
                  className="product-form-input"
                  value={form.inventory_quantity}
                  onChange={(event) => update("inventory_quantity", event.target.value)}
                  placeholder="25"
                />
                {errors.inventory_quantity ? (
                  <p className="text-xs text-red-500">{errors.inventory_quantity}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  id="track_inventory"
                  type="checkbox"
                  checked={form.track_inventory}
                  onChange={(event) => update("track_inventory", event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--card)]"
                />
                <label className="text-sm font-medium text-[var(--text)]" htmlFor="track_inventory">
                  Track inventory automatically
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="weight">
                  Weight (grams)
                </label>
                <input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.01"
                  className="product-form-input"
                  value={form.weight}
                  onChange={(event) => update("weight", event.target.value)}
                  placeholder="250"
                />
              </div>
            </div>
          </section>

          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Descriptions</h2>
              <p className="text-sm text-[var(--text-muted)]">Short copy for cards and the full overview.</p>
            </header>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="short_description">
                  Short Description
                </label>
                <textarea
                  id="short_description"
                  className={textareaClass(false)}
                  rows={3}
                  value={form.short_description}
                  onChange={(event) => update("short_description", event.target.value)}
                  placeholder="A strengthening treatment that supports nail health."
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="overview">
                  Overview
                </label>
                <textarea
                  id="overview"
                  className={textareaClass(false)}
                  rows={6}
                  value={form.overview}
                  onChange={(event) => update("overview", event.target.value)}
                  placeholder="Detailed product description, usage story and benefits."
                />
              </div>
            </div>
          </section>

          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Images</h2>
              <p className="text-sm text-[var(--text-muted)]">Main product image and optional hover image.</p>
            </header>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="thumbnail_url">
                  Main Product Image URL (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="thumbnail_url"
                    type="url"
                    className="product-form-input flex-1"
                    value={form.thumbnail_url}
                    onChange={(event) => update("thumbnail_url", event.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  <label className="product-btn-secondary cursor-pointer">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          showToast('info', 'Uploading to Cloudinary...');
                          const url = await uploadToCloudinary(file);
                          update("thumbnail_url", url);
                          showToast('success', 'Image uploaded to Cloudinary');
                        } catch (err) {
                          showToast('error', 'Upload failed: ' + (err.message || 'Unknown error'));
                        }
                      }}
                    />
                  </label>
                </div>
                {form.thumbnail_url && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    {isCloudinaryImage(form.thumbnail_url) ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">☁️ Cloudinary</span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">🔗 External</span>
                    )}
                    <span>Image URL: {form.thumbnail_url.substring(0, 60)}{form.thumbnail_url.length > 60 ? '...' : ''}</span>
                  </div>
                )}
                <small className="text-xs text-[var(--text-muted)]">Direct link to product image</small>
                {errors.images ? <p className="text-xs text-red-500">{errors.images}</p> : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="hover_url">
                  Hover Image URL (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="hover_url"
                    type="url"
                    className="product-form-input flex-1"
                    value={form.hover_url}
                    onChange={(event) => update("hover_url", event.target.value)}
                    placeholder="https://example.com/hover.jpg"
                  />
                  <label className="product-btn-secondary cursor-pointer">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          showToast('info', 'Uploading to Cloudinary...');
                          const url = await uploadToCloudinary(file);
                          update("hover_url", url);
                          showToast('success', 'Image uploaded to Cloudinary');
                        } catch (err) {
                          showToast('error', 'Upload failed: ' + (err.message || 'Unknown error'));
                        }
                      }}
                    />
                  </label>
                </div>
                {form.hover_url && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    {isCloudinaryImage(form.hover_url) ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">☁️ Cloudinary</span>
                    ) : (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">🔗 External</span>
                    )}
                    <span>Image URL: {form.hover_url.substring(0, 60)}{form.hover_url.length > 60 ? '...' : ''}</span>
                  </div>
                )}
                <small className="text-xs text-[var(--text-muted)]">Shows when customer hovers over product</small>
              </div>
            </div>
          </section>

          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Variants &amp; Highlights</h2>
              <p className="text-sm text-[var(--text-muted)]">List variants, key features and how to use steps.</p>
            </header>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--text)]">Variants</label>
                <small className="text-xs text-[var(--text-muted)] block mb-2">
                  e.g., different sizes or colors with unique images. Each variant can have its own price or use the default product price.
                </small>
                <div className="space-y-3">
                  {ensureList(form.variants).map((variant, index) => (
                    <div key={`variant-${index}`} className="variant-row">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-[var(--text-muted)]">#{index + 1}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveVariant("variants", index, 'up')}
                            disabled={index === 0}
                            className="product-btn-secondary px-2 py-1 text-xs"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveVariant("variants", index, 'down')}
                            disabled={index === ensureList(form.variants).length - 1}
                            className="product-btn-secondary px-2 py-1 text-xs"
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                      
                      <textarea
                        placeholder="Variant name (e.g. 250ml, Pink)"
                        className="product-form-input"
                        style={{ 
                          flex: 3, 
                          minWidth: '250px',
                          minHeight: '84px',
                          maxHeight: '120px',
                          resize: 'vertical',
                          overflowY: 'auto'
                        }}
                        rows={3}
                        value={(() => {
                          if (typeof variant === 'string') {
                            return variant;
                          }
                          // Handle empty variant objects properly
                          const name = variant?.name?.trim();
                          return name || '';
                        })()}
                        onChange={(e) => {
                          const current = form.variants[index];
                          const updated = typeof current === "string"
                            ? { name: e.target.value, image: "" }
                            : { ...current, name: e.target.value };
                          updateArr("variants", index, updated);
                        }}
                        onFocus={(e) => {
                          // If the field is empty and shows placeholder, ensure it's truly empty
                          if (!e.target.value && typeof variant === 'object' && !variant?.name?.trim()) {
                            e.target.value = '';
                          }
                        }}
                      />
                      
                      <div className="flex flex-col gap-2" style={{ minWidth: '180px' }}>
                        {/* Image Upload/Change Button */}
                        <div className="variant-image-upload">
                          <input
                            type="file"
                            accept="image/*"
                            id={`variant-image-${index}`}
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleVariantImageUpload(index, file);
                            }}
                          />
                          <label htmlFor={`variant-image-${index}`} className="upload-btn" style={{ width: '100%' }}>
                            {variant?.image ? '📷 Change Image' : '📷 Upload Image'}
                          </label>
                          {variant?.image && (
                            <img
                              src={variant.image}
                              alt={variant?.name || 'Variant'}
                              className="variant-thumbnail"
                            />
                          )}
                        </div>
                        
                        {/* Price Edit Button */}
                        <div>
                          <label className="text-xs font-medium text-[var(--text-muted)] block mb-1">Price</label>
                          {getVariantPriceInput(index)}
                        </div>
                        
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => removeRow("variants", index)}
                          className="product-btn-secondary"
                          style={{ width: '100%', background: '#ef4444', color: 'white' }}
                        >
                          🗑️ Delete Variant
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addRow("variants")}
                  className="product-btn-add"
                >
                  + Add variant
                </button>
              </div>
              {renderArrayField("features", "Features", "Key selling point", "Add feature")}
              {renderArrayField("how_to_use", "How to Use", "Usage instruction", "Add step")}
            </div>
          </section>

          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Ingredients</h2>
              <p className="text-sm text-[var(--text-muted)]">Break down formulation details.</p>
            </header>
            <div className="space-y-6">
              {renderArrayField("inci_ingredients", "INCI Ingredients", "Water (Aqua)", "Add INCI")}
              {renderArrayField("key_ingredients", "Key Ingredients", "Biotin", "Add key ingredient")}
            </div>
          </section>

          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Product Details</h2>
              <p className="text-sm text-[var(--text-muted)]">Supporting specifications and claims.</p>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="size">
                  Size
                </label>
                <input
                  id="size"
                  type="text"
                  className="product-form-input"
                  value={form.size}
                  onChange={(event) => update("size", event.target.value)}
                  placeholder="100ml"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="shelf_life">
                  Shelf Life
                </label>
                <input
                  id="shelf_life"
                  type="text"
                  className="product-form-input"
                  value={form.shelf_life}
                  onChange={(event) => update("shelf_life", event.target.value)}
                  placeholder="12 months"
                />
              </div>
            </div>
            <div className="mt-4">
              {renderArrayField("claims", "Claims", "Vegan", "Add claim")}
            </div>
          </section>

          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Related Products</h2>
              <p className="text-sm text-[var(--text-muted)]">Select products to recommend (up to 3).</p>
            </header>
            <div className="space-y-2">
              {form.related.map((productId, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={productId}
                    onChange={(e) => {
                      const updated = [...form.related];
                      updated[index] = e.target.value;
                      setForm(prev => ({ ...prev, related: updated }));
                    }}
                    className="product-form-select flex-1"
                  >
                    <option value="">Select product...</option>
                    {allProducts
                      .filter(p => !form.related.includes(p.id) || p.id === productId)
                      .map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))
                    }
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        related: prev.related.filter((_, i) => i !== index)
                      }));
                    }}
                    className="product-btn-secondary"
                  >
                    Remove
                  </button>
                </div>
              ))}

              {form.related.length < 3 && (
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    related: [...prev.related, '']
                  }))}
                  className="product-btn-add"
                >
                  + Add Related Product
                </button>
              )}
            </div>
          </section>

          {serverError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{serverError}</div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="product-btn-secondary"
              onClick={() => navigate("/products")}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`product-btn-primary ${isSubmitting ? "opacity-70" : ""}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Create Product"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className={fullscreenPreview ? "preview-fullscreen" : "rounded-2xl border border-[var(--card)] bg-[var(--card)] shadow-sm"}>
            <div className="flex gap-2 justify-between border-b border-[var(--card)] p-3 text-sm font-semibold text-[var(--text-muted)]">
              <div className="flex gap-2">
                {[
                  { id: "card", label: "Product Card" },
                  { id: "page-desktop", label: "Product Page – Desktop" },
                  { id: "page-mobile", label: "Product Page – Mobile" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPreviewTab(tab.id)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      previewTab === tab.id ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:bg-[var(--card)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setFullscreenPreview(!fullscreenPreview)}
                className="product-btn-secondary text-xs"
              >
                {fullscreenPreview ? '✕ Exit Fullscreen' : '⛶ Fullscreen'}
              </button>
            </div>
            <div className={fullscreenPreview ? "overflow-auto p-4" : "max-h-[75vh] overflow-auto p-4"}>
              {previewTab === "card" ? (
                <div className="mx-auto max-w-sm">
                  {cardModel ? (
                    <ProductCard product={cardModel} />
                  ) : (
                    <div className="text-center text-[var(--text-muted)] py-8">Loading preview...</div>
                  )}
                </div>
              ) : null}
              {previewTab === "page-desktop" ? (
                <div className={fullscreenPreview ? "desktop-preview" : "preview-container overflow-x-auto max-w-full"}>
                  <div className={fullscreenPreview ? "mx-auto max-w-[1200px]" : "min-w-[1200px] mx-auto max-w-5xl overflow-hidden rounded-xl border border-[var(--card)] shadow-sm"}>
                    {pageModel ? (
                      <ProductPageTemplate product={pageModel} isPreview={true} />
                    ) : (
                      <div className="text-center text-[var(--text-muted)] py-8">Loading preview...</div>
                    )}
                  </div>
                </div>
              ) : null}
              {previewTab === "page-mobile" ? (
                <div className={fullscreenPreview ? "mobile-preview mx-auto" : "mx-auto w-[390px] overflow-hidden rounded-xl border border-[var(--card)] shadow-sm"}>
                  {pageModel ? (
                    <ProductPageTemplate product={pageModel} isPreview={true} />
                  ) : (
                    <div className="text-center text-[var(--text-muted)] py-8">Loading preview...</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--card)] bg-[var(--card)] p-4 text-sm text-[var(--text-muted)] shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--text)]">Preview Summary</h3>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Stock Label</dt>
                <dd className="font-medium text-[var(--text)]">{stockLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Price String</dt>
                <dd className="font-medium text-[var(--text)]">{priceString}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Images</dt>
                <dd className="font-medium text-[var(--text)]">{previewImages.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
