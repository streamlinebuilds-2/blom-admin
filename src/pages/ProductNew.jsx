
import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "../components/data/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/Toast";
import ProductEditor from "../components/ProductEditor";

export default function ProductNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const initialProduct = {
    name: "",
    status: "draft",
    price_cents: 0,
    compare_at_price_cents: null,
    stock_qty: 0,
    slug: "",
    short_desc: ""
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.upsertProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('success', 'Product created successfully');
      navigate(createPageUrl("Products"));
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to create product');
    },
  });

  return (
    <ProductEditor
      product={initialProduct}
      onSave={(data) => createMutation.mutate(data)}
      onCancel={() => navigate(createPageUrl("Products"))}
      isSaving={createMutation.isPending}
      title="New Product"
    />
  );
}
