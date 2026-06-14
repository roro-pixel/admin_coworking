import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Calendar,
  MessageSquare,
  UserPlus,
  BarChart3,
  Trash2,
} from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskCard,
  TaskRecurrence,
} from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { AgentAutocomplete } from "../../components/auth/AgentAutocomplete";
import { TaskSourceAutocomplete } from "../../components/tasks/TaskSourceAutocomplete";
import type { AdminUser } from "../../services/auth.service";

const activeStatuses: Exclude<TaskStatus, "ARCHIVED">[] = [
  "OPEN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];
const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  OPEN: { label: "À faire", color: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Terminée", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-700" },
  ARCHIVED: { label: "Archivée", color: "bg-gray-100 text-gray-500" },
};
const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  LOW: { label: "Faible", color: "bg-gray-100 text-gray-600" },
  MEDIUM: { label: "Moyen", color: "bg-blue-100 text-blue-700" },
  HIGH: { label: "Élevé", color: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Urgent", color: "bg-red-100 text-red-700" },
};
const recurrenceOptions: TaskRecurrence[] = [
  "NONE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "AFTER_BOOKING",
];

type SubTab = "board" | "my" | "today" | "metrics" | "create";

export const TaskMaster: React.FC = () => {
  const { admin } = useAuth();
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
  const [page, setPage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [selectedAssignAgent, setSelectedAssignAgent] =
    useState<AdminUser | null>(null);
  const [selectedCreateAgent, setSelectedCreateAgent] =
    useState<AdminUser | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [checklistItems, setChecklistItems] = useState<
    { label: string; completed: boolean }[]
  >([]);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "MEDIUM" as TaskPriority,
    dueAt: "",
    sourceType: "",
    sourceCode: "",
    recurrence: "NONE" as TaskRecurrence,
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
      title: "",
      description: "",
      assignedTo: "",
      priority: "MEDIUM",
      dueAt: "",
      sourceType: "",
      sourceCode: "",
      recurrence: "NONE",
    });
    setChecklistItems([]);
    setSelectedCreateAgent(null);
  }, [activeTab]);

  const switchTab = (tab: SubTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
    setActionError(null);
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

  const myTasks = myTasksData?.content || [];
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
      switchTab("board");
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur création tâche"),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      operationsService.updateTaskStatus(id, status),
    onSuccess: invalidate,
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur changement statut"),
  });
  const completeMutation = useMutation({
    mutationFn: (id: number) => operationsService.completeTask(id),
    onSuccess: invalidate,
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur finalisation tâche"),
  });
  const archiveMutation = useMutation({
    mutationFn: (id: number) => operationsService.archiveTask(id),
    onSuccess: invalidate,
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur archivage tâche"),
  });
  const assignMutation = useMutation({
    mutationFn: ({
      id,
      assignedTo,
    }: {
      id: number;
      assignedTo: number | null;
    }) => operationsService.assignTask(id, assignedTo),
    onSuccess: () => {
      setAssignTo("");
      setSelectedAssignAgent(null);
      invalidate();
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur assignation"),
  });
  const commentMutation = useMutation({
    mutationFn: () =>
      operationsService.addTaskComment(selectedTask!.id, {
        authorId: admin?.email || "admin",
        authorName: admin?.email || "Admin",
        comment,
      }),
    onSuccess: () => {
      refetchDetail();
      setComment("");
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur ajout commentaire"),
  });
  const addChecklistMutation = useMutation({
    mutationFn: () =>
      operationsService.addTaskChecklistItem(selectedTask!.id, {
        label: newChecklistItem,
        completed: false,
        displayOrder: (currentTask?.checklist?.length || 0) + 1,
      }),
    onSuccess: () => {
      setNewChecklistItem("");
      refetchDetail();
      invalidate();
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur ajout checklist"),
  });
  const toggleChecklistMutation = useMutation({
    mutationFn: ({
      itemId,
      completed,
      label,
      displayOrder,
    }: {
      itemId: number;
      completed: boolean;
      label: string;
      displayOrder: number;
    }) =>
      operationsService.updateTaskChecklistItem(selectedTask!.id, itemId, {
        completed,
        label,
        displayOrder,
      }),
    onSuccess: () => {
      refetchDetail();
      invalidate();
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message || "Erreur mise à jour checklist",
      ),
  });
  const deleteChecklistMutation = useMutation({
    mutationFn: (itemId: number) =>
      operationsService.deleteTaskChecklistItem(selectedTask!.id, itemId),
    onSuccess: () => {
      refetchDetail();
      invalidate();
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message || "Erreur suppression checklist",
      ),
  });

  const tabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: "board", label: "Kanban", icon: ClipboardList },
    {
      id: "today",
      label: `Aujourd'hui (${todayTasks.length})`,
      icon: Calendar,
    },
    { id: "my", label: "Liste", icon: ClipboardList },
    { id: "metrics", label: "Métriques", icon: BarChart3 },
    { id: "create", label: "Nouvelle tâche", icon: Plus },
  ];

  return (
    <div>
      <div className="overflow-x-auto mb-6 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5 ${activeTab === tab.id ? "bg-primary-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
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
          <TaskFilters
            search={search}
            setSearch={setSearch}
            assignedToFilter={assignedToFilter}
            setAssignedToFilter={setAssignedToFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            sourceTypeFilter={sourceTypeFilter}
            setSourceTypeFilter={setSourceTypeFilter}
          />
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Metric label="Total" value={metrics.totalTasks} />
              <Metric label="Ouvertes" value={metrics.openTasks} />
              <Metric
                label="En retard"
                value={metrics.overdueTasks}
                color="text-red-600"
              />
              <Metric
                label="Taux complétion"
                value={`${Number(metrics.completionRate ?? 0).toFixed(1)}%`}
                color="text-green-600"
              />
            </div>
          )}
          {boardLoading ? (
            <div className="py-12 text-center">Chargement...</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {activeStatuses.map((status) => {
                const col = boardData?.columns?.find(
                  (c) => c.status === status,
                );
                return (
                  <div key={status} className="flex-shrink-0 w-80">
                    <div
                      className={`px-3 py-2 rounded-xl font-medium text-sm ${statusConfig[status].color}`}
                    >
                      {statusConfig[status].label} ({col?.count ?? 0})
                    </div>
                    <div className="space-y-2 bg-gray-50 rounded-b-lg p-2 min-h-32">
                      {(col?.cards || []).map((card) => (
                        <TaskCardView
                          key={card.id}
                          card={card}
                          onOpen={() => {
                            setSelectedTask(card as any);
                            setIsDetailOpen(true);
                          }}
                          onMove={(target) =>
                            statusMutation.mutate({
                              id: card.id,
                              status: target,
                            })
                          }
                        />
                      ))}
                      {(!col?.cards || col.cards.length === 0) && (
                        <p className="text-xs text-gray-400 p-3">
                          Aucune tâche
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "today" && (
        <TaskSimpleList
          tasks={todayTasks}
          loading={todayLoading}
          open={(t) => {
            setSelectedTask(t);
            setIsDetailOpen(true);
          }}
        />
      )}

      {activeTab === "my" && (
        <div className="space-y-4">
          <TaskFilters
            search={search}
            setSearch={setSearch}
            assignedToFilter={assignedToFilter}
            setAssignedToFilter={setAssignedToFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            sourceTypeFilter={sourceTypeFilter}
            setSourceTypeFilter={setSourceTypeFilter}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            <option value="">Statut actif</option>
            <option value="OPEN">À faire</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="COMPLETED">Terminée</option>
            <option value="CANCELLED">Annulée</option>
            <option value="ARCHIVED">Archivée</option>
          </select>
          <TaskSimpleList
            tasks={myTasks}
            loading={myLoading}
            open={(t) => {
              setSelectedTask(t);
              setIsDetailOpen(true);
            }}
          />
          {totalPages > 1 && (
            <Pagination page={page} setPage={setPage} totalPages={totalPages} />
          )}
        </div>
      )}

      {activeTab === "metrics" && (
        <div>
          {metricsLoading ? (
            <div>Chargement...</div>
          ) : (
            metrics && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Metric label="Total" value={metrics.totalTasks} />
                  <Metric label="Ouvertes" value={metrics.openTasks} />
                  <Metric label="En cours" value={metrics.inProgressTasks} />
                  <Metric
                    label="Terminées"
                    value={metrics.completedTasks}
                    color="text-green-600"
                  />
                  <Metric label="Annulées" value={metrics.cancelledTasks} />
                  <Metric label="Archivées" value={metrics.archivedTasks} />
                  <Metric
                    label="En retard"
                    value={metrics.overdueTasks}
                    color="text-red-600"
                  />
                  <Metric
                    label="Durée moy."
                    value={`${Number(metrics.avgCompletionHours ?? 0).toFixed(1)} h`}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Breakdown title="Par priorité" data={metrics.byPriority} />
                  <Breakdown title="Par source" data={metrics.bySourceType} />
                </div>
              </div>
            )
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-4xl space-y-4">
          <TaskCreateForm
            form={createForm}
            setForm={setCreateForm}
            checklistItems={checklistItems}
            setChecklistItems={setChecklistItems}
            selectedAgent={selectedCreateAgent}
            setSelectedAgent={setSelectedCreateAgent}
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={!createForm.title || createMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
          >
            Créer la tâche
          </button>
        </div>
      )}

      {isDetailOpen && currentTask && (
        <ModalPortal onClose={() => setIsDetailOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-start rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">{currentTask.title}</h3>
              <p className="text-sm text-gray-500">#{currentTask.id}</p>
            </div>
            <button onClick={() => setIsDetailOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <span
                className={`px-2 py-1 rounded-full text-xs ${statusConfig[currentTask.status].color}`}
              >
                {statusConfig[currentTask.status].label}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs ${priorityConfig[currentTask.priority].color}`}
              >
                {priorityConfig[currentTask.priority].label}
              </span>
              <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                {currentTask.recurrence}
              </span>
              {currentTask.sourceType && (
                <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                  {currentTask.sourceType} · {currentTask.sourceCode}
                </span>
              )}
            </div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: currentTask.description || "",
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <AgentAutocomplete
                    value={assignTo}
                    selectedAgent={selectedAssignAgent}
                    onValueChange={setAssignTo}
                    onSelect={setSelectedAssignAgent}
                    placeholder="Rechercher un agent..."
                  />
                </div>
                <button
                  onClick={() =>
                    assignMutation.mutate({
                      id: currentTask.id,
                      assignedTo: assignTo ? Number(assignTo) : null,
                    })
                  }
                  className="px-3 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-1"
                >
                  <UserPlus size={15} /> Assigner
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {activeStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      statusMutation.mutate({ id: currentTask.id, status: s })
                    }
                    className="px-2 py-1 border rounded text-xs"
                  >
                    {statusConfig[s].label}
                  </button>
                ))}
                <button
                  onClick={() => completeMutation.mutate(currentTask.id)}
                  className="px-2 py-1 border rounded text-xs"
                >
                  Terminer
                </button>
                <button
                  onClick={() => archiveMutation.mutate(currentTask.id)}
                  className="px-2 py-1 border rounded text-xs"
                >
                  Archiver
                </button>
              </div>
            </div>
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Checklist</h4>
                <span className="text-xs text-gray-500">
                  {
                    (currentTask.checklist || []).filter((i) => i.completed)
                      .length
                  }{" "}
                  / {(currentTask.checklist || []).length}
                </span>
              </div>
              <div className="space-y-2">
                {(currentTask.checklist || []).map((item) => (
                  <div
                    key={item.id || item.displayOrder}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={(e) =>
                        item.id &&
                        toggleChecklistMutation.mutate({
                          itemId: item.id,
                          completed: e.target.checked,
                          label: item.label,
                          displayOrder: item.displayOrder,
                        })
                      }
                    />
                    <span
                      className={
                        item.completed ? "line-through text-gray-400" : ""
                      }
                    >
                      {item.label}
                    </span>
                    {item.id && (
                      <button
                        onClick={() => deleteChecklistMutation.mutate(item.id!)}
                        className="ml-auto text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {(!currentTask.checklist ||
                  currentTask.checklist.length === 0) && (
                  <p className="text-sm text-gray-500">Aucun item.</p>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Nouvel item"
                  className="flex-1 px-3 py-2 border rounded-lg"
                />
                <button
                  onClick={() =>
                    newChecklistItem.trim() && addChecklistMutation.mutate()
                  }
                  className="px-3 py-2 bg-primary-600 text-white rounded-lg"
                >
                  Ajouter
                </button>
              </div>
            </div>
            <div className="border rounded-xl p-4 space-y-3">
              <h4 className="font-semibold">Commentaires</h4>
              <div className="space-y-2">
                {(currentTask.comments || []).map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">
                      {c.authorName} ·{" "}
                      {new Date(c.createdAt).toLocaleString("fr-FR")}
                    </p>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: c.comment }}
                    />
                  </div>
                ))}
              </div>
              <RichTextEditor
                value={comment}
                onChange={setComment}
                minHeight="90px"
              />
              <button
                onClick={() => commentMutation.mutate()}
                disabled={!comment.trim()}
                className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <MessageSquare size={14} className="inline mr-1" /> Commenter
              </button>
            </div>
          </div>
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
  value: string | number;
  color?: string;
}) => (
  <div className="bg-white rounded-xl p-4 shadow-sm">
    <p className={`text-xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);
const TaskFilters = ({
  search,
  setSearch,
  assignedToFilter,
  setAssignedToFilter,
  priorityFilter,
  setPriorityFilter,
  sourceTypeFilter,
  setSourceTypeFilter,
}: any) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher..."
        className="w-full pl-9 pr-3 py-2 border rounded-lg"
      />
    </div>
    <AgentAutocomplete
      value={assignedToFilter}
      onValueChange={setAssignedToFilter}
      onSelect={() => undefined}
      placeholder="Filtrer par agent..."
    />
    <select
      value={priorityFilter}
      onChange={(e) => setPriorityFilter(e.target.value)}
      className="px-3 py-2 border rounded-lg bg-white"
    >
      <option value="">Toutes priorités</option>
      <option value="LOW">Faible</option>
      <option value="MEDIUM">Moyenne</option>
      <option value="HIGH">Élevée</option>
      <option value="URGENT">Urgente</option>
    </select>
    <select
      value={sourceTypeFilter}
      onChange={(e) => setSourceTypeFilter(e.target.value)}
      className="px-3 py-2 border rounded-lg bg-white"
    >
      <option value="">Toutes sources</option>
      <option value="CRM_LEAD">CRM lead</option>
      <option value="BOOKING">Booking</option>
      <option value="INVENTORY">Inventory</option>
    </select>
  </div>
);
const TaskCardView = ({
  card,
  onOpen,
  onMove,
}: {
  card: TaskCard;
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
}) => (
  <div className="bg-white rounded-lg p-3 shadow-sm">
    <div onClick={onOpen} className="cursor-pointer">
      <div className="flex justify-between gap-2">
        <p className="font-medium text-sm line-clamp-2">{card.title}</p>
        <span
          className={`px-1.5 py-0.5 rounded text-xs ${priorityConfig[card.priority].color}`}
        >
          {priorityConfig[card.priority].label}
        </span>
      </div>
      {card.dueAt && (
        <p
          className={`text-xs mt-2 ${card.overdue ? "text-red-600" : "text-gray-500"}`}
        >
          {new Date(card.dueAt).toLocaleString("fr-FR")}
        </p>
      )}
      {card.sourceType && (
        <p className="text-xs mt-1 text-blue-600">
          {card.sourceType} · {card.sourceCode}
        </p>
      )}
      <div className="flex gap-2 text-xs text-gray-500 mt-2">
        <span>
          {card.checklistDone ?? 0}/{card.checklistTotal ?? 0} checklist
        </span>
        <span>{card.commentCount ?? 0} commentaires</span>
      </div>
    </div>
    <select
      value={card.status}
      onChange={(e) => onMove(e.target.value as TaskStatus)}
      className="mt-2 w-full px-2 py-1 border rounded text-xs bg-white"
    >
      {activeStatuses.map((s) => (
        <option key={s} value={s}>
          {statusConfig[s].label}
        </option>
      ))}
    </select>
  </div>
);
const TaskSimpleList = ({
  tasks,
  loading,
  open,
}: {
  tasks: Task[];
  loading?: boolean;
  open: (task: Task) => void;
}) =>
  loading ? (
    <div className="py-12 text-center">Chargement...</div>
  ) : (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <table className="w-full border-separate border-spacing-y-2 text-sm">
        <tbody className="divide-y-0">
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => open(task)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <td className="px-4 py-3">
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-gray-500">
                  {task.sourceType
                    ? `${task.sourceType} · ${task.sourceCode}`
                    : "Source manuelle"}
                </p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${statusConfig[task.status].color}`}
                >
                  {statusConfig[task.status].label}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${priorityConfig[task.priority].color}`}
                >
                  {priorityConfig[task.priority].label}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {task.dueAt
                  ? new Date(task.dueAt).toLocaleDateString("fr-FR")
                  : "—"}
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={4} className="py-12 text-center text-gray-500">
                Aucune tâche.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
const TaskCreateForm = ({
  form,
  setForm,
  checklistItems,
  setChecklistItems,
  selectedAgent,
  setSelectedAgent,
}: any) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input
        value={form.title}
        onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))}
        placeholder="Titre *"
        className="px-3 py-2 border rounded-lg"
      />
      <AgentAutocomplete
        value={form.assignedTo}
        selectedAgent={selectedAgent}
        onValueChange={(value) =>
          setForm((f: any) => ({ ...f, assignedTo: value }))
        }
        onSelect={setSelectedAgent}
        placeholder="Assigner à un agent..."
      />
      <select
        value={form.priority}
        onChange={(e) =>
          setForm((f: any) => ({
            ...f,
            priority: e.target.value as TaskPriority,
          }))
        }
        className="px-3 py-2 border rounded-lg bg-white"
      >
        <option value="LOW">Faible</option>
        <option value="MEDIUM">Moyenne</option>
        <option value="HIGH">Élevée</option>
        <option value="URGENT">Urgente</option>
      </select>
      <input
        type="datetime-local"
        value={form.dueAt}
        onChange={(e) => setForm((f: any) => ({ ...f, dueAt: e.target.value }))}
        className="px-3 py-2 border rounded-lg"
      />
      <select
        value={form.sourceType}
        onChange={(e) =>
          setForm((f: any) => ({
            ...f,
            sourceType: e.target.value,
            sourceCode: "",
          }))
        }
        className="px-3 py-2 border rounded-lg bg-white"
      >
        <option value="">Source manuelle</option>
        <option value="CRM_LEAD">CRM lead</option>
        <option value="BOOKING">Booking</option>
        <option value="INVENTORY">Inventory</option>
      </select>
      <TaskSourceAutocomplete
        sourceType={form.sourceType}
        value={form.sourceCode}
        onChange={(sourceCode) => setForm((f: any) => ({ ...f, sourceCode }))}
      />
      <select
        value={form.recurrence}
        onChange={(e) =>
          setForm((f: any) => ({
            ...f,
            recurrence: e.target.value as TaskRecurrence,
          }))
        }
        className="px-3 py-2 border rounded-lg bg-white"
      >
        {recurrenceOptions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
    <RichTextEditor
      value={form.description}
      onChange={(v: string) => setForm((f: any) => ({ ...f, description: v }))}
      minHeight="120px"
    />
    <div className="border rounded-xl p-4">
      <h4 className="font-semibold mb-3">Checklist initiale</h4>
      {checklistItems.map((item: any, i: number) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            value={item.label}
            onChange={(e) => {
              const arr = [...checklistItems];
              arr[i] = { ...arr[i], label: e.target.value };
              setChecklistItems(arr);
            }}
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            onClick={() =>
              setChecklistItems(
                checklistItems.filter((_: any, idx: number) => idx !== i),
              )
            }
            className="px-3 py-2 border rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          setChecklistItems([
            ...checklistItems,
            { label: "", completed: false },
          ])
        }
        className="text-primary-600 text-sm flex items-center gap-1"
      >
        <Plus size={14} /> Ajouter un item
      </button>
    </div>
  </div>
);
