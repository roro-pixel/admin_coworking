import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle, Clock, X, Loader2, ChevronLeft, ChevronRight, AlertTriangle, ClipboardList, Calendar, MessageSquare, UserPlus } from 'lucide-react';
import { operationsService } from '../../services/operations.service';
import type { Task, TaskStatus, TaskPriority } from '../../services/operations.service';
import { useAuth } from '../../contexts/AuthContext';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  OPEN:        { label: 'Ouverte',   color: 'bg-gray-100 text-gray-700' },
  IN_PROGRESS: { label: 'En cours',  color: 'bg-blue-100 text-blue-700' },
  COMPLETED:   { label: 'Terminée',  color: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Annulée',   color: 'bg-red-100 text-red-700' },
};

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  LOW:    { label: 'Faible',  color: 'bg-gray-100 text-gray-600' },
  MEDIUM: { label: 'Moyen',   color: 'bg-blue-100 text-blue-700' },
  HIGH:   { label: 'Élevé',   color: 'bg-orange-100 text-orange-700' },
  URGENT: { label: 'Urgent',  color: 'bg-red-100 text-red-700' },
};

type SubTab = 'board' | 'my' | 'today' | 'create';

export const TaskMaster: React.FC = () => {
  const { admin, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>('board');
  const [visitedTabs, setVisitedTabs] = useState<Set<SubTab>>(new Set(['board']));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [page, setPage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [checklistItems, setChecklistItems] = useState<{ label: string; completed: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const [createForm, setCreateForm] = useState({
    title: '', description: '', priority: 'MEDIUM' as TaskPriority,
    dueAt: '', sourceType: '', sourceCode: '', recurrence: 'NONE' as const,
  });

  const switchTab = (tab: SubTab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
    setActionError(null);
  };

  useEffect(() => {
    if (activeTab !== 'create') return;
    setCreateForm({ title: '', description: '', priority: 'MEDIUM',
      dueAt: '', sourceType: '', sourceCode: '', recurrence: 'NONE' });
    setChecklistItems([]);
  }, [activeTab]);

  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ['tasks-board'],
    queryFn: () => operationsService.getTasks({ size: 200 }),
    enabled: visitedTabs.has('board'),
  });

  const { data: myTasksData, isLoading: myLoading } = useQuery({
    queryKey: ['tasks-my', page, statusFilter],
    queryFn: () => operationsService.getTasks({ status: statusFilter || undefined, page, size: 20 }),
    enabled: visitedTabs.has('my'),
  });

  const { data: todayTasks = [], isLoading: todayLoading } = useQuery({
    queryKey: ['tasks-today'],
    queryFn: () => operationsService.getDueTodayTasks(),
    enabled: visitedTabs.has('today'),
  });

  const { data: taskDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['task-detail', selectedTask?.id],
    queryFn: () => operationsService.getTask(selectedTask!.id),
    enabled: !!selectedTask && isDetailOpen,
  });

  const allBoardTasks = boardData?.content || [];
  const myTasks = myTasksData?.content || [];
  const totalPages = myTasksData?.totalPages ?? 0;
  const currentTask = taskDetail || selectedTask;

  const filteredMy = search
    ? myTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : myTasks;

  const createMutation = useMutation({
    mutationFn: () => operationsService.createTask({
      ...createForm,
      dueAt: createForm.dueAt ? new Date(createForm.dueAt).toISOString() : undefined,
      sourceType: createForm.sourceType || undefined,
      sourceCode: createForm.sourceCode || undefined,
      checklist: checklistItems.map((item, i) => ({ ...item, displayOrder: i + 1 })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-my'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] });
      switchTab('board');
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur création tâche'),
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) => operationsService.completeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-my'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-today'] });
      refetchDetail();
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur finalisation tâche'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo }: { id: number; assignedTo: number }) =>
      operationsService.assignTask(id, assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-board'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-my'] });
      refetchDetail();
    },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur assignation'),
  });

  const commentMutation = useMutation({
    mutationFn: () => operationsService.addTaskComment(selectedTask!.id, {
      authorId: admin?.email || 'admin',
      authorName: admin?.email || 'Admin',
      comment,
    }),
    onSuccess: () => { refetchDetail(); setComment(''); },
    onError: (e: any) => setActionError(e?.response?.data?.message || 'Erreur ajout commentaire'),
  });

  const tabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'board',  label: 'Tableau',              icon: ClipboardList },
    { id: 'today',  label: `Aujourd'hui (${todayTasks.length})`, icon: Calendar },
    { id: 'my',     label: 'Toutes les tâches',    icon: ClipboardList },
    { id: 'create', label: 'Nouvelle tâche',       icon: Plus },
  ];

  return (
    <div>
      {/* Sous-onglets */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => switchTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id ? 'bg-primary-50 text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
          {actionError}<button onClick={() => setActionError(null)} className="ml-2 font-bold">x</button>
        </div>
      )}

      {/* Board Kanban */}
      {activeTab === 'board' && (
        <div>
          {boardLoading ? <div className="text-center py-8">Chargement...</div> : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {(['OPEN', 'IN_PROGRESS', 'COMPLETED'] as TaskStatus[]).map(status => {
                const statusTasks = allBoardTasks.filter(t => t.status === status);
                return (
                  <div key={status} className="flex-shrink-0 w-72">
                    <div className={`px-3 py-2 rounded-t-lg font-medium text-sm ${statusConfig[status].color}`}>
                      {statusConfig[status].label} ({statusTasks.length})
                    </div>
                    <div className="space-y-2 bg-gray-50 rounded-b-lg p-2 min-h-24">
                      {statusTasks.map(task => (
                        <div key={task.id}
                          className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm line-clamp-2">{task.title}</p>
                            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-xs ${priorityConfig[task.priority]?.color}`}>
                              {priorityConfig[task.priority]?.label}
                            </span>
                          </div>
                          {task.dueAt && (
                            <p className={`text-xs mt-2 flex items-center gap-1 ${
                              new Date(task.dueAt) < new Date() && task.status !== 'COMPLETED'
                                ? 'text-red-500' : 'text-gray-400'
                            }`}>
                              <Clock size={11} />
                              {new Date(task.dueAt).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                          {task.checklist?.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {task.checklist.filter(c => c.completed).length}/{task.checklist.length} <CheckCircle size={10} />
                            </p>
                          )}
                          {task.sourceCode && (
                            <p className="text-xs text-gray-400 font-mono mt-1">{task.sourceType}: {task.sourceCode}</p>
                          )}
                          {status !== 'COMPLETED' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); completeMutation.mutate(task.id); }}
                              disabled={completeMutation.isPending}
                              className="mt-2 w-full text-xs border border-green-300 text-green-600 py-1 rounded hover:bg-green-50 disabled:opacity-50 flex items-center justify-center gap-1">
                              <CheckCircle size={11} /> Terminer
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Aujourd'hui */}
      {activeTab === 'today' && (
        <div>
          {todayLoading ? <div className="text-center py-8">Chargement...</div> : (
            <div>
              {todayTasks.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl">
                  <CheckCircle size={48} className="mx-auto text-green-300 mb-4" />
                  <p className="text-gray-500">Aucune tâche due aujourd'hui</p>
                </div>
              )}
              <div className="space-y-3">
                {todayTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md"
                    onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${priorityConfig[task.priority]?.color}`}>
                          {priorityConfig[task.priority]?.label}
                        </span>
                        <p className="font-medium text-sm">{task.title}</p>
                      </div>
                      {task.dueAt && <p className="text-xs text-red-500 mt-1"><AlertTriangle size={11} className="inline mr-1" />Dû le {new Date(task.dueAt).toLocaleString('fr-FR')}</p>}
                    </div>
                    {task.status !== 'COMPLETED' && (
                      <button onClick={(e) => { e.stopPropagation(); completeMutation.mutate(task.id); }}
                        disabled={completeMutation.isPending}
                        className="ml-3 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                        <CheckCircle size={11} /> Terminer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toutes les tâches */}
      {activeTab === 'my' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-48 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Rechercher..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
              <option value="">Tous les statuts</option>
              {(Object.keys(statusConfig) as TaskStatus[]).map(s => (
                <option key={s} value={s}>{statusConfig[s].label}</option>
              ))}
            </select>
          </div>
          {myLoading ? <div className="text-center py-8">Chargement...</div> : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Titre</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Priorité</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Échéance</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMy.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}>
                      <td className="px-4 py-3 text-sm font-medium">{task.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${priorityConfig[task.priority]?.color}`}>
                          {priorityConfig[task.priority]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[task.status]?.color}`}>
                          {statusConfig[task.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {task.dueAt ? new Date(task.dueAt).toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {task.sourceCode ? `${task.sourceType}: ${task.sourceCode}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMy.length === 0 && <div className="text-center py-12 text-gray-500">Aucune tâche trouvée</div>}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-2 border rounded-lg disabled:opacity-50"><ChevronLeft size={16} /></button>
              <span className="px-3 py-2 text-sm text-gray-600">Page {page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-2 border rounded-lg disabled:opacity-50"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      )}

      {/* Création tâche */}
      {activeTab === 'create' && (
        <div className="max-w-lg mx-auto bg-white rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">Nouvelle tâche</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input type="text" value={createForm.title}
              onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <RichTextEditor
              value={createForm.description}
              onChange={(val) => setCreateForm(f => ({ ...f, description: val }))}
              placeholder="Description de la tâche..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <select value={createForm.priority}
                onChange={(e) => setCreateForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                {(Object.keys(priorityConfig) as TaskPriority[]).map(p =>
                  <option key={p} value={p}>{priorityConfig[p].label}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Récurrence</label>
              <select value={createForm.recurrence}
                onChange={(e) => setCreateForm(f => ({ ...f, recurrence: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white">
                {['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'AFTER_BOOKING'].map(r =>
                  <option key={r} value={r}>{r}</option>
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Échéance</label>
            <input type="datetime-local" value={createForm.dueAt}
              onChange={(e) => setCreateForm(f => ({ ...f, dueAt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type source</label>
              <input type="text" value={createForm.sourceType}
                onChange={(e) => setCreateForm(f => ({ ...f, sourceType: e.target.value }))}
                placeholder="BOOKING, INVOICE..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code source</label>
              <input type="text" value={createForm.sourceCode}
                onChange={(e) => setCreateForm(f => ({ ...f, sourceCode: e.target.value }))}
                placeholder="BKG-000001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
            </div>
          </div>
          {/* Checklist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Checklist</label>
            <div className="space-y-1 mb-2">
              {checklistItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-sm flex-1">{item.label}</span>
                  <button onClick={() => setChecklistItems(prev => prev.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 font-bold">x</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newChecklistItem.trim()) {
                  setChecklistItems(prev => [...prev, { label: newChecklistItem.trim(), completed: false }]);
                  setNewChecklistItem('');
                }}}
                placeholder="Ajouter un item (Entrée pour valider)"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <button onClick={() => { if (newChecklistItem.trim()) {
                  setChecklistItems(prev => [...prev, { label: newChecklistItem.trim(), completed: false }]);
                  setNewChecklistItem('');
                }}}
                className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">+</button>
            </div>
          </div>
          <button onClick={() => createMutation.mutate()}
            disabled={!createForm.title || createMutation.isPending}
            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Créer la tâche
          </button>
        </div>
      )}

      {/* Modal Détail tâche */}
      {isDetailOpen && currentTask && (
        <ModalPortal onClose={() => { setIsDetailOpen(false); setSelectedTask(null); }} size="2xl">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">{currentTask.title}</h3>
              <div className="flex gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs ${priorityConfig[currentTask.priority]?.color}`}>
                  {priorityConfig[currentTask.priority]?.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[currentTask.status]?.color}`}>
                  {statusConfig[currentTask.status]?.label}
                </span>
              </div>
            </div>
            <button onClick={() => { setIsDetailOpen(false); setSelectedTask(null); }}
              className="p-1 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
          </div>
          <div className="overflow-y-auto max-h-[80vh] p-6 space-y-4">
            {actionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
                {actionError}<button onClick={() => setActionError(null)} className="ml-2 font-bold">x</button>
              </div>
            )}

            {currentTask.description && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Description</p>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: currentTask.description }} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {currentTask.dueAt && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Échéance</p>
                  <p className={`text-sm font-medium ${new Date(currentTask.dueAt) < new Date() && currentTask.status !== 'COMPLETED' ? 'text-red-600' : ''}`}>
                    {new Date(currentTask.dueAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}
              {currentTask.sourceCode && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Source</p>
                  <p className="text-sm font-mono">{currentTask.sourceType}: {currentTask.sourceCode}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {currentTask.status !== 'COMPLETED' && (
                <button onClick={() => completeMutation.mutate(currentTask.id)}
                  disabled={completeMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                  {completeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Marquer terminée
                </button>
              )}
              {hasPermission('TASK:ASSIGN') && currentTask.status !== 'COMPLETED' && (
                <button
                  onClick={() => {
                    const userId = prompt('ID de l\'utilisateur à assigner :');
                    if (userId) assignMutation.mutate({ id: currentTask.id, assignedTo: Number(userId) });
                  }}
                  disabled={assignMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                  {assignMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Assigner
                </button>
              )}
            </div>

            {/* Checklist */}
            {currentTask.checklist?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Checklist ({currentTask.checklist.filter(c => c.completed).length}/{currentTask.checklist.length})
                </h4>
                <div className="space-y-1">
                  {currentTask.checklist.map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded ${item.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <span className={item.completed ? 'text-green-500' : 'text-gray-400'}>
                        {item.completed ? <CheckCircle size={14} /> : <Clock size={14} />}
                      </span>
                      <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : ''}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commentaires */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                <MessageSquare size={14} /> Commentaires ({currentTask.comments?.length || 0})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {(currentTask.comments || []).map(c => (
                  <div key={c.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">{c.authorName}</span>
                      <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: c.comment }} />
                  </div>
                ))}
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ajouter un commentaire</label>
              <RichTextEditor
                value={comment}
                onChange={setComment}
                placeholder="Votre commentaire..."
              />
              <button onClick={() => commentMutation.mutate()}
                disabled={!comment.trim() || commentMutation.isPending}
                className="mt-3 w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {commentMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : (
                  <><MessageSquare size={13} /> Commenter</>
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};