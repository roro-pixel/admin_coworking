import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Power, Wallet } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashCapBehavior, CashRegisterDetail, CashSchedule, UpdateCashRegisterRequest } from "../../services/cashRegister.service";
import type { PaymentMethod } from "../../services/payment.service";
import { ActionButton, Detail, EmptyState, ErrorBlock, Field, PageHeader, Section, StatusChip, Switch, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { METHOD_LABEL } from "../../components/payment/paymentLabels";
import { CAP_BEHAVIOR, DAY_LABEL, REGISTER_STATUS, REGISTER_TYPE, timeText } from "../../components/cash/cashLabels";
import { parseDigits } from "../../components/payment/paymentUtils";
import { AssignmentsTab, DevicesTab, HistoryTab, ResponsibilityTab } from "./CashRegisterTabs";

type Tab = "settings" | "assignments" | "devices" | "responsibility" | "history";

const toTime = (hhmm: string) => (hhmm.length === 5 ? `${hhmm}:00` : hhmm);

interface Draft {
  name: string;
  locationCode: string;
  businessEntityCode: string;
  parentRegisterCode: string;
  cashControlEnabled: boolean;
  maxCashAmount: number;
  capBehavior: CashCapBehavior;
  maxOutPerOperation: number;
  maxOutPerDay: number;
  standardFloat: number;
  alertRecipients: string;
  treasuryAccountNumber: string;
  defaultJournalCode: string;
  acceptedMethods: string[];
  /** jour 1..7 → [ouverture, fermeture] ; absent = fermé */
  schedules: Record<number, [string, string]>;
}

const toDraft = (r: CashRegisterDetail): Draft => ({
  name: r.name ?? "",
  locationCode: r.locationCode ?? "",
  businessEntityCode: r.businessEntityCode ?? "",
  parentRegisterCode: r.parentRegisterCode ?? "",
  cashControlEnabled: !!r.cashControlEnabled,
  maxCashAmount: r.maxCashAmount ?? 0,
  capBehavior: r.capBehavior ?? "ALERT",
  maxOutPerOperation: r.maxOutPerOperation ?? 0,
  maxOutPerDay: r.maxOutPerDay ?? 0,
  standardFloat: r.standardFloat ?? 0,
  alertRecipients: (r.alertRecipients ?? []).join(", "),
  treasuryAccountNumber: r.treasuryAccountNumber ?? "",
  defaultJournalCode: r.defaultJournalCode ?? "",
  acceptedMethods: r.acceptedMethods ?? [],
  schedules: Object.fromEntries((r.schedules ?? []).map((s) => [s.dayOfWeek, [timeText(s.opensAt), timeText(s.closesAt)] as [string, string]])),
});

const SettingsTab: React.FC<{ register: CashRegisterDetail; canManage: boolean }> = ({ register, canManage }) => {
  const queryClient = useQueryClient();
  const initial = useMemo(() => toDraft(register), [register]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [reason, setReason] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDraft(initial), [initial]);

  const diff = (): UpdateCashRegisterRequest => {
    const out: UpdateCashRegisterRequest = {};
    const d = draft;
    if (d.name !== initial.name) out.name = d.name.trim();
    if (d.locationCode !== initial.locationCode) out.locationCode = d.locationCode.trim();
    if (d.businessEntityCode !== initial.businessEntityCode) out.businessEntityCode = d.businessEntityCode.trim();
    if (d.parentRegisterCode !== initial.parentRegisterCode) out.parentRegisterCode = d.parentRegisterCode.trim();
    if (d.cashControlEnabled !== initial.cashControlEnabled) out.cashControlEnabled = d.cashControlEnabled;
    if (d.maxCashAmount !== initial.maxCashAmount) out.maxCashAmount = d.maxCashAmount;
    if (d.capBehavior !== initial.capBehavior) out.capBehavior = d.capBehavior;
    if (d.maxOutPerOperation !== initial.maxOutPerOperation) out.maxOutPerOperation = d.maxOutPerOperation;
    if (d.maxOutPerDay !== initial.maxOutPerDay) out.maxOutPerDay = d.maxOutPerDay;
    if (d.standardFloat !== initial.standardFloat) out.standardFloat = d.standardFloat;
    if (d.alertRecipients !== initial.alertRecipients) out.alertRecipients = d.alertRecipients.split(/[,\s;]+/).filter(Boolean);
    if (d.treasuryAccountNumber !== initial.treasuryAccountNumber) out.treasuryAccountNumber = d.treasuryAccountNumber.trim();
    if (d.defaultJournalCode !== initial.defaultJournalCode) out.defaultJournalCode = d.defaultJournalCode.trim();
    if (JSON.stringify([...d.acceptedMethods].sort()) !== JSON.stringify([...initial.acceptedMethods].sort())) out.acceptedMethods = d.acceptedMethods as PaymentMethod[];
    if (JSON.stringify(d.schedules) !== JSON.stringify(initial.schedules)) {
      out.schedules = Object.entries(d.schedules)
        .filter(([, v]) => v[0] && v[1])
        .map(([day, v]): CashSchedule => ({ dayOfWeek: Number(day), opensAt: toTime(v[0]), closesAt: toTime(v[1]) }));
    }
    return out;
  };
  const changes = diff();
  const changed = Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: () => cashRegisterService.updateRegister(register.registerCode, { ...changes, reason: reason.trim() || undefined, effectiveAt: effectiveAt ? new Date(effectiveAt).toISOString() : undefined }),
    onSuccess: () => {
      toast.success("Paramètres enregistrés.");
      setReason("");
      setEffectiveAt("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["cash-register-detail", register.registerCode] });
      queryClient.invalidateQueries({ queryKey: ["cash-register-history", register.registerCode] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
    },
    onError: (e: unknown) => setError(apiMessage(e, "Enregistrement impossible.")),
  });

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const ro = !canManage || register.systemManaged;
  const num = (v: number, k: keyof Draft, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input disabled={ro} inputMode="numeric" value={v || ""} onChange={(e) => set({ [k]: parseDigits(e.target.value) } as Partial<Draft>)} className={`${FIELD_SOFT} tabular-nums`} />
    </Field>
  );
  const txt = (v: string, k: keyof Draft, label: string, hint?: string, mono = false) => (
    <Field label={label} hint={hint}>
      <input disabled={ro} value={v} onChange={(e) => set({ [k]: e.target.value } as Partial<Draft>)} className={`${FIELD_SOFT} ${mono ? "font-mono" : ""}`} />
    </Field>
  );

  return (
    <div className="space-y-5">
      {register.systemManaged && <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">Cette caisse est tenue par le système : ses paramètres ne se modifient pas ici.</p>}
      <Section title="Paramètres">
        <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-2">
          {txt(draft.name, "name", "Nom")}
          {txt(draft.locationCode, "locationCode", "Site", undefined, true)}
          {txt(draft.businessEntityCode, "businessEntityCode", "Entité", undefined, true)}
          {txt(draft.parentRegisterCode, "parentRegisterCode", "Caisse mère", undefined, true)}
          {num(draft.maxCashAmount, "maxCashAmount", "Plafond de détention (FCFA)")}
          <Field label="Au dépassement du plafond">
            <select disabled={ro} value={draft.capBehavior} onChange={(e) => set({ capBehavior: e.target.value as CashCapBehavior })} className={FIELD_SOFT}>
              {Object.entries(CAP_BEHAVIOR).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          {num(draft.maxOutPerOperation, "maxOutPerOperation", "Sortie maximale par opération (FCFA)")}
          {num(draft.maxOutPerDay, "maxOutPerDay", "Sortie maximale par jour (FCFA)")}
          {num(draft.standardFloat, "standardFloat", "Fonds de caisse standard (FCFA)")}
          {txt(draft.alertRecipients, "alertRecipients", "Destinataires des alertes", "E-mails séparés par une virgule")}
          {txt(draft.treasuryAccountNumber, "treasuryAccountNumber", "Compte de trésorerie", undefined, true)}
          {txt(draft.defaultJournalCode, "defaultJournalCode", "Journal par défaut", undefined, true)}
          <div className="md:col-span-2">
            <Switch checked={draft.cashControlEnabled} onChange={(v) => !ro && set({ cashControlEnabled: v })} label="Contrôle des espèces" hint="Active le plafond de détention" />
          </div>
        </div>
      </Section>

      <Section title="Moyens acceptés">
        <div className="flex flex-wrap gap-2 p-3">
          {Object.entries(METHOD_LABEL).map(([m, label]) => {
            const on = draft.acceptedMethods.includes(m);
            return (
              <button
                key={m}
                type="button"
                disabled={ro}
                aria-pressed={on}
                onClick={() => set({ acceptedMethods: on ? draft.acceptedMethods.filter((x) => x !== m) : [...draft.acceptedMethods, m] })}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${on ? "bg-[color:var(--logo-pink)] text-white" : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Horaires d'ouverture" description="Une ouverture hors horaires demande un motif">
        <div className="space-y-2 p-3">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const v = draft.schedules[day];
            return (
              <div key={day} className="grid grid-cols-[7rem_1fr_1fr] items-center gap-3 text-sm">
                <label className="flex items-center gap-2 font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    disabled={ro}
                    checked={!!v}
                    onChange={(e) => {
                      const next = { ...draft.schedules };
                      if (e.target.checked) next[day] = ["08:00", "17:00"];
                      else delete next[day];
                      set({ schedules: next });
                    }}
                  />
                  {DAY_LABEL[day]}
                </label>
                {v ? (
                  <>
                    <input type="time" disabled={ro} value={v[0]} onChange={(e) => set({ schedules: { ...draft.schedules, [day]: [e.target.value, v[1]] } })} className={FIELD_SOFT} aria-label={`${DAY_LABEL[day]} ouverture`} />
                    <input type="time" disabled={ro} value={v[1]} onChange={(e) => set({ schedules: { ...draft.schedules, [day]: [v[0], e.target.value] } })} className={FIELD_SOFT} aria-label={`${DAY_LABEL[day]} fermeture`} />
                  </>
                ) : (
                  <span className="col-span-2 text-gray-400">Fermé</span>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {canManage && !register.systemManaged && (
        <Section title="Enregistrer">
          {error && (
            <p role="alert" className="mx-3 mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 p-3 md:grid-cols-2">
            <Field label="Motif du changement" hint="Conservé dans l'historique">
              <input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD_SOFT} />
            </Field>
            <Field label="Date d'effet" hint="Facultatif : sans date, le changement s'applique tout de suite">
              <input type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} className={FIELD_SOFT} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 p-3">
            <ActionButton variant="ghost" disabled={!changed} onClick={() => setDraft(initial)}>
              Annuler les modifications
            </ActionButton>
            <ActionButton pending={save.isPending} disabled={!changed} onClick={() => save.mutate()}>
              Enregistrer
            </ActionButton>
          </div>
        </Section>
      )}
    </div>
  );
};

export const CashRegisterDetailPage: React.FC = () => {
  const { registerCode = "" } = useParams<{ registerCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("CASH_REGISTER:MANAGE");
  const [tab, setTab] = useState<Tab>("settings");
  const [reasonText, setReasonText] = useState("");
  const [statusAction, setStatusAction] = useState<null | "suspend" | "close">(null);

  const { data: register, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["cash-register-detail", registerCode],
    queryFn: () => cashRegisterService.getRegisterDetail(registerCode),
    enabled: !!registerCode,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["cash-register-detail", registerCode] });
    queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
    queryClient.invalidateQueries({ queryKey: ["cash-register-history", registerCode] });
  };

  const status = useMutation({
    mutationFn: (a: "suspend" | "close" | "reactivate") =>
      a === "reactivate"
        ? cashRegisterService.reactivateRegister(registerCode)
        : (a === "suspend" ? cashRegisterService.suspendRegister : cashRegisterService.closeRegister)(registerCode, reasonText.trim() ? { reasonText: reasonText.trim() } : undefined),
    onSuccess: () => {
      toast.success("Statut de la caisse mis à jour.");
      setStatusAction(null);
      setReasonText("");
      refresh();
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Changement de statut refusé.")),
  });

  if (isLoading) return <DetailsSkeleton />;
  if (isError || !register) {
    return <ErrorBlock message={apiMessage(error, "Caisse introuvable.")} onRetry={() => refetch()} />;
  }

  const st = statusOf(REGISTER_STATUS, register.status);
  const tabs: TabItem<Tab>[] = [
    { id: "settings", label: "Paramètres" },
    { id: "assignments", label: "Affectations", count: (register.assignments ?? []).filter((a) => !a.revokedAt).length },
    { id: "devices", label: "Appareils", count: (register.devices ?? []).length },
    { id: "responsibility", label: "Passations" },
    { id: "history", label: "Historique" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={register.name}
        subtitle={`${register.registerCode} · ${REGISTER_TYPE[register.registerType] ?? register.registerType}${register.locationCode ? ` · ${register.locationCode}` : ""}`}
        onBack={() => navigate("/payments/registers")}
        backLabel="Retour aux caisses"
        badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
        actions={
          canManage && !register.systemManaged && !statusAction ? (
            <div className="flex flex-wrap gap-2">
              {register.status === "ACTIVE" && (
                <>
                  <ActionButton variant="ghost" icon={Pause} onClick={() => setStatusAction("suspend")}>
                    Suspendre
                  </ActionButton>
                  <ActionButton variant="danger" icon={Power} onClick={() => setStatusAction("close")}>
                    Clore
                  </ActionButton>
                </>
              )}
              {register.status === "SUSPENDED" && (
                <>
                  <ActionButton icon={Play} pending={status.isPending} onClick={() => status.mutate("reactivate")}>
                    Réactiver
                  </ActionButton>
                  <ActionButton variant="danger" icon={Power} onClick={() => setStatusAction("close")}>
                    Clore
                  </ActionButton>
                </>
              )}
              {register.status === "CLOSED" && (
                <ActionButton icon={Play} pending={status.isPending} onClick={() => status.mutate("reactivate")}>
                  Réactiver
                </ActionButton>
              )}
            </div>
          ) : undefined
        }
      />

      {statusAction && (
        <div className="rounded-2xl bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">{statusAction === "suspend" ? "Suspendre cette caisse ?" : "Clore cette caisse ?"}</p>
          <p className="mt-1 text-sm text-amber-900">
            {statusAction === "suspend" ? "Aucune session ne pourra s'ouvrir tant qu'elle est suspendue." : "Une caisse close n'accepte plus de session. Elle est refusée si une session est en cours."}
          </p>
          <div className="mt-3 max-w-lg">
            <Field label="Motif">
              <input value={reasonText} onChange={(e) => setReasonText(e.target.value)} className={FIELD_SOFT} />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <ActionButton variant="ghost" onClick={() => setStatusAction(null)}>
              Annuler
            </ActionButton>
            <ActionButton variant={statusAction === "close" ? "danger" : "primary"} pending={status.isPending} onClick={() => status.mutate(statusAction)}>
              Confirmer
            </ActionButton>
          </div>
        </div>
      )}

      <Section>
        <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Titulaire actuel">{register.currentHolder}</Detail>
          <Detail label="Dernier comptage">{register.lastCountAmount != null ? `${formatMoney(register.lastCountAmount, "FCFA")}${register.lastCountAt ? ` · ${formatDateTime(register.lastCountAt)}` : ""}` : "Jamais compté"}</Detail>
          <Detail label="Moyen restreint">{register.restrictedToMethod ? METHOD_LABEL[register.restrictedToMethod] : undefined}</Detail>
          <Detail label="Motif du statut">{register.statusReason}</Detail>
          <Detail label="Mise à jour">{register.updatedAt ? `${formatDateTime(register.updatedAt)}${register.updatedBy ? ` par ${register.updatedBy}` : ""}` : undefined}</Detail>
          <Detail label="Clôturée le">{register.closedAt ? formatDateTime(register.closedAt) : undefined}</Detail>
        </div>
      </Section>

      <Tabs variant="soft" items={tabs} active={tab} onChange={setTab} />

      {tab === "settings" && <SettingsTab register={register} canManage={canManage} />}
      {tab === "assignments" && <AssignmentsTab register={register} onChanged={refresh} />}
      {tab === "devices" && <DevicesTab register={register} onChanged={refresh} canManage={canManage} />}
      {tab === "responsibility" && <ResponsibilityTab register={register} />}
      {tab === "history" && <HistoryTab registerCode={register.registerCode} />}
      {!register.registerCode && <EmptyState icon={Wallet} title="Caisse introuvable" />}
    </div>
  );
};
