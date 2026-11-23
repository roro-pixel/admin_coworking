import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarX, CheckCircle2, Flag, KeyRound, Lock, LockOpen, Plus, UserCheck, X } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashAbsence, CashAbsenceStatus, CashNoReplacementPolicy } from "../../services/cashRegister.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ListHeader, PanelForm, StatusChip, Tabs } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { CountForm, buildCountRequest, countTotal, emptyCount } from "../../components/cash/CountForm";
import type { CountDraft } from "../../components/cash/CountForm";
import { RegisterSelect, useDenominations } from "../../components/cash/cashPickers";
import { ABSENCE_STATUS, NO_REPLACEMENT_POLICY } from "../../components/cash/cashLabels";

type View = "absences" | "delegations" | "seals";
const dayOnly = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

// ───────────────────────── Absences ─────────────────────────

const Absences: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canDeclare = hasPermission("CASH_STAFF:DECLARE_ABSENCE");
  const canManage = hasPermission("CASH_STAFF:MANAGE");
  const [status, setStatus] = useState<CashAbsenceStatus | "">("");
  const [userFilter, setUserFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ userEmail: "", kindCode: "", reasonText: "", startsOn: "", endsOn: "", replacementEmail: "", noReplacementPolicy: "" as CashNoReplacementPolicy | "", unplanned: false, force: false, forceNote: "", registerCode: "" });
  const set = (p: Partial<typeof f>) => setF((v) => ({ ...v, ...p }));

  const list = useQuery({ queryKey: ["cash-absences", status, userFilter], queryFn: () => cashRegisterService.getAbsences({ status: status || undefined, userEmail: userFilter.trim() || undefined }) });
  const lists = useQuery({ queryKey: ["cash-reference-lists"], queryFn: () => cashRegisterService.getReferenceLists(), staleTime: 300_000, enabled: open });
  const kinds = Object.entries(lists.data ?? {}).find(([code]) => /ABSENCE/i.test(code))?.[1].filter((v) => v.active) ?? [];
  const suggestions = useQuery({
    queryKey: ["cash-replacements", f.registerCode, f.startsOn, f.endsOn],
    queryFn: () => cashRegisterService.getReplacementSuggestions({ registerCode: f.registerCode, from: f.startsOn || undefined, to: f.endsOn || undefined }),
    enabled: open && !!f.registerCode,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cash-absences"] });
  const declare = useMutation({
    mutationFn: () =>
      cashRegisterService.declareAbsence({
        userEmail: f.userEmail.trim() || undefined,
        kindCode: f.kindCode,
        reasonText: f.reasonText.trim() || undefined,
        startsOn: f.startsOn,
        endsOn: f.endsOn || undefined,
        replacementEmail: f.replacementEmail.trim() || undefined,
        noReplacementPolicy: f.noReplacementPolicy || undefined,
        unplanned: f.unplanned || undefined,
        force: f.force || undefined,
        forceNote: f.force ? f.forceNote.trim() || undefined : undefined,
      }),
    onSuccess: (a) => {
      toast.success(a.warnings?.length ? `Absence déclarée (${a.warnings.length} avertissement(s))` : "Absence déclarée");
      setOpen(false);
      setError(null);
      refresh();
    },
    onError: (e) => setError(apiMessage(e, "Déclaration impossible")),
  });
  const step = useMutation({
    mutationFn: ({ a, action }: { a: CashAbsence; action: "approve" | "cancel" | "end" }) =>
      action === "approve" ? cashRegisterService.approveAbsence(a.absenceNumber) : action === "cancel" ? cashRegisterService.cancelAbsence(a.absenceNumber) : cashRegisterService.endAbsence(a.absenceNumber),
    onSuccess: () => {
      toast.success("Absence mise à jour");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Action impossible")),
  });
  const ask = (a: CashAbsence, action: "approve" | "cancel" | "end", message: string, confirmLabel: string) =>
    toast.confirm({ message, confirmLabel, pendingLabel: "En cours", onConfirm: () => step.mutateAsync({ a, action }) });

  const absences = list.data ?? [];
  return (
    <div className="space-y-4">
      <ListHeader
        title="Absences des caissiers"
        subtitle="Une absence organise le remplacement : remplaçant, remise à la caisse mère ou scellé."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={list.isFetching} onClick={() => list.refetch()} />
            {canDeclare && <ActionButton icon={Plus} onClick={() => { setOpen(true); setError(null); }}>Déclarer une absence</ActionButton>}
          </div>
        }
      />

      {open && (
        <PanelForm title="Déclarer une absence" onSubmit={(e) => { e.preventDefault(); declare.mutate(); }} onCancel={() => setOpen(false)} pending={declare.isPending} submitLabel="Déclarer" submitDisabled={!f.kindCode || !f.startsOn || (f.force && !f.forceNote.trim())} error={error}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Caissier absent" hint="Vide : vous-même.">
              <input value={f.userEmail} onChange={(e) => set({ userEmail: e.target.value })} placeholder="caissier@exemple.cg" className={FIELD_SOFT} />
            </Field>
            <Field label="Nature de l'absence" required>
              {kinds.length > 0 ? (
                <select value={f.kindCode} onChange={(e) => set({ kindCode: e.target.value })} className={FIELD_SOFT}>
                  <option value="">Choisir</option>
                  {kinds.map((k) => (
                    <option key={k.code} value={k.code}>
                      {k.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={f.kindCode} onChange={(e) => set({ kindCode: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
              )}
            </Field>
            <Field label="Motif">
              <input value={f.reasonText} onChange={(e) => set({ reasonText: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Du" required>
              <input type="date" value={f.startsOn} onChange={(e) => set({ startsOn: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Au" hint="Vide : durée indéterminée.">
              <input type="date" value={f.endsOn} onChange={(e) => set({ endsOn: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Si personne ne remplace">
              <select value={f.noReplacementPolicy} onChange={(e) => set({ noReplacementPolicy: e.target.value as CashNoReplacementPolicy | "" })} className={FIELD_SOFT}>
                <option value="">Règle par défaut</option>
                {Object.entries(NO_REPLACEMENT_POLICY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <RegisterSelect label="Voir les remplaçants possibles pour la caisse" value={f.registerCode} onChange={(v) => set({ registerCode: v })} emptyLabel="Aucune" />
            <Field label="Remplaçant" hint="E-mail. Facultatif.">
              <input value={f.replacementEmail} onChange={(e) => set({ replacementEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
          </div>
          {(suggestions.data ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(suggestions.data ?? []).map((s) => (
                <button key={`${s.userEmail}-${s.rank}`} type="button" onClick={() => set({ replacementEmail: s.userEmail })} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-100">
                  {s.rank}. {s.userEmail} <span className="font-normal text-gray-400">({s.origin})</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={f.unplanned} onChange={(e) => set({ unplanned: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
              Absence imprévue
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={f.force} onChange={(e) => set({ force: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
              Forcer malgré les avertissements
            </label>
          </div>
          {f.force && (
            <Field label="Justification du forçage" required>
              <input value={f.forceNote} onChange={(e) => set({ forceNote: e.target.value })} className={FIELD_SOFT} />
            </Field>
          )}
        </PanelForm>
      )}

      <div className="flex flex-wrap gap-3">
        <Field label="Caissier">
          <input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="E-mail" className={`${FIELD_SOFT} w-64`} />
        </Field>
        <Field label="Statut">
          <select value={status} onChange={(e) => setStatus(e.target.value as CashAbsenceStatus | "")} className={`${FIELD_SOFT} w-48`}>
            <option value="">Tous</option>
            {Object.entries(ABSENCE_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {list.isLoading ? (
        <ListSkeleton rows={4} />
      ) : list.isError ? (
        <ErrorBlock message="Les absences n'ont pas pu être chargées." onRetry={() => list.refetch()} />
      ) : absences.length === 0 ? (
        <EmptyState icon={CalendarX} title="Aucune absence" />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {absences.map((a) => {
              const st = statusOf(ABSENCE_STATUS, a.status);
              const live = a.status !== "ENDED" && a.status !== "CANCELLED";
              return (
                <div key={a.absenceNumber} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-950">
                      <span className="font-mono text-xs text-[color:var(--logo-pink-dark)]">{a.absenceNumber}</span>
                      {a.userEmail}
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      {a.unplanned && <StatusChip tone="warn">Imprévue</StatusChip>}
                      {a.forced && <StatusChip tone="danger">Forcée</StatusChip>}
                    </p>
                    <p className="text-sm text-gray-600">
                      {a.kindLabel || a.kindCode} · du {dayOnly(a.startsOn)} {a.endsOn ? `au ${dayOnly(a.endsOn)}` : "(durée indéterminée)"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.replacementUser ? `Remplaçant : ${a.replacementUser}` : a.noReplacementPolicy ? `Sans remplaçant : ${NO_REPLACEMENT_POLICY[a.noReplacementPolicy] ?? a.noReplacementPolicy}` : "Sans remplaçant"}
                      {(a.registerCodes ?? []).length > 0 ? ` · caisses ${(a.registerCodes ?? []).join(", ")}` : ""}
                      {a.declaredBy ? ` · déclarée par ${a.declaredBy}` : ""}
                      {a.approvedBy ? ` · approuvée par ${a.approvedBy}` : ""}
                    </p>
                    {a.reason && <p className="text-xs text-gray-500">{a.reason}</p>}
                    {a.forcedNote && <p className="text-xs text-red-600">Forçage : {a.forcedNote}</p>}
                    {(a.warnings ?? []).map((w, i) => (
                      <p key={i} className="text-xs text-amber-700">⚠ {w}</p>
                    ))}
                  </div>
                  {live && (
                    <div className="flex shrink-0 items-center gap-1">
                      {canManage && a.status === "PLANNED" && <IconButton icon={CheckCircle2} label="Approuver" tone="success" onClick={() => ask(a, "approve", `Approuver ${a.absenceNumber} ?`, "Approuver")} />}
                      {canManage && (a.status === "ACTIVE" || a.status === "APPROVED") && <IconButton icon={Flag} label="Terminer l'absence" onClick={() => ask(a, "end", `Terminer ${a.absenceNumber} ?`, "Terminer")} />}
                      {canDeclare && <IconButton icon={Ban} label="Annuler" tone="danger" onClick={() => ask(a, "cancel", `Annuler ${a.absenceNumber} ?`, "Annuler l'absence")} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
};

// ───────────────────────── Délégations ─────────────────────────

/** Droits pouvant se déléguer : noms exacts des fiches, à confirmer côté serveur. */
const DELEGABLE = ["CASH_VARIANCE:DECIDE", "CASH_MOVEMENT:APPROVE", "CASH_SESSION:FORCE_CLOSE", "CASH_TRANSFER:SEND", "CASH_TRANSFER:RECEIVE"];

const Delegations: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission("CASH_VARIANCE:DECIDE");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ delegateEmail: "", permissions: [] as string[], startsOn: "", endsOn: "", note: "" });
  const [custom, setCustom] = useState("");

  const list = useQuery({ queryKey: ["cash-delegations"], queryFn: () => cashRegisterService.getDelegations() });
  const create = useMutation({
    mutationFn: () => cashRegisterService.createDelegation({ delegateEmail: f.delegateEmail.trim(), permissions: f.permissions, startsOn: f.startsOn, endsOn: f.endsOn, note: f.note.trim() || undefined }),
    onSuccess: () => {
      toast.success("Délégation créée");
      setOpen(false);
      setF({ delegateEmail: "", permissions: [], startsOn: "", endsOn: "", note: "" });
      queryClient.invalidateQueries({ queryKey: ["cash-delegations"] });
    },
    onError: (e) => setError(apiMessage(e, "Création impossible")),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cashRegisterService.cancelDelegation(id),
    onSuccess: () => {
      toast.success("Délégation annulée");
      queryClient.invalidateQueries({ queryKey: ["cash-delegations"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Annulation impossible")),
  });
  const toggle = (p: string) => setF((v) => ({ ...v, permissions: v.permissions.includes(p) ? v.permissions.filter((x) => x !== p) : [...v.permissions, p] }));
  const delegations = list.data ?? [];

  return (
    <div className="space-y-4">
      <ListHeader
        title="Délégations de pouvoir"
        subtitle="Confier temporairement un droit de décision à un collègue, pour une période donnée."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={list.isFetching} onClick={() => list.refetch()} />
            {canManage && <ActionButton icon={KeyRound} onClick={() => { setOpen(true); setError(null); }}>Nouvelle délégation</ActionButton>}
          </div>
        }
      />
      {open && (
        <PanelForm title="Nouvelle délégation" onSubmit={(e) => { e.preventDefault(); create.mutate(); }} onCancel={() => setOpen(false)} pending={create.isPending} submitLabel="Déléguer" submitDisabled={!f.delegateEmail.trim() || f.permissions.length === 0 || !f.startsOn || !f.endsOn || f.endsOn < f.startsOn} error={error}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Délégataire" required hint="E-mail du collègue.">
              <input value={f.delegateEmail} onChange={(e) => setF({ ...f, delegateEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Du" required>
              <input type="date" value={f.startsOn} onChange={(e) => setF({ ...f, startsOn: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Au" required>
              <input type="date" value={f.endsOn} onChange={(e) => setF({ ...f, endsOn: e.target.value })} className={FIELD_SOFT} />
            </Field>
          </div>
          <Field label="Droits délégués" required hint="Vous ne pouvez déléguer que des droits que vous avez.">
            <div className="flex flex-wrap gap-2">
              {[...DELEGABLE, ...f.permissions.filter((p) => !DELEGABLE.includes(p))].map((p) => (
                <button key={p} type="button" onClick={() => toggle(p)} className={`rounded-full px-3 py-1.5 font-mono text-xs font-semibold ${f.permissions.includes(p) ? "bg-gray-950 text-white" : "bg-white text-gray-600 shadow-sm"}`}>
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Autre droit, ex. CASH_STAFF:MANAGE" className={`${FIELD_SOFT} font-mono`} />
              <ActionButton variant="ghost" disabled={!custom.trim()} onClick={() => { const p = custom.trim(); if (!f.permissions.includes(p)) toggle(p); setCustom(""); }}>
                Ajouter
              </ActionButton>
            </div>
          </Field>
          <Field label="Note">
            <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={FIELD_SOFT} />
          </Field>
        </PanelForm>
      )}
      {list.isLoading ? (
        <ListSkeleton rows={3} />
      ) : list.isError ? (
        <ErrorBlock message="Les délégations n'ont pas pu être chargées." onRetry={() => list.refetch()} />
      ) : delegations.length === 0 ? (
        <EmptyState icon={UserCheck} title="Aucune délégation" />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {delegations.map((d) => (
              <div key={d.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-950">
                    {d.delegator} → {d.delegate}
                    <StatusChip tone={d.cancelledAt ? "neutral" : d.activeNow ? "success" : "info"}>{d.cancelledAt ? "Annulée" : d.activeNow ? "En cours" : "Planifiée ou échue"}</StatusChip>
                  </p>
                  <p className="text-xs text-gray-500">
                    Du {dayOnly(d.startsOn)} au {dayOnly(d.endsOn)}
                    {d.cancelledAt ? ` · annulée le ${formatDateTime(d.cancelledAt)}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {d.permissions.map((p) => (
                      <span key={p} className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-700">
                        {p}
                      </span>
                    ))}
                  </div>
                  {d.note && <p className="text-xs text-gray-500">{d.note}</p>}
                </div>
                {canManage && !d.cancelledAt && (
                  <IconButton icon={X} label="Annuler la délégation" tone="danger" pending={cancel.isPending && cancel.variables === d.id} onClick={() => toast.confirm({ message: "Annuler cette délégation ?", confirmLabel: "Annuler", pendingLabel: "Annulation", onConfirm: () => cancel.mutateAsync(d.id) })} />
                )}
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
};

// ───────────────────────── Scellés ─────────────────────────

const Seals: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission("CASH_STAFF:MANAGE");
  const [registerCode, setRegisterCode] = useState("");
  const [mode, setMode] = useState<null | "seal" | "unseal">(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CountDraft>(emptyCount());
  const [f, setF] = useState({ envelopeNumber: "", depositedIn: "", witnessEmail: "", absenceNumber: "" });
  const denoms = useDenominations();
  const withLines = (denoms.data ?? []).length > 0;

  const list = useQuery({ queryKey: ["cash-seals", registerCode], queryFn: () => cashRegisterService.getSeals(registerCode), enabled: !!registerCode });
  const run = useMutation({
    mutationFn: () => {
      const body = {
        envelopeNumber: f.envelopeNumber.trim() || undefined,
        depositedIn: f.depositedIn.trim() || undefined,
        witnessEmail: f.witnessEmail.trim(),
        count: buildCountRequest(draft, denoms.data ?? [], "XAF", withLines, {}),
        absenceNumber: f.absenceNumber.trim() || undefined,
      };
      return mode === "seal" ? cashRegisterService.sealRegister(registerCode, body) : cashRegisterService.unsealRegister(registerCode, body);
    },
    onSuccess: () => {
      toast.success(mode === "seal" ? "Caisse scellée" : "Caisse descellée");
      setMode(null);
      setError(null);
      setDraft(emptyCount());
      queryClient.invalidateQueries({ queryKey: ["cash-seals"] });
      queryClient.invalidateQueries({ queryKey: ["cash-position"] });
    },
    onError: (e) => setError(apiMessage(e, mode === "seal" ? "Scellé impossible" : "Descellement impossible")),
  });

  const seals = list.data ?? [];
  const openSeal = seals.find((s) => !s.unsealedAt);
  return (
    <div className="space-y-4">
      <ListHeader title="Scellés" subtitle="Quand une caisse reste sans caissier, son contenu est compté, mis sous enveloppe et scellé devant un témoin." />
      <div className="max-w-md">
        <RegisterSelect label="Caisse" value={registerCode} onChange={(v) => { setRegisterCode(v); setMode(null); }} />
      </div>

      {registerCode && canManage && !mode && (
        <div className="flex flex-wrap gap-2">
          {!openSeal && <ActionButton icon={Lock} onClick={() => { setMode("seal"); setError(null); }}>Sceller la caisse</ActionButton>}
          {openSeal && <ActionButton icon={LockOpen} onClick={() => { setMode("unseal"); setError(null); }}>Desceller</ActionButton>}
        </div>
      )}

      {mode && (
        <PanelForm title={mode === "seal" ? "Sceller la caisse" : `Desceller ${openSeal?.sealNumber ?? ""}`} onSubmit={(e) => { e.preventDefault(); run.mutate(); }} onCancel={() => setMode(null)} pending={run.isPending} submitLabel={mode === "seal" ? "Sceller" : "Desceller"} submitDisabled={!f.witnessEmail.trim() || countTotal(draft, denoms.data ?? [], withLines) <= 0} error={error}>
          <p className="text-sm text-gray-600">{mode === "seal" ? "Comptez le contenu : il part sous enveloppe." : "Recomptez le contenu de l'enveloppe : un écart avec le scellé ouvre une revue."}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Témoin" required hint="E-mail d'une personne présente.">
              <input value={f.witnessEmail} onChange={(e) => setF({ ...f, witnessEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
            {mode === "seal" && (
              <>
                <Field label="N° d'enveloppe">
                  <input value={f.envelopeNumber} onChange={(e) => setF({ ...f, envelopeNumber: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
                </Field>
                <Field label="Déposée dans">
                  <input value={f.depositedIn} onChange={(e) => setF({ ...f, depositedIn: e.target.value })} placeholder="Coffre principal" className={FIELD_SOFT} />
                </Field>
              </>
            )}
            <Field label="Absence liée" hint="N° d'absence. Facultatif.">
              <input value={f.absenceNumber} onChange={(e) => setF({ ...f, absenceNumber: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
            </Field>
          </div>
          <CountForm draft={draft} onChange={setDraft} denominations={denoms.data ?? []} withLines={withLines} showVariance={false} expected={mode === "unseal" ? openSeal?.amount ?? null : undefined} />
        </PanelForm>
      )}

      {!registerCode ? (
        <EmptyState icon={Lock} title="Choisissez une caisse" hint="L'historique de ses scellés s'affiche ici." />
      ) : list.isLoading ? (
        <ListSkeleton rows={3} />
      ) : list.isError ? (
        <ErrorBlock message="Les scellés n'ont pas pu être chargés." onRetry={() => list.refetch()} />
      ) : seals.length === 0 ? (
        <EmptyState icon={Lock} title="Aucun scellé" hint="Cette caisse n'a jamais été scellée." />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {seals.map((s) => (
              <div key={s.sealNumber} className="space-y-1 p-4">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-950">
                  <span className="font-mono text-xs text-[color:var(--logo-pink-dark)]">{s.sealNumber}</span>
                  {s.envelopeNumber ? `enveloppe ${s.envelopeNumber}` : ""}
                  <StatusChip tone={s.unsealedAt ? "neutral" : "warn"}>{s.unsealedAt ? "Descellé" : "Scellé"}</StatusChip>
                </p>
                <p className="text-sm text-gray-600">
                  {formatMoney(s.amount ?? 0, "FCFA")} · scellé par {s.sealedBy} devant {s.witness} le {formatDateTime(s.sealedAt)}
                  {s.depositedIn ? ` · déposé dans ${s.depositedIn}` : ""}
                </p>
                {s.unsealedAt && (
                  <p className="text-xs text-gray-500">
                    Descellé par {s.unsealedBy} devant {s.unsealWitness} le {formatDateTime(s.unsealedAt)} · {formatMoney(s.unsealAmount ?? 0, "FCFA")}
                    {s.difference ? <span className="text-red-600"> · écart {formatMoney(s.difference, "FCFA")}</span> : null}
                  </p>
                )}
                {s.absenceNumber && <p className="text-xs text-gray-500">Absence {s.absenceNumber}</p>}
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
};

export const CashStaffPage: React.FC = () => {
  const [view, setView] = useState<View>("absences");
  return (
    <div className="space-y-5">
      <Tabs variant="soft" items={[{ id: "absences" as View, label: "Absences" }, { id: "delegations" as View, label: "Délégations" }, { id: "seals" as View, label: "Scellés" }]} active={view} onChange={setView} />
      {view === "absences" && <Absences />}
      {view === "delegations" && <Delegations />}
      {view === "seals" && <Seals />}
    </div>
  );
};
