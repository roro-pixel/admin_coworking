import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Tags } from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { subscriptionService } from "../../../services/subscription.service";
import {
  buildDefaultEntitlementFormData,
  buildEntitlementPayload,
  EntitlementDefinitionFields,
  type EntitlementFormData,
} from "./EntitlementDefinitionFields";

export const CreateEntitlementDefinition: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<EntitlementFormData>(() => buildDefaultEntitlementFormData());

  const createMutation = useMutation({
    mutationFn: () => subscriptionService.createEntitlementDefinition(buildEntitlementPayload(formData)),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["entitlement-definitions"] });
      navigate(`/subscriptions/entitlements/${created.code}`);
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message ?? "Erreur lors de la création du droit.");
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    createMutation.mutate();
  };

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl pb-10">
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
                <Tags size={16} /> Droits d’abonnement
              </div>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">Créer un droit</h1>
              <p className="mt-1 text-sm text-gray-500">Définissez un droit réutilisable dans vos plans, passes et souscriptions.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/subscriptions/entitlements")}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !formData.name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Créer le droit
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <EntitlementDefinitionFields formData={formData} onChange={setFormData} />
      </form>
    </AdminLayout>
  );
};
