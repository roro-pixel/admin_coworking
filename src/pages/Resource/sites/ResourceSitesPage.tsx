import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, ChevronRight, Layers, MapPin, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { resourceOpsService } from "../../../services/resourceOps.service";
import type { FloorRequest, ResourceFloor, ResourceSite, SiteRequest } from "../../../services/resourceOps.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, IconButton, ListHeader, PanelForm, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage, formatDateTime } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { RefreshButton } from "../../../components/reporting/reportKit";

const STATE: Record<string, { label: string; cls: string }> = {
  FREE: { label: "Libre", cls: "bg-emerald-500" },
  PARTIAL: { label: "Partiel", cls: "bg-amber-500" },
  OCCUPIED: { label: "Occupé", cls: "bg-red-500" },
  CLOSED: { label: "Fermé", cls: "bg-gray-500" },
  NO_SLOT: { label: "Aucun créneau", cls: "bg-gray-300" },
  OUT_OF_SERVICE: { label: "Hors service", cls: "bg-gray-700" },
};

const count = (v?: number | string | null) => Number(v ?? 0);

// ───────────────────────── Plan en direct ─────────────────────────

const LivePlan: React.FC<{ floor: ResourceFloor }> = ({ floor }) => {
  const [at, setAt] = useState("");
  const plan = useQuery({
    queryKey: ["resource-floor-plan", floor.code, at],
    queryFn: () => resourceOpsService.getFloorPlan(floor.code, at ? `${at}:00` : undefined),
    refetchInterval: at ? false : 60000,
  });
  const placed = (plan.data?.resources ?? []).filter((r) => r.planX != null && r.planY != null);
  return (
    <Section
      title={`Plan en direct : ${floor.name}`}
      description="État de chaque ressource placée sur l'étage, à l'heure choisie (maintenant par défaut, fuseau du site)."
      icon={Layers}
      action={<RefreshButton onClick={() => plan.refetch()} fetching={plan.isFetching} />}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="À l'heure de">
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={FIELD} />
        </Field>
        {at && (
          <ActionButton variant="ghost" onClick={() => setAt("")}>
            Revenir à maintenant
          </ActionButton>
        )}
      </div>
      {plan.isLoading ? (
        <ListSkeleton rows={3} />
      ) : plan.isError ? (
        <ErrorBlock message="Le plan n'a pas pu être chargé." onRetry={() => plan.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            {Object.entries(STATE).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${v.cls}`} />
                {v.label}
              </span>
            ))}
          </div>
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 [background-image:linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] [background-size:10%_10%]">
            {placed.map((r) => {
              const st = STATE[r.state] ?? { label: r.state, cls: "bg-gray-400" };
              return (
                <div key={r.code} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${r.planX}%`, top: `${r.planY}%` }} title={`${r.name} : ${st.label}`}>
                  <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-800 shadow">
                    <span className={`h-2.5 w-2.5 rounded-full ${st.cls}`} />
                    {r.name}
                  </div>
                </div>
              );
            })}
          </div>
          {plan.data?.planDocumentCode && <p className="text-xs text-gray-400">Image du plan : document {plan.data.planDocumentCode} (GED).</p>}
          {(plan.data?.resources ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">Aucune ressource n'est rattachée à cet étage. Placez-les depuis leur fiche (onglet Réglages).</p>
          ) : (
            <DataCard>
              {plan.data!.resources.map((r) => {
                const st = STATE[r.state] ?? { label: r.state, cls: "bg-gray-400" };
                return (
                  <div key={r.code} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                    <span className={`h-2.5 w-2.5 rounded-full ${st.cls}`} />
                    <span className="min-w-0 flex-1 truncate font-semibold text-gray-900">{r.name}</span>
                    <span className="text-xs text-gray-500">{st.label}</span>
                    {r.remainingCapacity != null && <span className="text-xs text-gray-500">{r.remainingCapacity} place(s) restante(s)</span>}
                    {r.freeAt && <span className="text-xs text-gray-500">libre à {formatDateTime(r.freeAt)}</span>}
                    {(r.planX == null || r.planY == null) && <StatusChip tone="warn">Non placée</StatusChip>}
                  </div>
                );
              })}
            </DataCard>
          )}
        </>
      )}
    </Section>
  );
};

// ───────────────────────── Étages d'un site ─────────────────────────

const EMPTY_FLOOR = { name: "", level: "", planDocumentCode: "", active: true };

const Floors: React.FC<{ site: ResourceSite }> = ({ site }) => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("RESOURCE:CREATE");
  const canUpdate = hasPermission("RESOURCE:UPDATE");
  const canDelete = hasPermission("RESOURCE:DELETE");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY_FLOOR } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planOf, setPlanOf] = useState<ResourceFloor | null>(null);

  const floors = useQuery({ queryKey: ["resource-floors", site.code], queryFn: () => resourceOpsService.getFloors(site.code) });
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["resource-floors", site.code] }), queryClient.invalidateQueries({ queryKey: ["resource-sites"] })]);

  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body: FloorRequest = { name: f.name.trim(), level: f.level === "" ? undefined : Number(f.level), planDocumentCode: f.planDocumentCode.trim() || undefined, active: f.active };
      if (editing!.code === null) await resourceOpsService.createFloor(site.code, body);
      else await resourceOpsService.updateFloor(editing!.code, body);
    },
    onSuccess: async () => {
      await refresh();
      toast.success(editing?.code === null ? "Étage créé" : "Étage modifié");
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (f: ResourceFloor) => resourceOpsService.updateFloor(f.code, { active: !f.active }),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (code: string) => resourceOpsService.deleteFloor(code), onSuccess: refresh });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY_FLOOR>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));

  return (
    <div className="space-y-4">
      <Section
        title={`Étages de ${site.name}`}
        icon={Layers}
        action={canCreate ? <ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...EMPTY_FLOOR } }); }}>Nouvel étage</ActionButton> : undefined}
      >
        {editing && f && (
          <PanelForm
            title={editing.code === null ? "Nouvel étage" : `Modifier ${editing.code}`}
            onCancel={() => setEditing(null)}
            pending={save.isPending}
            submitLabel={editing.code === null ? "Créer" : "Enregistrer"}
            submitDisabled={!f.name.trim()}
            error={error}
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" required>
                <input value={f.name} onChange={(e) => set({ name: e.target.value })} className={FIELD} autoFocus />
              </Field>
              <Field label="Niveau" hint="0 = rez-de-chaussée.">
                <input type="number" value={f.level} onChange={(e) => set({ level: e.target.value })} className={FIELD} />
              </Field>
            </div>
            <Field label="Document du plan (GED)" hint="Code d'une image déposée dans la GED.">
              <input value={f.planDocumentCode} onChange={(e) => set({ planDocumentCode: e.target.value })} className={FIELD} />
            </Field>
            <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Étage actif" />
          </PanelForm>
        )}
        {floors.isLoading ? (
          <ListSkeleton rows={3} />
        ) : floors.isError ? (
          <ErrorBlock message="Les étages n'ont pas pu être chargés." onRetry={() => floors.refetch()} />
        ) : (floors.data ?? []).length === 0 ? (
          <EmptyState icon={Layers} title="Aucun étage" hint="Ajoutez les étages pour pouvoir placer les ressources sur un plan." />
        ) : (
          <DataCard>
            {floors.data!.map((fl) => (
              <div key={fl.code} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{fl.name}</p>
                  <p className="text-xs text-gray-400">
                    {fl.code}
                    {fl.level != null ? ` · niveau ${fl.level}` : ""} · {count(fl.resourceCount)} ressource(s)
                  </p>
                </div>
                <StatusChip tone={fl.active ? "success" : "neutral"}>{fl.active ? "Actif" : "Inactif"}</StatusChip>
                <ActionButton variant="ghost" icon={MapPin} onClick={() => setPlanOf(planOf?.code === fl.code ? null : fl)}>
                  Plan
                </ActionButton>
                {canUpdate && (
                  <>
                    <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: fl.code, form: { name: fl.name, level: fl.level == null ? "" : String(fl.level), planDocumentCode: fl.planDocumentCode ?? "", active: fl.active } }); }} />
                    <IconButton icon={Power} label={fl.active ? "Désactiver" : "Activer"} tone={fl.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.code === fl.code} onClick={() => toggle.mutate(fl)} />
                  </>
                )}
                {canDelete && (
                  <IconButton
                    icon={Trash2}
                    label="Supprimer"
                    tone="danger"
                    onClick={() =>
                      toast.confirm({ message: `Supprimer l'étage ${fl.name} ?`, detail: "Refusé s'il reste des ressources rattachées.", confirmLabel: "Supprimer", pendingLabel: "Suppression", successMessage: "Étage supprimé", errorMessage: "Suppression impossible", onConfirm: () => remove.mutateAsync(fl.code) })
                    }
                  />
                )}
              </div>
            ))}
          </DataCard>
        )}
      </Section>
      {planOf && <LivePlan floor={planOf} />}
    </div>
  );
};

// ───────────────────────── Sites ─────────────────────────

const EMPTY_SITE = { name: "", address: "", city: "", phone: "", timeZone: "Africa/Brazzaville", openingHoursNote: "", active: true };

export const ResourceSitesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("RESOURCE:CREATE");
  const canUpdate = hasPermission("RESOURCE:UPDATE");
  const canDelete = hasPermission("RESOURCE:DELETE");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ code: string | null; form: typeof EMPTY_SITE } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const sites = useQuery({ queryKey: ["resource-sites"], queryFn: () => resourceOpsService.getSites() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resource-sites"] });

  const save = useMutation({
    mutationFn: async () => {
      const f = editing!.form;
      const body: SiteRequest = { name: f.name.trim(), address: f.address.trim() || undefined, city: f.city.trim() || undefined, phone: f.phone.trim() || undefined, timeZone: f.timeZone.trim() || undefined, openingHoursNote: f.openingHoursNote.trim() || undefined, active: f.active };
      if (editing!.code === null) await resourceOpsService.createSite(body);
      else await resourceOpsService.updateSite(editing!.code, body);
    },
    onSuccess: async () => {
      await refresh();
      toast.success(editing?.code === null ? "Site créé" : "Site modifié");
      setEditing(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const toggle = useMutation({
    mutationFn: (s: ResourceSite) => resourceOpsService.updateSite(s.code, { active: !s.active }),
    onSuccess: refresh,
    onError: (e) => toast.error(apiMessage(e, "Changement d'état impossible")),
  });
  const remove = useMutation({ mutationFn: (code: string) => resourceOpsService.deleteSite(code), onSuccess: refresh });

  const f = editing?.form;
  const set = (p: Partial<typeof EMPTY_SITE>) => setEditing((s) => (s ? { ...s, form: { ...s.form, ...p } } : s));
  const list = sites.data ?? [];
  const current = list.find((s) => s.code === selected) ?? null;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Sites et plans"
        subtitle={sites.isLoading ? undefined : `${list.length} site${list.length > 1 ? "s" : ""}, avec leurs étages`}
        action={canCreate ? <ActionButton icon={Plus} onClick={() => { setError(null); setEditing({ code: null, form: { ...EMPTY_SITE } }); }}>Nouveau site</ActionButton> : undefined}
      />

      {editing && f && (
        <PanelForm
          title={editing.code === null ? "Nouveau site" : `Modifier ${editing.code}`}
          onCancel={() => setEditing(null)}
          pending={save.isPending}
          submitLabel={editing.code === null ? "Créer" : "Enregistrer"}
          submitDisabled={!f.name.trim()}
          error={error}
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" required>
              <input value={f.name} onChange={(e) => set({ name: e.target.value })} className={FIELD} autoFocus />
            </Field>
            <Field label="Ville">
              <input value={f.city} onChange={(e) => set({ city: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Adresse">
              <input value={f.address} onChange={(e) => set({ address: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Téléphone">
              <input value={f.phone} onChange={(e) => set({ phone: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Fuseau horaire">
              <input value={f.timeZone} onChange={(e) => set({ timeZone: e.target.value })} className={FIELD} />
            </Field>
            <Field label="Horaires affichés" hint="Texte libre, par exemple « Lun-ven 8h-18h ».">
              <input value={f.openingHoursNote} onChange={(e) => set({ openingHoursNote: e.target.value })} className={FIELD} />
            </Field>
          </div>
          <CheckField checked={f.active} onChange={(v) => set({ active: v })} label="Site actif" />
        </PanelForm>
      )}

      {sites.isLoading ? (
        <ListSkeleton rows={4} />
      ) : sites.isError ? (
        <ErrorBlock message="Les sites n'ont pas pu être chargés." onRetry={() => sites.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={Building} title="Aucun site" hint="Créez un site, puis ses étages, pour placer les ressources sur un plan." />
      ) : (
        <DataCard>
          {list.map((s) => (
            <div key={s.code} className={`flex flex-wrap items-center gap-3 p-4 ${selected === s.code ? "bg-gray-50" : ""}`}>
              <button type="button" onClick={() => setSelected(selected === s.code ? null : s.code)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <ChevronRight size={16} className={`shrink-0 text-gray-400 transition ${selected === s.code ? "rotate-90" : ""}`} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">{s.name}</span>
                  <span className="block truncate text-xs text-gray-400">
                    {s.code}
                    {s.city ? ` · ${s.city}` : ""} · {count(s.floorCount)} étage(s) · {count(s.resourceCount)} ressource(s)
                  </span>
                </span>
              </button>
              <StatusChip tone={s.active ? "success" : "neutral"}>{s.active ? "Actif" : "Inactif"}</StatusChip>
              {canUpdate && (
                <>
                  <IconButton icon={Pencil} label="Modifier" onClick={() => { setError(null); setEditing({ code: s.code, form: { name: s.name, address: s.address ?? "", city: s.city ?? "", phone: s.phone ?? "", timeZone: s.timeZone ?? "", openingHoursNote: s.openingHoursNote ?? "", active: s.active } }); }} />
                  <IconButton icon={Power} label={s.active ? "Désactiver" : "Activer"} tone={s.active ? "success" : "neutral"} pending={toggle.isPending && toggle.variables?.code === s.code} onClick={() => toggle.mutate(s)} />
                </>
              )}
              {canDelete && (
                <IconButton
                  icon={Trash2}
                  label="Supprimer"
                  tone="danger"
                  onClick={() =>
                    toast.confirm({ message: `Supprimer le site ${s.name} ?`, detail: "Refusé s'il reste des ressources ou des étages.", confirmLabel: "Supprimer", pendingLabel: "Suppression", successMessage: "Site supprimé", errorMessage: "Suppression impossible", onConfirm: () => remove.mutateAsync(s.code) })
                  }
                />
              )}
            </div>
          ))}
        </DataCard>
      )}

      {current && <Floors site={current} />}
    </div>
  );
};
