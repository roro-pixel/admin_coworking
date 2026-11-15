import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import { subscriptionService } from "../../../services/subscription.service";
import { ActionButton, ErrorBanner, PageHeader } from "../../../components/subscription/kit";
import { apiMessage } from "../../../components/subscription/kitUtils";
import { EntitlementDefinitionFields } from "./EntitlementDefinitionFields";
import { buildDefaultEntitlementFormData, buildEntitlementPayload } from "./entitlementForm";
import type { EntitlementFormData } from "./entitlementForm";

/** Page de création d'un droit. */
export const CreateEntitlementDefinition: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<EntitlementFormData>(() => buildDefaultEntitlementFormData());

  const createMutation = useMutation({
    mutationFn: () => subscriptionService.createEntitlementDefinition(buildEntitlementPayload(formData)),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["entitlement-definitions"] });
      toast.success("Droit créé");
      navigate(`/subscriptions/entitlements/${created.code}`);
    },
    onError: (error: unknown) => setErrorMessage(apiMessage(error, "Erreur lors de la création du droit.")),
  });

  const goBack = () => navigate("/subscriptions/entitlements");

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title="Nouveau droit"
          subtitle="Un droit réutilisable dans les plans, pass et souscriptions."
          onBack={goBack}
          backLabel="Droits"
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setErrorMessage(null);
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <ErrorBanner message={errorMessage} />
          <EntitlementDefinitionFields formData={formData} onChange={setFormData} disabled={createMutation.isPending} />
          <div className="flex flex-col-reverse gap-2 pb-4 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={goBack} disabled={createMutation.isPending}>
              Annuler
            </ActionButton>
            <ActionButton type="submit" pending={createMutation.isPending} disabled={!formData.name.trim()}>
              Créer le droit
            </ActionButton>
          </div>
        </form>
      </div>
      <Toaster />
    </AdminLayout>
  );
};
