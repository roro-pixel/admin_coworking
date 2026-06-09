import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Loader2,
  UserCheck,
  ArrowLeft,
  X,
  Paperclip,
  Tags,
  History,
  CheckSquare,
  Shuffle,
} from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { operationsService } from "../../services/operations.service";
import type {
  TicketStatus,
  TicketPriority,
} from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { AgentAutocomplete } from "../../components/auth/AgentAutocomplete";
import type { AdminUser } from "../../services/auth.service";

const statusConfig: Record<TicketStatus, { label: string; color: string }> = {
  OPEN: { label: "Ouvert", color: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "En cours", color: "bg-blue-100 text-blue-700" },
  WAITING_CLIENT: {
    label: "Attente client",
    color: "bg-yellow-100 text-yellow-700",
  },
  RESOLVED: { label: "Résolu", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Fermé", color: "bg-gray-100 text-gray-600" },
};
const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "Faible", color: "bg-gray-100 text-gray-600" },
  MEDIUM: { label: "Moyen", color: "bg-blue-100 text-blue-700" },
  HIGH: { label: "Élevé", color: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Urgent", color: "bg-red-100 text-red-700" },
};
const categoryLabels: Record<string, string> = {
  BILLING: "Facturation",
  BOOKING: "Réservation",
  ACCESS: "Accès",
  TECHNICAL: "Technique",
  OTHER: "Autre",
};

type DetailTab = "conversation" | "timeline" | "attachments" | "tags" | "task";

export const TicketDetailPage: React.FC = () => {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DetailTab>("conversation");
  const [messageContent, setMessageContent] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
    refetch();
  };

  const assignMutation = useMutation({
    mutationFn: (agent: string) =>
      operationsService.assignTicket(ticketNumber!, agent),
    onSuccess: () => {
      invalidate();
      setAssignedTo("");
      setSelectedAgent(null);
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur assignation"),
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
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur envoi message"),
  });
  const tagMutation = useMutation({
    mutationFn: (tag: string) =>
      operationsService.addTicketTag(ticketNumber!, tag),
    onSuccess: () => {
      invalidate();
      setNewTag("");
    },
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur ajout tag"),
  });
  const removeTagMutation = useMutation({
    mutationFn: (tag: string) =>
      operationsService.removeTicketTag(ticketNumber!, tag),
    onSuccess: invalidate,
    onError: (e: any) =>
      setActionError(e?.response?.data?.message || "Erreur suppression tag"),
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
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message || "Erreur upload pièce jointe",
      ),
  });
  const deleteAttachmentMutation = useMutation<void, any, number>({
    mutationFn: async (id: number) => {
      await operationsService.deleteTicketAttachment(ticketNumber!, id);
    },
    onSuccess: () => {
      refetchAttachments();
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message || "Erreur suppression pièce jointe",
      ),
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
    },
    onError: (e: any) =>
      setActionError(
        e?.response?.data?.message || "Erreur conversion en tâche",
      ),
  });

  const assignRandom = () => {
    const agents = randomAgents
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    if (!agents.length) {
      setActionError("Ajoutez au moins un agent dans la liste.");
      return;
    }
    const pick = agents[Math.floor(Math.random() * agents.length)];
    assignMutation.mutate(pick);
  };

  const downloadAttachment = async (id: number, fileName: string) => {
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
  };

  if (isLoading)
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement du ticket...</p>
        </div>
      </AdminLayout>
    );
  if (!ticket)
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500">
          Ticket introuvable
        </div>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={18} /> Retour
      </button>
      <div className="max-w-6xl space-y-6">
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm flex justify-between">
            {actionError}
            <button onClick={() => setActionError(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm">
          <div className="border-b px-6 py-4 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {ticket.title}
              </h2>
              <p className="text-sm text-gray-500 font-mono mt-1">
                {ticket.ticketNumber}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig[ticket.priority]?.color}`}
                >
                  {priorityConfig[ticket.priority]?.label}
                </span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[ticket.status]?.color}`}
                >
                  {statusConfig[ticket.status]?.label}
                </span>
                <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                  {categoryLabels[ticket.category]}
                </span>
                {ticket.escalationLevel ? (
                  <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                    Escalade N{ticket.escalationLevel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="space-y-2 min-w-[280px]">
              <div className="flex gap-2">
                <div className="flex-1">
                  <AgentAutocomplete
                    value={assignedTo}
                    selectedAgent={selectedAgent}
                    onValueChange={setAssignedTo}
                    onSelect={setSelectedAgent}
                    placeholder="Rechercher un agent..."
                  />
                </div>
                <button
                  onClick={() =>
                    assignedTo && assignMutation.mutate(assignedTo)
                  }
                  disabled={!assignedTo || assignMutation.isPending}
                  className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  <UserCheck size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <AgentAutocomplete
                  value={randomAgents}
                  onValueChange={setRandomAgents}
                  onSelect={() => undefined}
                  placeholder="Ajouter un ID agent au tirage..."
                />
                <button
                  onClick={assignRandom}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex items-center gap-1"
                >
                  <Shuffle size={15} /> Aléatoire
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Assigné : {ticket.assignedTo || "non assigné"}
              </p>
            </div>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <Info
              label="Propriétaire"
              value={`${ticket.ownerType || "—"} ${ticket.ownerCode || ""}`}
            />
            <Info
              label="Contact"
              value={ticket.contactName || ticket.contactEmail || "—"}
            />
            <Info
              label="Objet lié"
              value={
                ticket.relatedType
                  ? `${ticket.relatedType} · ${ticket.relatedCode}`
                  : "—"
              }
            />
            <Info
              label="Première réponse SLA"
              value={
                ticket.firstResponseDueAt
                  ? new Date(ticket.firstResponseDueAt).toLocaleString("fr-FR")
                  : "—"
              }
            />
            <Info
              label="Résolution SLA"
              value={
                ticket.resolutionDueAt
                  ? new Date(ticket.resolutionDueAt).toLocaleString("fr-FR")
                  : "—"
              }
            />
            <Info
              label="Client 360"
              value={
                ownerSummary
                  ? `${ownerSummary.openTickets} ouverts · ${ownerSummary.resolvedTickets} résolus`
                  : "—"
              }
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex flex-wrap gap-1 border-b px-4 pt-3">
            <Tab
              id="conversation"
              active={activeTab}
              setActive={setActiveTab}
              label="Conversation"
              icon={Send}
            />
            <Tab
              id="timeline"
              active={activeTab}
              setActive={setActiveTab}
              label="Timeline"
              icon={History}
            />
            <Tab
              id="attachments"
              active={activeTab}
              setActive={setActiveTab}
              label="Pièces jointes"
              icon={Paperclip}
            />
            <Tab
              id="tags"
              active={activeTab}
              setActive={setActiveTab}
              label="Tags"
              icon={Tags}
            />
            <Tab
              id="task"
              active={activeTab}
              setActive={setActiveTab}
              label="Tâche"
              icon={CheckSquare}
            />
          </div>

          {activeTab === "conversation" && (
            <div className="p-6 space-y-5">
              <div
                className="prose max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: ticket.description }}
              />
              <div className="space-y-3">
                {(ticket.messages || []).map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-4 ${m.internal ? "bg-amber-50 border border-amber-100" : "bg-gray-50"}`}
                  >
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>
                        {m.authorName ||
                          m.senderName ||
                          m.authorId ||
                          m.senderType ||
                          "Auteur"}
                      </span>
                      <span>
                        {new Date(m.createdAt).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: m.content }}
                    />
                  </div>
                ))}
              </div>
              <div className="border rounded-xl p-4 space-y-3">
                <RichTextEditor
                  value={messageContent}
                  onChange={setMessageContent}
                  placeholder="Écrire une réponse ou une note interne..."
                  minHeight="140px"
                />
                <div className="flex justify-between items-center">
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={internalNote}
                      onChange={(e) => setInternalNote(e.target.checked)}
                    />{" "}
                    Note interne
                  </label>
                  <button
                    onClick={() => messageMutation.mutate()}
                    disabled={
                      !messageContent.trim() || messageMutation.isPending
                    }
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    <Send size={16} /> Envoyer
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="p-6 space-y-3">
              {timeline.map((e: any, i) => (
                <div key={e.id || i} className="flex gap-3">
                  <div className="mt-1 w-2 h-2 rounded-full bg-primary-600" />
                  <div>
                    <p className="font-medium text-sm">{e.eventType}</p>
                    <p className="text-sm text-gray-500">
                      {e.description ||
                        `${e.oldValue || ""} ${e.newValue || ""}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
              {timeline.length === 0 && (
                <p className="text-gray-500 text-sm">Aucun événement.</p>
              )}
            </div>
          )}

          {activeTab === "attachments" && (
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMutation.mutate({ file });
                  }}
                  className="text-sm"
                />
                <label className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={attachmentInternal}
                    onChange={(e) => setAttachmentInternal(e.target.checked)}
                  />{" "}
                  Interne
                </label>
              </div>
              <div className="space-y-2">
                {attachments.map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{a.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {a.contentType || "fichier"}{" "}
                        {a.internal ? "· interne" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadAttachment(a.id, a.fileName)}
                        className="text-primary-600 text-sm"
                      >
                        Télécharger
                      </button>
                      <button
                        onClick={() => deleteAttachmentMutation.mutate(a.id)}
                        className="text-red-600 text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <p className="text-sm text-gray-500">Aucune pièce jointe.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "tags" && (
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ajouter un tag"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  onClick={() =>
                    newTag.trim() && tagMutation.mutate(newTag.trim())
                  }
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
                >
                  Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(ticket.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
                  >
                    {tag}
                    <button onClick={() => removeTagMutation.mutate(tag)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {(!ticket.tags || ticket.tags.length === 0) && (
                  <p className="text-sm text-gray-500">Aucun tag.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "task" && (
            <div className="p-6">
              <button
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
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <CheckSquare size={16} /> Convertir le ticket en tâche
              </button>
            </div>
          )}
        </div>
      </div>

      {isTaskOpen && (
        <ModalPortal onClose={() => setIsTaskOpen(false)}>
          <div className="p-5 border-b flex justify-between">
            <h3 className="font-bold text-lg">
              Créer une tâche depuis le ticket
            </h3>
            <button onClick={() => setIsTaskOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <Input
              label="Titre"
              value={taskForm.title}
              onChange={(v) => setTaskForm((f) => ({ ...f, title: v }))}
            />
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Agent</label>
                <AgentAutocomplete
                  value={taskForm.assignedTo}
                  selectedAgent={selectedTaskAgent}
                  onValueChange={(value) =>
                    setTaskForm((f) => ({ ...f, assignedTo: value }))
                  }
                  onSelect={setSelectedTaskAgent}
                  placeholder="Rechercher un agent..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Priorité</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm((f) => ({
                      ...f,
                      priority: e.target.value as TicketPriority,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white"
                >
                  <option value="LOW">Faible</option>
                  <option value="MEDIUM">Moyenne</option>
                  <option value="HIGH">Élevée</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>
              <Input
                type="datetime-local"
                label="Échéance"
                value={taskForm.dueAt}
                onChange={(v) => setTaskForm((f) => ({ ...f, dueAt: v }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsTaskOpen(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={() => taskMutation.mutate()}
                disabled={!taskForm.title || taskMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </AdminLayout>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-gray-900">{value}</p>
  </div>
);
const Tab = ({
  id,
  active,
  setActive,
  label,
  icon: Icon,
}: {
  id: DetailTab;
  active: DetailTab;
  setActive: (v: DetailTab) => void;
  label: string;
  icon: React.ElementType;
}) => (
  <button
    onClick={() => setActive(id)}
    className={`px-4 py-2 text-sm flex items-center gap-2 rounded-t-lg ${active === id ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600" : "text-gray-500 hover:bg-gray-50"}`}
  >
    <Icon size={15} />
    {label}
  </button>
);
const Input = ({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
    />
  </div>
);
