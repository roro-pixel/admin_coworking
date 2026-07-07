import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  X,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Target,
  Users,
  BarChart3,
  Globe2,
} from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type {
  Lead,
  LeadStage,
  ActivityType,
  LeadInterest,
  LeadSource,
  KanbanCard,
} from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { RichTextEditor } from "../../components/ui/RichTextEditor";

const stages: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
];
const stageConfig: Record<LeadStage, { label: string; color: string }> = {
  NEW: { label: "Nouveau", color: "bg-gray-100 text-gray-700" },
  CONTACTED: { label: "Contacté", color: "bg-blue-100 text-blue-700" },
  QUALIFIED: { label: "Qualifié", color: "bg-purple-100 text-purple-700" },
  PROPOSAL_SENT: {
    label: "Proposition",
    color: "bg-yellow-100 text-yellow-700",
  },
  WON: { label: "Gagné", color: "bg-green-100 text-green-700" },
  LOST: { label: "Perdu", color: "bg-red-100 text-red-700" },
};
const sourceOptions: { value: LeadSource; label: string }[] = [
  { value: "WEBSITE", label: "Site web" },
  { value: "REFERRAL", label: "Recommandation" },
  { value: "COLD_CALL", label: "Prospection" },
  { value: "TRADE_SHOW", label: "Salon" },
  { value: "PARTNER", label: "Partenaire" },
  { value: "SOCIAL_MEDIA", label: "Réseaux sociaux" },
  { value: "EVENT", label: "Événement" },
  { value: "OTHER", label: "Autre" },
];
const interestOptions: { value: LeadInterest; label: string }[] = [
  { value: "WORKSPACE", label: "Espace de travail" },
  { value: "MEETING_ROOM", label: "Salle de réunion" },
  { value: "VIRTUAL_OFFICE", label: "Bureau virtuel" },
  { value: "DOMICILIATION", label: "Domiciliation" },
  { value: "DAY_PASS", label: "Pass journée" },
  { value: "DEDICATED_DESK", label: "Bureau dédié" },
  { value: "PRIVATE_OFFICE", label: "Bureau privé" },
  { value: "OTHER", label: "Autre" },
];
const activityTypes: ActivityType[] = [
  "CALL",
  "EMAIL",
  "MEETING",
  "VISIT",
  "NOTE",
];
const activityLabels: Record<ActivityType, string> = {
  CALL: "Appel",
  EMAIL: "Email",
  MEETING: "Réunion",
  VISIT: "Visite",
  NOTE: "Note",
};

type SubTab = "board" | "list" | "analytics" | "public" | "create";

export const CrmMaster: React.FC = () => {
  const { admin } = useAuth();
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
  const [page, setPage] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState({
    activityType: "NOTE" as ActivityType,
    subject: "",
    notes: "",
    performedAt: new Date().toISOString().slice(0, 16),
  });
  const [convertForm, setConvertForm] = useState({
    ownerType: "CUSTOMER",
    ownerCode: "",
  });
  const [isConvertOpen, setIsConvertOpen] = useState(false);
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
  const [createForm, setCreateForm] = useState({
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
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if (activeTab !== "create") return;
    setCreateForm({
      fullName: "",
      email: "",
      phone: "",
      company: "",
      source: "WEBSITE",
      interest: "WORKSPACE",
      estimatedAmount: 0,
      probability: 30,
      expectedCloseDate: "",
      assignedTo: "",
    });
  }, [activeTab]);

  const switchTab = (tab: SubTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
    setActionError(null);
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

  const leads = leadsData?.content || [];
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
      switchTab("list");
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur création lead"),
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
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur capture publique"),
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
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur changement étape"),
  });
  const qualifyMutation = useMutation({
    mutationFn: (id: number) => operationsService.qualifyLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-board"] });
      refetchDetail();
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur qualification"),
  });
  const activityMutation = useMutation({
    mutationFn: () =>
      operationsService.addLeadActivity(selectedLead!.id, {
        ...activityForm,
        performedBy: admin?.email || "admin",
        performedAt: new Date(activityForm.performedAt).toISOString(),
      }),
    onSuccess: () => {
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["crm-board"] });
      setActivityForm({
        activityType: "NOTE",
        subject: "",
        notes: "",
        performedAt: new Date().toISOString().slice(0, 16),
      });
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur ajout activité"),
  });
  const convertMutation = useMutation({
    mutationFn: () =>
      operationsService.convertLead(selectedLead!.id, convertForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-board"] });
      setIsConvertOpen(false);
      refetchDetail();
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur conversion"),
  });
  const quoteMutation = useMutation({
    mutationFn: (id: number) =>
      operationsService.generateLeadQuote(id, {
        currency: "XAF",
        performedBy: admin?.email || "admin",
      }),
    onSuccess: (data) => {
      alert(`Devis généré : ${data.quoteNumber}`);
      refetchDetail();
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur génération devis"),
  });

  const conversionRate = Number(metrics?.conversionRate ?? 0);
  const tabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: "board", label: "Kanban", icon: Target },
    { id: "list", label: "Liste", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "public", label: "Capture site", icon: Globe2 },
    { id: "create", label: "Nouveau lead", icon: TrendingUp },
  ];

  return (
    <div>
      {metricsLoading ? (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-4 shadow-sm animate-pulse h-20"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          <Metric label="Total leads" value={metrics?.totalLeads ?? 0} />
          <Metric
            label="Gagnés"
            value={metrics?.wonLeads ?? 0}
            color="text-green-600"
          />
          <Metric
            label="Perdus"
            value={metrics?.lostLeads ?? 0}
            color="text-red-600"
          />
          <Metric
            label="Valeur pipeline"
            value={`${(metrics?.pipelineValue ?? 0).toLocaleString("fr-FR")} FCFA`}
            color="text-primary-600"
          />
          <Metric
            label="Taux conversion"
            value={`${conversionRate.toFixed(1)}%`}
            color="text-blue-600"
          />
        </div>
      )}
      <div className="mb-6 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-xl flex items-center gap-1.5 ${activeTab === id ? "bg-primary-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
        </div>
      </div>
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
          {actionError}
          <button onClick={() => setActionError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {activeTab === "board" && (
        <div className="space-y-4">
          <Filters
            search={search}
            setSearch={setSearch}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            interestFilter={interestFilter}
            setInterestFilter={setInterestFilter}
            assignedToFilter={assignedToFilter}
            setAssignedToFilter={setAssignedToFilter}
          />
          {boardLoading ? (
            <div className="py-12 text-center">Chargement...</div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 overflow-x-auto pb-4">
              {stages.map((stage) => {
                const col = board?.columns?.find((c) => c.stage === stage);
                return (
                  <div key={stage} className="flex-shrink-0 w-80">
                    <div
                      className={`px-3 py-2 rounded-xl font-medium text-sm ${stageConfig[stage].color}`}
                    >
                      {stageConfig[stage].label} ({col?.count ?? 0})
                      <span className="block text-xs font-normal">
                        {(col?.totalAmount ?? 0).toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                    <div className="space-y-2 bg-gray-50 rounded-b-lg p-2 min-h-32">
                      {(col?.cards || []).map((card) => (
                        <LeadCard
                          key={card.id}
                          card={card}
                          onOpen={() => {
                            setSelectedLead(card as any);
                            setIsDetailOpen(true);
                          }}
                          onMove={(target) => {
                            if (target === "LOST") {
                              const reason = prompt(
                                "Motif de perte obligatoire",
                              );
                              if (!reason) return;
                              stageMutation.mutate({
                                id: card.id,
                                stage: target,
                                reason,
                              });
                            } else
                              stageMutation.mutate({
                                id: card.id,
                                stage: target,
                              });
                          }}
                        />
                      ))}
                      {(!col?.cards || col.cards.length === 0) && (
                        <p className="text-xs text-gray-400 p-3">Aucun lead</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "list" && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un lead..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="">Tous stages</option>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {stageConfig[s].label}
                </option>
              ))}
            </select>
          </div>
          {leadsLoading ? (
            <div className="py-12 text-center">Chargement...</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
              <table className="w-full border-separate border-spacing-y-2 text-sm max-md:block max-md:border-spacing-0 max-md:[&_thead]:hidden max-md:[&_tbody]:block max-md:[&_tr]:mb-3 max-md:[&_tr]:block max-md:[&_tr]:rounded-2xl max-md:[&_tr]:bg-gray-50 max-md:[&_tr]:p-3 max-md:[&_tr]:shadow-sm max-md:[&_tr]:ring-1 max-md:[&_tr]:ring-gray-100 max-md:[&_td]:block max-md:[&_td]:px-0 max-md:[&_td]:py-1.5 max-md:[&_td]:text-left max-md:[&_td]:text-xs max-md:[&_td]:break-words">
                <tbody className="divide-y-0">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => {
                        setSelectedLead(lead);
                        setIsDetailOpen(true);
                      }}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{lead.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {lead.leadNumber} · {lead.company || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${stageConfig[lead.stage].color}`}
                        >
                          {stageConfig[lead.stage].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {interestOptions.find((i) => i.value === lead.interest)
                          ?.label ||
                          lead.interest ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(lead.estimatedAmount ?? 0).toLocaleString("fr-FR")}{" "}
                        FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <Pagination page={page} setPage={setPage} totalPages={totalPages} />
          )}
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={analyticsFrom}
              onChange={(e) => setAnalyticsFrom(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="date"
              value={analyticsTo}
              onChange={(e) => setAnalyticsTo(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          {analyticsLoading ? (
            <div>Chargement...</div>
          ) : (
            analytics && (
              <>
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  <Metric label="Créés" value={analytics.totalCreated} />
                  <Metric
                    label="Gagnés"
                    value={analytics.totalWon}
                    color="text-green-600"
                  />
                  <Metric
                    label="Perdus"
                    value={analytics.totalLost}
                    color="text-red-600"
                  />
                  <Metric
                    label="Conversion"
                    value={`${Number(analytics.conversionRate ?? 0).toFixed(1)}%`}
                  />
                  <Metric
                    label="Jours moy. pour gagner"
                    value={Number(analytics.avgDaysToWin ?? 0).toFixed(1)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:p-6">
                  <Breakdown title="Par source" data={analytics.bySource} />
                  <Breakdown title="Par stage" data={analytics.byStage} />
                </div>
                <p className="text-xs text-gray-500">
                  Valeur pipeline actuelle :{" "}
                  {(analytics.pipelineValue ?? 0).toLocaleString("fr-FR")} FCFA.
                </p>
              </>
            )
          )}
        </div>
      )}

      {activeTab === "public" && (
        <div className="mx-auto w-full max-w-6xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100 space-y-6">
          <h3 className="font-semibold">
            Test intégration formulaire site vitrine
          </h3>
          <p className="text-sm text-gray-500">
            Ce formulaire appelle l'endpoint public de capture CRM, utilisable
            depuis le site web.
          </p>
          {publicResult && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
              {publicResult.message} Référence : {publicResult.leadNumber}
            </div>
          )}
          <LeadForm
            form={publicForm}
            setForm={setPublicForm as any}
            publicMode
          />
          <button
            onClick={() => publicCaptureMutation.mutate()}
            disabled={!publicForm.fullName || publicCaptureMutation.isPending}
            className="w-full sm:w-auto justify-center px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
          >
            Envoyer au CRM
          </button>
        </div>
      )}

      {activeTab === "create" && (
        <div className="mx-auto w-full max-w-6xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100 space-y-6">
          <LeadForm form={createForm} setForm={setCreateForm as any} />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!createForm.fullName || createMutation.isPending}
            className="w-full sm:w-auto justify-center px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
          >
            Créer le lead
          </button>
        </div>
      )}

      {isDetailOpen && currentLead && (
        <ModalPortal onClose={() => setIsDetailOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-start rounded-t-2xl">
            <div>
              <h3 className="text-lg sm:text-xl font-bold">{currentLead.fullName}</h3>
              <p className="text-sm text-gray-500 font-mono">
                {currentLead.leadNumber}
              </p>
            </div>
            <button onClick={() => setIsDetailOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-2 py-1 rounded-full text-xs ${stageConfig[currentLead.stage].color}`}
              >
                {stageConfig[currentLead.stage].label}
              </span>
              <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                Score auto{" "}
                {currentLead.scoredProbability ??
                  (currentLead as any).score ??
                  0}
                %
              </span>
              <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                Probabilité agent {currentLead.probability ?? 0}%
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Info label="Email" value={currentLead.email || "—"} />
              <Info label="Téléphone" value={currentLead.phone || "—"} />
              <Info label="Société" value={currentLead.company || "—"} />
              <Info
                label="Intérêt"
                value={
                  interestOptions.find((i) => i.value === currentLead.interest)
                    ?.label ||
                  currentLead.interest ||
                  "—"
                }
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => qualifyMutation.mutate(currentLead.id)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                Qualifier
              </button>
              <button
                onClick={() => quoteMutation.mutate(currentLead.id)}
                disabled={currentLead.stage === "LOST"}
                className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50"
              >
                Générer devis
              </button>
              <button
                onClick={() => setIsConvertOpen(true)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                Convertir
              </button>
              {stages.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (s === "LOST") {
                      const reason = prompt("Motif de perte obligatoire");
                      if (!reason) return;
                      stageMutation.mutate({
                        id: currentLead.id,
                        stage: s,
                        reason,
                      });
                    } else {
                      stageMutation.mutate({ id: currentLead.id, stage: s });
                    }
                  }}
                  className="px-2 py-1 border rounded text-xs"
                >
                  {stageConfig[s].label}
                </button>
              ))}
            </div>
            <div className="border rounded-xl p-4 space-y-3">
              <h4 className="font-semibold">Ajouter une activité</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={activityForm.activityType}
                  onChange={(e) =>
                    setActivityForm((f) => ({
                      ...f,
                      activityType: e.target.value as ActivityType,
                    }))
                  }
                  className="px-3 py-2 border rounded-lg bg-white"
                >
                  {activityTypes.map((t) => (
                    <option key={t} value={t}>
                      {activityLabels[t]}
                    </option>
                  ))}
                </select>
                <input
                  value={activityForm.subject}
                  onChange={(e) =>
                    setActivityForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  placeholder="Sujet"
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="datetime-local"
                  value={activityForm.performedAt}
                  onChange={(e) =>
                    setActivityForm((f) => ({
                      ...f,
                      performedAt: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border rounded-lg"
                />
              </div>
              <RichTextEditor
                value={activityForm.notes}
                onChange={(v) => setActivityForm((f) => ({ ...f, notes: v }))}
                minHeight="90px"
              />
              <button
                onClick={() => activityMutation.mutate()}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm"
              >
                Ajouter l'activité
              </button>
            </div>
            <div className="space-y-3">
              {(currentLead.activities || []).map((a) => (
                <div key={a.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-sm">
                    {activityLabels[a.activityType]}{" "}
                    {a.subject ? `· ${a.subject}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {a.performedBy} ·{" "}
                    {a.performedAt
                      ? new Date(a.performedAt).toLocaleString("fr-FR")
                      : "—"}
                  </p>
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: a.notes || "" }}
                  />
                </div>
              ))}
            </div>
          </div>
          {isConvertOpen && (
            <ModalPortal onClose={() => setIsConvertOpen(false)}>
              <div className="p-5 border-b flex justify-between">
                <h3 className="font-bold">Convertir le lead</h3>
                <button onClick={() => setIsConvertOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <select
                  value={convertForm.ownerType}
                  onChange={(e) =>
                    setConvertForm((f) => ({ ...f, ownerType: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg bg-white"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="MEMBER">Membre</option>
                </select>
                <input
                  value={convertForm.ownerCode}
                  onChange={(e) =>
                    setConvertForm((f) => ({ ...f, ownerCode: e.target.value }))
                  }
                  placeholder="Code client/membre"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <button
                  onClick={() => convertMutation.mutate()}
                  disabled={!convertForm.ownerCode}
                  className="w-full sm:w-auto justify-center px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
                >
                  Convertir
                </button>
              </div>
            </ModalPortal>
          )}
        </ModalPortal>
      )}
    </div>
  );
};

const Metric = ({
  label,
  value,
  color = "text-gray-900",
}: {
  label: string;
  value: number | string;
  color?: string;
}) => (
  <div className="bg-white rounded-xl p-4 shadow-sm">
    <p className={`text-lg sm:text-xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);
const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
);
const Pagination = ({
  page,
  setPage,
  totalPages,
}: {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
}) => (
  <div className="flex justify-end items-center gap-2 mt-4">
    <button
      disabled={page === 0}
      onClick={() => setPage((p) => p - 1)}
      className="p-2 border rounded-lg disabled:opacity-50"
    >
      <ChevronLeft size={16} />
    </button>
    <span className="text-sm">
      Page {page + 1} / {totalPages}
    </span>
    <button
      disabled={page >= totalPages - 1}
      onClick={() => setPage((p) => p + 1)}
      className="p-2 border rounded-lg disabled:opacity-50"
    >
      <ChevronRight size={16} />
    </button>
  </div>
);
const Breakdown = ({
  title,
  data,
}: {
  title: string;
  data?: Record<string, number>;
}) => {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-sm mb-1">
              <span>{k}</span>
              <span>{v}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div
                className="h-2 bg-primary-600 rounded-full"
                style={{ width: `${(v / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
const Filters = ({
  search,
  setSearch,
  sourceFilter,
  setSourceFilter,
  interestFilter,
  setInterestFilter,
  assignedToFilter,
  setAssignedToFilter,
}: any) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Rechercher..."
      className="px-3 py-2 border rounded-lg"
    />
    <input
      value={assignedToFilter}
      onChange={(e) => setAssignedToFilter(e.target.value)}
      placeholder="Agent ID"
      className="px-3 py-2 border rounded-lg"
    />
    <select
      value={sourceFilter}
      onChange={(e) => setSourceFilter(e.target.value)}
      className="px-3 py-2 border rounded-lg bg-white"
    >
      <option value="">Toutes sources</option>
      {sourceOptions.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <select
      value={interestFilter}
      onChange={(e) => setInterestFilter(e.target.value)}
      className="px-3 py-2 border rounded-lg bg-white"
    >
      <option value="">Tous intérêts</option>
      {interestOptions.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);
const LeadCard = ({
  card,
  onOpen,
  onMove,
}: {
  card: KanbanCard;
  onOpen: () => void;
  onMove: (stage: LeadStage) => void;
}) => (
  <div className="bg-white rounded-lg p-3 shadow-sm">
    <div onClick={onOpen} className="cursor-pointer">
      <p className="font-medium text-sm">{card.fullName}</p>
      <p className="text-xs text-gray-500">{card.company || card.leadNumber}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
          Score {card.score ?? 0}%
        </span>
        {card.interest && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
            {card.interest}
          </span>
        )}
      </div>
      <p className="text-xs mt-2 text-gray-500">
        {(card.estimatedAmount ?? 0).toLocaleString("fr-FR")} FCFA
      </p>
    </div>
    <select
      value={card.stage}
      onChange={(e) => onMove(e.target.value as LeadStage)}
      className="mt-2 w-full px-2 py-1 border rounded text-xs bg-white"
    >
      {stages.map((s) => (
        <option key={s} value={s}>
          {stageConfig[s].label}
        </option>
      ))}
    </select>
  </div>
);
const LeadForm = ({
  form,
  setForm,
  publicMode = false,
}: {
  form: any;
  setForm: (fn: any) => void;
  publicMode?: boolean;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <input
      value={form.fullName}
      onChange={(e) =>
        setForm((f: any) => ({ ...f, fullName: e.target.value }))
      }
      placeholder="Nom complet *"
      className="px-3 py-2 border rounded-lg"
    />
    <input
      value={form.email}
      onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
      placeholder="Email"
      className="px-3 py-2 border rounded-lg"
    />
    <input
      value={form.phone}
      onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))}
      placeholder="Téléphone"
      className="px-3 py-2 border rounded-lg"
    />
    <input
      value={form.company}
      onChange={(e) => setForm((f: any) => ({ ...f, company: e.target.value }))}
      placeholder="Société"
      className="px-3 py-2 border rounded-lg"
    />
    {!publicMode && (
      <select
        value={form.source}
        onChange={(e) =>
          setForm((f: any) => ({ ...f, source: e.target.value as LeadSource }))
        }
        className="px-3 py-2 border rounded-lg bg-white"
      >
        {sourceOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )}
    <select
      value={form.interest}
      onChange={(e) =>
        setForm((f: any) => ({
          ...f,
          interest: e.target.value as LeadInterest,
        }))
      }
      className="px-3 py-2 border rounded-lg bg-white"
    >
      {interestOptions.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    {!publicMode && (
      <>
        <input
          type="number"
          value={form.estimatedAmount}
          onChange={(e) =>
            setForm((f: any) => ({
              ...f,
              estimatedAmount: Number(e.target.value),
            }))
          }
          placeholder="Montant estimé"
          className="px-3 py-2 border rounded-lg"
        />
        <input
          type="number"
          value={form.probability}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, probability: Number(e.target.value) }))
          }
          placeholder="Probabilité agent"
          className="px-3 py-2 border rounded-lg"
        />
        <input
          type="date"
          value={form.expectedCloseDate}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, expectedCloseDate: e.target.value }))
          }
          className="px-3 py-2 border rounded-lg"
        />
        <input
          value={form.assignedTo}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, assignedTo: e.target.value }))
          }
          placeholder="Agent ID"
          className="px-3 py-2 border rounded-lg"
        />
      </>
    )}
    <textarea
      value={form.note}
      onChange={(e) => setForm((f: any) => ({ ...f, note: e.target.value }))}
      placeholder="Note"
      className="md:col-span-2 px-3 py-2 border rounded-lg"
      rows={4}
    />
  </div>
);
