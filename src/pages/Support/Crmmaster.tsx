import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Globe2,
  UserPlus,
  SendHorizonal,
  Inbox,
} from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type {
  Lead,
  LeadStage,
  LeadInterest,
  LeadSource,
  KanbanCard,
} from "../../services/operations.service";
import {
  ActionButton,
  DataCard,
  EmptyState,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  ListHeader,
  Pagination,
  SearchField,
  Section,
  StatusChip,
  Tag,
} from "../../components/subscription/kit";
import { FIELD_SOFT, ROW_HOVER, apiMessage, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton, Skeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { ReasonPanel } from "../../components/bookings/ReasonPanel";
import { Avatar, SectionBar, ViewSwitch } from "../../components/operations/opsKit";
import type { ViewItem } from "../../components/operations/opsKit";
import {
  ChartCard,
  ChartSkeleton,
  ColumnChart,
  DonutBreakdown,
  KpiRow,
  KpiRowSkeleton,
} from "../../components/operations/OpsCharts";
import { LeadForm } from "../../components/operations/LeadForm";
import { LeadDetailModal } from "../../components/operations/LeadDetailModal";
import {
  LEAD_INTERESTS,
  LEAD_SOURCES,
  LEAD_STAGE,
  LEAD_STAGES,
} from "../../components/operations/opsLabels";
import { toSlices } from "../../components/operations/opsChartData";

const stages: LeadStage[] = [...LEAD_STAGES];
const interestLabel = (v?: string) => LEAD_INTERESTS.find((i) => i.value === v)?.label || v || "";

type SubTab = "board" | "list" | "analytics" | "public" | "create";

const views: ViewItem<SubTab>[] = [
  { id: "board", label: "Kanban", icon: Target },
  { id: "list", label: "Liste", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "public", label: "Capture site", icon: Globe2 },
];

const STAGE_COLORS: Record<string, string> = {
  NEW: "#B9B4B0",
  CONTACTED: "#9B8FD1",
  QUALIFIED: "#E4C7D6",
  PROPOSAL_SENT: "#E8A33D",
  WON: "#7FB08A",
  LOST: "#D64545",
};

const EMPTY_CREATE = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  source: "WEBSITE" as LeadSource,
  interest: "WORKSPACE" as LeadInterest,
  estimatedAmount: 0,
  probability: 30,
  expectedCloseDate: "",
  assignedTo: "",
};

const LIST_COLS = "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]";

export const CrmMaster: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>("board");
  const [visitedTabs, setVisitedTabs] = useState<Set<SubTab>>(
    new Set(["board"]),
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStage | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [interestFilter, setInterestFilter] = useState<LeadInterest | "">("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  /** Perte en attente d'un motif : "board" l'affiche au-dessus du kanban, "detail" dans la fiche */
  const [lostTarget, setLostTarget] = useState<{ id: number; name: string; origin: "board" | "detail" } | null>(null);
  const [analyticsFrom, setAnalyticsFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [analyticsTo, setAnalyticsTo] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [publicResult, setPublicResult] = useState<{
    leadNumber: string;
    message: string;
  } | null>(null);
  const [publicForm, setPublicForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    interest: "WORKSPACE" as LeadInterest,
    note: "",
  });
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if (activeTab !== "create") return;
    setCreateForm(EMPTY_CREATE);
  }, [activeTab]);

  const switchTab = (tab: SubTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: [
      "crm-board",
      assignedToFilter,
      sourceFilter,
      interestFilter,
      debouncedSearch,
    ],
    queryFn: () =>
      operationsService.getCrmBoard({
        assignedTo: assignedToFilter ? Number(assignedToFilter) : undefined,
        source: sourceFilter || undefined,
        interest: interestFilter || undefined,
        searchText: debouncedSearch || undefined,
      }),
    enabled: visitedTabs.has("board"),
  });
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["crm-metrics"],
    queryFn: () => operationsService.getCrmMetrics(),
  });
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["crm-analytics", analyticsFrom, analyticsTo],
    queryFn: () =>
      operationsService.getCrmAnalytics({
        from: `${analyticsFrom}T00:00:00Z`,
        to: `${analyticsTo}T23:59:59Z`,
      }),
    enabled: visitedTabs.has("analytics"),
  });
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ["crm-leads", stageFilter, debouncedSearch, page],
    queryFn: () =>
      operationsService.getLeads({
        stage: stageFilter || undefined,
        searchText: debouncedSearch || undefined,
        page,
        size: 20,
        sort: "updatedAt,desc",
      }),
    enabled: visitedTabs.has("list"),
  });
  const { data: leadDetail, refetch: refetchDetail } = useQuery({
    queryKey: ["crm-lead", selectedLead?.id],
    queryFn: () => operationsService.getLead(selectedLead!.id),
    enabled: !!selectedLead && isDetailOpen,
  });

  const leads: Lead[] = leadsData?.content || [];
  const totalPages = leadsData?.totalPages ?? 0;
  const currentLead = leadDetail || selectedLead;

  const createMutation = useMutation({
    mutationFn: () =>
      operationsService.createLead({
        ...createForm,
        assignedTo: createForm.assignedTo
          ? Number(createForm.assignedTo)
          : undefined,
        estimatedAmount: createForm.estimatedAmount || undefined,
        probability: createForm.probability || undefined,
        expectedCloseDate: createForm.expectedCloseDate || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-board"] });
      queryClient.invalidateQueries({ queryKey: ["crm-metrics"] });
      toast.success("Lead créé");
      switchTab("list");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur création lead")),
  });
  const publicCaptureMutation = useMutation({
    mutationFn: () =>
      operationsService.captureLeadPublic({ ...publicForm, source: "WEBSITE" }),
    onSuccess: (data) => {
      setPublicResult(data);
      setPublicForm({
        fullName: "",
        email: "",
        phone: "",
        company: "",
        interest: "WORKSPACE",
        note: "",
      });
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur capture publique")),
  });
  const stageMutation = useMutation({
    mutationFn: ({
      id,
      stage,
      reason,
    }: {
      id: number;
      stage: LeadStage;
      reason?: string;
    }) => operationsService.updateLeadStage(id, stage, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-board"] });
      queryClient.invalidateQueries({ queryKey: ["crm-metrics"] });
      refetchDetail();
      setLostTarget(null);
      toast.success("Étape mise à jour");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur changement étape")),
  });

  /** Déplace un lead ; la perte demande d'abord un motif (panneau, plus de prompt()) */
  const moveLead = (id: number, name: string, stage: LeadStage, origin: "board" | "detail") => {
    if (stage === "LOST") {
      setLostTarget({ id, name, origin });
      return;
    }
    stageMutation.mutate({ id, stage });
  };

  const lostPanel = (origin: "board" | "detail") =>
    lostTarget && lostTarget.origin === origin ? (
      <ReasonPanel
        title={`Marquer « ${lostTarget.name} » comme perdu`}
        subtitle="Le motif de perte est obligatoire"
        required
        submitLabel="Marquer comme perdu"
        pending={stageMutation.isPending}
        onCancel={() => setLostTarget(null)}
        onSubmit={(reason) => stageMutation.mutate({ id: lostTarget.id, stage: "LOST", reason })}
      />
    ) : null;

  const conversionRate = Number(metrics?.conversionRate ?? 0);
  const filtersActive = !!(sourceFilter || interestFilter || assignedToFilter);
  const openLead = (lead: Lead | KanbanCard) => {
    setSelectedLead(lead as Lead);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-5">
      {metricsLoading ? (
        <KpiRowSkeleton count={5} columns={5} />
      ) : (
        <KpiRow
          columns={5}
          items={[
            { label: "Total leads", value: metrics?.totalLeads ?? 0 },
            { label: "Gagnés", value: metrics?.wonLeads ?? 0, tone: "success" },
            { label: "Perdus", value: metrics?.lostLeads ?? 0, tone: "danger" },
            { label: "Valeur du pipeline", value: formatMoney(metrics?.pipelineValue ?? 0), tone: "pink" },
            { label: "Taux de conversion", value: `${conversionRate.toFixed(1)} %` },
          ]}
        />
      )}

      <SectionBar
        action={
          <ActionButton icon={UserPlus} onClick={() => switchTab("create")} className="w-full sm:w-auto">
            Nouveau lead
          </ActionButton>
        }
      >
        <ViewSwitch items={views} active={activeTab} onChange={switchTab} />
      </SectionBar>

      {activeTab === "board" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchField value={search} onChange={setSearch} placeholder="Rechercher un lead" className="flex-1" />
            <FilterButton open={showFilters} active={filtersActive} onClick={() => setShowFilters((v) => !v)} />
          </div>
          {showFilters && (
            <FilterPanel
              canReset={filtersActive}
              onReset={() => {
                setSourceFilter("");
                setInterestFilter("");
                setAssignedToFilter("");
              }}
            >
              <Field label="Agent (identifiant)">
                <input
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  placeholder="Identifiant"
                  className={FIELD_SOFT}
                />
              </Field>
              <Field label="Source">
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as LeadSource | "")} className={FIELD_SOFT}>
                  <option value="">Toutes les sources</option>
                  {LEAD_SOURCES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Intérêt">
                <select value={interestFilter} onChange={(e) => setInterestFilter(e.target.value as LeadInterest | "")} className={FIELD_SOFT}>
                  <option value="">Tous les intérêts</option>
                  {LEAD_INTERESTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </FilterPanel>
          )}

          {lostPanel("board")}

          {boardLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-80 shrink-0 space-y-3 rounded-[1.75rem] bg-gray-100/70 p-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3">
              {stages.map((stage) => {
                const col = board?.columns?.find((c: any) => c.stage === stage);
                const st = LEAD_STAGE[stage];
                return (
                  <section
                    key={stage}
                    className="w-[85vw] shrink-0 snap-start rounded-[1.75rem] bg-gray-100/70 p-3 sm:w-80 2xl:w-auto 2xl:min-w-[17rem] 2xl:flex-1"
                  >
                    <header className="flex items-start justify-between gap-2 px-2 pb-3 pt-1">
                      <div>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                        <p className="mt-2 text-xs font-semibold text-gray-500">{formatMoney(col?.totalAmount ?? 0)}</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-gray-700 shadow-sm">
                        {col?.count ?? 0}
                      </span>
                    </header>
                    <div className="min-h-24 space-y-2.5">
                      {(col?.cards || []).map((card: KanbanCard) => (
                        <article key={card.id} className="rounded-2xl bg-white p-4 shadow-sm">
                          <button type="button" onClick={() => openLead(card)} className="block w-full text-left focus:outline-none">
                            <p className="font-semibold text-gray-950">{card.fullName}</p>
                            <p className="text-xs text-gray-500">{card.company || card.leadNumber}</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              <Tag>Score {card.score ?? 0} %</Tag>
                              {card.interest && <Tag tone="pink">{interestLabel(card.interest)}</Tag>}
                            </div>
                            <p className="mt-3 text-sm font-bold text-gray-950">{formatMoney(card.estimatedAmount ?? 0)}</p>
                          </button>
                          <select
                            aria-label={`Déplacer ${card.fullName}`}
                            value={card.stage}
                            onChange={(e) => moveLead(card.id, card.fullName, e.target.value as LeadStage, "board")}
                            className={`${FIELD_SOFT} mt-3 !py-2 text-xs`}
                          >
                            {stages.map((s) => (
                              <option key={s} value={s}>
                                {LEAD_STAGE[s].label}
                              </option>
                            ))}
                          </select>
                        </article>
                      ))}
                      {(!col?.cards || col.cards.length === 0) && (
                        <p className="px-2 py-4 text-center text-xs text-gray-400">Aucun lead</p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "list" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchField value={search} onChange={setSearch} placeholder="Rechercher un lead" className="flex-1" />
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as LeadStage | "")}
              className={`${FIELD_SOFT} sm:w-56`}
            >
              <option value="">Toutes les étapes</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STAGE[s].label}
                </option>
              ))}
            </select>
          </div>
          {leadsLoading ? (
            <ListSkeleton rows={6} />
          ) : leads.length === 0 ? (
            <EmptyState icon={Inbox} title="Aucun lead" hint="Créez un lead ou modifiez la recherche." />
          ) : (
            <DataCard>
              <HeadRow cols={LIST_COLS}>
                <span>Lead</span>
                <span>Étape</span>
                <span>Intérêt</span>
                <span className="text-right">Montant estimé</span>
              </HeadRow>
              <div className="space-y-1">
                {leads.map((lead) => {
                  const st = statusOf(LEAD_STAGE, lead.stage);
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => openLead(lead)}
                      className={`grid w-full grid-cols-1 items-center gap-2 rounded-2xl max-lg:bg-gray-50 px-4 py-3 text-left transition lg:gap-4 ${LIST_COLS} ${ROW_HOVER} focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar size="sm" name={lead.fullName} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-950">{lead.fullName}</p>
                          <p className="truncate text-xs text-gray-500">
                            {lead.leadNumber}
                            {lead.company ? ` · ${lead.company}` : ""}
                          </p>
                        </div>
                      </div>
                      <div>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </div>
                      <p className="truncate text-sm text-gray-600">{interestLabel(lead.interest)}</p>
                      <p className="text-sm font-bold text-gray-950 lg:text-right">{formatMoney(lead.estimatedAmount ?? 0)}</p>
                    </button>
                  );
                })}
              </div>
            </DataCard>
          )}
          <Pagination page={page} totalPages={totalPages} total={leadsData?.totalElements ?? 0} noun="lead" onChange={setPage} />
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-5">
          <ListHeader
            title="Analytics CRM"
            subtitle="Création, conversion et origine des leads sur la période"
            action={
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Du">
                  <input type="date" value={analyticsFrom} onChange={(e) => setAnalyticsFrom(e.target.value)} className={FIELD_SOFT} />
                </Field>
                <Field label="Au">
                  <input type="date" value={analyticsTo} onChange={(e) => setAnalyticsTo(e.target.value)} className={FIELD_SOFT} />
                </Field>
              </div>
            }
          />
          {analyticsLoading ? (
            <>
              <KpiRowSkeleton count={5} columns={5} />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            </>
          ) : (
            analytics && (
              <>
                <KpiRow
                  columns={5}
                  items={[
                    { label: "Créés", value: analytics.totalCreated ?? 0 },
                    { label: "Gagnés", value: analytics.totalWon ?? 0, tone: "success" },
                    { label: "Perdus", value: analytics.totalLost ?? 0, tone: "danger" },
                    { label: "Conversion", value: `${Number(analytics.conversionRate ?? 0).toFixed(1)} %` },
                    { label: "Jours moyens pour gagner", value: Number(analytics.avgDaysToWin ?? 0).toFixed(1) },
                  ]}
                />
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <ChartCard
                    title="Leads par étape"
                    subtitle={`Valeur actuelle du pipeline : ${formatMoney(analytics.pipelineValue ?? 0)}`}
                  >
                    <ColumnChart
                      data={toSlices(
                        analytics.byStage,
                        Object.fromEntries(stages.map((s) => [s, LEAD_STAGE[s].label])),
                        stages,
                        STAGE_COLORS,
                      )}
                    />
                  </ChartCard>
                  <ChartCard title="Origine des leads" subtitle="Par source d'acquisition">
                    <DonutBreakdown
                      centerLabel="leads"
                      data={toSlices(analytics.bySource, Object.fromEntries(LEAD_SOURCES.map((s) => [s.value, s.label])))}
                    />
                  </ChartCard>
                </div>
              </>
            )
          )}
        </div>
      )}

      {activeTab === "public" && (
        <div className="mx-auto w-full max-w-4xl space-y-5">
          <Section
            title="Test d'intégration du formulaire du site vitrine"
            description="Ce formulaire appelle l'endpoint public de capture CRM, utilisable depuis le site web."
            icon={Globe2}
          >
            <div className="space-y-5">
              {publicResult && (
                <div role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  {publicResult.message} Référence : <b className="font-mono">{publicResult.leadNumber}</b>
                </div>
              )}
              <LeadForm form={publicForm} setForm={setPublicForm as any} publicMode />
            </div>
          </Section>
          <div className="flex justify-end">
            <ActionButton
              icon={SendHorizonal}
              pending={publicCaptureMutation.isPending}
              disabled={!publicForm.fullName}
              onClick={() => publicCaptureMutation.mutate()}
            >
              Envoyer au CRM
            </ActionButton>
          </div>
        </div>
      )}

      {activeTab === "create" && (
        <form
          className="mx-auto w-full max-w-4xl space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (createForm.fullName) createMutation.mutate();
          }}
        >
          <Section title="Nouveau lead" description="Un prospect à suivre dans le pipeline" icon={TrendingUp}>
            <LeadForm form={createForm} setForm={setCreateForm as any} />
          </Section>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={() => switchTab("board")} disabled={createMutation.isPending}>
              Annuler
            </ActionButton>
            <ActionButton type="submit" pending={createMutation.isPending} disabled={!createForm.fullName}>
              Créer le lead
            </ActionButton>
          </div>
        </form>
      )}

      {isDetailOpen && currentLead && (
        <LeadDetailModal
          lead={currentLead}
          onClose={() => setIsDetailOpen(false)}
          onStage={(s) => moveLead(currentLead.id, currentLead.fullName, s, "detail")}
          stageBusy={stageMutation.isPending ? (stageMutation.variables?.stage ?? null) : null}
          lostPanel={lostPanel("detail")}
          refetch={refetchDetail}
        />
      )}
    </div>
  );
};
