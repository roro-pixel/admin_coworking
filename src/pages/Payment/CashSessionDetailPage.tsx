import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashSessionPaymentLine, CashSessionSummary } from "../../services/cashRegister.service";
import { ActionButton, EmptyState, ErrorBlock, Field, PageHeader, Section, StatusChip, Tabs, Detail } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { DetailsSkeleton, ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { METHOD_LABEL, SESSION_STATUS } from "../../components/payment/paymentLabels";
import { COUNT_MOMENT, TIMELINE_KIND, VARIANCE_DECISION } from "../../components/cash/cashLabels";
import { ActionBar, SessionActionPanel } from "./CashSessionPanels";
import type { SessionAction } from "./CashSessionPanels";

type Tab = "summary" | "payments" | "timeline" | "indicators" | "counts";

/** Un montant null signifie « non compté », jamais zéro. */
const money = (v: number | null | undefined) => (v === null || v === undefined ? "Non compté" : formatMoney(v, "FCFA"));

const SummaryTab: React.FC<{ s: CashSessionSummary }> = ({ s }) => (
  <Section title="Synthèse">
    <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3">
      <Detail label="Caisse" mono>{s.registerCode}</Detail>
      <Detail label="Ouverte par">{s.openedBy}</Detail>
      <Detail label="Ouverte le">{s.openedAt ? formatDateTime(s.openedAt) : undefined}</Detail>
      <Detail label="Fonds d'ouverture">{money(s.openingAmount)}</Detail>
      {s.expectedOpeningAmount != null && <Detail label="Fonds attendu à l'ouverture">{money(s.expectedOpeningAmount)}</Detail>}
      {s.openingVariance ? <Detail label="Écart à l'ouverture">{`${money(s.openingVariance)}${s.openingVarianceReason ? ` · ${s.openingVarianceReason}` : ""}`}</Detail> : null}
      <Detail label="Encaissements">{s.totalPayments != null ? formatMoney(s.totalPayments, "FCFA") : undefined}</Detail>
      <Detail label="Remboursements">{s.totalRefunds != null ? formatMoney(s.totalRefunds, "FCFA") : undefined}</Detail>
      <Detail label="Sorties d'espèces">{s.totalCashOut != null ? formatMoney(s.totalCashOut, "FCFA") : undefined}</Detail>
      <Detail label="Solde attendu">{s.expectedHidden ? "Masqué (clôture à l'aveugle)" : s.expectedClosingAmount != null ? formatMoney(s.expectedClosingAmount, "FCFA") : undefined}</Detail>
      {s.status === "CLOSED" || s.countedClosingAmount !== undefined ? <Detail label="Solde compté">{money(s.countedClosingAmount)}</Detail> : null}
      {s.varianceAmount != null && <Detail label="Écart">{`${formatMoney(s.varianceAmount, "FCFA")}${s.varianceReason ? ` · ${s.varianceReason}` : ""}`}</Detail>}
      {s.varianceDecision && <Detail label="Décision sur l'écart">{`${VARIANCE_DECISION[s.varianceDecision] ?? s.varianceDecision}${s.varianceDecidedBy ? ` · ${s.varianceDecidedBy}` : ""}`}</Detail>}
      {s.keptFloat != null && <Detail label="Fonds conservé">{formatMoney(s.keptFloat, "FCFA")}</Detail>}
      {s.amountToRemit != null && <Detail label="À remettre">{formatMoney(s.amountToRemit, "FCFA")}</Detail>}
      {s.suspensionReason && <Detail label="Suspension" wide>{`${s.suspensionReason}${s.suspendedBy ? ` · ${s.suspendedBy}` : ""}`}</Detail>}
      {s.outOfHoursReason && <Detail label="Ouverture hors horaires" wide>{s.outOfHoursReason}</Detail>}
      {s.forcedClose && <Detail label="Clôture">Forcée</Detail>}
      <Detail label="Clôturée par">{s.closedBy ? (s.closedBy === "SYSTEM" ? "Le système" : s.closedBy) : undefined}</Detail>
      <Detail label="Clôturée le">{s.closedAt ? formatDateTime(s.closedAt) : undefined}</Detail>
      <Detail label="Écart validé par">{s.reviewedBy}</Detail>
    </div>
  </Section>
);

const PaymentsTab: React.FC<{ s: CashSessionSummary }> = ({ s }) => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canReassign = hasPermission("CASH_VARIANCE:DECIDE");
  const [method, setMethod] = useState("");
  const [moving, setMoving] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const n = s.sessionNumber;
  const { data, isLoading, isError, error: loadError, refetch } = useQuery({ queryKey: ["cash-session-payments", n, method], queryFn: () => cashRegisterService.getSessionPayments(n, { paymentMethod: method || undefined }) });
  const reassign = useMutation({
    mutationFn: () => cashRegisterService.reassignPayment(n, moving!, { targetSessionNumber: target.trim(), reason: reason.trim() }),
    onSuccess: () => {
      toast.success("Paiement déplacé.");
      setMoving(null); setTarget(""); setReason(""); setError(null);
      queryClient.invalidateQueries({ queryKey: ["cash-session-payments"] });
      queryClient.invalidateQueries({ queryKey: ["cash-session"] });
    },
    onError: (e: unknown) => setError(apiMessage(e, "Déplacement refusé.")),
  });
  if (isLoading) return <ListSkeleton />;
  if (isError || !data) return <ErrorBlock message={apiMessage(loadError, "Encaissements indisponibles.")} onRetry={() => refetch()} />;
  const submit = () => (target.trim() && reason.trim().length >= 5 ? reassign.mutate() : setError("Session cible et motif (5 caractères minimum) requis."));
  const canMove = (l: CashSessionPaymentLine) => canReassign && l.paymentMethod === "CASH" && !l.refund;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {data.byMethod.map((m) => (
          <button key={m.paymentMethod} type="button" onClick={() => setMethod(method === m.paymentMethod ? "" : m.paymentMethod)} className={`rounded-full px-4 py-2 font-semibold ${method === m.paymentMethod ? "bg-[color:var(--logo-pink)] text-white" : "bg-white text-gray-700 shadow-sm"}`}>
            {METHOD_LABEL[m.paymentMethod] ?? m.paymentMethod} · {m.count} · {formatMoney(m.amount, "FCFA")}
          </button>
        ))}
      </div>
      {moving && (
        <div className="rounded-2xl bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Déplacer {moving} vers une autre session</p>
          {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Session cible"><input value={target} onChange={(e) => setTarget(e.target.value)} className={`${FIELD_SOFT} font-mono`} /></Field>
            <Field label="Motif"><input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_SOFT} /></Field>
          </div>
          <div className="mt-3 flex gap-2">
            <ActionButton variant="ghost" onClick={() => setMoving(null)}>Annuler</ActionButton>
            <ActionButton pending={reassign.isPending} onClick={submit}>Déplacer</ActionButton>
          </div>
        </div>
      )}
      <Section title={`Encaissements (${data.paymentCount}) · ${formatMoney(data.paymentTotal, "FCFA")}`}>
        {data.lines.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucun encaissement" hint="Aucun paiement sur cette session." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.lines.map((l) => (
              <li key={l.transactionNumber} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900"><span className="font-mono">{l.transactionNumber}</span> · {METHOD_LABEL[l.paymentMethod] ?? l.paymentMethod}{l.refund ? " · remboursement" : ""}</p>
                  <p className="text-xs text-gray-500">{[l.customerName, l.sourceLabel, l.receivedBy, l.at ? formatDateTime(l.at) : null].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tabular-nums">{formatMoney(l.refund ? -Math.abs(l.amount) : l.amount, "FCFA")}</span>
                  {canMove(l) && s.status !== "CLOSED" && <ActionButton variant="ghost" onClick={() => { setMoving(l.transactionNumber); setError(null); }}>Déplacer</ActionButton>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

const TimelineTab: React.FC<{ n: string }> = ({ n }) => {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["cash-session-timeline", n], queryFn: () => cashRegisterService.getSessionTimeline(n) });
  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorBlock message={apiMessage(error, "Chronologie indisponible.")} onRetry={() => refetch()} />;
  return (
    <Section title="Chronologie">
      <ul className="divide-y divide-gray-100">
        {(data ?? []).map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <p className="font-bold text-gray-900">{TIMELINE_KIND[e.kind] ?? e.kind} · <span className="font-normal text-gray-700">{e.label}</span></p>
              <p className="text-xs text-gray-500">{formatDateTime(e.at)}{e.actor ? ` · ${e.actor}` : ""}{e.reference ? ` · ${e.reference}` : ""}</p>
            </div>
            {e.amount != null && <span className="font-semibold tabular-nums">{formatMoney(e.amount, "FCFA")}</span>}
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">Aucun événement.</li>}
      </ul>
    </Section>
  );
};

const IndicatorsTab: React.FC<{ n: string }> = ({ n }) => {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["cash-session-indicators", n], queryFn: () => cashRegisterService.getSessionIndicators(n), refetchInterval: 60_000 });
  if (isLoading) return <ListSkeleton />;
  if (isError || !data) return <ErrorBlock message={apiMessage(error, "Indicateurs indisponibles.")} onRetry={() => refetch()} />;
  return (
    <Section title="Indicateurs">
      <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Solde attendu">{data.expectedHidden ? "Masqué" : data.expectedBalance != null ? formatMoney(data.expectedBalance, "FCFA") : undefined}</Detail>
        <Detail label="Encaissements">{`${data.paymentCount} · ${formatMoney(data.paymentTotal, "FCFA")}`}</Detail>
        <Detail label="Clients servis">{String(data.customersServed)}</Detail>
        <Detail label="Ticket moyen">{data.averageTicket != null ? formatMoney(data.averageTicket, "FCFA") : undefined}</Detail>
        <Detail label="Remboursements">{`${data.refundCount} · ${formatMoney(data.refundTotal, "FCFA")}`}</Detail>
        <Detail label="Mouvements">{String(data.movementCount)}</Detail>
        <Detail label="Temps actif">{`${data.activeMinutes} min`}</Detail>
        <Detail label="Temps en pause">{`${data.pauseMinutes} min`}</Detail>
        <Detail label="Plafond de détention">{data.detentionCap != null ? `${formatMoney(data.detentionCap, "FCFA")}${data.detentionRemaining != null ? ` · reste ${formatMoney(data.detentionRemaining, "FCFA")}` : ""}` : undefined}</Detail>
      </div>
    </Section>
  );
};

const CountsTab: React.FC<{ n: string }> = ({ n }) => {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["cash-session-counts", n], queryFn: () => cashRegisterService.getCounts(n) });
  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorBlock message={apiMessage(error, "Comptages indisponibles.")} onRetry={() => refetch()} />;
  return (
    <Section title="Comptages">
      <ul className="divide-y divide-gray-100">
        {(data ?? []).map((c) => (
          <li key={c.countNumber} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-gray-900"><span className="font-mono">{c.countNumber}</span> · {COUNT_MOMENT[c.moment] ?? c.moment}{c.supersededBy ? " · remplacé" : ""}</p>
              <span className="font-bold tabular-nums">{formatMoney(c.total, "FCFA")}</span>
            </div>
            <p className="text-xs text-gray-500">
              {[c.countedBy, c.secondCounter ? `2e compteur ${c.secondCounter}` : null, c.witness ? `témoin ${c.witness}` : null, c.createdAt ? formatDateTime(c.createdAt) : null].filter(Boolean).join(" · ")}
              {c.variance != null ? ` · écart ${formatMoney(c.variance, "FCFA")}` : ""}
            </p>
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">Aucun comptage.</li>}
      </ul>
    </Section>
  );
};

export const CashSessionDetailPage: React.FC = () => {
  const { sessionNumber = "" } = useParams<{ sessionNumber: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<Tab>("summary");
  const [action, setAction] = useState<SessionAction | null>(null);
  const [reportTo, setReportTo] = useState("");
  const { data: s, isLoading, isError, error, refetch } = useQuery({ queryKey: ["cash-session", sessionNumber], queryFn: () => cashRegisterService.getSessionSummary(sessionNumber), enabled: !!sessionNumber });
  const register = useQuery({ queryKey: ["cash-register-detail", s?.registerCode], queryFn: () => cashRegisterService.getRegisterDetail(s!.registerCode), enabled: !!s?.registerCode });
  const report = useMutation({
    mutationFn: () => cashRegisterService.sendSessionReport(sessionNumber, reportTo.trim() || undefined),
    onSuccess: (r) => toast.success(`Rapport envoyé à ${r.recipients.length} destinataire(s).`),
    onError: (e: unknown) => toast.error(apiMessage(e, "Envoi impossible.")),
  });
  if (isLoading) return <DetailsSkeleton />;
  if (isError || !s) return <ErrorBlock message={apiMessage(error, "Session introuvable.")} onRetry={() => refetch()} />;
  void queryClient;

  const st = statusOf(SESSION_STATUS, s.status);
  const manual = !register.data?.systemManaged;
  const p = (c: string) => hasPermission(c);
  const items: { action: SessionAction; label: string; variant?: "primary" | "ghost" | "danger"; show: boolean }[] = [
    { action: "confirm", label: "Confirmer l'ouverture", variant: "primary", show: manual && s.status === "OPENING" },
    { action: "contest", label: "Contester", variant: "danger", show: manual && s.status === "OPENING" },
    { action: "pause", label: "Pause", show: manual && s.status === "OPEN" && p("CASH_SESSION:PAUSE") },
    { action: "resume", label: "Reprendre", variant: "primary", show: manual && s.status === "PAUSED" },
    { action: "suspend", label: "Suspendre", show: manual && (s.status === "OPEN" || s.status === "PAUSED") && p("CASH_SESSION:SUSPEND") },
    { action: "unsuspend", label: "Lever la suspension", variant: "primary", show: s.status === "SUSPENDED" && p("CASH_SESSION:SUSPEND") },
    { action: "close", label: "Démarrer la clôture", variant: "primary", show: manual && s.status === "OPEN" && p("CASH_SESSION:CLOSE") },
    { action: "count", label: "Saisir le comptage", variant: "primary", show: manual && (s.status === "COUNTING" || s.status === "RECOUNT") },
    { action: "decide", label: "Décider l'écart", variant: "primary", show: s.status === "CLOSING_REVIEW" && p("CASH_VARIANCE:DECIDE") },
    { action: "recount", label: "Demander un recomptage", show: s.status === "CLOSING_REVIEW" && p("CASH_VARIANCE:DECIDE") },
    { action: "spot", label: "Contrôle inopiné", show: manual && s.status === "OPEN" && p("CASH_SESSION:SPOT_CHECK") },
    { action: "handover", label: "Remise de caisse", show: manual && s.status === "OPEN" },
    { action: "cancel", label: "Annuler la session", variant: "danger", show: manual && (s.status === "OPENING" || s.status === "OPEN") },
    { action: "force", label: "Clôture forcée", variant: "danger", show: !["CLOSED", "CANCELLED"].includes(s.status) && p("CASH_SESSION:FORCE_CLOSE") },
  ];
  const tabs: TabItem<Tab>[] = [
    { id: "summary", label: "Synthèse" },
    { id: "payments", label: "Encaissements" },
    { id: "timeline", label: "Chronologie" },
    { id: "indicators", label: "Indicateurs" },
    { id: "counts", label: "Comptages" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={s.sessionNumber}
        subtitle={`${register.data?.name ?? s.registerCode}${s.openedBy ? ` · ouverte par ${s.openedBy}` : ""}`}
        onBack={() => navigate("/payments/sessions")}
        backLabel="Retour aux sessions"
        badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
      />
      {register.data?.systemManaged && <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">Caisse tenue par le système : pas de saisie manuelle.</p>}
      {s.handoverNumber && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900">
          <span>Remise de caisse <span className="font-mono font-bold">{s.handoverNumber}</span></span>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => setAction("acceptHandover")}>Accepter</ActionButton>
            <ActionButton variant="danger" onClick={() => setAction("disputeHandover")}>Contester</ActionButton>
            <ActionButton variant="ghost" onClick={() => setAction("cancelHandover")}>Annuler</ActionButton>
          </div>
        </div>
      )}
      <ActionBar items={items} onPick={setAction} />
      {action && <SessionActionPanel session={s} action={action} onClose={() => setAction(null)} />}
      <Tabs variant="soft" items={tabs} active={tab} onChange={setTab} />
      {tab === "summary" && <SummaryTab s={s} />}
      {tab === "payments" && <PaymentsTab s={s} />}
      {tab === "timeline" && <TimelineTab n={s.sessionNumber} />}
      {tab === "indicators" && <IndicatorsTab n={s.sessionNumber} />}
      {tab === "counts" && <CountsTab n={s.sessionNumber} />}
      {s.status === "CLOSED" && (
        <Section title="Rapport de session">
          <div className="flex flex-wrap items-end gap-3 p-3">
            <div className="min-w-[16rem] flex-1">
              <Field label="Destinataires supplémentaires" hint="E-mails séparés par une virgule"><input value={reportTo} onChange={(e) => setReportTo(e.target.value)} className={FIELD_SOFT} /></Field>
            </div>
            <ActionButton pending={report.isPending} onClick={() => report.mutate()}>Envoyer le rapport</ActionButton>
          </div>
        </Section>
      )}
    </div>
  );
};
