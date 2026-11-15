import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Play, Wallet, XCircle, Zap } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashSession } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBlock,
  Field,
  HeadRow,
  IconButton,
  ListHeader,
  PanelForm,
  Pagination,
  SearchField,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD_SOFT, FOCUS, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { toast } from "../../components/ui/toastStore";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { SESSION_STATUS } from "../../components/payment/paymentLabels";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_8rem_8rem_8rem_8rem_6rem]";

const STATUS_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "OPEN", label: "Ouvertes" },
  { value: "CLOSING_REVIEW", label: "À valider" },
  { value: "CLOSED", label: "Clôturées" },
];

export const CashSessionsList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const me = admin?.email || String(admin?.id || "admin");

  const [search, setSearch] = useState("");
  const [registerFilter, setRegisterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  const [panel, setPanel] = useState<null | "open" | "close">(null);
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);
  const [sessionSummary, setSessionSummary] = useState<CashSession | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);

  const [selectedRegisterForOpen, setSelectedRegisterForOpen] = useState("");
  const [openingAmount, setOpeningAmount] = useState(0);
  const [openError, setOpenError] = useState<string | null>(null);

  const [countedAmount, setCountedAmount] = useState(0);
  const [varianceReason, setVarianceReason] = useState("");
  const [closeError, setCloseError] = useState<string | null>(null);

  const { data: registersData } = useQuery({
    queryKey: ["cash-registers-list"],
    queryFn: () => paymentService.getCashRegisters({ active: true, size: 200 }),
  });
  const registers = registersData?.content || [];

  const { data: sessionsData, isLoading, isError, refetch } = useQuery({
    queryKey: ["cash-sessions", page, registerFilter, statusFilter],
    queryFn: () =>
      paymentService.getCashSessions({
        registerCode: registerFilter || undefined,
        status: statusFilter || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });
  const sessions: CashSession[] = sessionsData?.content || [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? sessions.filter(
        (s) =>
          s.sessionNumber.toLowerCase().includes(q) ||
          s.registerCode.toLowerCase().includes(q) ||
          s.openedBy.toLowerCase().includes(q),
      )
    : sessions;

  const closePanel = () => {
    setPanel(null);
    setSelectedSession(null);
    setSessionSummary(null);
    setOpeningAmount(0);
    setSelectedRegisterForOpen("");
    setOpenError(null);
    setCountedAmount(0);
    setVarianceReason("");
    setCloseError(null);
  };

  const openSessionMutation = useMutation({
    mutationFn: () =>
      paymentService.openCashSession({
        registerCode: selectedRegisterForOpen || registerFilter,
        openedBy: me,
        openingAmount: openingAmount || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["cash-sessions-open-select"] });
      closePanel();
      toast.success("Session ouverte");
    },
    onError: (e: unknown) => setOpenError(apiMessage(e, "Erreur lors de l'ouverture.")),
  });

  const closeSessionMutation = useMutation({
    mutationFn: () =>
      paymentService.closeCashSession(selectedSession!.sessionNumber, {
        closedBy: me,
        countedClosingAmount: countedAmount,
        varianceReason: varianceReason || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["cash-sessions-open-select"] });
      closePanel();
      toast.success("Session clôturée");
    },
    onError: (e: unknown) => setCloseError(apiMessage(e, "Erreur lors de la fermeture.")),
  });

  const requestClosingMutation = useMutation({
    mutationFn: (session: CashSession) =>
      paymentService.requestSessionClosing(session.sessionNumber, {
        closedBy: me,
        countedClosingAmount: session.expectedClosingAmount,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cash-sessions"] }),
  });

  const approveVarianceMutation = useMutation({
    mutationFn: ({ sessionNumber, note }: { sessionNumber: string; note?: string }) =>
      paymentService.approveVariance(sessionNumber, { reviewedBy: admin?.email || "admin", note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cash-sessions"] }),
  });

  const startClose = async (session: CashSession) => {
    setLoadingSummary(session.sessionNumber);
    setSelectedSession(session);
    setCloseError(null);
    try {
      const summary = await paymentService.getCashSessionSummary(session.sessionNumber);
      setSessionSummary(summary);
      setCountedAmount(summary.expectedClosingAmount ?? 0);
    } catch {
      setSessionSummary(session);
      setCountedAmount(session.expectedClosingAmount ?? 0);
    }
    setLoadingSummary(null);
    setPanel("close");
  };

  const confirmQuickClose = (session: CashSession) =>
    toast.confirm({
      message: `Clôture rapide de ${session.sessionNumber} ?`,
      detail: `Le montant attendu (${formatMoney(session.expectedClosingAmount ?? 0)}) sera retenu, sans comptage.`,
      confirmLabel: "Demander la clôture",
      successMessage: "Demande de clôture envoyée",
      errorMessage: "Demande de clôture impossible",
      onConfirm: () => requestClosingMutation.mutateAsync(session),
    });

  const confirmApprove = (session: CashSession) =>
    toast.confirm({
      message: `Valider l'écart de ${session.sessionNumber} ?`,
      detail: "La session sera clôturée avec l'écart constaté.",
      confirmLabel: "Valider l'écart",
      successMessage: "Écart validé",
      errorMessage: "Validation impossible",
      onConfirm: () => approveVarianceMutation.mutateAsync({ sessionNumber: session.sessionNumber }),
    });

  const summary = sessionSummary || selectedSession;
  const expected = summary?.expectedClosingAmount ?? 0;
  const hasVariance = !!summary && countedAmount !== expected;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Sessions de caisse"
        subtitle="Ouverture, comptage et clôture des sessions."
        action={
          <ActionButton
            icon={Play}
            className="w-full sm:w-auto"
            onClick={() => {
              closePanel();
              setPanel("open");
            }}
          >
            Ouvrir une session
          </ActionButton>
        }
      />

      {panel === "open" && (
        <PanelForm
          title="Ouvrir une session de caisse"
          onSubmit={(e) => {
            e.preventDefault();
            openSessionMutation.mutate();
          }}
          onCancel={closePanel}
          pending={openSessionMutation.isPending}
          submitLabel="Ouvrir la session"
          submitDisabled={!(selectedRegisterForOpen || registerFilter)}
          error={openError}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Caisse" required>
              <select
                value={selectedRegisterForOpen || registerFilter}
                onChange={(e) => setSelectedRegisterForOpen(e.target.value)}
                className={FIELD_SOFT}
              >
                <option value="">Choisir une caisse</option>
                {registers.map((r) => (
                  <option key={r.registerCode} value={r.registerCode}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fonds d'ouverture (FCFA)" hint="Laissez vide pour ouvrir à zéro">
              <input
                type="number"
                min={0}
                value={openingAmount || ""}
                onChange={(e) => setOpeningAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className={FIELD_SOFT}
              />
            </Field>
          </div>
        </PanelForm>
      )}

      {panel === "close" && summary && (
        <PanelForm
          title={`Clôturer la session ${summary.sessionNumber}`}
          onSubmit={(e) => {
            e.preventDefault();
            closeSessionMutation.mutate();
          }}
          onCancel={closePanel}
          pending={closeSessionMutation.isPending}
          submitLabel="Clôturer la session"
          submitDisabled={hasVariance && !varianceReason.trim()}
          error={closeError}
        >
          <ul className="space-y-1.5 rounded-2xl bg-gray-50 p-4 text-sm">
            {[
              { label: "Fonds d'ouverture", value: formatMoney(summary.openingAmount ?? 0) },
              { label: "Encaissements", value: `+ ${formatMoney(summary.totalPayments ?? 0)}` },
              { label: "Remboursements", value: `− ${formatMoney(summary.totalRefunds ?? 0)}` },
              { label: "Sorties d'espèces", value: `− ${formatMoney(summary.totalCashOut ?? 0)}` },
            ].map((l) => (
              <li key={l.label} className="flex justify-between gap-3 text-gray-600">
                <span>{l.label}</span>
                <span className="font-semibold tabular-nums text-gray-900">{l.value}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 pt-2 text-base font-bold text-gray-950">
              <span>Montant attendu</span>
              <span className="tabular-nums">{formatMoney(expected)}</span>
            </li>
          </ul>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Montant compté (FCFA)" required>
              <input
                type="number"
                min={0}
                value={countedAmount || ""}
                onChange={(e) => setCountedAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className={FIELD_SOFT}
              />
            </Field>
            {hasVariance && (
              <div className="flex items-end">
                <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${countedAmount > expected ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  Écart : {countedAmount - expected > 0 ? "+" : "−"} {formatMoney(Math.abs(countedAmount - expected))}
                </p>
              </div>
            )}
          </div>
          {hasVariance && (
            <Field label="Motif de l'écart" required>
              <textarea
                rows={2}
                value={varianceReason}
                onChange={(e) => setVarianceReason(e.target.value)}
                placeholder="Expliquez la raison de l'écart"
                className={FIELD_SOFT}
              />
            </Field>
          )}
        </PanelForm>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_16rem]">
          <SearchField value={search} onChange={setSearch} placeholder="Session, caisse ou ouvert par" />
          <select
            value={registerFilter}
            onChange={(e) => {
              setRegisterFilter(e.target.value);
              setPage(0);
            }}
            className={`${FIELD_SOFT} bg-white shadow-sm`}
            aria-label="Filtrer par caisse"
          >
            <option value="">Toutes les caisses</option>
            {registers.map((r) => (
              <option key={r.registerCode} value={r.registerCode}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => {
            const on = statusFilter === f.value;
            return (
              <button
                key={f.value || "all"}
                type="button"
                onClick={() => {
                  setStatusFilter(f.value);
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
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les sessions." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wallet} title="Aucune session" hint="Ajustez les filtres ou ouvrez une session." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Session</span>
            <span>Caisse</span>
            <span className="text-right">Ouverture</span>
            <span className="text-right">Encaissements</span>
            <span className="text-right">Attendu</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {filtered.map((s) => {
              const st = statusOf(SESSION_STATUS, s.status);
              return (
                <div
                  key={s.sessionNumber}
                  className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS}`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{s.sessionNumber}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {s.openedBy} · {formatDateTime(s.openedAt)}
                    </p>
                    {s.status === "CLOSED" && s.closedAt && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {s.closedBy === "SYSTEM" ? "Clôturée par le système" : `Clôturée par ${s.closedBy ?? "la caisse"}`} · {formatDateTime(s.closedAt)}
                        {s.closedBy === "SYSTEM" && s.countedClosingAmount == null && " · au montant attendu, sans comptage"}
                        {s.countedClosingAmount != null && s.varianceAmount ? ` · écart ${formatMoney(s.varianceAmount)}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1 lg:order-last">
                    {s.status === "OPEN" && (
                      <>
                        <IconButton
                          icon={XCircle}
                          label="Clôturer avec comptage"
                          tone="danger"
                          pending={loadingSummary === s.sessionNumber}
                          onClick={() => startClose(s)}
                        />
                        <IconButton icon={Zap} label="Clôture rapide sans comptage" onClick={() => confirmQuickClose(s)} />
                      </>
                    )}
                    {s.status === "CLOSING_REVIEW" && (
                      <IconButton icon={CheckCircle2} label="Valider l'écart" tone="success" onClick={() => confirmApprove(s)} />
                    )}
                  </div>
                  <p className="col-span-2 truncate text-sm text-gray-600 lg:col-span-1">{s.registerCode}</p>
                  <p className="text-sm tabular-nums text-gray-700 lg:text-right">{formatMoney(s.openingAmount ?? 0)}</p>
                  <p className="text-sm tabular-nums text-gray-700 lg:text-right">{formatMoney(s.totalPayments ?? 0)}</p>
                  <p className="text-sm font-bold tabular-nums text-gray-950 lg:text-right">{formatMoney(s.expectedClosingAmount ?? 0)}</p>
                  <div>
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination
            page={page}
            totalPages={sessionsData?.totalPages || 1}
            total={sessionsData?.totalElements ?? filtered.length}
            noun="session"
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
};
