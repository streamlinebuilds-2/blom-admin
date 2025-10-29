import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "../components/data/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/Toast";
import BundleEditor from "../components/BundleEditor";

export default function BundleNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const initialBundle = {
    name: "",
    slug: "",
    status: "draft",
    items: [],
    pricing_mode: "manual",
    discount_value: null,
    price_cents: 0,
    compare_at_price_cents: null,
    short_desc: "",
    long_desc: "",
    images: [],
    hover_image: ""
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.upsertBundle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      showToast('success', 'Bundle created successfully');
      navigate(createPageUrl("Bundles"));
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to create bundle');
    },
  });

  return (
    <BundleEditor
      bundle={initialBundle}
      onSave={(data) => createMutation.mutate(data)}
      onCancel={() => navigate(createPageUrl("Bundles"))}
      isSaving={createMutation.isPending}
      title="New Bundle"
    />
  );
}