import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "../components/data/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/ToastProvider";
import BundleEditor from "../components/BundleEditor";

export default function BundleNew() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Initial bundle fields
  const initialBundle = {
    name: "",
    slug: "",
    status: "draft",
    items: [], // products will be selected via BundleEditor
    pricing_mode: "manual", // manual | percent_off | amount_off
    discount_value: null,
    price_cents: 0,
    compare_at_price_cents: null,
    short_desc: "",
    long_desc: "",
    images: [],
    hover_image: "",
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.upsertBundle(data),
    onSuccess: () => {
      // Invalidate bundles list and show toast
      queryClient.invalidateQueries({ queryKey: ["bundles"] });
      showToast("success", "Bundle created successfully");
      // Navigate to edit page or back to list
      navigate(createPageUrl("Bundles"));
    },
    onError: (error) => {
      showToast("error", error.message || "Failed to create bundle");
    },
  });

  return (
    <>
      <div className="topbar">
        <div className="font-bold">New Bundle</div>
      </div>
      <div className="content-area">
        <BundleEditor
          bundle={initialBundle}
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => navigate(createPageUrl("Bundles"))}
          isSaving={createMutation.isPending}
          title="New Bundle"
        />
      </div>
    </>
  );
}
