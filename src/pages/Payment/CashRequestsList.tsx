import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCircle2, ClipboardList, Download, Paperclip, Plus, Trash2, XCircle } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashMovementAttachment, CashRequest, CashRequestType } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBlock,
  Field,
  FilterButton,
  FilterPanel,
  IconButton,
  ListHeader,
  PanelForm,
  Pagination,
  SearchField,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD_SOFT, FOCUS, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { Dots } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { REQUEST_STATUS, REQUEST_TYPES } from "../../components/payment/paymentLabels";
import { currencyLabel, saveBlob } from "../../components/payment/paymentUtils";
import { readPdfError } from "../../services/documentTemplate.service";

const PAGE_SIZE = 20;

const initialForm = {
  sessionNumber: "",
  requestType: "JUSTIFICATIF" as CashRequestType,
  amount: 0,
  currency: "XAF",
  reason: "",
};

const STATUS_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "APPROVED", label: "Approuvées" },
  { value: "REJECTED", label: "Refusées" },
  { value: "EXECUTED", label: "Exécutées" },
  { value: "CANCELLED", label: "Annulées" },
];

export const CashRequestsList: React.FC = () => {
  const { admin, hasPermission } = useAuth();
  const canReview = hasPermission("CASH_MOVEMENT:APPROVE");
  const canWrite = hasPermission("CASH_MOVEMENT:CREATE");
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [sessionNumber, setSessionNumber] = useState("");
  const [status, setStatus] = useState("");
  const [requestType, setRequestType] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [files, setFiles] = useState<CashMovementAttachment[]>([]);

  const { data: sessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });
  const sessions = sessionsData?.content || [];

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["cash-requests", page, sessionNumber, status, requestType, searchText],
    queryFn: () =>
      paymentService.getCashRequests({
        sessionNumber: sessionNumber || undefined,
        status: status || undefined,
        requestType: requestType || undefined,
        searchText: searchText || undefined,
        page,
        size: PAGE_SIZE,
        sort: "createdAt,desc",
      }),
  });
  const requests: CashRequest[] = data?.content || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cash-requests"] });

  const createMutation = useMutation({
    mutationFn: () =>
      paymentService.createCashRequest(form.sessionNumber, {
        requestType: form.requestType,
        amount: form.amount,
        currency: form.currency,
        reason: form.reason,
        requestedBy: admin?.email || "admin",
        attachments: files.filter((f) => f.fileName.trim() && f.storagePath.trim()).length ? files.filter((f) => f.fileName.trim() && f.storagePath.trim()) : undefined,
      }),
    onSuccess: () => {
      invalidate();
      setFiles([]);
      setIsFormOpen(false);
      setError(null);
      setForm(initialForm);
      toast.success("Demande créée");
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la création de la demande.")),
  });

  const approveMutation = useMutation({
    mutationFn: (r: CashRequest) =>
      paymentService.approveCashRequest(r.requestNumber, { reviewedBy: admin?.email || "admin", note: reviewNote || undefined }),
    onSuccess: () => {
      invalidate();
      setReviewNote("");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (r: CashRequest) =>
      paymentService.rejectCashRequest(r.requestNumber, { reviewedBy: admin?.email || "admin", note: reviewNote || undefined }),
    onSuccess: () => {
      invalidate();
      setReviewNote("");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (r: CashRequest) => paymentService.cancelCashRequest(r.requestNumber, reviewNote ? { note: reviewNote } : undefined),
    onSuccess: () => {
      invalidate();
      setReviewNote("");
    },
  });
  const confirmCancel = (r: CashRequest) =>
    toast.confirm({
      message: `Annuler ${r.requestNumber} ?`,
      detail: "La demande n'engage plus aucun fonds.",
      confirmLabel: "Annuler la demande",
      successMessage: "Demande annulée",
      errorMessage: "Annulation impossible",
      onConfirm: () => cancelMutation.mutateAsync(r),
    });

  const confirmApprove = (r: CashRequest) =>
    toast.confirm({
      message: `Approuver ${r.requestNumber} ?`,
      detail: `${formatMoney(r.amount, currencyLabel(r.currency))} seront engagés sur la session ${r.sessionNumber}.`,
      confirmLabel: "Approuver",
      successMessage: "Demande approuvée",
      errorMessage: "Approbation impossible",
      onConfirm: () => approveMutation.mutateAsync(r),
    });

  const confirmReject = (r: CashRequest) =>
    toast.confirm({
      message: `Refuser ${r.requestNumber} ?`,
      detail: "Le demandeur sera informé du refus.",
      confirmLabel: "Refuser",
      successMessage: "Demande refusée",
      errorMessage: "Refus impossible",
      onConfirm: () => rejectMutation.mutateAsync(r),
    });

  const downloadPdf = async (requestNumber: string) => {
    setDownloading(requestNumber);
    try {
      saveBlob(await paymentService.getCashRequestDocumentPdf(requestNumber), `demande_caisse_${requestNumber}.pdf`);
    } catch (e) {
      toast.error((await readPdfError(e)).message || "Téléchargement impossible");
    } finally {
      setDownloading(null);
    }
  };

  const hasPending = (canReview || canWrite) && requests.some((r) => r.status === "PENDING");
  const hasFilters = !!(sessionNumber || requestType);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Demandes de caisse"
        subtitle="Avances, remises de fonds, remboursements de frais et justificatifs."
        action={
          <ActionButton
            icon={Plus}
            className="w-full sm:w-auto"
            onClick={() => {
              setError(null);
              setIsFormOpen(true);
            }}
          >
            Nouvelle demande
          </ActionButton>
        }
      />

      {isFormOpen && (
        <PanelForm
          title="Nouvelle demande de caisse"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.sessionNumber) return setError("La session est obligatoire.");
            if (form.amount <= 0) return setError("Le montant doit être supérieur à 0.");
            if (!form.reason.trim()) return setError("Le motif est obligatoire.");
            setError(null);
            createMutation.mutate();
          }}
          onCancel={() => setIsFormOpen(false)}
          pending={createMutation.isPending}
          submitLabel="Créer la demande"
          error={error}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Session ouverte" required>
              <select value={form.sessionNumber} onChange={(e) => setForm({ ...form, sessionNumber: e.target.value })} className={FIELD_SOFT}>
                <option value="">Choisir</option>
                {sessions.map((s) => (
                  <option key={s.sessionNumber} value={s.sessionNumber}>
                    {s.sessionNumber} · {s.registerCode}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type de demande" required>
              <select
                value={form.requestType}
                onChange={(e) => setForm({ ...form, requestType: e.target.value as CashRequestType })}
                className={FIELD_SOFT}
              >
                {Object.entries(REQUEST_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Montant" required>
              <input
                type="text"
                inputMode="numeric"
                value={form.amount === 0 ? "" : form.amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setForm({ ...form, amount: v === "" ? 0 : parseInt(v, 10) });
                }}
                placeholder="25000"
                className={FIELD_SOFT}
              />
            </Field>
            <Field label="Devise" required>
              <input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                placeholder="XAF"
                className={`${FIELD_SOFT} font-mono`}
              />
            </Field>
          </div>
          <Field label="Motif" required>
            <textarea
              rows={3}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Bénéficiaire, contexte, justificatif attendu"
              className={FIELD_SOFT}
            />
          </Field>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Pièces jointes</p>
              <ActionButton variant="ghost" icon={Paperclip} onClick={() => setFiles([...files, { fileName: "", contentType: "application/pdf", storagePath: "", label: "" }])}>
                Ajouter
              </ActionButton>
            </div>
            <p className="text-xs text-gray-500">Chaque pièce est référencée par son chemin de stockage : le fichier doit déjà être enregistré.</p>
            {files.map((f, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input aria-label="Nom du fichier" placeholder="Nom du fichier" value={f.fileName} onChange={(e) => setFiles(files.map((x, j) => (j === i ? { ...x, fileName: e.target.value } : x)))} className={FIELD_SOFT} />
                <input aria-label="Chemin de stockage" placeholder="Chemin de stockage" value={f.storagePath} onChange={(e) => setFiles(files.map((x, j) => (j === i ? { ...x, storagePath: e.target.value } : x)))} className={`${FIELD_SOFT} font-mono`} />
                <input aria-label="Libellé" placeholder="Libellé" value={f.label ?? ""} onChange={(e) => setFiles(files.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className={FIELD_SOFT} />
                <IconButton icon={Trash2} label="Retirer" tone="danger" onClick={() => setFiles(files.filter((_, j) => j !== i))} />
              </div>
            ))}
          </div>
        </PanelForm>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchField
            className="flex-1"
            value={searchText}
            onChange={(v) => {
              setSearchText(v);
              setPage(0);
            }}
            placeholder="Demande, session, motif"
          />
          <FilterButton open={filtersOpen} active={hasFilters} onClick={() => setFiltersOpen((o) => !o)} />
        </div>
        {filtersOpen && (
          <FilterPanel
            canReset={hasFilters}
            onReset={() => {
              setSessionNumber("");
              setRequestType("");
              setPage(0);
            }}
          >
            <Field label="Session">
              <select
                value={sessionNumber}
                onChange={(e) => {
                  setSessionNumber(e.target.value);
                  setPage(0);
                }}
                className={FIELD_SOFT}
              >
                <option value="">Toutes les sessions</option>
                {sessions.map((s) => (
                  <option key={s.sessionNumber} value={s.sessionNumber}>
                    {s.sessionNumber} · {s.registerCode}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select
                value={requestType}
                onChange={(e) => {
                  setRequestType(e.target.value);
                  setPage(0);
                }}
                className={FIELD_SOFT}
              >
                <option value="">Tous les types</option>
                {Object.entries(REQUEST_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </FilterPanel>
        )}
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => {
            const on = status === f.value;
            return (
              <button
                key={f.value || "all"}
                type="button"
                onClick={() => {
                  setStatus(f.value);
                  setPage(0);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${
                  on ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            );
          })}
          {isFetching && !isLoading && <Dots />}
        </div>
      </div>

      {hasPending && (
        <Field label="Note de décision" hint="Facultative. Elle accompagne la prochaine approbation ou le prochain refus.">
          <input
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Ex. pièce justificative reçue"
            className={`${FIELD_SOFT} bg-white shadow-sm`}
          />
        </Field>
      )}

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les demandes." onRetry={() => refetch()} />
      ) : requests.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune demande" hint="Ajustez les filtres ou créez une demande." />
      ) : (
        <>
          <DataCard>
            {requests.map((r) => {
              const st = statusOf(REQUEST_STATUS, r.status);
              return (
                <div
                  key={r.requestNumber}
                  className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-x-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{r.requestNumber}</span>
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    </div>
                    <p className="mt-1 font-semibold text-gray-950">{REQUEST_TYPES[r.requestType] ?? r.requestType}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{r.reason || "Aucun motif renseigné"}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      <span className="font-mono">{r.sessionNumber}</span> · {r.requestedBy} · {formatDateTime(r.requestedAt ?? r.createdAt)}
                    </p>
                    {r.reviewNote && <p className="mt-1 text-xs text-gray-500">Décision{r.reviewedBy ? ` de ${r.reviewedBy}` : ""} : {r.reviewNote}</p>}
                    {(r.executedMovementNumber ?? r.generatedMovementNumber) && (
                      <p className="mt-1 text-xs text-gray-500">
                        Exécutée{r.executedAt ? ` le ${formatDateTime(r.executedAt)}` : ""} : mouvement <span className="font-mono">{r.executedMovementNumber ?? r.generatedMovementNumber}</span>
                      </p>
                    )}
                    {(r.attachments ?? []).length > 0 && (
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                        <Paperclip size={12} />
                        {(r.attachments ?? []).map((a, i) => (
                          <span key={`${a.storagePath}-${i}`} title={a.storagePath}>
                            {a.label || a.fileName}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                  <p className="whitespace-nowrap text-right text-lg font-bold tabular-nums text-gray-950 lg:order-none">
                    {formatMoney(r.amount, currencyLabel(r.currency))}
                  </p>
                  <div className="col-span-2 flex items-center justify-end gap-1 lg:col-span-1">
                    <IconButton
                      icon={Download}
                      label="Télécharger le PDF"
                      pending={downloading === r.requestNumber}
                      onClick={() => downloadPdf(r.requestNumber)}
                    />
                    {r.status === "PENDING" && canReview && (
                      <>
                        <IconButton icon={CheckCircle2} label="Approuver" tone="success" onClick={() => confirmApprove(r)} />
                        <IconButton icon={XCircle} label="Refuser" tone="danger" onClick={() => confirmReject(r)} />
                      </>
                    )}
                    {r.status === "PENDING" && canWrite && <IconButton icon={Ban} label="Annuler la demande" onClick={() => confirmCancel(r)} />}
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages || 1} total={data?.totalElements ?? requests.length} noun="demande" onChange={setPage} />
        </>
      )}
    </div>
  );
};
