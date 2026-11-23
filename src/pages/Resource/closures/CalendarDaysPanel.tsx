import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { resourceOpsService } from "../../../services/resourceOps.service";
import type { CalendarDay } from "../../../services/resourceOps.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ListHeader, PanelForm, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ResourceAutocomplete } from "../../../components/resources/ResourceAutocomplete";

const KIND: Record<string, string> = { HOLIDAY: "Jour férié ajouté", SPECIAL_HOURS: "Horaires exceptionnels", CLOSED: "Jour fermé" };
const year = new Date().getFullYear();
const EMPTY = { date: "", resourceCode: "", kind: "HOLIDAY", label: "", openingHours: "" };

/**
 * Jours particuliers : fériés nationaux du Congo (calculés, en lecture seule), fériés ajoutés,
 * horaires exceptionnels et jours fermés, pour toutes les ressources ou une seule.
 */
export const CalendarDaysPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("RESOURCE:CREATE");
  const canDelete = hasPermission("RESOURCE:DELETE");
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(`${year}-01-01`);
  const [to, setTo] = useState(`${year}-12-31`);
  const [resourceCode, setResourceCode] = useState("");
  const [creating, setCreating] = useState<typeof EMPTY | null>(null);
  const [error, setError] = useState<string | null>(null);

  const days = useQuery({
    queryKey: ["resource-calendar-days", from, to, resourceCode],
    queryFn: () => resourceOpsService.getCalendarDays({ from: from || undefined, to: to || undefined, resourceCode: resourceCode || undefined }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resource-calendar-days"] });

  const create = useMutation({
    mutationFn: () => {
      const f = creating!;
      return resourceOpsService.createCalendarDay({
        date: f.date,
        resourceCode: f.resourceCode || undefined,
        kind: f.kind,
        label: f.label.trim() || undefined,
        openingHours: f.kind === "SPECIAL_HOURS" ? f.openingHours.trim() : undefined,
      });
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Jour enregistré");
      setCreating(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const remove = useMutation({ mutationFn: (id: string | number) => resourceOpsService.deleteCalendarDay(id), onSuccess: refresh });

  const list: CalendarDay[] = [...(days.data ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const f = creating;
  const set = (p: Partial<typeof EMPTY>) => setCreating((s) => (s ? { ...s, ...p } : s));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Jours particuliers"
        subtitle="Fériés, horaires exceptionnels et jours fermés. Ordre d'application : jour de la ressource, jour général, férié national, semaine type."
        action={canCreate ? <ActionButton icon={Plus} onClick={() => { setError(null); setCreating({ ...EMPTY, resourceCode }); }}>Nouveau jour</ActionButton> : undefined}
      />

      {f && (
        <PanelForm title="Nouveau jour particulier" onCancel={() => setCreating(null)} pending={create.isPending} submitLabel="Enregistrer" submitDisabled={!f.date || (f.kind === "SPECIAL_HOURS" && !f.openingHours.trim())} error={error} onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" required>
              <input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Nature" required>
              <select value={f.kind} onChange={(e) => set({ kind: e.target.value })} className={FIELD}>
                {Object.entries(KIND).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {f.kind === "SPECIAL_HOURS" && (
            <Field label="Plages horaires" required hint="Format HH:mm-HH:mm, plusieurs plages séparées par une virgule : 08:00-12:00,14:00-17:00.">
              <input value={f.openingHours} onChange={(e) => set({ openingHours: e.target.value })} placeholder="08:00-12:00" className={FIELD} />
            </Field>
          )}
          <Field label="Libellé">
            <input value={f.label} onChange={(e) => set({ label: e.target.value })} placeholder="Ex. Fête de l'entreprise" className={FIELD} />
          </Field>
          <Field label="Ressource" hint="Vide : le jour s'applique à toutes les ressources.">
            <ResourceAutocomplete selectedCode={f.resourceCode} onSelect={(r) => set({ resourceCode: r?.code || "" })} placeholder="Toutes les ressources" />
          </Field>
        </PanelForm>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Du">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Au">
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Ressource">
          <ResourceAutocomplete selectedCode={resourceCode} onSelect={(r) => setResourceCode(r?.code || "")} placeholder="Toutes" />
        </Field>
      </div>

      {days.isLoading ? (
        <ListSkeleton rows={5} />
      ) : days.isError ? (
        <ErrorBlock message="Les jours n'ont pas pu être chargés." onRetry={() => days.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Aucun jour particulier" hint="Aucun férié ni jour saisi sur cette période." />
      ) : (
        <DataCard>
          {list.map((d, i) => (
            <div key={`${d.id ?? "n"}-${d.date}-${i}`} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(d.date)} {d.label ? `· ${d.label}` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  {KIND[d.kind] ?? d.kind}
                  {d.openingHours ? ` · ${d.openingHours}` : ""} · {d.resourceCode ? d.resourceCode : "toutes les ressources"}
                </p>
              </div>
              {d.national ? <StatusChip tone="info">Férié national</StatusChip> : <StatusChip tone="pink">Saisi</StatusChip>}
              {!d.national && d.id != null && canDelete && (
                <IconButton
                  icon={Trash2}
                  label="Supprimer"
                  tone="danger"
                  onClick={() => toast.confirm({ message: `Supprimer le jour du ${formatDate(d.date)} ?`, confirmLabel: "Supprimer", pendingLabel: "Suppression", successMessage: "Jour supprimé", errorMessage: "Suppression impossible", onConfirm: () => remove.mutateAsync(d.id as string) })}
                />
              )}
            </div>
          ))}
        </DataCard>
      )}
    </div>
  );
};
