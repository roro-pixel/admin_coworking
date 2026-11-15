import React, { useCallback, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  UserCheck,
  Paperclip,
  Tags,
  History,
  CheckSquare,
  Shuffle,
  Download,
  Trash2,
  X,
  FileText,
  Upload,
  Gauge,
  Info as InfoIcon,
  LifeBuoy,
} from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { operationsService } from "../../services/operations.service";
import type {
  TicketStatus,
  TicketPriority,
} from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { AgentAutocomplete } from "../../components/auth/AgentAutocomplete";
import type { AdminUser } from "../../services/auth.service";
import { useTicketRealtime } from "../../hooks/useTicketRealtime";
import {
  ActionButton,
  CheckField,
  Detail,
  EmptyState,
  Field,
  IconButton,
  ItemRow,
  PageHeader,
  PanelForm,
  Section,
  StatusChip,
  Tag,
  Tabs,
} from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, FOCUS, PINK_SOFT, apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { Dots, Toaster } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { Avatar, PillChoice, RichHtml } from "../../components/operations/opsKit";
import {
  OWNER_TYPE_LABELS,
  PRIORITY_STYLE,
  TICKET_CATEGORY,
  TICKET_STATUS,
  nextTicketStatuses,
} from "../../components/operations/opsLabels";

const ticketStatusOptions: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CLIENT",
  "RESOLVED",
  "CLOSED",
];

const priorityOptions = (Object.keys(PRIORITY_STYLE) as TicketPriority[]).map((p) => ({
  value: p,
  label: PRIORITY_STYLE[p].label,
}));

type DetailTab = "conversation" | "timeline" | "attachments" | "tags" | "task";

const detailTabs: TabItem<DetailTab>[] = [
  { id: "conversation", label: "Conversation", icon: Send },
  { id: "timeline", label: "Chronologie", icon: History },
  { id: "attachments", label: "Pièces jointes", icon: Paperclip },
  { id: "tags", label: "Tags", icon: Tags },
  { id: "task", label: "Tâche", icon: CheckSquare },
];

const DOT: Record<string, string> = {
  success: "bg-emerald-500",
  warn: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-gray-400",
  info: "bg-sky-500",
  pink: "bg-[color:var(--logo-pink-dark)]",
};

export const TicketDetailPage: React.FC = () => {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("conversation");
  const [messageContent, setMessageContent] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AdminUser | null>(null);
  const [randomAgents, setRandomAgents] = useState("");
  const [newTag, setNewTag] = useState("");
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "MEDIUM" as TicketPriority,
    dueAt: "",
  });
  const [selectedTaskAgent, setSelectedTaskAgent] = useState<AdminUser | null>(
    null,
  );
  const [attachmentInternal, setAttachmentInternal] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const {
    data: ticket,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["support-ticket", ticketNumber],
    queryFn: () => operationsService.getTicket(ticketNumber!),
    enabled: !!ticketNumber,
  });
  const { data: timeline = [], refetch: refetchTimeline } = useQuery({
    queryKey: ["support-ticket-timeline", ticketNumber],
    queryFn: () => operationsService.getTicketTimeline(ticketNumber!),
    enabled: !!ticketNumber && activeTab === "timeline",
  });
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ["support-ticket-attachments", ticketNumber],
    queryFn: () => operationsService.getTicketAttachments(ticketNumber!),
    enabled: !!ticketNumber && activeTab === "attachments",
  });
  const { data: ownerSummary } = useQuery({
    queryKey: ["support-owner-summary", ticket?.ownerType, ticket?.ownerCode],
    queryFn: () =>
      operationsService.getTicketOwnerSummary({
        ownerType: ticket!.ownerType!,
        ownerCode: ticket!.ownerCode!,
      }),
    enabled: !!ticket?.ownerType && !!ticket?.ownerCode,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["support-ticket", ticketNumber],
    });
    queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["support-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["support-ticket-analytics"] });
    refetch();
  };

  const handleRealtimeTicketMessage = useCallback(() => {
    refetch();
    queryClient.invalidateQueries({
      queryKey: ["support-ticket", ticketNumber],
    });
    queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
  }, [queryClient, refetch, ticketNumber]);

  useTicketRealtime(ticketNumber, {
    enabled: activeTab === "conversation",
    onMessage: handleRealtimeTicketMessage,
  });

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) =>
      operationsService.updateTicketStatus(ticketNumber!, status),
    onSuccess: () => {
      invalidate();
      refetchTimeline();
      toast.success("Statut mis à jour");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur changement statut du ticket")),
  });

  const assignMutation = useMutation({
    mutationFn: (agent: string) =>
      operationsService.assignTicket(ticketNumber!, agent),
    onSuccess: () => {
      invalidate();
      setAssignedTo("");
      setSelectedAgent(null);
      toast.success("Ticket assigné");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur assignation")),
  });
  const messageMutation = useMutation({
    mutationFn: () =>
      operationsService.addTicketMessage(ticketNumber!, {
        senderType: "AGENT",
        senderId: admin?.email || "admin",
        senderName: admin?.email || "Admin",
        authorId: admin?.email || "admin",
        authorName: admin?.email || "Admin",
        content: messageContent,
        internal: internalNote,
      }),
    onSuccess: () => {
      invalidate();
      setMessageContent("");
      setInternalNote(false);
      toast.success(internalNote ? "Note interne ajoutée" : "Message envoyé");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur envoi message")),
  });
  const tagMutation = useMutation({
    mutationFn: (tag: string) =>
      operationsService.addTicketTag(ticketNumber!, tag),
    onSuccess: () => {
      invalidate();
      setNewTag("");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur ajout tag")),
  });
  const removeTagMutation = useMutation({
    mutationFn: (tag: string) =>
      operationsService.removeTicketTag(ticketNumber!, tag),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(apiMessage(e, "Erreur suppression tag")),
  });
  const uploadMutation = useMutation({
    mutationFn: ({ file }: { file: File }) =>
      operationsService.uploadTicketAttachment(ticketNumber!, file, {
        internal: attachmentInternal,
        uploadedBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      refetchAttachments();
      invalidate();
      toast.success("Pièce jointe ajoutée");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur upload pièce jointe")),
  });
  const deleteAttachmentMutation = useMutation<void, any, number>({
    mutationFn: async (id: number) => {
      await operationsService.deleteTicketAttachment(ticketNumber!, id);
    },
    onSuccess: () => {
      refetchAttachments();
    },
  });
  const taskMutation = useMutation({
    mutationFn: () =>
      operationsService.convertTicketToTask(ticketNumber!, {
        title: taskForm.title,
        description: taskForm.description || undefined,
        assignedTo: taskForm.assignedTo
          ? Number(taskForm.assignedTo)
          : undefined,
        priority: taskForm.priority,
        dueAt: taskForm.dueAt
          ? new Date(taskForm.dueAt).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      setIsTaskOpen(false);
      setTaskForm({
        title: "",
        description: "",
        assignedTo: "",
        priority: "MEDIUM",
        dueAt: "",
      });
      setSelectedTaskAgent(null);
      invalidate();
      refetchTimeline();
      toast.success("Tâche créée depuis le ticket");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur conversion en tâche")),
  });

  const assignRandom = () => {
    const agents = randomAgents
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    if (!agents.length) {
      toast.error("Ajoutez au moins un agent dans la liste.");
      return;
    }
    const pick = agents[Math.floor(Math.random() * agents.length)];
    assignMutation.mutate(pick);
  };

  const downloadAttachment = async (id: number, fileName: string) => {
    setDownloadingId(id);
    try {
      const blob = await operationsService.downloadTicketAttachment(
        ticketNumber!,
        id,
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(apiMessage(e, "Téléchargement impossible"));
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDeleteAttachment = (id: number, fileName: string) =>
    toast.confirm({
      message: `Supprimer « ${fileName} » ?`,
      detail: "La pièce jointe sera retirée du ticket.",
      confirmLabel: "Supprimer",
      successMessage: "Pièce jointe supprimée",
      errorMessage: "Suppression impossible",
      onConfirm: () => deleteAttachmentMutation.mutateAsync(id),
    });

  const shell = (children: React.ReactNode) => (
    <AdminLayout>
      <div style={brandVars}>
        <Toaster />
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </div>
    </AdminLayout>
  );

  if (isLoading) return shell(<DetailsSkeleton />);
  if (!ticket)
    return shell(
      <EmptyState
        icon={LifeBuoy}
        title="Ticket introuvable"
        action={<ActionButton variant="ghost" onClick={() => navigate("/operations")}>Retour aux opérations</ActionButton>}
      />,
    );

  const priority = statusOf(PRIORITY_STYLE, ticket.priority);
  const status = statusOf(TICKET_STATUS, ticket.status);

  return shell(
    <>
      <PageHeader
        title={ticket.title}
        subtitle={<span className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{ticket.ticketNumber}</span>}
        onBack={() => navigate("/operations")}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={priority.tone}>{priority.label}</StatusChip>
            <StatusChip tone={status.tone}>{status.label}</StatusChip>
            <Tag>{TICKET_CATEGORY[ticket.category] ?? ticket.category}</Tag>
            {ticket.escalationLevel ? <StatusChip tone="danger">Escalade N{ticket.escalationLevel}</StatusChip> : null}
          </div>
        }
      />

      <div className="space-y-5">
        <Section title="Traitement" description="Assignation et statut du ticket" icon={UserCheck}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-600">
                  Assigné à : <span className="text-gray-950">{ticket.assignedTo || "personne pour l'instant"}</span>
                </p>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <AgentAutocomplete
                      value={assignedTo}
                      selectedAgent={selectedAgent}
                      onValueChange={setAssignedTo}
                      onSelect={setSelectedAgent}
                      placeholder="Rechercher un agent..."
                    />
                  </div>
                  <ActionButton
                    icon={UserCheck}
                    pending={assignMutation.isPending}
                    disabled={!assignedTo}
                    onClick={() => assignedTo && assignMutation.mutate(assignedTo)}
                  >
                    Assigner
                  </ActionButton>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-600">Tirage au sort entre plusieurs agents</p>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <AgentAutocomplete
                      value={randomAgents}
                      onValueChange={setRandomAgents}
                      onSelect={() => undefined}
                      placeholder="Ajouter un ID agent au tirage..."
                    />
                  </div>
                  <ActionButton variant="ghost" icon={Shuffle} onClick={assignRandom} pending={assignMutation.isPending}>
                    Aléatoire
                  </ActionButton>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Field label="Statut du ticket">
                <select
                  value={ticket.status}
                  onChange={(e) => statusMutation.mutate(e.target.value as TicketStatus)}
                  disabled={statusMutation.isPending}
                  className={FIELD}
                >
                  {ticketStatusOptions.map((s) => (
                    <option key={s} value={s}>
                      {TICKET_STATUS[s]?.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-600">Passer directement à</p>
                <div className="flex flex-wrap gap-2">
                  {nextTicketStatuses(ticket.status).map((s) => {
                    const st = statusOf(TICKET_STATUS, s);
                    const busy = statusMutation.isPending && statusMutation.variables === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => statusMutation.mutate(s as TicketStatus)}
                        disabled={statusMutation.isPending}
                        className={`relative inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS}`}
                      >
                        <span className={`inline-flex items-center gap-2 ${busy ? "invisible" : ""}`}>
                          <span className={`h-2 w-2 rounded-full ${DOT[st.tone]}`} />
                          {st.label}
                        </span>
                        {busy && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Dots />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Informations" icon={InfoIcon}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Propriétaire">
              {ticket.ownerType
                ? `${OWNER_TYPE_LABELS[ticket.ownerType] ?? ticket.ownerType} ${ticket.ownerCode || ""}`
                : undefined}
            </Detail>
            <Detail label="Contact">{ticket.contactName || ticket.contactEmail}</Detail>
            <Detail label="Objet lié">
              {ticket.relatedType ? `${ticket.relatedType} · ${ticket.relatedCode}` : undefined}
            </Detail>
            <Detail label="Première réponse (SLA)">{formatDateTime(ticket.firstResponseDueAt)}</Detail>
            <Detail label="Résolution (SLA)">{formatDateTime(ticket.resolutionDueAt)}</Detail>
            <Detail label="Vue client">
              {ownerSummary ? `${ownerSummary.openTickets} ouverts · ${ownerSummary.resolvedTickets} résolus` : undefined}
            </Detail>
          </div>
        </Section>

        <div className="space-y-4">
          <Tabs variant="soft" items={detailTabs} active={activeTab} onChange={setActiveTab} />

          {activeTab === "conversation" && (
            <Section title="Conversation" icon={Send}>
              <div className="space-y-5">
                <RichHtml html={ticket.description} className="rounded-2xl bg-white p-4 shadow-sm" />
                <ul className="space-y-3">
                  {(ticket.messages || []).map((m: any) => {
                    const author = m.authorName || m.senderName || m.authorId || m.senderType || "Auteur";
                    return (
                      <li
                        key={m.id}
                        className={`rounded-2xl p-4 ${m.internal ? "bg-amber-50" : "bg-white shadow-sm"}`}
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <Avatar size="sm" name={author} />
                          <span className="text-sm font-semibold text-gray-950">{author}</span>
                          {m.internal && <StatusChip tone="warn">Note interne</StatusChip>}
                          <span className="ml-auto text-xs text-gray-400">{formatDateTime(m.createdAt)}</span>
                        </div>
                        <RichHtml html={m.content} />
                      </li>
                    );
                  })}
                </ul>
                <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                  <RichTextEditor
                    value={messageContent}
                    onChange={setMessageContent}
                    placeholder="Écrire une réponse ou une note interne..."
                    minHeight="140px"
                  />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CheckField checked={internalNote} onChange={setInternalNote} label="Note interne" />
                    <ActionButton
                      icon={Send}
                      pending={messageMutation.isPending}
                      disabled={!messageContent.trim()}
                      onClick={() => messageMutation.mutate()}
                    >
                      Envoyer
                    </ActionButton>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {activeTab === "timeline" && (
            <Section title="Chronologie" description="Les événements du ticket, du plus ancien au plus récent" icon={History}>
              {timeline.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Aucun événement.</p>
              ) : (
                <ol className="relative space-y-5 pl-6 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-gray-200">
                  {timeline.map((e: any, i: number) => (
                    <li key={e.id || i} className="relative">
                      <span className="absolute -left-6 top-1.5 h-3 w-3 rounded-full bg-[color:var(--logo-pink-dark)] ring-4 ring-gray-50" />
                      <p className="text-sm font-semibold text-gray-950">{e.eventType}</p>
                      <p className="text-sm text-gray-600">
                        {e.description || `${e.oldValue || ""} ${e.newValue || ""}`}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(e.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          )}

          {activeTab === "attachments" && (
            <Section title="Pièces jointes" icon={Paperclip}>
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    ref={fileInput}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMutation.mutate({ file });
                      e.target.value = "";
                    }}
                  />
                  <ActionButton
                    icon={Upload}
                    pending={uploadMutation.isPending}
                    onClick={() => fileInput.current?.click()}
                  >
                    Ajouter un fichier
                  </ActionButton>
                  <CheckField checked={attachmentInternal} onChange={setAttachmentInternal} label="Réservé à l'équipe (interne)" />
                </div>
                {attachments.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">Aucune pièce jointe.</p>
                ) : (
                  <ul className="space-y-2">
                    {attachments.map((a: any) => (
                      <li key={a.id}>
                        <ItemRow className="flex items-center gap-3">
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}>
                            <FileText size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-gray-950">{a.fileName}</p>
                            <p className="text-xs text-gray-500">{a.contentType || "fichier"}</p>
                          </div>
                          {a.internal && <Tag>Interne</Tag>}
                          <IconButton
                            icon={Download}
                            label="Télécharger"
                            pending={downloadingId === a.id}
                            onClick={() => downloadAttachment(a.id, a.fileName)}
                          />
                          <IconButton
                            icon={Trash2}
                            label="Supprimer"
                            tone="danger"
                            onClick={() => confirmDeleteAttachment(a.id, a.fileName)}
                          />
                        </ItemRow>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>
          )}

          {activeTab === "tags" && (
            <Section title="Tags" description="Mots-clés pour retrouver et regrouper les tickets" icon={Tags}>
              <div className="space-y-4">
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newTag.trim()) tagMutation.mutate(newTag.trim());
                  }}
                >
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Ajouter un tag"
                    className={FIELD}
                  />
                  <ActionButton type="submit" pending={tagMutation.isPending} disabled={!newTag.trim()}>
                    Ajouter
                  </ActionButton>
                </form>
                {!ticket.tags || ticket.tags.length === 0 ? (
                  <p className="py-2 text-center text-sm text-gray-400">Aucun tag.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map((tag: string) => {
                      const busy = removeTagMutation.isPending && removeTagMutation.variables === tag;
                      return (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white py-1.5 pl-3.5 pr-1.5 text-sm font-semibold text-gray-700 shadow-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            aria-label={`Retirer le tag ${tag}`}
                            disabled={busy}
                            onClick={() => removeTagMutation.mutate(tag)}
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600 ${FOCUS}`}
                          >
                            {busy ? <Dots /> : <X size={14} />}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </Section>
          )}

          {activeTab === "task" && (
            <Section title="Tâche liée" description="Transformez ce ticket en tâche à suivre par l'équipe" icon={CheckSquare}>
              {isTaskOpen ? (
                <PanelForm
                  title="Créer une tâche depuis le ticket"
                  submitLabel="Créer la tâche"
                  pending={taskMutation.isPending}
                  submitDisabled={!taskForm.title}
                  onCancel={() => setIsTaskOpen(false)}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (taskForm.title) taskMutation.mutate();
                  }}
                >
                  <Field label="Titre" required>
                    <input
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                      className={FIELD}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                      rows={4}
                      className={`${FIELD} resize-none`}
                    />
                  </Field>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-gray-600">Priorité</p>
                    <PillChoice
                      label="Priorité"
                      options={priorityOptions}
                      value={taskForm.priority}
                      onChange={(priority) => setTaskForm((f) => ({ ...f, priority }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-gray-600">Agent</p>
                      <AgentAutocomplete
                        value={taskForm.assignedTo}
                        selectedAgent={selectedTaskAgent}
                        onValueChange={(value) => setTaskForm((f) => ({ ...f, assignedTo: value }))}
                        onSelect={setSelectedTaskAgent}
                        placeholder="Rechercher un agent..."
                      />
                    </div>
                    <Field label="Échéance">
                      <input
                        type="datetime-local"
                        value={taskForm.dueAt}
                        onChange={(e) => setTaskForm((f) => ({ ...f, dueAt: e.target.value }))}
                        className={FIELD}
                      />
                    </Field>
                  </div>
                </PanelForm>
              ) : (
                <ActionButton
                  icon={Gauge}
                  onClick={() => {
                    setTaskForm({
                      title: `Traiter ${ticket.ticketNumber}`,
                      description: ticket.title,
                      assignedTo: "",
                      priority: ticket.priority,
                      dueAt: "",
                    });
                    setIsTaskOpen(true);
                  }}
                >
                  Convertir le ticket en tâche
                </ActionButton>
              )}
            </Section>
          )}
        </div>
      </div>
    </>,
  );
};
