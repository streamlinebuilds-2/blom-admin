import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Upload, Save, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../components/ui/ToastProvider';
import { uploadToCloudinary } from '../lib/cloudinary';

export default function Featured() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current featured slots
  const { data: featuredItems, isLoading: loadingFeatured } = useQuery({
    queryKey: ['featuredItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_items')
        .select('*, products(id, name, thumbnail_url, price)')
        .order('slot_number');
      if (error) throw error;
      return data;
    }
  });

  // Fetch all active products for the dropdown
  const { data: allProducts } = useQuery({
    queryKey: ['activeProducts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, thumbnail_url')
        .eq('is_active', true)
        .order('name');
      return data || [];
    }
  });

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Featured Products</h1>
        <p className="text-[var(--text-muted)]">Select 3 products to highlight on the homepage. You can set a custom image for each.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(slotNum => {
          const item = featuredItems?.find(f => f.slot_number === slotNum) || {};
          return (
            <FeaturedSlotCard
              key={slotNum}
              slotNumber={slotNum}
              item={item}
              allProducts={allProducts}
              onSave={() => queryClient.invalidateQueries(['featuredItems'])}
              showToast={showToast}
            />
          );
        })}
      </div>
    </div>
  );
}

function FeaturedSlotCard({ slotNumber, item, allProducts, onSave, showToast }) {
  const [productId, setProductId] = useState(item.product_id || '');
  const [customImage, setCustomImage] = useState(item.custom_image_url || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when data loads
  React.useEffect(() => {
    setProductId(item.product_id || '');
    setCustomImage(item.custom_image_url || '');
  }, [item]);

  const selectedProduct = allProducts?.find(p => p.id === productId);

  // Fallback preview: custom image -> product thumb -> placeholder
  const previewImage = customImage || selectedProduct?.thumbnail_url;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch('/.netlify/functions/save-featured', {
        method: 'POST',
        body: JSON.stringify({
          slot_number: slotNumber,
          product_id: productId,
          custom_image_url: customImage
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('success', `Slot ${slotNumber} updated!`);
      onSave();
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to save slot');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('info', 'Uploading image...');
      const result = await uploadToCloudinary(file, `featured-slot-${slotNumber}`);
      setCustomImage(result.hero); // Use the hero image URL
      showToast('success', 'Image uploaded ready to save');
    } catch (err) {
      console.error(err);
      showToast('error', 'Upload failed');
    }
  };

  return (
    <div className="section-card flex flex-col h-full">
      <div className="font-bold text-lg mb-4 border-b border-[var(--border)] pb-2">
        Position #{slotNumber}
      </div>

      {/* Image Preview */}
      <div className="aspect-[4/5] bg-[var(--bg)] rounded-xl mb-4 overflow-hidden relative group border border-[var(--border)]">
        {previewImage ? (
          <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
            <ImageIcon size={32} className="mb-2 opacity-50" />
            <span className="text-sm">No Product Selected</span>
          </div>
        )}

        {/* Overlay for Upload */}
        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
          <Upload size={24} className="mb-2" />
          <span className="text-sm font-medium">Change Featured Image</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>

        {customImage && (
           <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
             Custom Image Active
           </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4 flex-1">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Select Product</label>
          <select
            className="select w-full"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">-- Empty Slot --</option>
            {allProducts?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {customImage && (
          <button
            onClick={() => setCustomImage('')}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <X size={12} /> Remove custom image (use product default)
          </button>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--border)]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isSaving ? 'Saving...' : <><Save size={16} /> Save Slot</>}
        </button>
      </div>
    </div>
  );
}
