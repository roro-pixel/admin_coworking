import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Edit, Loader2, Save, Tags, X, XCircle } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { subscriptionService } from "../../../services/subscription.service";
import type { EntitlementDefinition } from "../../../services/subscription.service";
import {
  buildDefaultEntitlementFormData,
  buildEntitlementPayload,
  consumptionModeLabels,
  DetailValue,
  EntitlementDefinitionFields,
  entitlementTypeLabels,
  resetPolicyLabels,
  type EntitlementFormData,
  unitLabels,
} from "./EntitlementDefinitionFields";

export const EntitlementDefinitionDetail: React.FC = () => {
  const { code } = useParams();
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
    queryFn: () => subscriptionService.getEntitlementDefinition(code!),
    enabled: !!code,
  });

  useEffect(() => {
    if (entitlement) {
      setFormData(buildDefaultEntitlementFormData(entitlement));
    }
  }, [entitlement]);

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<EntitlementDefinition>) => subscriptionService.updateEntitlementDefinition(code!, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["entitlement-definition", code], updated);
      queryClient.invalidateQueries({ queryKey: ["entitlement-definitions"] });
      setIsEditing(false);
      setErrorMessage(null);
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message ?? "Erreur lors de la modification du droit.");
    },
  });

  const handleSave = () => {
    setErrorMessage(null);
    updateMutation.mutate(buildEntitlementPayload(formData));
  };

  const startEditing = () => {
    setFormData(buildDefaultEntitlementFormData(entitlement));
    setErrorMessage(null);
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-primary-600" size={36} />
        </div>
      </AdminLayout>
    );
  }

  if (error || !entitlement) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700">Droit introuvable.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl pb-10">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate("/subscriptions/entitlements")}
              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary-600">
                <Tags size={16} /> {entitlement.code}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{entitlement.name}</h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    entitlement.active ? "bg-green-50 text-green-700 ring-1 ring-green-100" : "bg-gray-100 text-gray-600 ring-1 ring-gray-200"
                  }`}
                >
                  {entitlement.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {entitlement.active ? "Actif" : "Inactif"}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">Détail et paramètres de consommation du droit.</p>
            </div>
          </div>

          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(buildDefaultEntitlementFormData(entitlement));
                    setIsEditing(false);
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <X size={16} /> Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateMutation.isPending || !formData.name.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                <Edit size={16} /> Modifier
              </button>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {isEditing ? (
          <EntitlementDefinitionFields formData={formData} onChange={setFormData} />
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Informations générales</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <DetailValue label="Code" value={<span className="font-mono">{entitlement.code}</span>} />
                <DetailValue label="Type" value={entitlementTypeLabels[entitlement.entitlementType] ?? entitlement.entitlementType} />
                <DetailValue label="Nom" value={entitlement.name} />
                <DetailValue label="Unité" value={unitLabels[entitlement.unit] ?? entitlement.unit} />
                <div className="md:col-span-2">
                  <DetailValue label="Description" value={entitlement.description} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Consommation</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <DetailValue label="Mode" value={consumptionModeLabels[entitlement.consumptionMode] ?? entitlement.consumptionMode} />
                <DetailValue label="Reset" value={resetPolicyLabels[entitlement.resetPolicy] ?? entitlement.resetPolicy} />
                <DetailValue label="Cumulable" value={entitlement.stackable ? "Oui" : "Non"} />
                <DetailValue label="Transférable" value={entitlement.transferable ? "Oui" : "Non"} />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm shadow-gray-200/70 ring-1 ring-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Ressources et métadonnées</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <DetailValue label="Type de ressource" value={entitlement.resourceTypeCode} />
                <DetailValue label="Groupe de ressources" value={entitlement.resourceGroupCode} />
                <div className="md:col-span-2">
                  <DetailValue
                    label="Métadonnées JSON"
                    value={
                      entitlement.metadataJson ? (
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-gray-700">{entitlement.metadataJson}</pre>
                      ) : undefined
                    }
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
