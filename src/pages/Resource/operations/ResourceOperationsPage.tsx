import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, PlayCircle, Plus, Pencil, Power, Trash2, TriangleAlert } from "lucide-react";
import { resourceOpsService } from "../../../services/resourceOps.service";
import type { ResourceIncident, TaskTemplate } from "../../../services/resourceOps.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, IconButton, ListHeader, PanelForm, StatusChip, Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDateTime } from "../../../components/subscription/kitUtils";
import type { Tone } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";
import { ImpactedBookingsList } from "../../../components/resources/ImpactedBookings";

type View = "incidents" | "templates";
const VIEWS: TabItem<View>[] = [
  { id: "incidents", label: "Incidents", icon: TriangleAlert },
  { id: "templates", label: "Modèles de tâches", icon: ClipboardList },
];

const SEVERITY: Record<string, { label: string; tone: Tone }> = {
  LOW: { label: "Faible", tone: "neutral" },
  MEDIUM: { label: "Moyenne", tone: "info" },
  HIGH: { label: "Haute", tone: "warn" },
  CRITICAL: { label: "Critique", tone: "danger" },
};
const INCIDENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: "Ouvert", tone: "danger" },
  IN_PROGRESS: { label: "En cours", tone: "warn" },
  RESOLVED: { label: "Résolu", tone: "success" },
};
const MOMENT: Record<string, string> = { BEFORE_START: "Avant le début", AFTER_END: "Après la fin" };
const PRIORITY: Record<string, string> = { LOW: "Basse", NORMAL: "Normale", HIGH: "Haute", URGENT: "Urgente" };

// ───────────────────────── Incidents ─────────────────────────

const EMPTY_INCIDENT = { resourceCode: "", bookingNumber: "", title: "", description: "", severity: "MEDIUM", block: false, cancelBookings: false, photos: "" };

const Incidents: React.FC = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission("RESOURCE:CREATE");
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [resourceCode, setResourceCode] = useState("");
  const [creating, setCreating] = useState<typeof EMPTY_INCIDENT | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<{ code: string; resolution: string; reopen: boolean } | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const incidents = useQuery({
    queryKey: ["resource-incidents", status, resourceCode],
    queryFn: () => resourceOpsService.getIncidents({ status: status || undefined, resourceCode: resourceCode || undefined }),
  });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["resource-incidents"] }), queryClient.invalidateQueries({ queryKey: ["resource"] }), queryClient.invalidateQueries({ queryKey: ["resource-maintenance-history"] })]);

  const report = useMutation({
    mutationFn: () => {
      const f = creating!;
      return resourceOpsService.reportIncident({
        resourceCode: f.resourceCode,
        bookingNumber: f.bookingNumber.trim() || undefined,
        title: f.title.trim(),
        description: f.description.trim() || undefined,
        severity: f.severity,
        block: f.block,
        cancelBookings: f.block ? f.cancelBookings : undefined,
        photoDocumentCodes: f.photos.split(/[\s,;]+/).filter(Boolean),
      });
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Incident signalé : un ticket est ouvert au support");
      setCreating(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Signalement impossible")),
  });
  const start = useMutation({
    mutationFn: (code: string) => resourceOpsService.startIncident(code),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Prise en charge impossible")),
  });
  const resolve = useMutation({
    mutationFn: () => resourceOpsService.resolveIncident(resolving!.code, { resolution: resolving!.resolution.trim() || undefined, reopen: resolving!.reopen }),
    onSuccess: async () => {
      await refresh();
      toast.success("Incident résolu");
      setResolving(null);
      setResolveError(null);
    },
    onError: (e) => setResolveError(apiMessage(e, "Résolution impossible")),
  });

  const f = creating;
  const set = (p: Partial<typeof EMPTY_INCIDENT>) => setCreating((s) => (s ? { ...s, ...p } : s));
  const list: ResourceIncident[] = incidents.data ?? [];

  return (
    <div className="space-y-5">
      <ListHeader
        title="Incidents"
        subtitle="Signalements des membres et de l'équipe. Chaque incident ouvre un ticket au support."
        action={canWrite ? <ActionButton icon={Plus} onClick={() => { setError(null); setCreating({ ...EMPTY_INCIDENT, resourceCode }); }}>Signaler un incident</ActionButton> : undefined}
      />

      {f && (
        <PanelForm title="Signaler un incident" onCancel={() => setCreating(null)} pending={report.isPending} submitLabel="Signaler" submitDisabled={!f.resourceCode || !f.title.trim()} error={error} onSubmit={(e) => { e.preventDefault(); report.mutate(); }}>
          <Field label="Ressource" required>
            <ResourceAutocomplete selectedCode={f.resourceCode} onSelect={(r) => set({ resourceCode: r?.code || "" })} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre" required>
              <input value={f.title} onChange={(e) => set({ title: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Gravité" required>
              <select value={f.severity} onChange={(e) => set({ severity: e.target.value })} className={FIELD}>
                {Object.entries(SEVERITY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={3} className={`${FIELD} resize-none`} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Réservation concernée" hint="Facultatif.">
              <input value={f.bookingNumber} onChange={(e) => set({ bookingNumber: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Photos (codes de documents GED)" hint="Séparés par une virgule ou un espace.">
              <input value={f.photos} onChange={(e) => set({ photos: e.target.value })} className={FIELD} />
            </Field>
          </div>
          <CheckField checked={f.block} onChange={(v) => set({ block: v, cancelBookings: v ? f.cancelBookings : false })} label="Bloquer la ressource (la passe en maintenance)" />
          {f.block && f.resourceCode && (
            <div className="space-y-2 rounded-2xl bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">Réservations à venir touchées par le blocage</p>
              <ImpactedBookingsList resourceCode={f.resourceCode} />
              <CheckField checked={f.cancelBookings} onChange={(v) => set({ cancelBookings: v })} label="Annuler ces réservations et prévenir les clients" />
              <p className="text-xs text-amber-800">Sans cette option, le serveur refuse le blocage s'il reste des réservations à venir.</p>
            </div>
          )}
        </PanelForm>
      )}

      {resolving && (
        <PanelForm title={`Résoudre ${resolving.code}`} onCancel={() => setResolving(null)} pending={resolve.isPending} submitLabel="Marquer résolu" error={resolveError} onSubmit={(e) => { e.preventDefault(); resolve.mutate(); }}>
          <Field label="Résolution">
            <textarea value={resolving.resolution} onChange={(e) => setResolving({ ...resolving, resolution: e.target.value })} rows={3} className={`${FIELD} resize-none`} />
          </Field>
          <CheckField checked={resolving.reopen} onChange={(v) => setResolving({ ...resolving, reopen: v })} label="Remettre la ressource en service (si aucun autre incident ne la bloque)" />
        </PanelForm>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Statut">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={FIELD}>
            <option value="">Ouverts et en cours</option>
            {Object.entries(INCIDENT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ressource">
          <ResourceAutocomplete selectedCode={resourceCode} onSelect={(r) => setResourceCode(r?.code || "")} placeholder="Toutes" />
        </Field>
      </div>

      {incidents.isLoading ? (
        <ListSkeleton rows={4} />
      ) : incidents.isError ? (
        <ErrorBlock message="Les incidents n'ont pas pu être chargés." onRetry={() => incidents.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={TriangleAlert} title="Aucun incident" hint="Rien à traiter pour ce filtre." />
      ) : (
        <DataCard>
          {list.map((i) => {
            const sev = SEVERITY[i.severity] ?? { label: i.severity, tone: "neutral" as Tone };
            const st = INCIDENT_STATUS[i.status] ?? { label: i.status, tone: "neutral" as Tone };
            return (
              <div key={i.code} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => setOpen(open === i.code ? null : i.code)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-gray-900">{i.title}</span>
                    <span className="block truncate text-xs text-gray-400">
                      {i.code} · {i.resourceName || i.resourceCode}
                      {i.bookingNumber ? ` · réservation ${i.bookingNumber}` : ""} · {formatDateTime(i.createdAt)}
                    </span>
                  </button>
                  <StatusChip tone={sev.tone}>{sev.label}</StatusChip>
                  <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  {i.blocked && <StatusChip tone="warn">Ressource bloquée</StatusChip>}
                  {canWrite && i.status === "OPEN" && <IconButton icon={PlayCircle} label="Prendre en charge" tone="success" pending={start.isPending && start.variables === i.code} onClick={() => start.mutate(i.code)} />}
                  {canWrite && i.status !== "RESOLVED" && <IconButton icon={CheckCircle2} label="Résoudre" tone="success" onClick={() => { setResolveError(null); setResolving({ code: i.code, resolution: "", reopen: !!i.blocked }); }} />}
                </div>
                {open === i.code && (
                  <div className="space-y-1 rounded-2xl bg-gray-50 p-3 text-sm text-gray-700">
                    {i.description && <p>{i.description}</p>}
                    <p className="text-xs text-gray-500">
                      Signalé par {i.reporterName || "?"} ({i.reportedByType === "MEMBER" ? "membre" : i.reportedByType === "STAFF" ? "équipe" : i.reportedByType || "?"}){i.ticketNumber ? ` · ticket ${i.ticketNumber}` : ""}
                    </p>
                    {(i.photoDocumentCodes ?? []).length > 0 && <p className="text-xs text-gray-500">Photos : {i.photoDocumentCodes!.join(", ")}</p>}
                    {i.resolution && (
                      <p className="text-xs text-gray-500">
                        Résolution : {i.resolution} ({i.resolvedBy || "?"}, {formatDateTime(i.resolvedAt)})
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </DataCard>
      )}
    </div>
  );
};

// ───────────────────────── Modèles de tâches ─────────────────────────

const EMPTY_TPL = { resourceCode: "", serviceItemCode: "", title: "", description: "", moment: "BEFORE_START", offsetMinutes: "30", priority: "NORMAL", assignedTo: "", checklist: "", active: true };

const Templates: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("RESOURCE:CREATE");
  const canUpdate = hasPermission("RESOURCE:UPDATE");
  const canDelete = hasPermission("RESOURCE:DELETE");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ id: string | number | null; form: typeof EMPTY_TPL } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const templates = useQuery({ queryKey: ["resource-task-templates"], queryFn: () => resourceOpsService.getTaskTemplates() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resource-task-templates"] });

  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body = {
        resourceCode: f.resourceCode || undefined,
        serviceItemCode: f.serviceItemCode.trim() || undefined,
        title: f.title.trim(),
        description: f.description.trim() || undefined,
        moment: f.moment,
        offsetMinutes: f.offsetMinutes === "" ? undefined : Number(f.offsetMinutes),
        priority: f.priority,
        assignedTo: f.assignedTo.trim() === "" ? undefined : Number(f.assignedTo),
        checklist: f.checklist.split("\n").map((l) => l.trim()).filter(Boolean),
        active: f.active,
      };
      if (editing!.id === null) await resourceOpsService.createTaskTemplate(body);
      else await resourceOpsService.updateTaskTemplate(editing!.id, body);
    },
    onSuccess: async () => {
      await refresh();
      toast.success(editing?.id === null ? "Modèle créé" : "Modèle modifié");
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (t: TaskTemplate) => resourceOpsService.updateTaskTemplate(t.id, { active: !t.active }),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (id: string | number) => resourceOpsService.deleteTaskTemplate(id), onSuccess: refresh });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY_TPL>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));
  const list = templates.data ?? [];

  return (
    <div className="space-y-5">
      <ListHeader
        title="Modèles de tâches"
        subtitle="À la confirmation d'une réservation, une tâche par modèle entre dans la liste de l'équipe. Une ressource qui a des modèles n'a plus les deux tâches par défaut (préparer, nettoyer)."
        action={canCreate ? <ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ id: null, form: { ...EMPTY_TPL } }); }}>Nouveau modèle</ActionButton> : undefined}
      />

      {editing && f && (
        <PanelForm title={editing.id === null ? "Nouveau modèle" : "Modifier le modèle"} onCancel={() => setEditing(null)} pending={save.isPending} submitLabel={editing.id === null ? "Créer" : "Enregistrer"} submitDisabled={!f.title.trim()} error={error} onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Field label="Titre" required>
            <input value={f.title} onChange={(e) => set({ title: e.target.value })} className={FIELD} autoFocus />
          </Field>
          <Field label="Description">
            <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={2} className={`${FIELD} resize-none`} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Moment">
              <select value={f.moment} onChange={(e) => set({ moment: e.target.value })} className={FIELD}>
                {Object.entries(MOMENT).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Décalage (minutes)">
              <input type="number" min={0} value={f.offsetMinutes} onChange={(e) => set({ offsetMinutes: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Priorité">
              <select value={f.priority} onChange={(e) => set({ priority: e.target.value })} className={FIELD}>
                {Object.entries(PRIORITY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ressource" hint="Vide : toutes les ressources.">
              <ResourceAutocomplete selectedCode={f.resourceCode} onSelect={(r) => set({ resourceCode: r?.code || "" })} placeholder="Toutes les ressources" />
            </Field>
            <Field label="Service du catalogue" hint="Si renseigné, la tâche naît à la vente de ce service.">
              <input value={f.serviceItemCode} onChange={(e) => set({ serviceItemCode: e.target.value })} className={FIELD} />
            </Field>
          </div>
          <Field label="Assignée à (identifiant d'utilisateur de l'équipe)" hint="Facultatif.">
            <input type="number" min={1} value={f.assignedTo} onChange={(e) => set({ assignedTo: e.target.value })} className={`${FIELD} sm:max-w-[12rem]`} />
          </Field>
          <Field label="Liste de vérification" hint="Un point par ligne.">
            <textarea value={f.checklist} onChange={(e) => set({ checklist: e.target.value })} rows={3} className={`${FIELD} resize-none`} />
          </Field>
          <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Modèle actif" />
        </PanelForm>
      )}

      {templates.isLoading ? (
        <ListSkeleton rows={4} />
      ) : templates.isError ? (
        <ErrorBlock message="Les modèles n'ont pas pu être chargés." onRetry={() => templates.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucun modèle de tâche" hint="Sans modèle, la réservation confirmée crée les deux tâches par défaut." />
      ) : (
        <DataCard>
          {list.map((t) => (
            <div key={String(t.id)} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{t.title}</p>
                <p className="truncate text-xs text-gray-400">
                  {MOMENT[t.moment ?? ""] ?? t.moment ?? ""}
                  {t.offsetMinutes != null ? ` (${t.offsetMinutes} min)` : ""} · {PRIORITY[t.priority ?? ""] ?? t.priority ?? ""} · {t.resourceCode || "toutes les ressources"}
                  {t.serviceItemCode ? ` · service ${t.serviceItemCode}` : ""}
                  {(t.checklist ?? []).length ? ` · ${t.checklist!.length} point(s)` : ""}
                </p>
              </div>
              <StatusChip tone={t.active ? "success" : "neutral"}>{t.active ? "Actif" : "Inactif"}</StatusChip>
              {canUpdate && (
                <>
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ id: t.id, form: { resourceCode: t.resourceCode ?? "", serviceItemCode: t.serviceItemCode ?? "", title: t.title, description: t.description ?? "", moment: t.moment ?? "BEFORE_START", offsetMinutes: t.offsetMinutes == null ? "" : String(t.offsetMinutes), priority: t.priority ?? "NORMAL", assignedTo: t.assignedTo == null ? "" : String(t.assignedTo), checklist: (t.checklist ?? []).join("\n"), active: t.active } }); }} />
                  <IconButton icon={Power} label={t.active ? "Désactiver" : "Activer"} tone={t.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.id === t.id} onClick={() => toggle.mutate(t)} />
                </>
              )}
              {canDelete && <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => toast.confirm({ message: `Supprimer le modèle « ${t.title} » ?`, confirmLabel: "Supprimer", pendingLabel: "Suppression", successMessage: "Modèle supprimé", errorMessage: "Suppression impossible", onConfirm: () => remove.mutateAsync(t.id) })} />}
            </div>
          ))}
        </DataCard>
      )}
    </div>
  );
};

export const ResourceOperationsPage: React.FC = () => {
  const [view, setView] = useState<View>("incidents");
  return (
    <div className="space-y-5">
      <Tabs items={VIEWS} active={view} onChange={setView} variant="soft" />
      {view === "incidents" ? <Incidents /> : <Templates />}
    </div>
  );
};
