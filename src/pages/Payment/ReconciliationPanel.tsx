import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, Loader2, RotateCcw, AlertCircle } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";

export const ReconciliationPanel: React.FC = () => {
  const { admin } = useAuth();

  const [provider, setProvider] = useState("CASH");
  const [createdBatch, setCreatedBatch] = useState<{
    batchNumber: string;
    status: string;
  } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [completeSuccess, setCompleteSuccess] = useState(false);

  // createReconciliationBatch
  const createMutation = useMutation({
    mutationFn: () =>
      paymentService.createReconciliationBatch({
        provider,
        createdBy: admin?.email || "admin",
      }),
    onSuccess: (data) => {
      setCreatedBatch(data);
      setCreateError(null);
    },
    onError: (error: any) => {
      setCreateError(
        error?.response?.data?.message || "Erreur lors de la création du lot.",
      );
    },
  });

  // completeReconciliationBatch
  const completeMutation = useMutation({
    mutationFn: () =>
      paymentService.completeReconciliationBatch(createdBatch!.batchNumber),
    onSuccess: () => {
      setCompleteSuccess(true);
      setCompleteError(null);
    },
    onError: (error: any) => {
      setCompleteError(
        error?.response?.data?.message || "Erreur lors de la clôture du lot.",
      );
    },
  });

  const reset = () => {
    setCreatedBatch(null);
    setCreateError(null);
    setCompleteError(null);
    setCompleteSuccess(false);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Réconciliation
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Créez un lot de réconciliation pour rapprocher les paiements avec le
        fournisseur.
      </p>

      {completeSuccess ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle size={40} className="mx-auto text-green-500 mb-3" />
          <p className="font-semibold text-green-800">
            Lot {createdBatch?.batchNumber} clôturé avec succès
          </p>
          <button
            onClick={reset}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            Nouveau lot
          </button>
        </div>
      ) : !createdBatch ? (
        /* Étape 1 : créer le lot */
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4">
          <h3 className="font-medium text-gray-800">Étape 1 — Créer un lot</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur *
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="CASH">CASH</option>
              <option value="WALLET">WALLET</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Seul CASH et WALLET sont disponibles — le paiement mobile money
              n'est pas encore actif en production.
            </p>
          </div>

          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {createError}
            </div>
          )}

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Créer le lot de réconciliation"
            )}
          </button>
        </div>
      ) : (
        /* Étape 2 : clôturer le lot */
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-6 space-y-4">
          <h3 className="font-medium text-gray-800">
            Étape 2 — Clôturer le lot
          </h3>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-blue-400">N° Lot</p>
                <p className="font-mono font-medium text-blue-800">
                  {createdBatch.batchNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-400">Statut</p>
                <p className="font-medium text-blue-800">
                  {createdBatch.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-400">Fournisseur</p>
                <p className="font-medium text-blue-800">{provider}</p>
              </div>
              <div>
                <p className="text-xs text-blue-400">Créé par</p>
                <p className="font-medium text-blue-800">
                  {admin?.email || "admin"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2 text-sm text-amber-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <p>
              Une fois clôturé, le lot ne peut plus être modifié. Assurez-vous
              que toutes les transactions ont été réconciliées.
            </p>
          </div>

          {completeError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {completeError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              disabled={completeMutation.isPending}
              className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw size={14} /> Recommencer
            </button>
            <button
              onClick={() => {
                if (confirm(`Clôturer le lot ${createdBatch.batchNumber} ?`)) {
                  completeMutation.mutate();
                }
              }}
              disabled={completeMutation.isPending}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {completeMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle size={14} /> Clôturer le lot
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
