import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Boxes, Gauge, Pencil, Power, Tags } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import { subscriptionService } from "../../../services/subscription.service";
import type { EntitlementDefinition } from "../../../services/subscription.service";
import {
  ActionButton,
  Detail,
  ErrorBanner,
  ErrorBlock,
  PageHeader,
  Section,
  StatusChip,
} from "../../../components/subscription/kit";
import { apiMessage } from "../../../components/subscription/kitUtils";
import { EntitlementDefinitionFields } from "./EntitlementDefinitionFields";
import {
  MODE_LABEL,
  RESET_LABEL,
  TYPE_LABEL,
  UNIT_LABEL,
  buildDefaultEntitlementFormData,
  buildEntitlementPayload,
} from "./entitlementForm";
import type { EntitlementFormData } from "./entitlementForm";

/** Page détail et modification d'un droit. */
export const EntitlementDefinitionDetail: React.FC = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<EntitlementFormData>(() => buildDefaultEntitlementFormData());

  const {
    data: entitlement,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["entitlement-definition", code],
    queryFn: () => subscriptionService.getEntitlementDefinition(code),
    enabled: !!code,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<EntitlementDefinition>) => subscriptionService.updateEntitlementDefinition(code, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["entitlement-definition", code], updated);
      queryClient.invalidateQueries({ queryKey: ["entitlement-definitions"] });
      setIsEditing(false);
      setErrorMessage(null);
      toast.success("Droit enregistré");
    },
    onError: (e: unknown) => setErrorMessage(apiMessage(e, "Erreur lors de la modification du droit.")),
  });

  // Activation / désactivation : toast de confirmation, l'erreur de l'API y est affichée
  const toggleMutation = useMutation({
    mutationFn: (active: boolean) => subscriptionService.updateEntitlementDefinition(code, { active }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["entitlement-definition", code], updated);
      queryClient.invalidateQueries({ queryKey: ["entitlement-definitions"] });
    },
  });

  const askToggle = () => {
    if (!entitlement) return;
    const off = entitlement.active;
    toast.confirm({
      message: off ? "Désactiver ce droit ?" : "Réactiver ce droit ?",
      detail: entitlement.name,
      confirmLabel: off ? "Désactiver" : "Réactiver",
      pendingLabel: off ? "Désactivation en cours" : "Réactivation en cours",
      successMessage: off ? "Droit désactivé" : "Droit réactivé",
      errorMessage: "La mise à jour a échoué",
      tone: off ? "danger" : "primary",
      onConfirm: () => toggleMutation.mutateAsync(!off),
    });
  };

  const startEditing = () => {
    setFormData(buildDefaultEntitlementFormData(entitlement));
    setErrorMessage(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setErrorMessage(null);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </AdminLayout>
    );
  }

  if (error || !entitlement) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <PageHeader title="Droit introuvable" onBack={() => navigate("/subscriptions/entitlements")} backLabel="Droits" />
          <ErrorBlock message="Ce droit n'existe pas ou n'est plus accessible." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title={entitlement.name}
          subtitle={<span className="font-mono">{entitlement.code}</span>}
          badge={
            <StatusChip tone={entitlement.active ? "success" : "neutral"}>
              {entitlement.active ? "Actif" : "Inactif"}
            </StatusChip>
          }
          actions={
            isEditing ? (
              <>
                <ActionButton variant="ghost" onClick={cancelEditing} disabled={updateMutation.isPending}>
                  Annuler
                </ActionButton>
                <ActionButton
                  pending={updateMutation.isPending}
                  disabled={!formData.name.trim()}
                  onClick={() => {
                    setErrorMessage(null);
                    updateMutation.mutate(buildEntitlementPayload(formData));
                  }}
                >
                  Enregistrer
                </ActionButton>
              </>
            ) : (
              <>
                <ActionButton icon={Pencil} onClick={startEditing}>
                  Modifier
                </ActionButton>
                <ActionButton variant={entitlement.active ? "danger" : "ghost"} icon={Power} onClick={askToggle}>
                  {entitlement.active ? "Désactiver" : "Réactiver"}
                </ActionButton>
              </>
            )
          }
          onBack={() => navigate("/subscriptions/entitlements")}
          backLabel="Droits"
        />

        <div className="space-y-4">
          <ErrorBanner message={errorMessage} />

          {isEditing ? (
            <EntitlementDefinitionFields formData={formData} onChange={setFormData} disabled={updateMutation.isPending} />
          ) : (
            <>
              <Section title="Informations générales" icon={Tags}>
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  <Detail label="Type">{TYPE_LABEL[entitlement.entitlementType] ?? entitlement.entitlementType}</Detail>
                  <Detail label="Unité">{UNIT_LABEL[entitlement.unit] ?? entitlement.unit}</Detail>
                  <Detail label="Description" wide>
                    {entitlement.description}
                  </Detail>
                </div>
              </Section>

              <Section title="Consommation" icon={Gauge}>
                <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  <Detail label="Mode">{MODE_LABEL[entitlement.consumptionMode] ?? entitlement.consumptionMode}</Detail>
                  <Detail label="Reset">{RESET_LABEL[entitlement.resetPolicy] ?? entitlement.resetPolicy}</Detail>
                  <Detail label="Cumulable">{entitlement.stackable ? "Oui" : "Non"}</Detail>
                  <Detail label="Transférable">{entitlement.transferable ? "Oui" : "Non"}</Detail>
                </div>
              </Section>

              {(entitlement.resourceTypeCode || entitlement.resourceGroupCode || entitlement.metadataJson) && (
                <Section title="Ressources et métadonnées" icon={Boxes}>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                    <Detail label="Type de ressource" mono>
                      {entitlement.resourceTypeCode}
                    </Detail>
                    <Detail label="Groupe de ressources" mono>
                      {entitlement.resourceGroupCode}
                    </Detail>
                    {entitlement.metadataJson && (
                      <Detail label="Métadonnées JSON" wide>
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs font-normal leading-5 text-gray-700">
                          {entitlement.metadataJson}
                        </pre>
                      </Detail>
                    )}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
      <Toaster />
    </AdminLayout>
  );
};
