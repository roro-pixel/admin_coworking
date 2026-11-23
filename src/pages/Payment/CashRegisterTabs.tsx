import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashAssignmentQuality, CashAssignmentRequest, CashAssignmentRole, CashDeviceStatus, CashRegisterDetail } from "../../services/cashRegister.service";
import { ActionButton, EmptyState, ErrorBlock, Field, IconButton, PanelForm, Section, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { ASSIGNMENT_QUALITY, ASSIGNMENT_ROLE, DEVICE_STATUS, RESPONSIBILITY_STATUS } from "../../components/cash/cashLabels";
import { parseDigits } from "../../components/payment/paymentUtils";

const asRequest = (a: { userEmail: string; role: CashAssignmentRole; quality: CashAssignmentQuality; backupRank?: number | null; validFrom?: string | null; validTo?: string | null; note?: string | null }): CashAssignmentRequest => ({
  userEmail: a.userEmail,
  role: a.role,
  quality: a.quality,
  backupRank: a.backupRank ?? undefined,
  validFrom: a.validFrom ?? undefined,
  validTo: a.validTo ?? undefined,
  note: a.note ?? undefined,
});

/* ───────────── Affectations ───────────── */
export const AssignmentsTab: React.FC<{ register: CashRegisterDetail; onChanged: () => void }> = ({ register, onChanged }) => {
  const { hasPermission } = useAuth();
  const canStaff = hasPermission("CASH_STAFF:MANAGE");
  const queryClient = useQueryClient();
  const code = register.registerCode;
  const [showAdd, setShowAdd] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [form, setForm] = useState({ userEmail: "", role: "CASHIER" as CashAssignmentRole, quality: "HOLDER" as CashAssignmentQuality, backupRank: "", validFrom: "", validTo: "", note: "" });
  const [emergency, setEmergency] = useState({ userEmail: "", hours: "4", reason: "" });
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, error: loadError, refetch } = useQuery({
    queryKey: ["cash-register-assignments", code],
    queryFn: () => cashRegisterService.getAssignments(code, true),
    enabled: canStaff,
  });
  const current = (data ?? register.assignments ?? []).filter((a) => !a.revokedAt);
  const ended = (data ?? []).filter((a) => !!a.revokedAt);

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ["cash-register-assignments", code] });
    onChanged();
  };

  /** La route PUT remplace toute la liste : on renvoie les affectations en cours, modifiées. */
  const replace = useMutation({
    mutationFn: (list: CashAssignmentRequest[]) => cashRegisterService.replaceAssignments(code, list),
    onSuccess: () => {
      toast.success("Affectations mises à jour.");
      setShowAdd(false);
      setError(null);
      done();
    },
    onError: (e: unknown) => {
      const m = apiMessage(e, "Mise à jour refusée.");
      setError(m);
      toast.error(m);
    },
  });

  const emergencyMut = useMutation({
    mutationFn: () => cashRegisterService.createEmergencyAssignment(code, { userEmail: emergency.userEmail.trim(), hours: emergency.hours ? Number(emergency.hours) : undefined, reason: emergency.reason.trim() }),
    onSuccess: () => {
      toast.success("Affectation d'urgence créée.");
      setShowEmergency(false);
      setEmergency({ userEmail: "", hours: "4", reason: "" });
      setError(null);
      done();
    },
    onError: (e: unknown) => setError(apiMessage(e, "Affectation d'urgence refusée.")),
  });

  if (!canStaff) return <EmptyState icon={Users} title="Accès réservé" hint="Les affectations demandent la permission de gestion du personnel de caisse." />;
  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorBlock message={apiMessage(loadError, "Affectations indisponibles.")} onRetry={() => refetch()} />;

  const remove = (id: string) => replace.mutate(current.filter((a) => a.id !== id && !a.emergency).map(asRequest));
  const add = () => {
    if (!form.userEmail.trim()) return setError("L'e-mail de l'agent est requis.");
    const next: CashAssignmentRequest = {
      userEmail: form.userEmail.trim(),
      role: form.role,
      quality: form.quality,
      backupRank: form.quality === "BACKUP" && form.backupRank ? Number(form.backupRank) : undefined,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
      validTo: form.validTo ? new Date(form.validTo).toISOString() : undefined,
      note: form.note.trim() || undefined,
    };
    replace.mutate([...current.filter((a) => !a.emergency).map(asRequest), next]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <ActionButton variant="ghost" onClick={() => { setShowEmergency((v) => !v); setShowAdd(false); setError(null); }}>
          Affectation d'urgence
        </ActionButton>
        <ActionButton icon={Plus} onClick={() => { setShowAdd((v) => !v); setShowEmergency(false); setError(null); }}>
          Affecter un agent
        </ActionButton>
      </div>

      {showAdd && (
        <PanelForm title="Nouvelle affectation" onSubmit={add} onCancel={() => setShowAdd(false)} pending={replace.isPending} submitLabel="Affecter" error={error}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="E-mail de l'agent">
              <input type="email" value={form.userEmail} onChange={(e) => setForm({ ...form, userEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Rôle">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as CashAssignmentRole })} className={FIELD_SOFT}>
                {Object.entries(ASSIGNMENT_ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Qualité">
              <select value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value as CashAssignmentQuality })} className={FIELD_SOFT}>
                {Object.entries(ASSIGNMENT_QUALITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            {form.quality === "BACKUP" && (
              <Field label="Rang de suppléance">
                <input inputMode="numeric" value={form.backupRank} onChange={(e) => setForm({ ...form, backupRank: String(parseDigits(e.target.value) || "") })} className={FIELD_SOFT} />
              </Field>
            )}
            <Field label="Début de validité">
              <input type="datetime-local" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Fin de validité">
              <input type="datetime-local" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Note">
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={FIELD_SOFT} />
              </Field>
            </div>
          </div>
        </PanelForm>
      )}

      {showEmergency && (
        <PanelForm title="Affectation d'urgence" onSubmit={() => (emergency.userEmail.trim() && emergency.reason.trim() ? emergencyMut.mutate() : setError("L'agent et le motif sont requis."))} onCancel={() => setShowEmergency(false)} pending={emergencyMut.isPending} submitLabel="Créer" error={error}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="E-mail de l'agent">
              <input type="email" value={emergency.userEmail} onChange={(e) => setEmergency({ ...emergency, userEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Durée (heures)">
              <input inputMode="numeric" value={emergency.hours} onChange={(e) => setEmergency({ ...emergency, hours: String(parseDigits(e.target.value) || "") })} className={FIELD_SOFT} />
            </Field>
            <Field label="Motif">
              <input value={emergency.reason} onChange={(e) => setEmergency({ ...emergency, reason: e.target.value })} className={FIELD_SOFT} />
            </Field>
          </div>
        </PanelForm>
      )}

      <Section title="Affectations en cours">
        {current.length === 0 ? (
          <EmptyState icon={Users} title="Aucune affectation" hint="Aucun agent n'est affecté à cette caisse." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {current.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{a.userEmail}</p>
                  <p className="text-xs text-gray-500">
                    {ASSIGNMENT_ROLE[a.role] ?? a.role} · {ASSIGNMENT_QUALITY[a.quality] ?? a.quality}
                    {a.backupRank ? ` n°${a.backupRank}` : ""}
                    {a.validFrom || a.validTo ? ` · ${a.validFrom ? formatDateTime(a.validFrom) : "…"} → ${a.validTo ? formatDateTime(a.validTo) : "…"}` : ""}
                  </p>
                  {a.note && <p className="text-xs text-gray-500">{a.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {a.emergency && <StatusChip tone="danger">Urgence</StatusChip>}
                  <StatusChip tone={a.effectiveNow ? "success" : "neutral"}>{a.effectiveNow ? "Active" : "Hors période"}</StatusChip>
                  {!a.emergency && <IconButton icon={Trash2} label="Retirer l'affectation" onClick={() => remove(a.id)} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {ended.length > 0 && (
        <Section title="Terminées">
          <ul className="divide-y divide-gray-100">
            {ended.map((a) => (
              <li key={a.id} className="px-4 py-3 text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{a.userEmail}</span> · {ASSIGNMENT_ROLE[a.role] ?? a.role} · {ASSIGNMENT_QUALITY[a.quality] ?? a.quality}
                {a.revokedAt ? ` · fin le ${formatDateTime(a.revokedAt)}${a.revokedBy ? ` par ${a.revokedBy}` : ""}` : ""}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

/* ───────────── Appareils ───────────── */
export const DevicesTab: React.FC<{ register: CashRegisterDetail; onChanged: () => void; canManage: boolean }> = ({ register, onChanged, canManage }) => {
  const decide = useMutation({
    mutationFn: (v: { deviceCode: string; status: CashDeviceStatus }) => cashRegisterService.decideDevice(register.registerCode, v.deviceCode, { status: v.status }),
    onSuccess: () => {
      toast.success("Décision enregistrée.");
      onChanged();
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Décision refusée.")),
  });
  const devices = register.devices ?? [];
  return (
    <Section title="Appareils vus sur cette caisse" description="Un appareil inconnu reste à décider tant qu'il n'est pas autorisé">
      {devices.length === 0 ? (
        <EmptyState icon={Users} title="Aucun appareil" hint="Aucun appareil ne s'est encore connecté à cette caisse." />
      ) : (
        <ul className="divide-y divide-gray-100">
          {devices.map((d) => {
            const st = statusOf(DEVICE_STATUS, d.status);
            return (
              <li key={d.deviceCode} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-bold text-gray-900">{d.label || d.deviceCode}</p>
                  <p className="text-xs text-gray-500">
                    {d.label ? `${d.deviceCode} · ` : ""}
                    {d.firstSeenAt ? `vu le ${formatDateTime(d.firstSeenAt)}` : ""}
                    {d.decidedBy ? ` · décidé par ${d.decidedBy}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  {canManage && d.status !== "ALLOWED" && (
                    <ActionButton disabled={decide.isPending} onClick={() => decide.mutate({ deviceCode: d.deviceCode, status: "ALLOWED" })}>
                      Autoriser
                    </ActionButton>
                  )}
                  {canManage && d.status !== "REFUSED" && (
                    <ActionButton variant="danger" disabled={decide.isPending} onClick={() => decide.mutate({ deviceCode: d.deviceCode, status: "REFUSED" })}>
                      Refuser
                    </ActionButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
};

/* ───────────── Passations ───────────── */
export const ResponsibilityTab: React.FC<{ register: CashRegisterDetail }> = ({ register }) => {
  const { hasPermission, admin } = useAuth();
  const canStaff = hasPermission("CASH_STAFF:MANAGE");
  const canSign = hasPermission("CASH_SESSION:OPEN");
  const queryClient = useQueryClient();
  const code = register.registerCode;
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ toUserEmail: "", reasonCode: "", reasonText: "", permanent: true, endsAt: "", countedAmount: "", witnessEmail: "", outgoingAbsent: false, keepFormerAsBackup: false });

  const list = useQuery({ queryKey: ["cash-responsibility", code], queryFn: () => cashRegisterService.getResponsibilityTransfers(code) });
  const pending = useQuery({ queryKey: ["cash-pending-items", code], queryFn: () => cashRegisterService.getPendingItems(code), enabled: showForm });
  const reasons = useQuery({ queryKey: ["cash-reference-list", "RESPONSIBILITY_REASON"], queryFn: () => cashRegisterService.getReferenceLists(), enabled: showForm });
  const reasonOptions = Object.entries(reasons.data ?? {})
    .filter(([k]) => /RESPONSIB|PASSATION|HANDOVER_REASON|TRANSFER_REASON/i.test(k))
    .flatMap(([, v]) => v)
    .filter((v) => v.active);

  const create = useMutation({
    mutationFn: () =>
      cashRegisterService.createResponsibilityTransfer(code, {
        toUserEmail: form.toUserEmail.trim(),
        reasonCode: form.reasonCode.trim(),
        reasonText: form.reasonText.trim() || undefined,
        permanent: form.permanent,
        endsAt: !form.permanent && form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        countedAmount: form.countedAmount ? Number(form.countedAmount) : undefined,
        witnessEmail: form.witnessEmail.trim() || undefined,
        outgoingAbsent: form.outgoingAbsent || undefined,
        keepFormerAsBackup: form.keepFormerAsBackup || undefined,
      }),
    onSuccess: () => {
      toast.success("Passation créée : en attente des signatures.");
      setShowForm(false);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["cash-responsibility", code] });
    },
    onError: (e: unknown) => setError(apiMessage(e, "Passation refusée.")),
  });

  const sign = useMutation({
    mutationFn: (n: string) => cashRegisterService.signResponsibilityTransfer(n),
    onSuccess: () => {
      toast.success("Signature enregistrée.");
      queryClient.invalidateQueries({ queryKey: ["cash-responsibility", code] });
      queryClient.invalidateQueries({ queryKey: ["cash-register-detail", code] });
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Signature refusée.")),
  });

  const submit = () => {
    if (!form.toUserEmail.trim() || !form.reasonCode.trim()) return setError("Le nouvel agent et le motif sont requis.");
    if (!form.permanent && !form.endsAt) return setError("Une passation temporaire demande une date de fin.");
    create.mutate();
  };
  const me = (admin as { email?: string } | null)?.email;

  return (
    <div className="space-y-4">
      {canStaff && (
        <div className="flex justify-end">
          <ActionButton icon={Plus} onClick={() => setShowForm((v) => !v)}>
            Nouvelle passation
          </ActionButton>
        </div>
      )}

      {showForm && (
        <PanelForm title="Passation de responsabilité" onSubmit={submit} onCancel={() => setShowForm(false)} pending={create.isPending} submitLabel="Créer la passation" error={error}>
          {(pending.data ?? []).length > 0 && (
            <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">Éléments en suspens</p>
              <ul className="mt-1 list-disc pl-5">
                {(pending.data ?? []).map((p, i) => (
                  <li key={`${p.reference ?? p.kind}-${i}`}>
                    {p.label ?? p.kind}
                    {p.amount != null ? ` · ${formatMoney(p.amount, "FCFA")}` : ""}
                    {p.blocking ? " · bloquant" : ""}
                    {p.fate ? ` · ${p.fate}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nouvel agent (e-mail)">
              <input type="email" value={form.toUserEmail} onChange={(e) => setForm({ ...form, toUserEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Motif">
              {reasonOptions.length > 0 ? (
                <select value={form.reasonCode} onChange={(e) => setForm({ ...form, reasonCode: e.target.value })} className={FIELD_SOFT}>
                  <option value="">Choisir…</option>
                  {reasonOptions.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                </select>
              ) : (
                <input value={form.reasonCode} onChange={(e) => setForm({ ...form, reasonCode: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
              )}
            </Field>
            <div className="md:col-span-2">
              <Field label="Précision">
                <input value={form.reasonText} onChange={(e) => setForm({ ...form, reasonText: e.target.value })} className={FIELD_SOFT} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input type="checkbox" checked={form.permanent} onChange={(e) => setForm({ ...form, permanent: e.target.checked })} /> Passation définitive
            </label>
            {!form.permanent && (
              <Field label="Fin de la passation">
                <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={FIELD_SOFT} />
              </Field>
            )}
            <Field label="Montant compté (FCFA)">
              <input inputMode="numeric" value={form.countedAmount} onChange={(e) => setForm({ ...form, countedAmount: String(parseDigits(e.target.value) || "") })} className={FIELD_SOFT} />
            </Field>
            <Field label="Témoin (e-mail)">
              <input type="email" value={form.witnessEmail} onChange={(e) => setForm({ ...form, witnessEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input type="checkbox" checked={form.outgoingAbsent} onChange={(e) => setForm({ ...form, outgoingAbsent: e.target.checked })} /> Le sortant est absent
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input type="checkbox" checked={form.keepFormerAsBackup} onChange={(e) => setForm({ ...form, keepFormerAsBackup: e.target.checked })} /> Garder l'ancien titulaire comme suppléant
            </label>
          </div>
        </PanelForm>
      )}

      <Section title="Passations">
        {list.isLoading ? (
          <ListSkeleton />
        ) : list.isError ? (
          <ErrorBlock message={apiMessage(list.error, "Passations indisponibles.")} onRetry={() => list.refetch()} />
        ) : (list.data ?? []).length === 0 ? (
          <EmptyState icon={Users} title="Aucune passation" hint="Aucune passation de responsabilité sur cette caisse." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {(list.data ?? []).map((t) => {
              const st = statusOf(RESPONSIBILITY_STATUS, t.status);
              const mine = !!me && (t.fromUser === me || t.toUser === me);
              const alreadySigned = !!me && (t.outgoingSignedBy === me || t.incomingSignedBy === me);
              return (
                <li key={t.transferNumber} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      <span className="font-mono">{t.transferNumber}</span> · {t.fromUser ?? "—"} → {t.toUser ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.reasonLabel ?? t.reasonCode} · {t.permanent ? "définitive" : `jusqu'au ${t.endsAt ? formatDateTime(t.endsAt) : "—"}`}
                      {t.countedAmount != null ? ` · compté ${formatMoney(t.countedAmount, "FCFA")}` : ""}
                      {t.difference ? ` · écart ${formatMoney(t.difference, "FCFA")}` : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      Sortant : {t.outgoingSignedAt ? `signé ${formatDateTime(t.outgoingSignedAt)}` : "en attente"} · Entrant : {t.incomingSignedAt ? `signé ${formatDateTime(t.incomingSignedAt)}` : "en attente"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                    {canSign && t.status === "PENDING_SIGNATURES" && (mine || !me) && !alreadySigned && (
                      <ActionButton pending={sign.isPending && sign.variables === t.transferNumber} onClick={() => sign.mutate(t.transferNumber)}>
                        Signer
                      </ActionButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
};

/* ───────────── Historique ───────────── */
export const HistoryTab: React.FC<{ registerCode: string }> = ({ registerCode }) => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["cash-register-history", registerCode],
    queryFn: () => cashRegisterService.getRegisterHistory(registerCode),
  });
  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorBlock message={apiMessage(error, "Historique indisponible.")} onRetry={() => refetch()} />;
  const rows = data ?? [];
  return (
    <Section title="Historique des paramètres">
      {rows.length === 0 ? (
        <EmptyState icon={Users} title="Aucun changement" hint="Les paramètres n'ont pas été modifiés depuis la création." />
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((h, i) => (
            <li key={`${h.changedAt}-${h.field}-${i}`} className="px-4 py-3 text-sm">
              <p className="font-bold text-gray-900">{h.field}</p>
              <p className="text-gray-600">
                <span className="line-through">{h.oldValue ?? "—"}</span> → <span className="font-semibold">{h.newValue ?? "—"}</span>
              </p>
              <p className="text-xs text-gray-500">
                {formatDateTime(h.changedAt)}
                {h.changedBy ? ` · ${h.changedBy}` : ""}
                {h.effectiveAt ? ` · effet ${formatDateTime(h.effectiveAt)}` : ""}
                {h.reason ? ` · ${h.reason}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};
