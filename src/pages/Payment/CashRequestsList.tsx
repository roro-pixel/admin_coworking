import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  Download,
  Loader2,
  Plus,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type {
  CashRequest,
  CashRequestType,
  CashSession,
} from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";

const PAGE_SIZE = 20;

const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  EXECUTED: "Exécutée",
  CANCELLED: "Annulée",
};

const statusClass: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  REJECTED: "bg-red-50 text-red-700 ring-red-100",
  EXECUTED: "bg-blue-50 text-blue-700 ring-blue-100",
  CANCELLED: "bg-gray-100 text-gray-600 ring-gray-200",
};

const typeLabels: Record<string, string> = {
  JUSTIFICATIF: "Justificatif",
  REMISE_DE_FONDS: "Remise de fonds",
  CASH_ADVANCE: "Avance caisse",
  EXPENSE_REIMBURSEMENT: "Remboursement dépense",
};

const initialForm = {
  sessionNumber: "",
  requestType: "JUSTIFICATIF" as CashRequestType,
  amount: 0,
  currency: "XAF",
  reason: "",
};

const formatAmount = (amount?: number | null, currency = "XAF") =>
  `${(amount ?? 0).toLocaleString("fr-FR")} ${currency}`;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR") : "—";

export const CashRequestsList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [sessionNumber, setSessionNumber] = useState("");
  const [status, setStatus] = useState("");
  const [requestType, setRequestType] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);

  const { data: sessionsData } = useQuery({
    queryKey: ["cash-sessions-open-select"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
  });

  const sessions: CashSession[] = sessionsData?.content || [];

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "cash-requests",
      page,
      sessionNumber,
      status,
      requestType,
      searchText,
    ],
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
  const totalPages = data?.totalPages ?? 1;
  const totalElements = data?.totalElements ?? 0;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["cash-requests"] });

  const createMutation = useMutation({
    mutationFn: () =>
      paymentService.createCashRequest(form.sessionNumber, {
        requestType: form.requestType,
        amount: form.amount,
        currency: form.currency,
        reason: form.reason,
        requestedBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      invalidate();
      setIsFormOpen(false);
      setError(null);
      setForm(initialForm);
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          "Erreur lors de la création de la demande.",
      ),
  });

  const approveMutation = useMutation({
    mutationFn: (r: CashRequest) =>
      paymentService.approveCashRequest(r.requestNumber, {
        reviewedBy: admin?.email || "admin",
        note: reviewNote || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setReviewNote("");
    },
    onError: () => alert("Erreur lors de l’approbation."),
  });

  const rejectMutation = useMutation({
    mutationFn: (r: CashRequest) =>
      paymentService.rejectCashRequest(r.requestNumber, {
        reviewedBy: admin?.email || "admin",
        note: reviewNote || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setReviewNote("");
    },
    onError: () => alert("Erreur lors du rejet."),
  });

  const downloadPdf = async (requestNumber: string) => {
    const blob = await paymentService.getCashRequestDocumentPdf(requestNumber);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demande_caisse_${requestNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openForm = () => {
    setError(null);
    setForm(initialForm);
    setIsFormOpen(true);
  };

  const submitForm = () => {
    if (!form.sessionNumber) return setError("Sélectionnez une session ouverte.");
    if (form.amount <= 0) return setError("Le montant doit être supérieur à 0.");
    if (!form.reason.trim()) return setError("Le motif est obligatoire.");
    setError(null);
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Demandes de caisse
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Suivi des demandes internes : justificatifs, remises, avances et remboursements.
          </p>
        </div>
        <button
          type="button"
          onClick={openForm}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <Plus size={17} />
          Nouvelle demande
        </button>
      </div>

      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(0);
              }}
              placeholder="Rechercher par demande, session, motif..."
              className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-50"
            />
          </div>

          <select
            value={sessionNumber}
            onChange={(e) => {
              setSessionNumber(e.target.value);
              setPage(0);
            }}
            className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
          >
            <option value="">Toutes sessions</option>
            {sessions.map((s) => (
              <option key={s.sessionNumber} value={s.sessionNumber}>
                {s.sessionNumber} — {s.registerCode}
              </option>
            ))}
          </select>

          <select
            value={requestType}
            onChange={(e) => {
              setRequestType(e.target.value);
              setPage(0);
            }}
            className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
          >
            <option value="">Tous types</option>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
          >
            <option value="">Tous statuts</option>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <div className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gray-50 px-4 text-sm text-gray-600 ring-1 ring-gray-100">
            {isFetching && <Loader2 size={14} className="animate-spin" />}
            {totalElements} résultat(s)
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-100">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">
            <Loader2 className="mx-auto mb-2 animate-spin" />
            Chargement des demandes...
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 py-10 text-center text-sm text-gray-500">
            Aucune demande trouvée.
          </div>
        ) : (
          <div className="grid gap-3">
            {requests.map((request) => (
              <RequestCard
                key={request.requestNumber}
                request={request}
                onDownload={() => downloadPdf(request.requestNumber)}
                onApprove={() => approveMutation.mutate(request)}
                onReject={() => rejectMutation.mutate(request)}
                pending={approveMutation.isPending || rejectMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="rounded-xl bg-white px-3 py-2 text-sm text-gray-600 ring-1 ring-gray-100">
            {page + 1}/{Math.max(totalPages, 1)}
          </span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}

      {isFormOpen && (
        <ModalPortal size="2xl" onClose={() => setIsFormOpen(false)}>
          <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-5 rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Nouvelle demande de caisse
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Renseignez la session, le type de demande, le montant et le motif.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-5 p-6">
            {error && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <section className="rounded-2xl bg-gray-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Session ouverte *">
                  <select
                    value={form.sessionNumber}
                    onChange={(e) =>
                      setForm({ ...form, sessionNumber: e.target.value })
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  >
                    <option value="">Sélectionner une session</option>
                    {sessions.map((s) => (
                      <option key={s.sessionNumber} value={s.sessionNumber}>
                        {s.sessionNumber} — {s.registerCode}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Type de demande *">
                  <select
                    value={form.requestType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        requestType: e.target.value as CashRequestType,
                      })
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  >
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Montant *">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.amount === 0 ? "" : form.amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setForm({
                        ...form,
                        amount: value ? parseInt(value, 10) : 0,
                      });
                    }}
                    placeholder="25000"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>

                <Field label="Devise *">
                  <input
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value.toUpperCase() })
                    }
                    placeholder="XAF"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-mono outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Motif *">
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    rows={4}
                    className="min-h-[110px] w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 resize-none"
                    placeholder="Expliquez la demande : bénéficiaire, contexte, justificatif attendu..."
                  />
                </Field>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={submitForm}
                disabled={createMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Créer la demande
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

function RequestCard({
  request,
  onDownload,
  onApprove,
  onReject,
  pending,
}: {
  request: CashRequest;
  onDownload: () => void;
  onApprove: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold text-gray-900">
              {request.requestNumber}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                statusClass[request.status] || "bg-gray-100 text-gray-600 ring-gray-200"
              }`}
            >
              {statusLabels[request.status] || request.status}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {typeLabels[request.requestType] || request.requestType}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">
            {request.reason || "Aucun motif renseigné"}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="font-mono">{request.sessionNumber}</span>
            <span>Demandé par : {request.requestedBy || "—"}</span>
            <span>{formatDate(request.createdAt)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 lg:flex-col lg:items-end">
          <p className="text-lg font-bold text-gray-900">
            {formatAmount(request.amount, request.currency)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50"
              title="Télécharger le document"
            >
              <Download size={16} />
            </button>
            {request.status === "PENDING" && (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={pending}
                  className="rounded-xl bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                  title="Approuver"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  type="button"
                  onClick={onReject}
                  disabled={pending}
                  className="rounded-xl bg-red-50 p-2 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                  title="Rejeter"
                >
                  <XCircle size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">
      {label}
    </span>
    {children}
  </label>
);
