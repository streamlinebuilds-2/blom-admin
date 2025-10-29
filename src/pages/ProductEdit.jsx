
import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "../components/data/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";
import ProductEditor from "../components/ProductEditor";

export default function ProductEdit() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.getProduct(productId),
    enabled: !!productId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.upsertProduct({ ...data, id: productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      showToast('success', 'Product updated successfully');
      navigate(createPageUrl("Products"));
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to update product');
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        Loading product...
      </div>
    );
  }

  if (error) {
    return <Banner type="error">{error.message || 'Failed to load product'}</Banner>;
  }

  if (!product) {
    return <Banner type="error">Product not found</Banner>;
  }

  return (
    <ProductEditor
      product={product}
      onSave={(data) => updateMutation.mutate(data)}
      onCancel={() => navigate(createPageUrl("Products"))}
      isSaving={updateMutation.isPending}
      title="Edit Product"
    />
  );
}
