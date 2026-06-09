import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Copy, Loader2, RefreshCw, Save, Search } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type {
  BillingDocument,
  BillingSchedule,
} from "../../services/billing.service";

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

export const BillingDocumentTools: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [documentNumber, setDocumentNumber] = useState("");
  const [scheduleNumber, setScheduleNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    terms: "",
    internalNotes: "",
  });

  const {
    data: document,
    isLoading: documentLoading,
    refetch,
  } = useQuery({
    queryKey: ["billing-tools-document", documentNumber],
    queryFn: () => billingService.getDocument(documentNumber.trim()),
    enabled: false,
  });

  const typedDocument = document as BillingDocument | undefined;

  const {
    data: schedule,
    isLoading: scheduleLoading,
    refetch: refetchSchedule,
  } = useQuery({
    queryKey: ["billing-tools-schedule", scheduleNumber],
    queryFn: () => billingService.getSchedule(scheduleNumber.trim()),
    enabled: false,
  });

  const typedSchedule = schedule as BillingSchedule | undefined;

  const loadDocument = async () => {
    if (!documentNumber.trim()) {
      setError("Renseigne un numéro de document.");
      return;
    }
    setError(null);
    const result = await refetch();
    const doc = result.data as BillingDocument | undefined;
    if (doc) {
      setEditForm({
        title: doc.title || "",
        description: doc.description || "",
        dueDate: doc.dueDate || "",
        terms: doc.terms || "",
        internalNotes: doc.internalNotes || "",
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!typedDocument) throw new Error("Charge d’abord un document.");
      return billingService.updateDocument(typedDocument.documentNumber, {
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        dueDate: editForm.dueDate || undefined,
        terms: editForm.terms || undefined,
        internalNotes: editForm.internalNotes || undefined,
      });
    },
    onSuccess: (doc) => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      queryClient.invalidateQueries({
        queryKey: ["billing-document", doc.documentNumber],
      });
      refetch();
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Erreur lors de la mise à jour.",
      ),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => {
      if (!typedDocument) throw new Error("Charge d’abord un document.");
      return billingService.duplicateDocument(typedDocument.documentNumber);
    },
    onSuccess: (doc) => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["billing-documents"] });
      navigate(`/billing/documents/${doc.documentNumber}`);
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Erreur lors de la duplication.",
      ),
  });

  const loadSchedule = async () => {
    if (!scheduleNumber.trim()) {
      setError("Renseigne un numéro d’échéancier.");
      return;
    }
    setError(null);
    await refetchSchedule();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Outils documents
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Expose les actions transversales : mise à jour légère, duplication et
          consultation d’échéancier par numéro.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5 max-w-5xl">
        <h3 className="font-semibold text-gray-900">Document</h3>
        <div className="flex gap-3">
          <input
            className={inputCls}
            placeholder="Numéro document"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
          />
          <button
            onClick={loadDocument}
            disabled={documentLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2 disabled:opacity-50"
          >
            {documentLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Charger
          </button>
        </div>

        {typedDocument && (
          <div className="space-y-4 border-t pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titre</label>
                <input
                  className={inputCls}
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date d’échéance
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={editForm.dueDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dueDate: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Conditions
                </label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={editForm.terms}
                  onChange={(e) =>
                    setEditForm({ ...editForm, terms: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Notes internes
                </label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={editForm.internalNotes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, internalNotes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Mettre à jour
              </button>
              <button
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {duplicateMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Copy size={16} />
                )}
                Dupliquer
              </button>
              <button
                onClick={() =>
                  navigate(`/billing/documents/${typedDocument.documentNumber}`)
                }
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 inline-flex items-center gap-2"
              >
                Ouvrir le détail
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5 max-w-5xl">
        <h3 className="font-semibold text-gray-900">Échéancier par numéro</h3>
        <div className="flex gap-3">
          <input
            className={inputCls}
            placeholder="Numéro échéancier"
            value={scheduleNumber}
            onChange={(e) => setScheduleNumber(e.target.value)}
          />
          <button
            onClick={loadSchedule}
            disabled={scheduleLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2 disabled:opacity-50"
          >
            {scheduleLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Charger
          </button>
        </div>

        {typedSchedule && (
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 text-sm font-medium">
              {typedSchedule.scheduleNumber}
            </div>
            <div className="divide-y">
              {(typedSchedule.installments || []).map((i: any) => (
                <div
                  key={i.installmentNumber}
                  className="px-4 py-3 flex justify-between text-sm"
                >
                  <span>
                    {i.installmentNumber} — {i.dueDate}
                  </span>
                  <span>
                    {(i.amount ?? 0).toLocaleString("fr-FR")} XAF · {i.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
