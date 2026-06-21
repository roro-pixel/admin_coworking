import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { kycService } from "../../services/document.service";
import { KycCaseDetailModal } from "../../components/kyc/KycCaseDetailModal";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";
import type { KycCaseResponse } from "../../services/document.service";

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700" },
  PENDING_REVIEW: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
  },
  IN_REVIEW: { label: "En revue", color: "bg-orange-100 text-orange-700" },
  APPROVED: { label: "Approuvé", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expiré", color: "bg-gray-100 text-gray-500" },
  CANCELLED: { label: "Annulé", color: "bg-gray-100 text-gray-500" },
  SUBMITTED: { label: "Soumis", color: "bg-yellow-100 text-yellow-700" },
  UNDER_REVIEW: { label: "En revue", color: "bg-orange-100 text-orange-700" },
  PENDING_CORRECTION: { label: "Correction", color: "bg-red-100 text-red-700" },
  NEEDS_CORRECTION: { label: "Correction", color: "bg-red-100 text-red-700" },
};

export const KycMyQueuePage: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCase, setSelectedCase] = useState<KycCaseResponse | null>(
    null,
  );
  const [decisionModal, setDecisionModal] = useState<{
    action: "approve" | "reject";
    code: string;
  } | null>(null);
  const [decisionComment, setDecisionComment] = useState("");
  const adminId = Number(admin?.id) || 1;

  const { data: myCases, isLoading } = useQuery({
    queryKey: ["kyc-my-queue"],
    queryFn: () => kycService.getMyQueue(adminId),
    refetchInterval: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: (code: string) =>
      kycService.approveKycCase(
        code,
        adminId,
        decisionComment || "Approuvé depuis ma file",
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-my-queue"] });
      setDecisionModal(null);
      setDecisionComment("");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (code: string) =>
      kycService.rejectKycCase(code, adminId, decisionComment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-my-queue"] });
      setDecisionModal(null);
      setDecisionComment("");
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement de votre file...</p>
      </div>
    );
  }

  const cases = myCases?.content || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mes dossiers</h2>
          <p className="text-sm text-gray-500 mt-1">
            Dossiers assignés à vous pour revue
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
            {cases.length} dossier{cases.length > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <CheckCircle size={48} className="mx-auto text-green-300 mb-4" />
          <p className="text-gray-500">Votre file est vide</p>
          <p className="text-sm text-gray-400">
            Tous les dossiers ont été traités
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((kycCase) => {
            const isSlaOverdue =
              kycCase.slaDeadline && new Date(kycCase.slaDeadline) < new Date();
            return (
              <div
                key={kycCase.code}
                className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText size={18} className="text-primary-600" />
                      <span className="font-mono font-medium">
                        {kycCase.code}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${statusConfig[kycCase.status]?.color || "bg-gray-100 text-gray-700"}`}
                      >
                        {statusConfig[kycCase.status]?.label || kycCase.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {kycCase.ownerType} ·{" "}
                      {kycCase.ownerCode || `ID: ${kycCase.ownerId}`}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>
                        Soumis :{" "}
                        {kycCase.submittedAt
                          ? new Date(kycCase.submittedAt).toLocaleDateString(
                              "fr-FR",
                            )
                          : "—"}
                      </span>
                      {kycCase.slaDeadline && (
                        <span
                          className={
                            isSlaOverdue
                              ? "text-red-500 font-medium flex items-center gap-1"
                              : ""
                          }
                        >
                          {isSlaOverdue && <AlertCircle size={10} />}
                          SLA :{" "}
                          {new Date(kycCase.slaDeadline).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCase(kycCase)}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 flex items-center gap-2 text-sm"
                    >
                      <Eye size={14} /> Examiner
                    </button>
                    <button
                      onClick={() => {
                        setDecisionComment("");
                        setDecisionModal({
                          action: "approve",
                          code: kycCase.code,
                        });
                      }}
                      disabled={approveMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      Approuver
                    </button>
                    <button
                      onClick={() => {
                        setDecisionComment("");
                        setDecisionModal({
                          action: "reject",
                          code: kycCase.code,
                        });
                      }}
                      disabled={rejectMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <XCircle size={14} />
                      )}
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {decisionModal && (
        <ModalPortal onClose={() => setDecisionModal(null)} size="lg">
          <div className="sticky top-0 bg-white border-b p-5 rounded-t-2xl">
            <h3 className="text-xl font-bold">
              {decisionModal.action === "approve"
                ? "Approuver le dossier"
                : "Rejeter le dossier"}
            </h3>
            <p className="mt-1 font-mono text-sm text-gray-500">
              {decisionModal.code}
            </p>
          </div>
          <div className="p-6 space-y-4">
            <textarea
              value={decisionComment}
              onChange={(e) => setDecisionComment(e.target.value)}
              rows={4}
              placeholder={
                decisionModal.action === "approve"
                  ? "Commentaire d'approbation..."
                  : "Motif de rejet obligatoire..."
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setDecisionModal(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() =>
                  decisionModal.action === "approve"
                    ? approveMutation.mutate(decisionModal.code)
                    : rejectMutation.mutate(decisionModal.code)
                }
                disabled={
                  approveMutation.isPending ||
                  rejectMutation.isPending ||
                  (decisionModal.action === "reject" && !decisionComment.trim())
                }
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  decisionModal.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {selectedCase && (
        <KycCaseDetailModal
          kycCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ["kyc-my-queue"] });
            setSelectedCase(null);
          }}
        />
      )}
    </div>
  );
};
