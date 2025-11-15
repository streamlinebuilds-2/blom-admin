import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { ProductPageTemplate } from "../../ProductPageTemplate";
import { useToast } from "../components/ui/ToastProvider";
import { supabase } from "@/components/supabaseClient";

const slugify = (value) =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const generateSKU = () => {
  const prefix = "SKU";
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

const initialFormState = {
  name: "",
  slug: "",
  sku: generateSKU(),
  category: "",
  price: "",
  compare_at_price: "",
  inventory_quantity: "0",
  track_inventory: true,
  weight: "",
  barcode: "",
  short_description: "",
  overview: "",
  thumbnail_url: "",
  hover_url: "",
  gallery_urls: [""],
  variants: [{ label: "", image: "" }],
  features: [""],
  how_to_use: [""],
  inci_ingredients: [""],
  key_ingredients: [""],
  size: "",
  shelf_life: "",
  claims: [""],
  meta_title: "",
  meta_description: "",
  is_active: true,
  is_featured: false,
  status: "published",
  badges: [""],
  related: [""],
};

const ensureList = (value) => {
  if (Array.isArray(value) && value.length > 0) return value;
  return [""];
};

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [previewTab, setPreviewTab] = useState("card");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    const data = await response.json();
    return data.secure_url;
  };

  const handleVariantImageUpload = async (index, file) => {
    if (!file) return;

    try {
      showToast('info', 'Uploading variant image...');
      const url = await uploadToCloudinary(file);

      const current = form.variants[index];
      const updated = typeof current === "string"
        ? { label: current, image: url }
        : { ...current, image: url };

      updateArr("variants", index, updated);
      showToast('success', 'Variant image uploaded');
    } catch (error) {
      showToast('error', 'Image upload failed');
      console.error('Variant image upload error:', error);
    }
  };

  // Load product from database
  useEffect(() => {
    console.log('ProductEdit mounted, ID:', id);

    async function loadProduct() {
      if (!id) {
        console.error('No product ID provided');
        setLoading(false);
        navigate('/products');
        return;
      }

      console.log('Loading product with ID:', id);
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Failed to load product:', error);
          showToast('error', 'Failed to load product');
          setLoading(false);
          return;
        }

        if (product) {
          console.log('Product loaded successfully:', product);
          // Pre-fill form with ALL database values
          setForm({
            id: product.id,
            name: product.name || '',
            slug: product.slug || '',
            sku: product.sku || generateSKU(),
            category: product.category || '',
            status: product.status || 'published',
            price: product.price?.toString() || (product.price_cents ? (product.price_cents / 100).toString() : ''),
            compare_at_price: product.compare_at_price?.toString() || (product.compare_at_price_cents ? (product.compare_at_price_cents / 100).toString() : ''),
            inventory_quantity: (product.inventory_quantity || product.stock || product.stock_on_hand || product.stock_qty || 0).toString(),
            track_inventory: product.track_inventory ?? true,
            weight: product.weight?.toString() || '',
            barcode: product.barcode || '',
            short_description: product.short_description || product.short_desc || '',
            overview: product.overview || product.long_description || product.description || '',
            thumbnail_url: product.thumbnail_url || product.image_url || '',
            hover_url: product.hover_url || '',
            gallery_urls: Array.isArray(product.gallery_urls) && product.gallery_urls.length > 0
              ? product.gallery_urls
              : (Array.isArray(product.gallery) && product.gallery.length > 0
                ? product.gallery
                : ['']),
            variants: Array.isArray(product.variants) && product.variants.length > 0
              ? product.variants
              : [{ label: "", image: "" }],
            features: Array.isArray(product.features) && product.features.length > 0
              ? product.features
              : [''],
            how_to_use: Array.isArray(product.how_to_use) && product.how_to_use.length > 0
              ? product.how_to_use
              : [''],
            inci_ingredients: Array.isArray(product.inci_ingredients) && product.inci_ingredients.length > 0
              ? product.inci_ingredients
              : [''],
            key_ingredients: Array.isArray(product.key_ingredients) && product.key_ingredients.length > 0
              ? product.key_ingredients
              : [''],
            size: product.size || '',
            shelf_life: product.shelf_life || '',
            claims: Array.isArray(product.claims) && product.claims.length > 0
              ? product.claims
              : [''],
            meta_title: product.meta_title || '',
            meta_description: product.meta_description || '',
            is_active: product.is_active ?? true,
            is_featured: product.is_featured ?? false,
            badges: Array.isArray(product.badges) && product.badges.length > 0
              ? product.badges
              : [''],
            related: Array.isArray(product.related) && product.related.length > 0
              ? product.related
              : [''],
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading product:', err);
        showToast('error', 'Error loading product');
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

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
        next.push({ label: "", image: "" });
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
        return { ...previous, [field]: next.length ? next : [{ label: "", image: "" }] };
      }
      return { ...previous, [field]: next.length ? next : [""] };
    });
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

  const galleryUrls = useMemo(
    () => ensureList(form.gallery_urls).map((url) => url.trim()).filter(Boolean),
    [form.gallery_urls]
  );

  const badges = useMemo(
    () => ensureList(form.badges).map((item) => item.trim()).filter(Boolean),
    [form.badges]
  );

  const claims = useMemo(
    () => ensureList(form.claims).map((item) => item.trim()).filter(Boolean),
    [form.claims]
  );

  const related = useMemo(
    () => ensureList(form.related).map((item) => item.trim()).filter(Boolean),
    [form.related]
  );

  const variants = useMemo(() => {
    const list = ensureList(form.variants);
    return list
      .map((item) => {
        if (typeof item === "string") {
          return item.trim() ? { label: item.trim(), image: "" } : null;
        }
        return (item?.label?.trim() || item?.image?.trim()) ? {
          label: item.label?.trim() || "",
          image: item.image?.trim() || ""
        } : null;
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
    const list = [primary, hover, ...galleryUrls].filter(Boolean);
    return list;
  }, [form.thumbnail_url, form.hover_url, galleryUrls]);

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
      id: form.id || "product-preview",
      name: form.name || "Product",
      slug: form.slug || "product",
      price_cents: Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : 0,
      compare_at_price_cents: compareAtNumber ? Math.round(compareAtNumber * 100) : undefined,
      short_desc: form.short_description || "",
      images: previewImages,
      stock_qty: form.status !== "archived" && inStock ? inventoryQuantityNumber : 0,
      badges,
    }),
    [badges, form.id, form.name, form.short_description, form.slug, form.status, inStock, inventoryQuantityNumber, previewImages, priceNumber, compareAtNumber]
  );

  const pageModel = useMemo(
    () => ({
      name: form.name || "Product",
      slug: form.slug || "product",
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
        title: form.meta_title?.trim() || form.name || "",
        description: form.meta_description?.trim() || form.short_description || "",
      },
    }),
    [
      claims,
      compareAtNumber,
      features,
      form.category,
      form.meta_description,
      form.meta_title,
      form.name,
      form.overview,
      form.short_description,
      form.size,
      form.slug,
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");

    // Validate
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.slug.trim()) nextErrors.slug = "Slug is required";
    if (!form.sku.trim()) nextErrors.sku = "SKU is required";
    if (!form.category.trim()) nextErrors.category = "Category is required";

    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      nextErrors.price = "Price must be greater than 0";
    }

    if (!Number.isFinite(inventoryQuantityNumber) || inventoryQuantityNumber < 0) {
      nextErrors.inventory_quantity = "Inventory must be zero or greater";
    }

    if (images.length === 0) {
      nextErrors.images = "Add at least one product image";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast("error", "Please fix the highlighted fields");
      return;
    }

    const payload = {
      id: form.id, // CRITICAL - include ID for update
      name: form.name.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      status: form.status,
      price: Number.isFinite(priceNumber) ? priceNumber : 0,
      compare_at_price: Number.isFinite(compareAtNumber ?? Number.NaN) ? compareAtNumber : null,
      inventory_quantity: Number.isFinite(inventoryQuantityNumber) ? inventoryQuantityNumber : 0,
      track_inventory: Boolean(form.track_inventory),
      weight: weightNumber,
      barcode: form.barcode?.trim() || null,
      short_description: form.short_description,
      overview: form.overview,
      description: form.overview,
      thumbnail_url: form.thumbnail_url?.trim() || "",
      hover_url: form.hover_url?.trim() || "",
      gallery_urls: galleryUrls,
      variants,
      features,
      how_to_use: howToUse,
      inci_ingredients: inciIngredients,
      key_ingredients: keyIngredients,
      size: form.size,
      shelf_life: form.shelf_life,
      claims,
      meta_title: form.meta_title,
      meta_description: form.meta_description,
      is_active: Boolean(form.is_active),
      is_featured: Boolean(form.is_featured),
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
        body: JSON.stringify({ action: "update_product", payload }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        const message = data?.error || data?.message || "Failed to update product";
        setServerError(message);
        showToast("error", message);
        return;
      }

      showToast("success", "Product updated successfully");
      navigate("/products");
    } catch (error) {
      const message = error?.message || "Failed to update product";
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

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center py-12">
          <div style={{
            width: '32px',
            height: '32px',
            border: '4px solid var(--card)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Product Form Styling - Matching ProductNew */
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
          align-items: center;
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
      `}</style>
      <div className="flex h-full flex-col">
        <div className="topbar">
          <div className="font-bold text-lg">Edit Product</div>
          <div className="text-sm text-[var(--text-muted)]">Update product details and preview changes.</div>
        </div>

        <div className="content-area grid grid-cols-1 gap-6 xl:grid-cols-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Basic Information</h2>
              <p className="text-sm text-[var(--text-muted)]">Name, slug and classification for the product.</p>
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
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  id="slug"
                  type="text"
                  className="product-form-input"
                  value={form.slug}
                  onChange={(event) => update("slug", event.target.value)}
                  placeholder="base-44-nail-strengthener"
                />
                {errors.slug ? <p className="text-xs text-red-500">{errors.slug}</p> : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="sku">
                  SKU <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="sku"
                    type="text"
                    className="product-form-input flex-1"
                    value={form.sku}
                    onChange={(event) => update("sku", event.target.value)}
                    placeholder="Auto-generated"
                  />
                  <button
                    type="button"
                    className="product-btn-secondary"
                    onClick={() => update("sku", generateSKU())}
                  >
                    Generate
                  </button>
                </div>
                {errors.sku ? <p className="text-xs text-red-500">{errors.sku}</p> : null}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  id="category"
                  type="text"
                  className="product-form-input"
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                  placeholder="Treatments"
                />
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
                  <option value="published">Published</option>
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
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="barcode">
                  Barcode
                </label>
                <input
                  id="barcode"
                  type="text"
                  className="product-form-input"
                  value={form.barcode}
                  onChange={(event) => update("barcode", event.target.value)}
                  placeholder="6001234567890"
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
              <p className="text-sm text-[var(--text-muted)]">Primary, hover and gallery imagery.</p>
            </header>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="thumbnail_url">
                  Thumbnail URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="thumbnail_url"
                    type="url"
                    className="product-form-input flex-1"
                    value={form.thumbnail_url}
                    onChange={(event) => update("thumbnail_url", event.target.value)}
                    placeholder="https://..."
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
                          showToast('info', 'Uploading...');
                          const url = await uploadToCloudinary(file);
                          update("thumbnail_url", url);
                          showToast('success', 'Image uploaded');
                        } catch (err) {
                          showToast('error', 'Upload failed');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="hover_url">
                  Hover URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="hover_url"
                    type="url"
                    className="product-form-input flex-1"
                    value={form.hover_url}
                    onChange={(event) => update("hover_url", event.target.value)}
                    placeholder="https://..."
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
                          showToast('info', 'Uploading...');
                          const url = await uploadToCloudinary(file);
                          update("hover_url", url);
                          showToast('success', 'Image uploaded');
                        } catch (err) {
                          showToast('error', 'Upload failed');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[var(--text)]">Gallery URLs</label>
                  {errors.images ? (
                    <span className="text-xs font-medium text-red-500">{errors.images}</span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {ensureList(form.gallery_urls).map((item, index) => (
                    <div key={`gallery_urls-${index}`} className="flex gap-2">
                      <input
                        type="text"
                        className="product-form-input flex-1"
                        value={item}
                        placeholder="https://..."
                        onChange={(event) => updateArr("gallery_urls", index, event.target.value)}
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
                              showToast('info', 'Uploading...');
                              const url = await uploadToCloudinary(file);
                              updateArr("gallery_urls", index, url);
                              showToast('success', 'Image uploaded');
                            } catch (err) {
                              showToast('error', 'Upload failed');
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeRow("gallery_urls", index)}
                        className="product-btn-secondary"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addRow("gallery_urls")}
                  className="product-btn-add"
                >
                  + Add image
                </button>
                {errors.images ? (
                  <p className="text-xs text-red-500">{errors.images}</p>
                ) : null}
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
                <small className="text-xs text-[var(--text-muted)] block mb-2">e.g., different sizes or colors with unique images</small>
                <div className="space-y-3">
                  {ensureList(form.variants).map((variant, index) => (
                    <div key={`variant-${index}`} className="variant-row">
                      <input
                        type="text"
                        placeholder="Variant name (e.g. 250ml, Pink)"
                        className="product-form-input"
                        style={{ flex: 2 }}
                        value={variant?.label || variant}
                        onChange={(e) => {
                          const current = form.variants[index];
                          const updated = typeof current === "string"
                            ? { label: e.target.value, image: "" }
                            : { ...current, label: e.target.value };
                          updateArr("variants", index, updated);
                        }}
                      />
                      <div className="variant-image-upload">
                        <input
                          type="file"
                          accept="image/*"
                          id={`edit-variant-${index}`}
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleVariantImageUpload(index, file);
                          }}
                        />
                        <label htmlFor={`edit-variant-${index}`} className="upload-btn">
                          {variant?.image ? '📷 Change' : '📷 Upload'}
                        </label>
                        {variant?.image && (
                          <img
                            src={variant.image}
                            alt={variant?.label || 'Variant'}
                            className="variant-thumbnail"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow("variants", index)}
                        className="product-btn-secondary"
                      >
                        Remove
                      </button>
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
              <h2 className="text-lg font-semibold text-[var(--text)]">SEO</h2>
              <p className="text-sm text-[var(--text-muted)]">Meta information for search engines.</p>
            </header>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="meta_title">
                  Meta Title
                </label>
                <input
                  id="meta_title"
                  type="text"
                  className="product-form-input"
                  value={form.meta_title}
                  onChange={(event) => update("meta_title", event.target.value)}
                  placeholder="Base 44 | Nail Strengthener"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-[var(--text)]" htmlFor="meta_description">
                  Meta Description
                </label>
                <textarea
                  id="meta_description"
                  className={textareaClass(false)}
                  rows={3}
                  value={form.meta_description}
                  onChange={(event) => update("meta_description", event.target.value)}
                  placeholder="Boost your nails with Base 44's restorative strengthener."
                />
              </div>
            </div>
          </section>

          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Display Settings</h2>
              <p className="text-sm text-[var(--text-muted)]">Control visibility across storefront experiences.</p>
            </header>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 text-sm font-medium text-[var(--text)]" htmlFor="is_active">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => update("is_active", event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--card)]"
                />
                Active
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-[var(--text)]" htmlFor="is_featured">
                <input
                  id="is_featured"
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(event) => update("is_featured", event.target.checked)}
                  className="h-4 w-4 rounded border-[var(--card)]"
                />
                Featured product
              </label>
            </div>
          </section>

          <section className="product-form-section">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text)]">Related Products</h2>
              <p className="text-sm text-[var(--text-muted)]">Surface complementary products by ID or slug.</p>
            </header>
            {renderArrayField("related", "Related Product IDs or Slugs", "product-slug", "Add related product")}
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
              {isSubmitting ? "Saving..." : "Update Product"}
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--card)] bg-[var(--card)] shadow-sm">
            <div className="flex gap-2 border-b border-[var(--card)] p-3 text-sm font-semibold text-[var(--text-muted)]">
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
            <div className="max-h-[75vh] overflow-auto p-4">
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
                <div className="relative">
                  <div className="preview-container overflow-x-auto max-w-full">
                    <div className="min-w-[1200px] mx-auto max-w-5xl overflow-hidden rounded-xl border border-[var(--card)] shadow-sm">
                      {pageModel ? (
                        <ProductPageTemplate product={pageModel} />
                      ) : (
                        <div className="text-center text-[var(--text-muted)] py-8">Loading preview...</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
              {previewTab === "page-mobile" ? (
                <div className="mx-auto w-[390px] overflow-hidden rounded-xl border border-[var(--card)] shadow-sm">
                  {pageModel ? (
                    <ProductPageTemplate product={pageModel} />
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
