import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Copy, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { gedService } from "../../services/ged.service";
import type { KycReason } from "../../services/ged.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ItemRow, ListHeader, PanelForm, Section, StatusChip, Tabs } from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { ChartCard, KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";
import { RankBars } from "../../components/reporting/ReportCharts";
import { RefreshButton } from "../../components/reporting/reportKit";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { KYC_STATUS_LABEL, OWNER_LABEL, dayOnly, fmtHours, fmtInt, label, toRank } from "../../components/documents/docUtils";

type View = "dashboard" | "renewals" | "duplicates" | "reasons" | "backfill";

// ───────────────────────── Tableau de bord ─────────────────────────

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const q = useQuery({ queryKey: ["kyc-center-dashboard", from, to], queryFn: () => gedService.kycCenterDashboard(from || undefined, to || undefined) });
  const d = q.data;
  const w = d?.waitingReview;
  const open = (code?: string) => code && navigate(`/documents/kyc/cases/${code}`);

  return (
    <div className="space-y-4">
      <ListHeader
        title="Vue d'ensemble du centre"
        subtitle="Charge, délais et dossiers en difficulté."
        action={<RefreshButton fetching={q.isFetching} onClick={() => q.refetch()} />}
      />
      <div className="flex flex-wrap gap-3">
        <Field label="Du">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${FIELD_SOFT} w-44`} />
        </Field>
        <Field label="Au">
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${FIELD_SOFT} w-44`} />
        </Field>
      </div>

      {q.isLoading ? (
        <KpiRowSkeleton count={4} columns={4} />
      ) : q.isError || !d ? (
        <ErrorBlock message="Le tableau de bord n'a pas pu être chargé." onRetry={() => q.refetch()} />
      ) : (
        <>
          <KpiRow
            items={[
              { label: "Décidés sur la période", value: fmtInt(d.decidedInPeriod ?? 0), tone: "success" },
              { label: "Délai moyen", value: fmtHours(d.averageProcessingHours), hint: `Médiane : ${fmtHours(d.medianProcessingHours)}` },
              { label: "Attente de plus de 7 jours", value: fmtInt(w?.overSevenDays ?? 0), tone: (w?.overSevenDays ?? 0) > 0 ? "danger" : "default" },
              { label: "Groupes de doublons", value: fmtInt(d.duplicateGroups ?? 0), tone: (d.duplicateGroups ?? 0) > 0 ? "pink" : "default" },
            ]}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Dossiers par statut">
              <RankBars items={toRank(d.byStatus, KYC_STATUS_LABEL)} format={fmtInt} />
            </ChartCard>
            <ChartCard title="Ancienneté des dossiers en revue" subtitle="Depuis leur soumission">
              <RankBars
                items={[
                  { key: "u2", label: "Moins de 2 jours", value: w?.underTwoDays ?? 0 },
                  { key: "2to7", label: "2 à 7 jours", value: w?.twoToSevenDays ?? 0 },
                  { key: "o7", label: "Plus de 7 jours", value: w?.overSevenDays ?? 0 },
                ]}
                format={fmtInt}
              />
            </ChartCard>
            <ChartCard title="Charge des agents" subtitle="Dossiers ouverts assignés et décisions sur la période">
              {(d.agents ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Aucun agent actif.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {(d.agents ?? []).map((a) => (
                    <div key={a.userId ?? a.name} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-semibold text-gray-900">{a.name || a.userId}</span>
                      <span className="text-gray-500">{fmtInt(a.assignedOpen ?? 0)} ouvert(s) · {fmtInt(a.decidedInPeriod ?? 0)} décidé(s)</span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
            <ChartCard title="Délai dépassé" subtitle="Dossiers au-delà de leur SLA">
              <CaseList items={d.overdue} onOpen={open} empty="Aucun dossier en retard." />
            </ChartCard>
            <ChartCard title="Dossiers bloqués" className="lg:col-span-2">
              <CaseList items={d.blocked} onOpen={open} empty="Aucun dossier bloqué." />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};

const CaseList: React.FC<{ items?: { code: string; status?: string; ownerType?: string; ownerId?: string; since?: string; detail?: string }[]; onOpen: (c?: string) => void; empty: string }> = ({ items = [], onOpen, empty }) =>
  items.length === 0 ? (
    <p className="py-6 text-center text-sm text-gray-400">{empty}</p>
  ) : (
    <div className="divide-y divide-gray-100">
      {items.map((c) => (
        <button key={c.code} type="button" onClick={() => onOpen(c.code)} className="flex w-full items-center justify-between gap-3 py-2 text-left hover:bg-gray-50">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-gray-900">{c.code}</span>
            <span className="block truncate text-xs text-gray-500">
              {label(OWNER_LABEL, String(c.ownerType))} {c.ownerId} {c.detail ? `· ${c.detail}` : ""}
            </span>
          </span>
          <span className="shrink-0 text-xs text-gray-500">{c.since ? `depuis le ${dayOnly(c.since)}` : label(KYC_STATUS_LABEL, String(c.status))}</span>
        </button>
      ))}
    </div>
  );

// ───────────────────────── Renouvellements ─────────────────────────

const Renewals: React.FC = () => {
  const queryClient = useQueryClient();
  const [days, setDays] = useState("90");
  const q = useQuery({ queryKey: ["kyc-renewals", days], queryFn: () => gedService.kycRenewals(Math.max(1, Number(days) || 90)) });
  const remind = useMutation({
    mutationFn: (data: { days?: number; kycDocumentIds?: string[] }) => gedService.kycRemind(data),
    onSuccess: (r) => {
      toast.success(`${r.reminded ?? 0} rappel(s) envoyé(s)${r.skippedRecentlyReminded ? `, ${r.skippedRecentlyReminded} déjà relancé(s) récemment` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["kyc-renewals"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Rappel impossible")),
  });
  const weeks = q.data ?? [];

  return (
    <div className="space-y-4">
      <ListHeader
        title="Pièces à renouveler"
        subtitle="Pièces approuvées qui expirent bientôt, regroupées par semaine."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={q.isFetching} onClick={() => q.refetch()} />
            <ActionButton icon={BellRing} pending={remind.isPending && !remind.variables?.kycDocumentIds} onClick={() => remind.mutate({ days: Math.max(1, Number(days) || 90) })}>
              Relancer tous les clients
            </ActionButton>
          </div>
        }
      />
      <Field label="Horizon (jours)">
        <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className={`${FIELD_SOFT} w-32`} />
      </Field>
      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorBlock message="Les renouvellements n'ont pas pu être chargés." onRetry={() => q.refetch()} />
      ) : weeks.length === 0 ? (
        <EmptyState icon={BellRing} title="Rien à renouveler" hint="Aucune pièce n'expire dans cet horizon." />
      ) : (
        weeks.map((w) => (
          <Section key={w.weekStart} title={`Semaine du ${dayOnly(w.weekStart)}`} description={`${w.items.length} pièce(s)`}>
            <div className="space-y-2">
              {w.items.map((i) => (
                <ItemRow key={i.kycDocumentId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {i.documentType || "Pièce"} {i.documentNumber ? `· ${i.documentNumber}` : ""}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {label(OWNER_LABEL, String(i.ownerType))} {i.ownerId} · dossier {i.kycCaseCode} · expire le {dayOnly(i.expiryDate)}
                      {i.lastRemindedAt ? ` · relancé le ${dayOnly(i.lastRemindedAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {i.daysLeft !== undefined && <StatusChip tone={i.daysLeft <= 14 ? "danger" : i.daysLeft <= 30 ? "warn" : "neutral"}>{i.daysLeft} j</StatusChip>}
                    <IconButton icon={BellRing} label="Relancer" pending={remind.isPending && remind.variables?.kycDocumentIds?.[0] === i.kycDocumentId} onClick={() => remind.mutate({ kycDocumentIds: [i.kycDocumentId] })} />
                  </div>
                </ItemRow>
              ))}
            </div>
          </Section>
        ))
      )}
    </div>
  );
};

// ───────────────────────── Doublons ─────────────────────────

const Duplicates: React.FC = () => {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["kyc-duplicates"], queryFn: () => gedService.kycDuplicates() });
  const groups = q.data ?? [];
  return (
    <div className="space-y-4">
      <ListHeader title="Pièces en doublon" subtitle="Un même numéro de pièce présent dans plusieurs dossiers : usurpation ou saisie en double." action={<RefreshButton fetching={q.isFetching} onClick={() => q.refetch()} />} />
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorBlock message="Les doublons n'ont pas pu être chargés." onRetry={() => q.refetch()} />
      ) : groups.length === 0 ? (
        <EmptyState icon={Copy} title="Aucun doublon" hint="Aucun numéro de pièce n'apparaît dans plusieurs dossiers." />
      ) : (
        groups.map((g) => (
          <Section key={`${g.documentType}-${g.normalizedNumber}`} title={`${g.documentType ?? "Pièce"} · ${g.normalizedNumber}`} description={`${g.pieces.length} dossiers concernés`}>
            <div className="space-y-2">
              {g.pieces.map((p) => (
                <ItemRow key={p.kycDocumentId ?? `${p.kycCaseCode}-${p.documentNumber}`} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {label(OWNER_LABEL, String(p.ownerType))} {p.ownerId}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      Dossier {p.kycCaseCode} · n° {p.documentNumber}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.status && <StatusChip tone="neutral">{p.status}</StatusChip>}
                    {p.kycCaseCode && (
                      <ActionButton variant="ghost" onClick={() => navigate(`/documents/kyc/cases/${p.kycCaseCode}`)}>
                        Ouvrir
                      </ActionButton>
                    )}
                  </div>
                </ItemRow>
              ))}
            </div>
          </Section>
        ))
      )}
    </div>
  );
};

// ───────────────────────── Motifs ─────────────────────────

const Reasons: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(false);
  const [editing, setEditing] = useState<KycReason | "new" | null>(null);
  const [form, setForm] = useState({ code: "", label: "", kind: "REJECTION", requiresText: false, active: true, sortOrder: "0" });
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["kyc-reasons", activeOnly], queryFn: () => gedService.kycReasons(undefined, activeOnly) });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["kyc-reasons"] });
    setEditing(null);
    setError(null);
  };
  const save = useMutation({
    mutationFn: () => {
      const body = { code: form.code.trim() || undefined, label: form.label.trim(), kind: form.kind.trim(), requiresText: form.requiresText, active: form.active, sortOrder: Number(form.sortOrder) || 0 };
      return editing === "new" ? gedService.kycCreateReason(body) : gedService.kycUpdateReason((editing as KycReason).code, body);
    },
    onSuccess: () => {
      toast.success("Motif enregistré");
      refresh();
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const remove = useMutation({
    mutationFn: (c: string) => gedService.kycDeleteReason(c),
    onSuccess: () => {
      toast.success("Motif supprimé");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Suppression impossible")),
  });

  const start = (r: KycReason | "new") => {
    setEditing(r);
    setError(null);
    setForm(r === "new" ? { code: "", label: "", kind: "REJECTION", requiresText: false, active: true, sortOrder: "0" } : { code: r.code, label: r.label, kind: r.kind ?? "", requiresText: !!r.requiresText, active: r.active !== false, sortOrder: String(r.sortOrder ?? 0) });
  };

  const reasons = q.data ?? [];
  return (
    <div className="space-y-4">
      <ListHeader
        title="Motifs de décision"
        subtitle="Motifs proposés aux agents pour rejeter ou demander une correction. Les motifs système se lisent mais ne se modifient pas."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={q.isFetching} onClick={() => q.refetch()} />
            {canManage && (
              <ActionButton icon={Plus} onClick={() => start("new")}>
                Nouveau motif
              </ActionButton>
            )}
          </div>
        }
      />
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
        Seulement les motifs actifs
      </label>

      {editing && (
        <PanelForm title={editing === "new" ? "Nouveau motif" : `Modifier ${editing.code}`} onSubmit={(e) => { e.preventDefault(); save.mutate(); }} onCancel={() => setEditing(null)} pending={save.isPending} submitLabel="Enregistrer" submitDisabled={!form.label.trim()} error={error}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code" hint={editing === "new" ? "Facultatif : généré si vide." : undefined}>
              <input value={form.code} disabled={editing !== "new"} onChange={(e) => setForm({ ...form, code: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Libellé" required>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Usage">
              <input value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Ordre d'affichage">
              <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className={FIELD} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.requiresText} onChange={(e) => setForm({ ...form, requiresText: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
              Un commentaire est obligatoire avec ce motif
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
              Actif
            </label>
          </div>
        </PanelForm>
      )}

      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorBlock message="Les motifs n'ont pas pu être chargés." onRetry={() => q.refetch()} />
      ) : reasons.length === 0 ? (
        <EmptyState icon={Pencil} title="Aucun motif" />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {reasons.map((r) => (
              <div key={r.code} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{r.label}</p>
                  <p className="truncate text-xs text-gray-500">
                    <span className="font-mono">{r.code}</span> · {r.kind ?? "tous usages"}
                    {r.requiresText ? " · commentaire obligatoire" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.systemReason && <StatusChip tone="neutral">Système</StatusChip>}
                  <StatusChip tone={r.active === false ? "neutral" : "success"}>{r.active === false ? "Inactif" : "Actif"}</StatusChip>
                  {canManage && !r.systemReason && (
                    <>
                      <IconButton icon={Pencil} label="Modifier" onClick={() => start(r)} />
                      <IconButton
                        icon={Trash2}
                        label="Supprimer"
                        tone="danger"
                        onClick={() => toast.confirm({ message: `Supprimer le motif « ${r.label} » ?`, detail: "Un motif déjà utilisé reste visible sur les décisions passées.", confirmLabel: "Supprimer", pendingLabel: "Suppression", tone: "danger", onConfirm: () => remove.mutateAsync(r.code) })}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
};

// ───────────────────────── Rattrapage ─────────────────────────

const Backfill: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const [result, setResult] = useState<{ apply: boolean; data: Record<string, number> } | null>(null);
  const run = useMutation({
    mutationFn: (apply: boolean) => gedService.kycBackfill(apply).then((data) => ({ apply, data })),
    onSuccess: (r) => {
      setResult(r);
      toast.success(r.apply ? "Rattrapage appliqué" : "Simulation terminée");
    },
    onError: (e) => toast.error(apiMessage(e, "Rattrapage impossible")),
  });
  return (
    <div className="space-y-4">
      <ListHeader title="Rattrapage des dossiers" subtitle="Crée les dossiers KYC manquants pour les comptes existants. Lancez d'abord une simulation, elle ne change rien." />
      {!canManage ? (
        <EmptyState icon={RefreshCw} title="Droit manquant" hint="Il faut KYC:MANAGE pour lancer le rattrapage." />
      ) : (
        <Section title="Lancer">
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={RefreshCw} pending={run.isPending && run.variables === false} onClick={() => run.mutate(false)}>
              Simuler
            </ActionButton>
            <ActionButton
              pending={run.isPending && run.variables === true}
              onClick={() => toast.confirm({ message: "Appliquer le rattrapage ?", detail: "Les dossiers manquants seront réellement créés.", confirmLabel: "Appliquer", pendingLabel: "Rattrapage", onConfirm: () => run.mutateAsync(true) })}
            >
              Appliquer
            </ActionButton>
          </div>
          {result && (
            <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
              <p className="mb-2 font-semibold">{result.apply ? "Résultat appliqué" : "Résultat de la simulation (rien n'a été modifié)"}</p>
              <ul className="space-y-1">
                {Object.entries(result.data).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-4">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-semibold">{fmtInt(Number(v))}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}
    </div>
  );
};

export const KycCenterPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const canRead = hasPermission("KYC:READ");
  if (!canRead) return <EmptyState icon={Copy} title="Accès refusé" hint="Il faut le droit KYC:READ pour ouvrir le centre KYC." />;
  return (
    <div className="space-y-4">
      <Tabs
        variant="soft"
        items={[
          { id: "dashboard" as View, label: "Vue d'ensemble" },
          { id: "renewals" as View, label: "Renouvellements" },
          { id: "duplicates" as View, label: "Doublons" },
          { id: "reasons" as View, label: "Motifs" },
          { id: "backfill" as View, label: "Rattrapage" },
        ]}
        active={view}
        onChange={setView}
      />
      {view === "dashboard" && <Dashboard />}
      {view === "renewals" && <Renewals />}
      {view === "duplicates" && <Duplicates />}
      {view === "reasons" && <Reasons canManage={hasPermission("KYC:MANAGE")} />}
      {view === "backfill" && <Backfill canManage={hasPermission("KYC:MANAGE")} />}
    </div>
  );
};

export default KycCenterPage;
