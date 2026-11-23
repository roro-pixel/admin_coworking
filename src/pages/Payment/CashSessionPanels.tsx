import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashCountRequest, CashReasonRequest, CashSessionStep, CashSessionSummary, CashVarianceDecision } from "../../services/cashRegister.service";
import { ActionButton, Field, PanelForm } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { CountForm, buildCountRequest, countTotal, emptyCount } from "../../components/cash/CountForm";
import type { CountDraft } from "../../components/cash/CountForm";
import { CASH_STEP_MESSAGE, VARIANCE_DECISION_OPTIONS } from "../../components/cash/cashLabels";

export type SessionAction = "pause" | "resume" | "suspend" | "unsuspend" | "cancel" | "confirm" | "contest" | "close" | "count" | "spot" | "recount" | "force" | "handover" | "decide" | "acceptHandover" | "disputeHandover" | "cancelHandover";

const ACTION_TITLE: Record<SessionAction, string> = {
  pause: "Mettre la session en pause",
  resume: "Reprendre la session",
  suspend: "Suspendre la session",
  unsuspend: "Lever la suspension",
  cancel: "Annuler la session",
  confirm: "Confirmer l'ouverture",
  contest: "Contester l'ouverture",
  close: "Démarrer la clôture",
  count: "Comptage de clôture",
  spot: "Contrôle inopiné",
  recount: "Demander un recomptage",
  force: "Clôture forcée",
  handover: "Remise de caisse",
  decide: "Décision sur l'écart",
  acceptHandover: "Accepter la remise de caisse",
  disputeHandover: "Contester la remise de caisse",
  cancelHandover: "Annuler la remise de caisse",
};

/** Actions immédiates, sans saisie : une confirmation suffit. */
const SIMPLE: SessionAction[] = ["pause", "unsuspend", "close", "cancelHandover"];
const REASON_REQUIRED: SessionAction[] = ["suspend", "cancel", "contest", "recount", "disputeHandover"];
const WITH_COUNT: SessionAction[] = ["count", "spot", "force", "handover", "acceptHandover", "disputeHandover"];

export const SessionActionPanel: React.FC<{ session: CashSessionSummary; action: SessionAction; onClose: () => void }> = ({ session, action, onClose }) => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const n = session.sessionNumber;
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [decision, setDecision] = useState<CashVarianceDecision>("EXPENSE");
  const [dueAt, setDueAt] = useState("");
  const [draft, setDraft] = useState<CountDraft>(emptyCount());
  const [error, setError] = useState<string | null>(null);

  const needsCount = WITH_COUNT.includes(action);
  const expectedOpening = useQuery({ queryKey: ["cash-expected-opening", session.registerCode], queryFn: () => cashRegisterService.getExpectedOpening(session.registerCode), enabled: needsCount });
  const denoms = expectedOpening.data?.denominations ?? [];
  const withLines = expectedOpening.data?.countLinesRequired ?? false;
  const blind = !!session.expectedHidden && !hasPermission("CASH_VARIANCE:DECIDE");
  const expected = blind ? undefined : session.expectedClosingAmount;

  const run = useMutation({
    mutationFn: async (): Promise<CashSessionStep | void> => {
      const reasonBody: CashReasonRequest = { reasonText: reason.trim() || undefined };
      const count = (): CashCountRequest =>
        buildCountRequest(draft, denoms, "XAF", withLines, { keptFloat: action === "count", secondCounter: true, witness: action === "force" || action === "spot" });
      switch (action) {
        case "pause": return cashRegisterService.pauseSession(n);
        case "resume": return cashRegisterService.resumeSession(n, password);
        case "suspend": return cashRegisterService.suspendSession(n, reasonBody);
        case "unsuspend": return cashRegisterService.unsuspendSession(n);
        case "cancel": return cashRegisterService.cancelSession(n, reasonBody);
        case "confirm": return cashRegisterService.confirmOpening(n, reasonBody);
        case "contest": return cashRegisterService.contestOpening(n, reasonBody);
        case "close": return cashRegisterService.startClosing(n);
        case "count": return cashRegisterService.submitCount(n, count());
        case "spot": return cashRegisterService.spotCheck(n, count());
        case "recount": return cashRegisterService.requestRecount(n, reasonBody);
        case "force": return cashRegisterService.forceClose(n, { count: count(), reason: reasonBody });
        case "handover": await cashRegisterService.createHandover(n, { incomingEmail: email.trim(), count: count() }); return;
        case "acceptHandover": return cashRegisterService.acceptHandover(session.handoverNumber ?? "", { count: count(), reason: reason.trim() || undefined });
        case "disputeHandover": return cashRegisterService.disputeHandover(session.handoverNumber ?? "", { count: count(), reason: reason.trim() });
        case "cancelHandover": await cashRegisterService.cancelHandover(session.handoverNumber ?? ""); return;
        case "decide": return cashRegisterService.decideVariance(n, { decision, note: reason.trim() || undefined, reviewDueAt: decision === "INVESTIGATION" && dueAt ? new Date(dueAt).toISOString() : undefined });
      }
    },
    onSuccess: (step) => {
      toast.success(CASH_STEP_MESSAGE((step as CashSessionStep | undefined)?.messages) ?? `${ACTION_TITLE[action]} : fait.`);
      ["cash-session", "cash-session-counts", "cash-session-timeline", "cash-session-indicators", "cash-sessions", "cash-variance-reviews"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e: unknown) => setError(apiMessage(e, "Action refusée.")),
  });

  const submit = () => {
    setError(null);
    if (REASON_REQUIRED.includes(action) && reason.trim().length < 3) return setError("Un motif est requis.");
    if (action === "force" && !reason.trim()) return setError("Le motif de la clôture forcée est requis.");
    if (action === "resume" && !password) return setError("Saisissez votre mot de passe.");
    if (action === "handover" && !email.trim()) return setError("L'e-mail du caissier entrant est requis.");
    if (needsCount && action !== "disputeHandover" && countTotal(draft, denoms, withLines) <= 0 && !draft.note.trim()) return setError("Saisissez le comptage.");
    run.mutate();
  };

  return (
    <PanelForm title={ACTION_TITLE[action]} onSubmit={submit} onCancel={onClose} pending={run.isPending} submitLabel="Confirmer" error={error}>
      {SIMPLE.includes(action) && (
        <p className="text-sm text-gray-600">
          {action === "pause" && "Aucun encaissement n'est possible pendant la pause. La reprise demande votre mot de passe."}
          {action === "unsuspend" && "La session redevient utilisable."}
          {action === "cancelHandover" && "La remise de caisse en attente est annulée."}
          {action === "close" && "La session passe en comptage : plus d'encaissement, le comptage de clôture est à saisir."}
        </p>
      )}
      {action === "confirm" && <p className="text-sm text-gray-600">Vous validez le fonds d'ouverture déclaré par le caissier.</p>}
      {action === "resume" && (
        <Field label="Mot de passe">
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={FIELD_SOFT} />
        </Field>
      )}
      {action === "handover" && (
        <Field label="Caissier entrant (e-mail)">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD_SOFT} />
        </Field>
      )}
      {needsCount && (
        <div className="space-y-2">
          {blind && <p className="rounded-2xl bg-gray-50 p-3 text-sm text-gray-600">Clôture à l'aveugle : le solde attendu n'est pas affiché.</p>}
          <CountForm draft={draft} onChange={setDraft} denominations={denoms} withLines={withLines} expected={action === "count" || action === "force" ? expected : undefined} showSecondCounter showWitness={action === "force" || action === "spot"} showKeptFloat={action === "count"} />
        </div>
      )}
      {(REASON_REQUIRED.includes(action) || action === "force" || action === "decide" || action === "confirm") && (
        <Field label={action === "decide" ? "Commentaire" : action === "confirm" ? "Note (facultatif)" : "Motif"}>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_SOFT} />
        </Field>
      )}
      {action === "decide" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Décision">
            <select value={decision} onChange={(e) => setDecision(e.target.value as CashVarianceDecision)} className={FIELD_SOFT}>
              {VARIANCE_DECISION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          {decision === "INVESTIGATION" && (
            <Field label="Revue prévue le">
              <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={FIELD_SOFT} />
            </Field>
          )}
        </div>
      )}
    </PanelForm>
  );
};

export const ActionBar: React.FC<{ items: { action: SessionAction; label: string; variant?: "primary" | "ghost" | "danger"; show: boolean }[]; onPick: (a: SessionAction) => void }> = ({ items, onPick }) => (
  <div className="flex flex-wrap gap-2">
    {items.filter((i) => i.show).map((i) => (
      <ActionButton key={i.action} variant={i.variant ?? "ghost"} onClick={() => onPick(i.action)}>
        {i.label}
      </ActionButton>
    ))}
  </div>
);
