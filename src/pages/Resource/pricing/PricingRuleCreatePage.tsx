import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resourceService } from "../../../services/resource.service";
import type { ResourceSummaryResponse } from "../../../services/resource.service";
import { Field, PageHeader, PanelForm } from "../../../components/subscription/kit";
import { apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { DetailShell } from "../../../components/resources/resKit";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";
import { PRICING_DEFAULTS, PricingFields, pricingError, pricingPayload } from "../../../components/resources/PricingFields";
import type { PricingForm } from "../../../components/resources/PricingFields";

export const PricingRuleCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  // Depuis la fiche d'une ressource, le code arrive en paramètre pour pré-remplir le champ
  const [resourceCode, setResourceCode] = useState(params.get("resource") ?? "");
  const [selected, setSelected] = useState<ResourceSummaryResponse | null>(null);
  const [form, setForm] = useState<PricingForm>({ ...PRICING_DEFAULTS });
  const [error, setError] = useState<string | null>(null);

  const back = () => navigate("/resources?tab=pricing");
  const create = useMutation({
    mutationFn: () => resourceService.createPricingRule({ resourceCode, ...pricingPayload(form, "create") } as never),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resource-pricing-rules"] });
      await queryClient.invalidateQueries({ queryKey: ["resource-pricing"] });
      toast.success("Règle de prix créée");
      back();
    },
    onError: (e) => setError(apiMessage(e, "Création impossible")),
  });

  return (
    <DetailShell>
      <PageHeader title="Nouvelle règle de prix" subtitle="Un prix pour une ressource et une unité de réservation." onBack={back} backLabel="Retour aux tarifs" />
      <PanelForm
        title="Définition de la règle"
        onCancel={back}
        pending={create.isPending}
        submitLabel="Créer la règle"
        error={error}
        onSubmit={(e) => {
          e.preventDefault();
          if (!resourceCode) return setError("La ressource est obligatoire.");
          const msg = pricingError(form);
          if (msg) return setError(msg);
          setError(null);
          create.mutate();
        }}
      >
        <Field label="Ressource" required>
          <ResourceAutocomplete
            selectedResource={selected}
            selectedCode={resourceCode}
            onSelect={(r) => {
              setSelected(r);
              setResourceCode(r?.code || "");
            }}
            required
          />
        </Field>
        <PricingFields value={form} onChange={(patch) => setForm((p) => ({ ...p, ...patch }))} />
      </PanelForm>
    </DetailShell>
  );
};
