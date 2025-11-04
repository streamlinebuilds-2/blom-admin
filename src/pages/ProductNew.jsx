import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProductCard } from "../../ProductCard";
import { ProductPageTemplate } from "../../ProductPageTemplate";
import { useToast } from "../components/ui/ToastProvider";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const Section = ({ title, description, children }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      ) : null}
    </div>
    <div className="grid gap-4">{children}</div>
  </section>
);

const FieldLabel = ({ label, required }) => (
  <span className="text-sm font-medium text-slate-700">
    {label}
    {required ? <span className="ml-1 text-rose-500">*</span> : null}
  </span>
);

const FieldError = ({ error }) =>
  error ? <p className="text-xs text-rose-500">{error}</p> : null;

const inputClasses = (error) =>
  `w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
    error ? "border-rose-400" : "border-slate-300"
  }`;

const Text = ({ label, value, onChange, placeholder, required, error }) => (
  <label className="flex flex-col gap-1">
    <FieldLabel label={label} required={required} />
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={inputClasses(error)}
    />
    <FieldError error={error} />
  </label>
);

const NumberField = ({ label, value, onChange, placeholder, required, min, step, error }) => (
  <label className="flex flex-col gap-1">
    <FieldLabel label={label} required={required} />
    <input
      type="number"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      min={min}
      step={step}
      className={inputClasses(error)}
    />
    <FieldError error={error} />
  </label>
);

const Textarea = ({ label, value, onChange, placeholder, rows = 4, required, error }) => (
  <label className="flex flex-col gap-1">
    <FieldLabel label={label} required={required} />
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputClasses(error)} resize-y`}
    />
    <FieldError error={error} />
  </label>
);

const Checkbox = ({ label, checked, onChange, description }) => (
  <label className="flex items-start gap-3">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
    />
    <span className="text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      {description ? (
        <span className="ml-1 block text-slate-500">{description}</span>
      ) : null}
    </span>
  </label>
);

const Select = ({ label, value, onChange, options, required, error }) => (
  <label className="flex flex-col gap-1">
    <FieldLabel label={label} required={required} />
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={inputClasses(error)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <FieldError error={error} />
  </label>
);

const ArrayText = ({ label, values = [], onChange, placeholder, addLabel = "Add", error }) => {
  const items = values.length ? values : [""];

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} />
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onChange(next);
              }}
              className={inputClasses(error)}
            />
            <button
              type="button"
              onClick={() => {
                const next = items.filter((_, idx) => idx !== index);
                onChange(next);
              }}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="inline-flex w-fit items-center gap-1 rounded-md bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
      >
        + {addLabel}
      </button>
      <FieldError error={error} />
    </div>
  );
};

const Tags = ({ label, values = [], onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setInputValue("");
      return;
    }
    onChange([...values, trimmed]);
    setInputValue("");
  };

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel label={label} />
      <div className="flex flex-wrap gap-2">
        {values.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
          >
            {tag}
            <button
              type="button"
              className="text-emerald-600 hover:text-emerald-800"
              onClick={() => {
                const next = values.filter((_, idx) => idx !== index);
                onChange(next);
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className={inputClasses()}
        />
        <button
          type="button"
          onClick={addTag}
          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        >
          Add
        </button>
      </div>
    </div>
  );
};

const initialFormState = {
  name: "",
  slug: "",
  sku: "",
  category: "",
  status: "draft",
  price: "",
  compare_at_price: "",
  short_description: "",
  overview: "",
  inventory_quantity: "0",
  track_inventory: true,
  weight: "",
  barcode: "",
  thumbnail_url: "",
  hover_url: "",
  gallery_urls: [""],
  features: [""],
  how_to_use: [""],
  inci_ingredients: [""],
  key_ingredients: [""],
  size: "",
  shelf_life: "",
  claims: [],
  meta_title: "",
  meta_description: "",
  is_active: true,
  is_featured: false,
  badges: [],
  related: [],
  variants: [""],
};

export default function ProductNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [form, setForm] = useState(initialFormState);
  const [slugLocked, setSlugLocked] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewTab, setPreviewTab] = useState("card");

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleNameChange = (value) => {
    setForm((current) => {
      const next = { ...current, name: value };
      if ((!slugLocked || !current.slug) && value) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSlugChange = (value) => {
    if (!value) {
      setSlugLocked(false);
    } else {
      setSlugLocked(true);
    }
    handleFieldChange("slug", value);
  };

  const inventoryQuantity = useMemo(() => {
    const parsed = Number(form.inventory_quantity);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }, [form.inventory_quantity]);

  const priceNumber = useMemo(() => {
    const parsed = parseFloat(form.price || "");
    return Number.isFinite(parsed) ? parsed : 0;
  }, [form.price]);

  const compareAtNumber = useMemo(() => {
    const parsed = parseFloat(form.compare_at_price || "");
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [form.compare_at_price]);

  const galleryUrls = useMemo(
    () => (form.gallery_urls || []).map((url) => url.trim()).filter(Boolean),
    [form.gallery_urls]
  );

  const images = useMemo(() => {
    const list = [form.thumbnail_url, form.hover_url, ...galleryUrls].filter(Boolean);
    return list;
  }, [form.thumbnail_url, form.hover_url, galleryUrls]);

  const previewImages = images.length
    ? images
    : ["https://via.placeholder.com/800x800.png?text=Product+Preview"];

  const stockLabel = useMemo(() => {
    if (form.status === "archived") return "Archived";
    if (inventoryQuantity > 0) return "In Stock";
    return "Out of Stock";
  }, [form.status, inventoryQuantity]);

  const priceString = useMemo(() => `R${Math.round(priceNumber || 0)}`, [priceNumber]);

  const filteredFeatures = useMemo(
    () => (form.features || []).map((item) => item.trim()).filter(Boolean),
    [form.features]
  );

  const filteredHowToUse = useMemo(
    () => (form.how_to_use || []).map((item) => item.trim()).filter(Boolean),
    [form.how_to_use]
  );

  const filteredInciIngredients = useMemo(
    () => (form.inci_ingredients || []).map((item) => item.trim()).filter(Boolean),
    [form.inci_ingredients]
  );

  const filteredKeyIngredients = useMemo(
    () => (form.key_ingredients || []).map((item) => item.trim()).filter(Boolean),
    [form.key_ingredients]
  );

  const filteredVariants = useMemo(
    () => (form.variants || []).map((item) => item.trim()).filter(Boolean),
    [form.variants]
  );

  const cardModel = useMemo(
    () => ({
      id: "temp",
      name: form.name || "New Product",
      slug: form.slug || "new-product",
      price: priceNumber,
      compareAtPrice: compareAtNumber,
      shortDescription: form.short_description || "",
      images: previewImages,
      inStock: inventoryQuantity > 0 && form.status !== "archived",
      badges: form.badges || [],
    }),
    [compareAtNumber, form.badges, form.name, form.short_description, form.slug, form.status, inventoryQuantity, previewImages, priceNumber]
  );

  const pageModel = useMemo(
    () => ({
      name: form.name || "New Product",
      slug: form.slug || "new-product",
      category: form.category || "",
      shortDescription: form.short_description || "",
      overview: form.overview || "",
      price: priceString,
      compareAtPrice: compareAtNumber !== undefined ? `R${compareAtNumber.toFixed(0)}` : undefined,
      stock: stockLabel,
      images: previewImages,
      features: filteredFeatures,
      howToUse: filteredHowToUse,
      ingredients: {
        inci: filteredInciIngredients,
        key: filteredKeyIngredients,
      },
      details: {
        size: form.size || "",
        shelfLife: form.shelf_life || "",
        claims: form.claims || [],
      },
      variants: filteredVariants,
      related: form.related || [],
      rating: 4.8,
      reviewCount: 124,
      reviews: [],
      seo: {
        title: form.meta_title || form.name || "",
        description: form.meta_description || form.short_description || "",
      },
    }),
    [compareAtNumber, filteredFeatures, filteredHowToUse, filteredInciIngredients, filteredKeyIngredients, filteredVariants, form.category, form.claims, form.meta_description, form.meta_title, form.name, form.overview, form.related, form.short_description, form.size, form.slug, form.shelf_life, priceString, previewImages, stockLabel]
  );

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.slug.trim()) nextErrors.slug = "Slug is required";
    if (!form.sku.trim()) nextErrors.sku = "SKU is required";
    if (!form.category.trim()) nextErrors.category = "Category is required";

    if (!priceNumber || priceNumber <= 0) nextErrors.price = "Price must be greater than 0";

    if (!Number.isFinite(inventoryQuantity) || inventoryQuantity < 0) {
      nextErrors.inventory_quantity = "Inventory must be 0 or greater";
    }

    if (images.length === 0) {
      nextErrors.images = "At least one image is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError(null);

    if (!validate()) {
      showToast("error", "Please fix the highlighted issues");
      return;
    }

    const stock_label = stockLabel;
    const price_string = priceString;

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      price: priceNumber,
      compare_at_price: compareAtNumber ?? null,
      short_description: form.short_description,
      description: form.overview,
      overview: form.overview,
      long_description: form.overview,
      inventory_quantity: Number.isFinite(inventoryQuantity) ? inventoryQuantity : 0,
      stock: Number.isFinite(inventoryQuantity) ? inventoryQuantity : 0,
      track_inventory: !!form.track_inventory,
      weight: form.weight ? Number(form.weight) : null,
      barcode: form.barcode ? form.barcode.trim() : null,
      thumbnail_url: form.thumbnail_url || "",
      image_url: form.thumbnail_url || "",
      hover_url: form.hover_url || "",
      gallery_urls: galleryUrls,
      gallery: galleryUrls,
      features: filteredFeatures,
      how_to_use: filteredHowToUse,
      inci_ingredients: filteredInciIngredients,
      key_ingredients: filteredKeyIngredients,
      size: form.size || "",
      shelf_life: form.shelf_life || "",
      claims: form.claims || [],
      meta_title: form.meta_title || form.name || "",
      meta_description: form.meta_description || form.short_description || "",
      is_active: !!form.is_active,
      is_featured: !!form.is_featured,
      status: form.status,
      badges: form.badges || [],
      related: form.related || [],
      stock_label,
      price_string,
      variants: filteredVariants,
    };

    try {
      setIsSubmitting(true);
      const response = await fetch("/.netlify/functions/save-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data?.ok === false) {
        const message = data?.error || data?.message || "Failed to create product";
        setServerError(message);
        showToast("error", message);
        return;
      }

      showToast("success", "Product created successfully");

      const createdProduct = data?.product || data;

      if (createdProduct && createdProduct.id) {
        navigate(`/products/edit?id=${createdProduct.id}`);
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

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-slate-900">New Product</h1>
        <p className="mt-1 text-sm text-slate-600">
          Complete the product details and preview how it will appear across the store.
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="grid gap-6">
            <Section title="Basic Information" description="Core details that describe the product.">
              <Text label="Name" value={form.name} onChange={handleNameChange} required error={errors.name} />
              <Text
                label="Slug"
                value={form.slug}
                onChange={handleSlugChange}
                placeholder="auto-generated if left blank"
                required
                error={errors.slug}
              />
              <Text label="SKU" value={form.sku} onChange={(value) => handleFieldChange("sku", value)} required error={errors.sku} />
              <Text
                label="Category"
                value={form.category}
                onChange={(value) => handleFieldChange("category", value)}
                required
                error={errors.category}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(value) => handleFieldChange("status", value)}
                options={[
                  { label: "Draft", value: "draft" },
                  { label: "Published", value: "published" },
                  { label: "Archived", value: "archived" },
                ]}
              />
              <Tags
                label="Badges"
                values={form.badges}
                onChange={(value) => handleFieldChange("badges", value)}
                placeholder="Type a badge and press Enter"
              />
            </Section>

            <Section title="Pricing & Stock" description="Manage how the product is sold and tracked.">
              <NumberField
                label="Price"
                value={form.price}
                onChange={(value) => handleFieldChange("price", value)}
                placeholder="199.00"
                required
                error={errors.price}
                min="0"
                step="0.01"
              />
              <NumberField
                label="Compare at Price"
                value={form.compare_at_price}
                onChange={(value) => handleFieldChange("compare_at_price", value)}
                placeholder="249.00"
                step="0.01"
              />
              <NumberField
                label="Inventory Quantity"
                value={form.inventory_quantity}
                onChange={(value) => handleFieldChange("inventory_quantity", value)}
                min="0"
                step="1"
                required
                error={errors.inventory_quantity}
              />
              <Checkbox
                label="Track Inventory"
                checked={form.track_inventory}
                onChange={(value) => handleFieldChange("track_inventory", value)}
              />
              <NumberField
                label="Weight (grams)"
                value={form.weight}
                onChange={(value) => handleFieldChange("weight", value)}
                placeholder="250"
                step="0.01"
              />
              <Text
                label="Barcode"
                value={form.barcode}
                onChange={(value) => handleFieldChange("barcode", value)}
                placeholder="e.g. 6001234567890"
              />
            </Section>

            <Section title="Images" description="Primary, hover and gallery imagery.">
              <Text
                label="Thumbnail URL"
                value={form.thumbnail_url}
                onChange={(value) => handleFieldChange("thumbnail_url", value)}
                placeholder="https://..."
              />
              <Text
                label="Hover URL"
                value={form.hover_url}
                onChange={(value) => handleFieldChange("hover_url", value)}
                placeholder="https://..."
              />
              <ArrayText
                label="Gallery URLs"
                values={form.gallery_urls}
                onChange={(value) => handleFieldChange("gallery_urls", value)}
                placeholder="https://..."
                addLabel="Add image"
                error={errors.images}
              />
            </Section>

            <Section title="Descriptions" description="Tell shoppers about the product.">
              <Textarea
                label="Short Description"
                value={form.short_description}
                onChange={(value) => handleFieldChange("short_description", value)}
                rows={3}
              />
              <Textarea
                label="Overview"
                value={form.overview}
                onChange={(value) => handleFieldChange("overview", value)}
                rows={6}
              />
            </Section>

            <Section title="Highlights & Usage" description="Outline benefits and usage guidance.">
              <ArrayText
                label="Features"
                values={form.features}
                onChange={(value) => handleFieldChange("features", value)}
                placeholder="Key product feature"
                addLabel="Add feature"
              />
              <ArrayText
                label="How to Use"
                values={form.how_to_use}
                onChange={(value) => handleFieldChange("how_to_use", value)}
                placeholder="Usage instruction"
                addLabel="Add step"
              />
            </Section>

            <Section title="Ingredients" description="Break down formulation details.">
              <ArrayText
                label="INCI Ingredients"
                values={form.inci_ingredients}
                onChange={(value) => handleFieldChange("inci_ingredients", value)}
                placeholder="INCI name"
                addLabel="Add ingredient"
              />
              <ArrayText
                label="Key Ingredients"
                values={form.key_ingredients}
                onChange={(value) => handleFieldChange("key_ingredients", value)}
                placeholder="Key ingredient"
                addLabel="Add key ingredient"
              />
            </Section>

            <Section title="Product Details" description="Additional merchandising attributes.">
              <Text
                label="Size"
                value={form.size}
                onChange={(value) => handleFieldChange("size", value)}
                placeholder="e.g. 100ml"
              />
              <Text
                label="Shelf Life"
                value={form.shelf_life}
                onChange={(value) => handleFieldChange("shelf_life", value)}
                placeholder="e.g. 12 months"
              />
              <Tags
                label="Claims"
                values={form.claims}
                onChange={(value) => handleFieldChange("claims", value)}
                placeholder="Type a claim and press Enter"
              />
            </Section>

            <Section title="Variants" description="List variant names such as sizes or shades.">
              <ArrayText
                label="Variants"
                values={form.variants}
                onChange={(value) => handleFieldChange("variants", value)}
                placeholder="Variant name"
                addLabel="Add variant"
              />
            </Section>

            <Section title="SEO" description="Improve how the product is discovered.">
              <Text
                label="Meta Title"
                value={form.meta_title}
                onChange={(value) => handleFieldChange("meta_title", value)}
                placeholder="Meta title"
              />
              <Textarea
                label="Meta Description"
                value={form.meta_description}
                onChange={(value) => handleFieldChange("meta_description", value)}
                rows={3}
                placeholder="Meta description"
              />
            </Section>

            <Section title="Related Products" description="Connect shoppers to complementary items.">
              <Tags
                label="Related Product IDs or Slugs"
                values={form.related}
                onChange={(value) => handleFieldChange("related", value)}
                placeholder="Enter and press Enter"
              />
            </Section>

            <Section title="Display Flags" description="Control visibility across storefront experiences.">
              <Checkbox
                label="Active"
                checked={form.is_active}
                onChange={(value) => handleFieldChange("is_active", value)}
              />
              <Checkbox
                label="Featured"
                checked={form.is_featured}
                onChange={(value) => handleFieldChange("is_featured", value)}
              />
            </Section>

            {serverError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
                {serverError}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/products")}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Create Product"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 p-3 text-sm font-semibold text-slate-600">
                {[
                  { id: "card", label: "Card" },
                  { id: "page-desktop", label: "Page – Desktop" },
                  { id: "page-mobile", label: "Page – Mobile" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPreviewTab(tab.id)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      previewTab === tab.id
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="max-h-[75vh] overflow-auto p-4">
                {previewTab === "card" ? (
                  <div className="mx-auto max-w-sm">
                    <ProductCard {...cardModel} />
                  </div>
                ) : null}
                {previewTab === "page-desktop" ? (
                  <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-slate-100 shadow-sm">
                    <ProductPageTemplate product={pageModel} />
                  </div>
                ) : null}
                {previewTab === "page-mobile" ? (
                  <div className="mx-auto w-[390px] overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                    <ProductPageTemplate product={pageModel} />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Preview Details</h3>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Stock Label</dt>
                  <dd className="font-medium text-slate-800">{stockLabel}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Price String</dt>
                  <dd className="font-medium text-slate-800">{priceString}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Images</dt>
                  <dd className="font-medium text-slate-800">{images.length}</dd>
                </div>
              </dl>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
