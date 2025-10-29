import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from "../components/data/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../components/ui/ToastProvider";
import { Banner } from "../components/ui/Banner";
import BundleEditor from "../components/BundleEditor";

export default function BundleEdit() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const bundleId = urlParams.get('id');

  const { data: bundle, isLoading, error } = useQuery({
    queryKey: ['bundle', bundleId],
    queryFn: () => api.getBundle(bundleId),
    enabled: !!bundleId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.upsertBundle({ ...data, id: bundleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      queryClient.invalidateQueries({ queryKey: ['bundle', bundleId] });
      showToast('success', 'Bundle updated successfully');
      navigate(createPageUrl("Bundles"));
    },
    onError: (error) => {
      showToast('error', error.message || 'Failed to update bundle');
    },
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        Loading bundle...
      </div>
    );
  }

  if (error) {
    return <Banner type="error">{error.message || 'Failed to load bundle'}</Banner>;
  }

  if (!bundle) {
    return <Banner type="error">Bundle not found</Banner>;
  }

  return (
    <BundleEditor
      bundle={bundle}
      onSave={(data) => updateMutation.mutate(data)}
      onCancel={() => navigate(createPageUrl("Bundles"))}
      isSaving={updateMutation.isPending}
      title="Edit Bundle"
    />
  );
}