import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BellRing, ListChecks, Pencil, Play, Plus, Power, ShieldAlert, X } from "lucide-react";
import { dunningService } from "../../services/dunning.service";
import type { DunningNoticeView, DunningPolicyRequest, DunningPolicyView, DunningRunResult } from "../../services/dunning.service";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBlock,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  IconButton,
  ItemRow,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
  Tabs,
  Tag,
} from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, FOCUS, MONO_LINK, ROW_HOVER, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { DunningPolicyForm } from "../../components/billing/dunning/DunningPolicyForm";
import {
  ACTION_LABEL,
  CHANNEL_LABEL,
  OUTCOME_LABEL,
  OUTCOME_TONE,
  SEGMENT_LABEL,
  TONE_LABEL,
  labelOf,
} from "../../components/billing/dunning/dunningLabels";
import { CUSTOMER_TYPE_LABEL } from "../../components/billing/billingLabels";

type DunningTab = "notices" | "policies";
const TABS: TabItem<DunningTab>[] = [
  { id: "notices", label: "Historique", icon: ListChecks },
  { id: "policies", label: "Politiques", icon: ShieldAlert },
];

const PAGE_SIZE = 20;
const NOTICE_COLS = "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_5rem_8rem_8.5rem_9rem]";
const POLICY_COLS = "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_7rem_7rem_8rem_6.5rem]";

/** Historique des 200 dernières relances : le backend n'est pas paginé, les filtres et pages se font ici. */
const NoticesPanel: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("");
  const [action, setAction] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [lastRun, setLastRun] = useState<DunningRunResult | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dunning-notices"],
    queryFn: () => dunningService.getNotices(),
  });

  const runMutation = useMutation({
    mutationFn: () => dunningService.run(),
    onSuccess: (r) => {
      setLastRun(r);
      qc.invalidateQueries({ queryKey: ["dunning-notices"] });
    },
  });

  const askRun = () =>
    toast.confirm({
      message: "Lancer un passage de relances ?",
      detail: "Chaque facture en retard reçoit la relance du palier atteint, selon la politique active de son segment.",
      confirmLabel: "Lancer le passage",
      pendingLabel: "Passage en cours",
      successMessage: "Passage terminé",
      errorMessage: "Le passage a échoué ou vous n'avez pas les droits administrateur",
      onConfirm: () => runMutation.mutateAsync(),
    });

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter(
      (n) =>
        (!outcome || n.outcome === outcome) &&
        (!action || n.action === action) &&
        (!needle ||
          n.documentNumber.toLowerCase().includes(needle) ||
          n.customerCode.toLowerCase().includes(needle) ||
          (n.subscriptionNumber ?? "").toLowerCase().includes(needle)),
    );
  }, [data, search, outcome, action]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [page, totalPages]);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasFilters = !!(search || outcome || action);
  const reset = () => {
    setSearch("");
    setOutcome("");
    setAction("");
    setPage(0);
  };

  return (
    <div className="space-y-5">
      <ListHeader
        title="Historique des relances"
        subtitle={data ? `${data.length} dernière${data.length > 1 ? "s" : ""} relance${data.length > 1 ? "s" : ""}` : "Les 200 dernières relances envoyées"}
        action={
          <ActionButton icon={Play} pending={runMutation.isPending} onClick={askRun}>
            Lancer un passage
          </ActionButton>
        }
      />

      {lastRun && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>
            Dernier passage : <b>{lastRun.documents}</b> facture{lastRun.documents > 1 ? "s" : ""} traitée{lastRun.documents > 1 ? "s" : ""}, <b>{lastRun.notices}</b> relance
            {lastRun.notices > 1 ? "s" : ""} créée{lastRun.notices > 1 ? "s" : ""}, <b>{lastRun.failed}</b> échec{lastRun.failed > 1 ? "s" : ""}.
          </p>
          <button type="button" aria-label="Fermer" onClick={() => setLastRun(null)} className={`rounded-full p-1 hover:bg-emerald-100 ${FOCUS}`}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          className="flex-1"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Facture, code client, abonnement"
        />
        <FilterButton open={showFilters} active={!!(outcome || action)} onClick={() => setShowFilters(!showFilters)} />
      </div>

      {showFilters && (
        <FilterPanel canReset={hasFilters} onReset={reset}>
          <Field label="Résultat">
            <select
              className={FIELD}
              value={outcome}
              onChange={(e) => {
                setOutcome(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tous les résultats</option>
              {Object.entries(OUTCOME_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Action">
            <select
              className={FIELD}
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Toutes les actions</option>
              {Object.entries(ACTION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les relances." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title="Aucune relance"
          hint={hasFilters ? "Ajustez ou réinitialisez les filtres." : "Aucune relance n'a encore été envoyée."}
          action={
            hasFilters ? (
              <ActionButton variant="ghost" onClick={reset}>
                Réinitialiser les filtres
              </ActionButton>
            ) : undefined
          }
        />
      ) : (
        <>
          <HeadRow cols={NOTICE_COLS}>
            <span>Facture</span>
            <span>Client</span>
            <span>Action</span>
            <span>Retard</span>
            <span className="text-right">Solde</span>
            <span>Résultat</span>
            <span>Date</span>
          </HeadRow>
          <DataCard>
            {visible.map((n: DunningNoticeView) => (
              <div
                key={`${n.documentNumber}-${n.policyCode}-${n.stepOrder}-${n.executedAt}`}
                className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 transition max-lg:mb-2 max-lg:bg-gray-50 ${NOTICE_COLS} ${ROW_HOVER}`}
              >
                <button type="button" onClick={() => navigate(`/billing/documents/${n.documentNumber}`)} className={`${MONO_LINK} ${FOCUS} text-left lg:order-1`}>
                  {n.documentNumber}
                </button>
                <div className="max-lg:text-right lg:order-6">
                  <StatusChip tone={OUTCOME_TONE[n.outcome as keyof typeof OUTCOME_TONE] ?? "neutral"}>{labelOf(OUTCOME_LABEL, n.outcome)}</StatusChip>
                </div>
                <div className="col-span-2 min-w-0 lg:order-2 lg:col-span-1">
                  <p className="truncate text-sm font-semibold text-gray-950">{n.customerCode}</p>
                  <p className="truncate text-xs text-gray-400">
                    {labelOf(CUSTOMER_TYPE_LABEL, n.customerType)}
                    {n.subscriptionNumber ? ` · ${n.subscriptionNumber}` : ""}
                  </p>
                </div>
                <div className="col-span-2 min-w-0 lg:order-3 lg:col-span-1">
                  <p className="truncate text-sm text-gray-800">{labelOf(ACTION_LABEL, n.action)}</p>
                  <p className="truncate text-xs text-gray-400">
                    {n.policyCode} · palier {n.stepOrder}
                  </p>
                  {n.detail && <p className="truncate text-xs text-gray-400">{n.detail}</p>}
                </div>
                <p className="text-sm text-gray-600 lg:order-4">J+{n.daysOverdue}</p>
                <p className="text-sm font-bold tabular-nums text-gray-950 max-lg:text-right lg:order-5 lg:text-right">{formatMoney(n.balanceDue)}</p>
                <p className="col-span-2 text-xs text-gray-500 lg:order-7 lg:col-span-1 lg:text-sm">{formatDateTime(n.executedAt)}</p>
              </div>
            ))}
          </DataCard>
          <Pagination page={page} totalPages={totalPages} total={filtered.length} noun="relance" onChange={setPage} />
        </>
      )}
    </div>
  );
};

/** Politiques de relance : une seule active par segment, écriture réservée à l'administrateur. */
const PoliciesPanel: React.FC = () => {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DunningPolicyView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dunning-policies"],
    queryFn: () => dunningService.getPolicies(),
  });
  const policies = data ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ["dunning-policies"] });
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: DunningPolicyRequest) => dunningService.savePolicy(payload),
    onSuccess: () => {
      toast.success(editing ? "Politique mise à jour" : "Politique créée");
      refresh();
      closeForm();
    },
    onError: (e) => setFormError(apiMessage(e, "Enregistrement impossible : les paliers doivent suivre l'ordre croissant des jours.")),
  });

  // La fiche complète est relue avant modification pour ne pas écraser des paliers absents de la liste.
  const loadMutation = useMutation({
    mutationFn: (code: string) => dunningService.getPolicy(code),
    onSuccess: (p) => {
      setEditing(p);
      setFormError(null);
      setFormOpen(true);
    },
    onError: (e) => toast.error(apiMessage(e, "Politique introuvable.")),
  });

  const deactivateMutation = useMutation({
    mutationFn: (code: string) => dunningService.deactivatePolicy(code),
    onSuccess: refresh,
  });

  const activateMutation = useMutation({
    mutationFn: (p: DunningPolicyView) => dunningService.savePolicy({ ...p, active: true } as DunningPolicyRequest),
    onSuccess: refresh,
  });

  const askDeactivate = (p: DunningPolicyView) =>
    toast.confirm({
      message: `Désactiver « ${p.name} » ?`,
      detail: "Les factures du segment ne seront plus relancées tant qu'aucune autre politique n'est active.",
      confirmLabel: "Désactiver",
      pendingLabel: "Désactivation",
      successMessage: "Politique désactivée",
      errorMessage: "Désactivation refusée : droits administrateur requis",
      onConfirm: () => deactivateMutation.mutateAsync(p.policyCode),
    });

  const askActivate = (p: DunningPolicyView) =>
    toast.confirm({
      message: `Activer « ${p.name} » ?`,
      detail: `Elle remplace la politique active du segment « ${labelOf(SEGMENT_LABEL, p.segment)} ».`,
      confirmLabel: "Activer",
      pendingLabel: "Activation",
      successMessage: "Politique activée",
      errorMessage: "Activation refusée : droits administrateur requis",
      onConfirm: () => activateMutation.mutateAsync(p),
    });

  return (
    <div className="space-y-5">
      <ListHeader
        title="Politiques de relance"
        subtitle="Paliers de relance appliqués aux factures en retard, par segment de clientèle."
        action={
          !formOpen ? (
            <ActionButton
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setFormError(null);
                setFormOpen(true);
              }}
            >
              Nouvelle politique
            </ActionButton>
          ) : undefined
        }
      />

      {formOpen && <DunningPolicyForm key={editing?.policyCode ?? "new"} policy={editing} pending={saveMutation.isPending} error={formError} onSubmit={(d) => saveMutation.mutate(d)} onCancel={closeForm} />}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les politiques." onRetry={() => refetch()} />
      ) : policies.length === 0 ? (
        !formOpen && <EmptyState icon={ShieldAlert} title="Aucune politique" hint="Créez une politique pour relancer automatiquement les factures en retard." />
      ) : (
        <>
          <HeadRow cols={POLICY_COLS}>
            <span>Politique</span>
            <span>Segment</span>
            <span>Ton</span>
            <span>Paliers</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </HeadRow>
          <DataCard>
            {policies.map((p) => (
              <ItemRow key={p.policyCode} className="mb-2 !shadow-none max-lg:bg-gray-50 lg:bg-transparent">
                <div className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 ${POLICY_COLS}`}>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-950">{p.name}</p>
                    <p className="truncate font-mono text-xs text-[color:var(--logo-pink-dark)]">{p.policyCode}</p>
                  </div>
                  <div className="flex justify-end gap-1 lg:order-last">
                    <IconButton icon={Pencil} label="Modifier" pending={loadMutation.isPending && loadMutation.variables === p.policyCode} onClick={() => loadMutation.mutate(p.policyCode)} />
                    {p.active ? (
                      <IconButton icon={Power} label="Désactiver" pending={deactivateMutation.isPending && deactivateMutation.variables === p.policyCode} onClick={() => askDeactivate(p)} />
                    ) : (
                      <IconButton icon={Power} label="Activer" tone="success" pending={activateMutation.isPending && activateMutation.variables?.policyCode === p.policyCode} onClick={() => askActivate(p)} />
                    )}
                  </div>
                  <p className="col-span-2 text-sm text-gray-600 lg:col-span-1">{labelOf(SEGMENT_LABEL, p.segment)}</p>
                  <p className="text-sm text-gray-600">{labelOf(TONE_LABEL, p.tone)}</p>
                  <p className="text-sm text-gray-600">{(p.steps ?? []).length}</p>
                  <div>
                    <StatusChip tone={p.active ? "success" : "neutral"}>{p.active ? "Active" : "Inactive"}</StatusChip>
                  </div>
                </div>
                {(p.steps ?? []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.steps.map((s, i) => (
                      <Tag key={i}>
                        J+{s.daysAfterDue} · {labelOf(ACTION_LABEL, s.action)} · {labelOf(CHANNEL_LABEL, s.channel)}
                      </Tag>
                    ))}
                  </div>
                )}
              </ItemRow>
            ))}
          </DataCard>
        </>
      )}
    </div>
  );
};

export const BillingDunning: React.FC = () => {
  const [tab, setTab] = useState<DunningTab>("notices");
  return (
    <div className="space-y-5">
      <Tabs variant="soft" items={TABS} active={tab} onChange={setTab} />
      {tab === "notices" ? <NoticesPanel /> : <PoliciesPanel />}
    </div>
  );
};
