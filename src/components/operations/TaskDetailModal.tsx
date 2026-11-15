import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, UserPlus, Trash2, MessageSquare, ListChecks, Archive, CheckCheck, Plus } from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type { Task, TaskStatus } from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";
import { brandVars } from "../layout/adminTheme";
import { ModalPortal } from "../ui/ModalPortal";
import { RichTextEditor } from "../ui/RichTextEditor";
import { AgentAutocomplete } from "../auth/AgentAutocomplete";
import type { AdminUser } from "../../services/auth.service";
import { Dots } from "../ui/Toaster";
import { toast } from "../ui/toastStore";
import { ActionButton, IconButton, StatusChip, Tag } from "../subscription/kit";
import { FIELD, FOCUS, PINK_SOFT, apiMessage, formatDateTime } from "../subscription/kitUtils";
import { statusOf } from "../subscription/labels";
import { Avatar, RichHtml } from "./opsKit";
import {
  ACTIVE_TASK_STATUSES,
  PRIORITY_STYLE,
  RECURRENCE_LABELS,
  SOURCE_TYPE_LABELS,
  TASK_STATUS,
} from "./opsLabels";

export const TaskDetailModal: React.FC<{
  task: Task;
  onClose: () => void;
  onStatus: (status: TaskStatus) => void;
  statusBusy: TaskStatus | null;
  /** Rafraîchit la fiche et les listes (invalidate du parent) */
  onChanged: () => void;
  refetch: () => void;
}> = ({ task, onClose, onStatus, statusBusy, onChanged, refetch }) => {
  const { admin } = useAuth();
  const [comment, setComment] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [selectedAssignAgent, setSelectedAssignAgent] = useState<AdminUser | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const completeMutation = useMutation({
    mutationFn: (id: number) => operationsService.completeTask(id),
    onSuccess: () => {
      onChanged();
      toast.success("Tâche terminée");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur finalisation tâche")),
  });
  const archiveMutation = useMutation({
    mutationFn: (id: number) => operationsService.archiveTask(id),
    onSuccess: onChanged,
  });
  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo }: { id: number; assignedTo: number | null }) =>
      operationsService.assignTask(id, assignedTo),
    onSuccess: () => {
      setAssignTo("");
      setSelectedAssignAgent(null);
      onChanged();
      toast.success("Tâche assignée");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur assignation")),
  });
  const commentMutation = useMutation({
    mutationFn: () =>
      operationsService.addTaskComment(task.id, {
        authorId: admin?.email || "admin",
        authorName: admin?.email || "Admin",
        comment,
      }),
    onSuccess: () => {
      refetch();
      setComment("");
      toast.success("Commentaire ajouté");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur ajout commentaire")),
  });
  const addChecklistMutation = useMutation({
    mutationFn: () =>
      operationsService.addTaskChecklistItem(task.id, {
        label: newChecklistItem,
        completed: false,
        displayOrder: (task.checklist?.length || 0) + 1,
      }),
    onSuccess: () => {
      setNewChecklistItem("");
      onChanged();
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur ajout checklist")),
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
      operationsService.updateTaskChecklistItem(task.id, itemId, {
        completed,
        label,
        displayOrder,
      }),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(apiMessage(e, "Erreur mise à jour checklist")),
  });
  const deleteChecklistMutation = useMutation({
    mutationFn: (itemId: number) => operationsService.deleteTaskChecklistItem(task.id, itemId),
    onSuccess: onChanged,
    onError: (e: any) => toast.error(apiMessage(e, "Erreur suppression checklist")),
  });

  const confirmArchive = () =>
    toast.confirm({
      message: `Archiver « ${task.title} » ?`,
      detail: "La tâche quittera le tableau et la liste active.",
      confirmLabel: "Archiver",
      successMessage: "Tâche archivée",
      errorMessage: "Erreur archivage tâche",
      onConfirm: () => archiveMutation.mutateAsync(task.id),
    });

  const status = statusOf(TASK_STATUS, task.status);
  const priority = statusOf(PRIORITY_STYLE, task.priority);
  const checklist = task.checklist || [];
  const done = checklist.filter((i) => i.completed).length;

  return (
    <ModalPortal onClose={onClose} size="3xl">
      <div style={brandVars}>
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-xl font-bold tracking-tight text-gray-950">{task.title}</h3>
            <p className="mt-0.5 font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">#{task.id}</p>
          </div>
          <IconButton icon={X} label="Fermer" tone="neutral" onClick={onClose} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusChip tone={status.tone}>{status.label}</StatusChip>
          <StatusChip tone={priority.tone}>{priority.label}</StatusChip>
          <Tag>{RECURRENCE_LABELS[task.recurrence] ?? task.recurrence}</Tag>
          {task.sourceType && (
            <Tag tone="pink">
              {SOURCE_TYPE_LABELS[task.sourceType] ?? task.sourceType} · {task.sourceCode}
            </Tag>
          )}
        </div>

        {task.description && <RichHtml html={task.description} className="mt-5 rounded-2xl bg-gray-50 p-4" />}

        <div className="mt-5 space-y-4 rounded-2xl bg-gray-50 p-5">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-600">Assigner à un agent</p>
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <AgentAutocomplete
                  value={assignTo}
                  selectedAgent={selectedAssignAgent}
                  onValueChange={setAssignTo}
                  onSelect={setSelectedAssignAgent}
                  placeholder="Rechercher un agent..."
                />
              </div>
              <ActionButton
                icon={UserPlus}
                pending={assignMutation.isPending}
                onClick={() =>
                  assignMutation.mutate({ id: task.id, assignedTo: assignTo ? Number(assignTo) : null })
                }
              >
                Assigner
              </ActionButton>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-600">Statut</p>
            <div className="flex flex-wrap gap-2">
              {ACTIVE_TASK_STATUSES.map((s) => {
                const on = task.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={on || statusBusy !== null}
                    onClick={() => onStatus(s)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${FOCUS} ${
                      on
                        ? `${PINK_SOFT} text-[color:var(--logo-pink-dark)]`
                        : "bg-white text-gray-700 shadow-sm hover:bg-gray-100 disabled:opacity-60"
                    }`}
                  >
                    {statusBusy === s ? <Dots /> : TASK_STATUS[s].label}
                  </button>
                );
              })}
              <ActionButton
                variant="ghost"
                icon={CheckCheck}
                className="!py-2"
                pending={completeMutation.isPending}
                onClick={() => completeMutation.mutate(task.id)}
              >
                Terminer
              </ActionButton>
              <ActionButton variant="ghost" icon={Archive} className="!py-2" onClick={confirmArchive}>
                Archiver
              </ActionButton>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-gray-50 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-base font-bold text-gray-950">
              <ListChecks size={18} className="text-[color:var(--logo-pink-dark)]" /> Checklist
            </h4>
            <span className="text-xs font-semibold tabular-nums text-gray-500">
              {done} / {checklist.length}
            </span>
          </div>
          {checklist.length > 0 && (
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-[color:var(--logo-pink)]"
                style={{ width: `${(done / checklist.length) * 100}%` }}
              />
            </div>
          )}
          {checklist.length === 0 ? (
            <p className="py-2 text-sm text-gray-400">Aucun item.</p>
          ) : (
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.id || item.displayOrder} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm">
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
                    className="h-4 w-4 shrink-0 rounded accent-[color:var(--logo-pink-dark)]"
                  />
                  <span className={`min-w-0 flex-1 text-sm ${item.completed ? "text-gray-400 line-through" : "font-semibold text-gray-900"}`}>
                    {item.label}
                  </span>
                  {item.id && (
                    <IconButton
                      icon={Trash2}
                      label="Supprimer l'item"
                      tone="danger"
                      className="!h-8 !w-8"
                      pending={deleteChecklistMutation.isPending && deleteChecklistMutation.variables === item.id}
                      onClick={() => deleteChecklistMutation.mutate(item.id!)}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newChecklistItem.trim()) addChecklistMutation.mutate();
            }}
          >
            <input
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              placeholder="Nouvel item"
              className={FIELD}
            />
            <ActionButton type="submit" icon={Plus} pending={addChecklistMutation.isPending} disabled={!newChecklistItem.trim()}>
              Ajouter
            </ActionButton>
          </form>
        </div>

        <div className="mt-5 space-y-3 rounded-2xl bg-gray-50 p-5">
          <h4 className="flex items-center gap-2 text-base font-bold text-gray-950">
            <MessageSquare size={18} className="text-[color:var(--logo-pink-dark)]" /> Commentaires
          </h4>
          {(task.comments || []).length === 0 && <p className="text-sm text-gray-400">Aucun commentaire.</p>}
          <ul className="space-y-2">
            {(task.comments || []).map((c) => (
              <li key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Avatar size="sm" name={c.authorName} />
                  <span className="text-sm font-semibold text-gray-950">{c.authorName}</span>
                  <span className="ml-auto text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                </div>
                <RichHtml html={c.comment} />
              </li>
            ))}
          </ul>
          <RichTextEditor value={comment} onChange={setComment} minHeight="90px" />
          <div className="flex justify-end">
            <ActionButton
              icon={MessageSquare}
              pending={commentMutation.isPending}
              disabled={!comment.trim()}
              onClick={() => commentMutation.mutate()}
            >
              Commenter
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
