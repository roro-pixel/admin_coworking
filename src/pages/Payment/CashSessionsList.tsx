import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Wallet } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashSession } from "../../services/payment.service";
import { cashRegisterService } from "../../services/cashRegister.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, HeadRow, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, FOCUS, ROW_HOVER, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { toast } from "../../components/ui/toastStore";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { SESSION_STATUS } from "../../components/payment/paymentLabels";
import { CountForm, buildCountRequest, countTotal, emptyCount } from "../../components/cash/CountForm";
import { CASH_STEP_MESSAGE } from "../../components/cash/cashLabels";
import { parseDigits } from "../../components/payment/paymentUtils";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_8rem_8rem_8rem_9rem]";

const STATUS_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "OPEN", label: "Ouvertes" },
  { value: "OPENING", label: "À confirmer" },
  { value: "CLOSING_REVIEW", label: "À valider" },
  { value: "CLOSED", label: "Clôturées" },
];

const OpenSessionPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [registerCode, setRegisterCode] = useState("");
  const [amount, setAmount] = useState(0);
  const [draft, setDraft] = useState(emptyCount());
  const [reasonText, setReasonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mine = useQuery({ queryKey: ["cash-my-registers"], queryFn: () => cashRegisterService.getMyRegisters() });
  const expected = useQuery({ queryKey: ["cash-expected-opening", registerCode], queryFn: () => cashRegisterService.getExpectedOpening(registerCode), enabled: !!registerCode });
  const exp = expected.data;
  const withLines = exp?.countLinesRequired ?? false;
  const registers = (mine.data ?? []).filter((r) => r.status === "ACTIVE" && !r.systemManaged);

  const open = useMutation({
    mutationFn: () =>
      cashRegisterService.openSession({
        registerCode,
        openingAmount: withLines ? undefined : amount || undefined,
        openingCount: withLines ? buildCountRequest(draft, exp?.denominations ?? [], "XAF", true) : undefined,
        outOfHoursReasonText: reasonText.trim() || undefined,
      }),
    onSuccess: (s) => {
      toast.success("Session ouverte.");
      queryClient.invalidateQueries({ queryKey: ["cash-sessions"] });
      navigate(`/payments/sessions/${s.sessionNumber}`);
    },
    onError: (e: unknown) => {
      const m = apiMessage(e, "Ouverture refusée.");
      setError(m);
    },
  });
  void CASH_STEP_MESSAGE;

  return (
    <PanelForm
      title="Ouvrir une session de caisse"
      onSubmit={() => (registerCode ? (withLines && countTotal(draft, exp?.denominations ?? [], true) <= 0 ? setError("Comptez le fonds d'ouverture.") : open.mutate()) : setError("Choisissez une caisse."))}
      onCancel={onClose}
      pending={open.isPending}
      submitLabel="Ouvrir la session"
      error={error}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Caisse" required>
          <select value={registerCode} onChange={(e) => setRegisterCode(e.target.value)} className={FIELD_SOFT}>
            <option value="">Choisir une de mes caisses</option>
            {registers.map((r) => <option key={r.registerCode} value={r.registerCode}>{r.name}</option>)}
          </select>
        </Field>
        {exp && (
          <div className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
            {exp.neverCounted ? "Cette caisse n'a jamais été comptée." : `Fonds attendu : ${exp.expectedAmount != null ? formatMoney(exp.expectedAmount, "FCFA") : "—"}`}
            {exp.standardFloat != null ? ` · fonds standard ${formatMoney(exp.standardFloat, "FCFA")}` : ""}
          </div>
        )}
        {exp && !withLines && (
          <Field label="Fonds d'ouverture (FCFA)">
            <input inputMode="numeric" value={amount || ""} onChange={(e) => setAmount(parseDigits(e.target.value))} className={`${FIELD_SOFT} tabular-nums`} />
          </Field>
        )}
        <Field label="Motif d'ouverture hors horaires" hint="Seulement si l'ouverture est en dehors des horaires de la caisse">
          <input value={reasonText} onChange={(e) => setReasonText(e.target.value)} className={FIELD_SOFT} />
        </Field>
      </div>
      {exp && withLines && <CountForm draft={draft} onChange={setDraft} denominations={exp.denominations} withLines expected={exp.expectedAmount} showSecondCounter={false} showVariance />}
    </PanelForm>
  );
};

export const CashSessionsList: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [registerFilter, setRegisterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [opening, setOpening] = useState(false);

  const { data: registersData } = useQuery({ queryKey: ["cash-registers-list"], queryFn: () => paymentService.getCashRegisters({ active: true, size: 200 }) });
  const registers = registersData?.content || [];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cash-sessions", page, registerFilter, statusFilter],
    queryFn: () => paymentService.getCashSessions({ registerCode: registerFilter || undefined, status: statusFilter || undefined, page, size: PAGE_SIZE }),
  });
  const sessions: CashSession[] = data?.content || [];
  const q = search.trim().toLowerCase();
  const filtered = q ? sessions.filter((s) => s.sessionNumber.toLowerCase().includes(q) || s.registerCode.toLowerCase().includes(q) || s.openedBy.toLowerCase().includes(q)) : sessions;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Sessions de caisse"
        subtitle="Ouverture, comptage et clôture des sessions."
        action={
          <ActionButton icon={Play} className="w-full sm:w-auto" onClick={() => setOpening((v) => !v)}>
            Ouvrir une session
          </ActionButton>
        }
      />
      {opening && <OpenSessionPanel onClose={() => setOpening(false)} />}

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_16rem]">
          <SearchField value={search} onChange={setSearch} placeholder="Session, caisse ou ouvert par" />
          <select value={registerFilter} onChange={(e) => { setRegisterFilter(e.target.value); setPage(0); }} className={`${FIELD_SOFT} bg-white shadow-sm`} aria-label="Filtrer par caisse">
            <option value="">Toutes les caisses</option>
            {registers.map((r) => <option key={r.registerCode} value={r.registerCode}>{r.name}</option>)}
          </select>
        </div>
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {STATUS_FILTERS.map((f) => {
            const on = statusFilter === f.value;
            return (
              <button key={f.value || "all"} type="button" onClick={() => { setStatusFilter(f.value); setPage(0); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${on ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"}`}>
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
          </HeadRow>
          <DataCard>
            {filtered.map((s) => {
              const st = statusOf(SESSION_STATUS, s.status);
              return (
                <button key={s.sessionNumber} type="button" onClick={() => navigate(`/payments/sessions/${s.sessionNumber}`)} className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 text-left max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER} ${FOCUS}`}>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{s.sessionNumber}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">{s.openedBy} · {formatDateTime(s.openedAt)}</p>
                    {s.status === "CLOSED" && s.closedAt && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {s.closedBy === "SYSTEM" ? "Clôturée par le système" : `Clôturée par ${s.closedBy ?? "la caisse"}`} · {formatDateTime(s.closedAt)}
                        {s.countedClosingAmount == null ? " · non compté" : s.varianceAmount ? ` · écart ${formatMoney(s.varianceAmount)}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="lg:order-last"><StatusChip tone={st.tone}>{st.label}</StatusChip></div>
                  <p className="col-span-2 truncate text-sm text-gray-600 lg:col-span-1">{s.registerCode}</p>
                  <p className="text-sm tabular-nums text-gray-700 lg:text-right">{formatMoney(s.openingAmount ?? 0)}</p>
                  <p className="text-sm tabular-nums text-gray-700 lg:text-right">{formatMoney(s.totalPayments ?? 0)}</p>
                  <p className="text-sm font-bold tabular-nums text-gray-950 lg:text-right">{s.expectedClosingAmount == null ? "—" : formatMoney(s.expectedClosingAmount)}</p>
                </button>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages || 1} total={data?.totalElements ?? filtered.length} noun="session" onChange={setPage} />
        </>
      )}
    </div>
  );
};
