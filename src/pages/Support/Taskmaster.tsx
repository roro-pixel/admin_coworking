import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  ClipboardList,
  Calendar,
  BarChart3,
  KanbanSquare,
  ListTodo,
  MessageSquare,
  CheckSquare,
} from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskCard,
  TaskRecurrence,
} from "../../services/operations.service";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { AgentAutocomplete } from "../../components/auth/AgentAutocomplete";
import { TaskSourceAutocomplete } from "../../components/tasks/TaskSourceAutocomplete";
import type { AdminUser } from "../../services/auth.service";
import {
  ActionButton,
  DataCard,
  EmptyState,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  SearchField,
  Section,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, ROW_HOVER, apiMessage } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton, Skeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { DueText, PillChoice, SectionBar, ViewSwitch } from "../../components/operations/opsKit";
import type { ViewItem } from "../../components/operations/opsKit";
import {
  BarBreakdown,
  ChartCard,
  ChartSkeleton,
  DonutBreakdown,
  KpiRow,
  KpiRowSkeleton,
  StackBar,
} from "../../components/operations/OpsCharts";
import { TaskDetailModal } from "../../components/operations/TaskDetailModal";
import {
  ACTIVE_TASK_STATUSES,
  PRIORITY_STYLE,
  RECURRENCE_LABELS,
  SOURCE_TYPE_LABELS,
  TASK_SOURCES,
  TASK_STATUS,
  styleLabels,
} from "../../components/operations/opsLabels";
import { toSlices } from "../../components/operations/opsChartData";

const activeStatuses: Exclude<TaskStatus, "ARCHIVED">[] = [...ACTIVE_TASK_STATUSES];
const recurrenceOptions: TaskRecurrence[] = ["NONE", "DAILY", "WEEKLY", "MONTHLY", "AFTER_BOOKING"];
const priorityOptions = (Object.keys(PRIORITY_STYLE) as TaskPriority[]).map((p) => ({
  value: p,
  label: PRIORITY_STYLE[p].label,
}));

const PRIORITY_LABELS = styleLabels(PRIORITY_STYLE);
const PRIORITY_ORDER = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;
const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#D64545",
  HIGH: "#E8A33D",
  MEDIUM: "#9B8FD1",
  LOW: "#B9B4B0",
};
const STATUS_COLORS: Record<string, string> = {
  OPEN: "#B9B4B0",
  IN_PROGRESS: "#9B8FD1",
  COMPLETED: "#7FB08A",
  CANCELLED: "#D64545",
  ARCHIVED: "#E4C7D6",
};

type SubTab = "board" | "my" | "today" | "metrics" | "create";

const EMPTY_CREATE = {
  title: "",
  description: "",
  assignedTo: "",
  priority: "MEDIUM" as TaskPriority,
  dueAt: "",
  sourceType: "",
  sourceCode: "",
  recurrence: "NONE" as TaskRecurrence,
};

const LIST_COLS = "lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]";

export const TaskMaster: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>("board");
  const [visitedTabs, setVisitedTabs] = useState<Set<SubTab>>(
    new Set(["board"]),
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "">("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("");
  const [assignedToFilter, setAssignedToFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCreateAgent, setSelectedCreateAgent] =
    useState<AdminUser | null>(null);
  const [checklistItems, setChecklistItems] = useState<
    { label: string; completed: boolean }[]
  >([]);
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
    setChecklistItems([]);
    setSelectedCreateAgent(null);
  }, [activeTab]);

  const switchTab = (tab: SubTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
  };

  const boardParams = {
    assignedTo: assignedToFilter ? Number(assignedToFilter) : undefined,
    priority: priorityFilter || undefined,
    sourceType: sourceTypeFilter || undefined,
    searchText: debouncedSearch || undefined,
  };
  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ["tasks-board", boardParams],
    queryFn: () => operationsService.getTaskBoard(boardParams),
    enabled: visitedTabs.has("board"),
  });
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["task-metrics"],
    queryFn: () => operationsService.getTaskMetrics(),
    enabled: visitedTabs.has("metrics") || visitedTabs.has("board"),
  });
  const { data: myTasksData, isLoading: myLoading } = useQuery({
    queryKey: [
      "tasks-my",
      page,
      statusFilter,
      priorityFilter,
      sourceTypeFilter,
      debouncedSearch,
    ],
    queryFn: () =>
      operationsService.getTasks({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        sourceType: sourceTypeFilter || undefined,
        searchText: debouncedSearch || undefined,
        page,
        size: 20,
        sort: "dueAt,asc",
      }),
    enabled: visitedTabs.has("my"),
  });
  const { data: todayTasks = [], isLoading: todayLoading } = useQuery({
    queryKey: ["tasks-today"],
    queryFn: () => operationsService.getDueTodayTasks(),
    enabled: visitedTabs.has("today"),
  });
  const { data: taskDetail, refetch: refetchDetail } = useQuery({
    queryKey: ["task-detail", selectedTask?.id],
    queryFn: () => operationsService.getTask(selectedTask!.id),
    enabled: !!selectedTask && isDetailOpen,
  });

  const myTasks: Task[] = myTasksData?.content || [];
  const totalPages = myTasksData?.totalPages ?? 0;
  const currentTask = taskDetail || selectedTask;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks-board"] });
    queryClient.invalidateQueries({ queryKey: ["tasks-my"] });
    queryClient.invalidateQueries({ queryKey: ["tasks-today"] });
    queryClient.invalidateQueries({ queryKey: ["task-metrics"] });
    refetchDetail();
  };
  const createMutation = useMutation({
    mutationFn: () =>
      operationsService.createTask({
        title: createForm.title,
        description: createForm.description || undefined,
        assignedTo: createForm.assignedTo
          ? Number(createForm.assignedTo)
          : undefined,
        priority: createForm.priority,
        dueAt: createForm.dueAt
          ? new Date(createForm.dueAt).toISOString()
          : undefined,
        sourceType: createForm.sourceType || undefined,
        sourceCode: createForm.sourceCode || undefined,
        recurrence: createForm.recurrence,
        checklist: checklistItems.map((item, i) => ({
          ...item,
          displayOrder: i + 1,
        })),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Tâche créée");
      switchTab("board");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur création tâche")),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      operationsService.updateTaskStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success("Statut mis à jour");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur changement statut")),
  });

  const openTask = (t: Task | TaskCard) => {
    setSelectedTask(t as Task);
    setIsDetailOpen(true);
  };

  const views: ViewItem<SubTab>[] = [
    { id: "board", label: "Kanban", icon: KanbanSquare },
    { id: "today", label: "Aujourd'hui", icon: Calendar, count: todayTasks.length },
    { id: "my", label: "Liste", icon: ListTodo },
    { id: "metrics", label: "Métriques", icon: BarChart3 },
  ];

  const filtersActive = !!(assignedToFilter || priorityFilter || sourceTypeFilter);
  const filters = (withStatus: boolean) => (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField value={search} onChange={setSearch} placeholder="Rechercher une tâche" className="flex-1" />
        <FilterButton open={showFilters} active={filtersActive || (withStatus && !!statusFilter)} onClick={() => setShowFilters((v) => !v)} />
      </div>
      {showFilters && (
        <FilterPanel
          canReset={filtersActive || (withStatus && !!statusFilter)}
          onReset={() => {
            setAssignedToFilter("");
            setPriorityFilter("");
            setSourceTypeFilter("");
            setStatusFilter("");
          }}
        >
          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-600">Agent</p>
            <AgentAutocomplete
              value={assignedToFilter}
              onValueChange={setAssignedToFilter}
              onSelect={() => undefined}
              placeholder="Filtrer par agent..."
            />
          </div>
          <Field label="Priorité">
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "")} className={FIELD_SOFT}>
              <option value="">Toutes les priorités</option>
              {priorityOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source">
            <select value={sourceTypeFilter} onChange={(e) => setSourceTypeFilter(e.target.value)} className={FIELD_SOFT}>
              <option value="">Toutes les sources</option>
              {TASK_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          {withStatus && (
            <Field label="Statut">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")} className={FIELD_SOFT}>
                <option value="">Statuts actifs</option>
                {Object.entries(TASK_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </FilterPanel>
      )}
    </>
  );

  return (
    <div className="space-y-5">
      <SectionBar
        action={
          <ActionButton icon={Plus} onClick={() => switchTab("create")} className="w-full sm:w-auto">
            Nouvelle tâche
          </ActionButton>
        }
      >
        <ViewSwitch items={views} active={activeTab} onChange={switchTab} />
      </SectionBar>

      {activeTab === "board" && (
        <div className="space-y-4">
          {filters(false)}
          {metrics && (
            <KpiRow
              items={[
                { label: "Total", value: metrics.totalTasks },
                { label: "Ouvertes", value: metrics.openTasks },
                { label: "En retard", value: metrics.overdueTasks, tone: "danger" },
                { label: "Taux de complétion", value: `${Number(metrics.completionRate ?? 0).toFixed(1)} %`, tone: "success" },
              ]}
            />
          )}
          {boardLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-3 rounded-[1.75rem] bg-gray-100/70 p-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 lg:grid lg:grid-cols-4 lg:overflow-visible">
              {activeStatuses.map((status) => {
                const col = boardData?.columns?.find((c: any) => c.status === status);
                const st = TASK_STATUS[status];
                return (
                  <section key={status} className="w-[85vw] shrink-0 snap-start rounded-[1.75rem] bg-gray-100/70 p-3 sm:w-80 lg:w-auto">
                    <header className="flex items-center justify-between gap-2 px-2 pb-3 pt-1">
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-gray-700 shadow-sm">
                        {col?.count ?? 0}
                      </span>
                    </header>
                    <div className="min-h-24 space-y-2.5">
                      {(col?.cards || []).map((card: TaskCard) => {
                        const pr = statusOf(PRIORITY_STYLE, card.priority);
                        const total = card.checklistTotal ?? 0;
                        const doneCount = card.checklistDone ?? 0;
                        return (
                          <article key={card.id} className="rounded-2xl bg-white p-4 shadow-sm">
                            <button type="button" onClick={() => openTask(card)} className="block w-full text-left focus:outline-none">
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-2 font-semibold text-gray-950">{card.title}</p>
                                <StatusChip tone={pr.tone}>{pr.label}</StatusChip>
                              </div>
                              {card.dueAt && (
                                <p className="mt-2 text-xs">
                                  <DueText value={card.dueAt} overdue={card.overdue} withTime />
                                </p>
                              )}
                              {card.sourceType && (
                                <p className="mt-1 text-xs font-semibold text-[color:var(--logo-pink-dark)]">
                                  {SOURCE_TYPE_LABELS[card.sourceType] ?? card.sourceType} · {card.sourceCode}
                                </p>
                              )}
                              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                                <span className="flex flex-1 items-center gap-2">
                                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                    <span
                                      className="block h-full rounded-full bg-[color:var(--logo-pink)]"
                                      style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
                                    />
                                  </span>
                                  <span className="tabular-nums">
                                    {doneCount}/{total}
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <MessageSquare size={12} />
                                  {card.commentCount ?? 0}
                                </span>
                              </div>
                            </button>
                            <select
                              aria-label={`Changer le statut de ${card.title}`}
                              value={card.status}
                              onChange={(e) => statusMutation.mutate({ id: card.id, status: e.target.value as TaskStatus })}
                              className={`${FIELD_SOFT} mt-3 !py-2 text-xs`}
                            >
                              {activeStatuses.map((s) => (
                                <option key={s} value={s}>
                                  {TASK_STATUS[s].label}
                                </option>
                              ))}
                            </select>
                          </article>
                        );
                      })}
                      {(!col?.cards || col.cards.length === 0) && (
                        <p className="px-2 py-4 text-center text-xs text-gray-400">Aucune tâche</p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "today" && (
        <div className="space-y-4">
          <ListHeader title="À faire aujourd'hui" subtitle={`${todayTasks.length} tâche${todayTasks.length > 1 ? "s" : ""} à échéance du jour`} />
          <TaskList tasks={todayTasks} loading={todayLoading} open={openTask} />
        </div>
      )}

      {activeTab === "my" && (
        <div className="space-y-4">
          {filters(true)}
          <TaskList tasks={myTasks} loading={myLoading} open={openTask} />
          <Pagination page={page} totalPages={totalPages} total={myTasksData?.totalElements ?? 0} noun="tâche" onChange={setPage} />
        </div>
      )}

      {activeTab === "metrics" && (
        <div className="space-y-5">
          <ListHeader title="Métriques des tâches" subtitle="Avancement, retards et répartition" />
          {metricsLoading ? (
            <>
              <KpiRowSkeleton count={8} />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ChartSkeleton />
                <ChartSkeleton />
              </div>
            </>
          ) : (
            metrics && (
              <>
                <KpiRow
                  items={[
                    { label: "Total", value: metrics.totalTasks },
                    { label: "Ouvertes", value: metrics.openTasks },
                    { label: "En cours", value: metrics.inProgressTasks },
                    { label: "Terminées", value: metrics.completedTasks, tone: "success" },
                    { label: "Annulées", value: metrics.cancelledTasks },
                    { label: "Archivées", value: metrics.archivedTasks },
                    { label: "En retard", value: metrics.overdueTasks, tone: "danger" },
                    { label: "Durée moyenne", value: `${Number(metrics.avgCompletionHours ?? 0).toFixed(1)} h` },
                  ]}
                />
                <ChartCard title="Répartition par statut">
                  <StackBar
                    data={toSlices(
                      {
                        OPEN: metrics.openTasks ?? 0,
                        IN_PROGRESS: metrics.inProgressTasks ?? 0,
                        COMPLETED: metrics.completedTasks ?? 0,
                        CANCELLED: metrics.cancelledTasks ?? 0,
                        ARCHIVED: metrics.archivedTasks ?? 0,
                      },
                      styleLabels(TASK_STATUS),
                      ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ARCHIVED"],
                      STATUS_COLORS,
                    )}
                  />
                </ChartCard>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <ChartCard title="Par priorité">
                    <DonutBreakdown
                      centerLabel="tâches"
                      data={toSlices(metrics.byPriority, PRIORITY_LABELS, PRIORITY_ORDER, PRIORITY_COLORS)}
                    />
                  </ChartCard>
                  <ChartCard title="Par origine" subtitle="D'où viennent les tâches">
                    <BarBreakdown data={toSlices(metrics.bySourceType, SOURCE_TYPE_LABELS)} />
                  </ChartCard>
                </div>
              </>
            )
          )}
        </div>
      )}

      {activeTab === "create" && (
        <form
          className="mx-auto w-full max-w-4xl space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (createForm.title) createMutation.mutate();
          }}
        >
          <Section title="La tâche" icon={CheckSquare}>
            <div className="space-y-4">
              <Field label="Titre" required>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  className={FIELD}
                />
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-600">Description</p>
                <RichTextEditor
                  value={createForm.description}
                  onChange={(v: string) => setCreateForm((f) => ({ ...f, description: v }))}
                  minHeight="120px"
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-600">Priorité</p>
                <PillChoice
                  label="Priorité"
                  options={priorityOptions}
                  value={createForm.priority}
                  onChange={(priority) => setCreateForm((f) => ({ ...f, priority }))}
                />
              </div>
            </div>
          </Section>

          <Section title="Planification et suivi" description="Qui, quand, et à quoi la tâche se rattache" icon={Calendar}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-600">Assigner à un agent</p>
                <AgentAutocomplete
                  value={createForm.assignedTo}
                  selectedAgent={selectedCreateAgent}
                  onValueChange={(value) => setCreateForm((f) => ({ ...f, assignedTo: value }))}
                  onSelect={setSelectedCreateAgent}
                  placeholder="Assigner à un agent..."
                />
              </div>
              <Field label="Échéance">
                <input
                  type="datetime-local"
                  value={createForm.dueAt}
                  onChange={(e) => setCreateForm((f) => ({ ...f, dueAt: e.target.value }))}
                  className={FIELD}
                />
              </Field>
              <Field label="Source">
                <select
                  value={createForm.sourceType}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sourceType: e.target.value, sourceCode: "" }))}
                  className={FIELD}
                >
                  <option value="">Source manuelle</option>
                  {TASK_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-600">Élément rattaché</p>
                <TaskSourceAutocomplete
                  sourceType={createForm.sourceType}
                  value={createForm.sourceCode}
                  onChange={(sourceCode) => setCreateForm((f) => ({ ...f, sourceCode }))}
                />
              </div>
              <Field label="Récurrence" className="md:col-span-2">
                <select
                  value={createForm.recurrence}
                  onChange={(e) => setCreateForm((f) => ({ ...f, recurrence: e.target.value as TaskRecurrence }))}
                  className={FIELD}
                >
                  {recurrenceOptions.map((r) => (
                    <option key={r} value={r}>
                      {RECURRENCE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section
            title="Checklist initiale"
            description="Les étapes à cocher au fil du travail"
            icon={ListTodo}
            action={
              <ActionButton
                variant="ghost"
                icon={Plus}
                className="!py-2"
                onClick={() => setChecklistItems([...checklistItems, { label: "", completed: false }])}
              >
                Ajouter un item
              </ActionButton>
            }
          >
            {checklistItems.length === 0 ? (
              <p className="py-2 text-center text-sm text-gray-400">Aucun item pour l'instant.</p>
            ) : (
              <ul className="space-y-2">
                {checklistItems.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <input
                      value={item.label}
                      aria-label={`Item ${i + 1}`}
                      onChange={(e) => {
                        const arr = [...checklistItems];
                        arr[i] = { ...arr[i], label: e.target.value };
                        setChecklistItems(arr);
                      }}
                      className={FIELD}
                    />
                    <IconButton
                      icon={X}
                      label="Retirer l'item"
                      tone="danger"
                      className="!h-11 !w-11 self-center bg-white shadow-sm"
                      onClick={() => setChecklistItems(checklistItems.filter((_, idx) => idx !== i))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={() => switchTab("board")} disabled={createMutation.isPending}>
              Annuler
            </ActionButton>
            <ActionButton type="submit" pending={createMutation.isPending} disabled={!createForm.title}>
              Créer la tâche
            </ActionButton>
          </div>
        </form>
      )}

      {isDetailOpen && currentTask && (
        <TaskDetailModal
          task={currentTask}
          onClose={() => setIsDetailOpen(false)}
          onStatus={(status) => statusMutation.mutate({ id: currentTask.id, status })}
          statusBusy={statusMutation.isPending ? (statusMutation.variables?.status ?? null) : null}
          onChanged={invalidate}
          refetch={refetchDetail}
        />
      )}
    </div>
  );
};

const TaskList: React.FC<{
  tasks: Task[];
  loading?: boolean;
  open: (task: Task) => void;
}> = ({ tasks, loading, open }) => {
  if (loading) return <ListSkeleton rows={5} />;
  if (tasks.length === 0) {
    return <EmptyState icon={ClipboardList} title="Aucune tâche" hint="Rien à afficher pour ce filtre." />;
  }
  return (
    <DataCard>
      <HeadRow cols={LIST_COLS}>
        <span>Tâche</span>
        <span>Statut</span>
        <span>Priorité</span>
        <span className="text-right">Échéance</span>
      </HeadRow>
      <div className="space-y-1">
        {tasks.map((task) => {
          const st = statusOf(TASK_STATUS, task.status);
          const pr = statusOf(PRIORITY_STYLE, task.priority);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => open(task)}
              className={`grid w-full grid-cols-1 items-center gap-2 rounded-2xl max-lg:bg-gray-50 px-4 py-3 text-left transition lg:gap-4 ${LIST_COLS} ${ROW_HOVER} focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]`}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-950">{task.title}</p>
                <p className="text-xs text-gray-500">
                  {task.sourceType
                    ? `${SOURCE_TYPE_LABELS[task.sourceType] ?? task.sourceType} · ${task.sourceCode}`
                    : "Source manuelle"}
                </p>
              </div>
              <div>
                <StatusChip tone={st.tone}>{st.label}</StatusChip>
              </div>
              <div>
                <StatusChip tone={pr.tone}>{pr.label}</StatusChip>
              </div>
              <p className="text-sm lg:text-right">
                <DueText value={task.dueAt} />
              </p>
            </button>
          );
        })}
      </div>
    </DataCard>
  );
};

