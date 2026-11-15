import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, FileWarning, Upload } from "lucide-react";
import { documentService, kycService } from "../../services/document.service";
import type { KycCaseResponse, KycDocumentResponse } from "../../services/document.service";
import { ActionButton, EmptyState, ErrorBlock, IconButton, ListHeader, Pagination } from "../../components/subscription/kit";
import { apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { KycStatusChip, RiskChip } from "../../components/documents/docKit";
import { OWNER_LABEL, label } from "../../components/documents/docUtils";
import { Dots } from "../../components/ui/Toaster";

const PAGE_SIZE = 10;
// Le type déclare VERIFIED/PENDING, mais d'autres écrans reçoivent APPROVED/PENDING_REVIEW : on accepte les deux.
const TO_FIX = ["REJECTED", "NEEDS_CORRECTION"];
const WAITING = ["PENDING", "PENDING_REVIEW"];
const VALID = ["VERIFIED", "APPROVED"];

const reasonOf = (d: KycDocumentResponse): string | undefined => d.rejectionReason ?? d.correctionNote ?? d.reviewComment ?? d.rejectReason ?? undefined;
const typeCode = (d: KycDocumentResponse) => d.documentTypeCode ?? d.documentType;

export const KycCorrectionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [uploading, setUploading] = useState<string | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["kyc-cases-pending-correction", page],
    queryFn: () => kycService.getAllKycCases({ status: "PENDING_CORRECTION", page, size: PAGE_SIZE }),
  });

  const upload = useMutation({
    mutationFn: (v: { documentTypeCode: string; file: File; ownerType: string; ownerCode: string }) => documentService.uploadKycDocumentAsAdmin(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-cases-pending-correction"] });
      toast.success("Document remplacé");
    },
    onError: (e) => toast.error(apiMessage(e, "Envoi du document impossible")),
    onSettled: () => setUploading(null),
  });

  const resubmit = useMutation({
    mutationFn: (code: string) => kycService.submitKycCase(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kyc-cases-pending-correction"] }),
  });

  const askResubmit = (code: string) =>
    toast.confirm({
      message: `Re-soumettre le dossier ${code} ?`,
      detail: "Toutes les corrections doivent avoir été apportées.",
      confirmLabel: "Re-soumettre",
      pendingLabel: "Envoi",
      successMessage: "Dossier re-soumis",
      errorMessage: "Re-soumission impossible",
      onConfirm: () => resubmit.mutateAsync(code),
    });

  const cases: KycCaseResponse[] = data?.content ?? [];
  const total = data?.totalElements ?? 0;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Corrections demandées"
        subtitle={isLoading ? undefined : `${total} dossier${total > 1 ? "s" : ""} en attente de correction`}
        action={<RefreshButton fetching={isFetching} onClick={() => refetch()} />}
      />

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les corrections." onRetry={() => refetch()} />
      ) : cases.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Aucune correction en attente" hint="Tous les dossiers sont en règle." />
      ) : (
        <>
          <div className="space-y-4">
            {cases.map((c) => {
              const docs = c.documents ?? [];
              const toFix = docs.filter((d) => TO_FIX.includes(d.status));
              const waiting = docs.filter((d) => WAITING.includes(d.status));
              const valid = docs.filter((d) => VALID.includes(d.status));
              // Sans code propriétaire on n'envoie rien : un identifiant numérique pourrait rattacher le fichier au mauvais dossier.
              const canUpload = !!c.ownerCode;
              return (
                <section key={c.code} className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[color:var(--logo-pink-dark)]">{c.code}</span>
                        <KycStatusChip status={c.status} />
                        <RiskChip level={c.riskLevel} />
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {c.ownerName || c.ownerCode || `#${c.ownerId ?? ""}`}
                        <span className="ml-2 text-xs text-gray-400">{label(OWNER_LABEL, c.ownerType)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconButton icon={Eye} label="Voir le dossier" onClick={() => navigate(`/documents/kyc/cases/${c.code}`)} />
                      {c.complete && c.status === "PENDING_CORRECTION" && (
                        <ActionButton icon={CheckCircle2} pending={resubmit.isPending && resubmit.variables === c.code} onClick={() => askResubmit(c.code)}>
                          Re-soumettre
                        </ActionButton>
                      )}
                    </div>
                  </div>

                  {toFix.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">À corriger ({toFix.length})</p>
                      <div className="space-y-2">
                        {toFix.map((d) => {
                          const tc = typeCode(d);
                          const key = `${c.code}:${d.documentCode}`;
                          const busy = uploading === key && upload.isPending;
                          return (
                            <div key={d.documentCode} className="flex flex-col gap-3 rounded-2xl bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{d.documentTypeName ?? tc}</p>
                                {reasonOf(d) && <p className="mt-0.5 text-sm text-red-700">{reasonOf(d)}</p>}
                                {d.fileName && <p className="mt-0.5 truncate text-xs text-gray-500">{d.fileName}</p>}
                              </div>
                              <label
                                className={`relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[color:var(--logo-pink-dark)] px-5 py-2.5 text-sm font-semibold text-white transition focus-within:ring-2 focus-within:ring-[color:var(--logo-pink)] ${
                                  canUpload && tc && !busy ? "cursor-pointer hover:opacity-90" : "pointer-events-none opacity-50"
                                }`}
                                title={canUpload ? undefined : "Code propriétaire manquant : remplacement impossible depuis cette page"}
                              >
                                <span className={`inline-flex items-center gap-2 ${busy ? "invisible" : ""}`}>
                                  <Upload size={16} />
                                  Remplacer
                                </span>
                                {busy && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <Dots />
                                  </span>
                                )}
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept="application/pdf,image/jpeg,image/png,image/webp"
                                  disabled={!canUpload || !tc || busy}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (!file || !tc || !c.ownerCode) return;
                                    setUploading(key);
                                    upload.mutate({ documentTypeCode: tc, file, ownerType: c.ownerType, ownerCode: c.ownerCode });
                                  }}
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(waiting.length > 0 || valid.length > 0) && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {waiting.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-600">En attente de revue ({waiting.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {waiting.map((d) => (
                              <span key={d.documentCode} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                {d.documentTypeName ?? typeCode(d)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {valid.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600">Validés ({valid.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {valid.map((d) => (
                              <span key={d.documentCode} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                {d.documentTypeName ?? typeCode(d)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {toFix.length === 0 && waiting.length === 0 && valid.length === 0 && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                      <FileWarning size={16} /> Aucun document dans ce dossier.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={total} noun="dossier" onChange={setPage} />
        </>
      )}
    </div>
  );
};
