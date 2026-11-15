import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resourceService } from "../../../services/resource.service";
import { PageHeader, PanelForm } from "../../../components/subscription/kit";
import { apiMessage } from "../../../components/subscription/kitUtils";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { DetailShell } from "../../../components/resources/resKit";
import { RESOURCE_DEFAULTS, ResourceFields, resourceError } from "../../../components/resources/ResourceFields";
import type { ResourceForm } from "../../../components/resources/ResourceFields";

export const ResourceCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ResourceForm>({ ...RESOURCE_DEFAULTS });
  const [error, setError] = useState<string | null>(null);

  const typesQuery = useQuery({ queryKey: ["resource-types-list"], queryFn: () => resourceService.getResourceTypes({ size: 500 }) });
  const groupsQuery = useQuery({ queryKey: ["resource-groups-list"], queryFn: () => resourceService.getResourceGroups({ size: 500 }) });
  const policiesQuery = useQuery({ queryKey: ["resource-policies-list"], queryFn: () => resourceService.getResourcePolicies({ size: 500 }) });
  const loading = typesQuery.isLoading || groupsQuery.isLoading || policiesQuery.isLoading;

  const create = useMutation({
    mutationFn: () =>
      resourceService.createResource({
        typeId: form.typeCode,
        groupId: form.groupCode || undefined,
        policyId: form.policyCode || undefined,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        capacity: form.capacity,
        zone: form.zone.trim() || undefined,
        locationLabel: form.locationLabel.trim() || undefined,
        status: form.status,
        bookingEnabled: form.bookingEnabled,
        portalVisible: form.portalVisible,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Ressource créée");
      navigate("/resources");
    },
    onError: (e) => setError(apiMessage(e, "Création impossible")),
  });

  return (
    <DetailShell>
      <PageHeader title="Nouvelle ressource" subtitle="Informations générales, classement et règles d'affichage." onBack={() => navigate("/resources")} backLabel="Retour aux ressources" />
      {loading ? (
        <DetailsSkeleton />
      ) : (
        <PanelForm
          title="Informations de la ressource"
          onCancel={() => navigate("/resources")}
          pending={create.isPending}
          submitLabel="Créer la ressource"
          error={error}
          onSubmit={(e) => {
            e.preventDefault();
            const msg = resourceError(form);
            if (msg) return setError(msg);
            setError(null);
            create.mutate();
          }}
        >
          <ResourceFields
            value={form}
            onChange={(patch) => setForm((p) => ({ ...p, ...patch }))}
            types={(typesQuery.data?.content ?? []).filter((t) => t.active)}
            groups={(groupsQuery.data?.content ?? []).filter((g) => g.active)}
            policies={(policiesQuery.data?.content ?? []).filter((p) => p.active)}
          />
        </PanelForm>
      )}
    </DetailShell>
  );
};
