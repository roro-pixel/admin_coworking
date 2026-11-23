import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Download, Link2, MapPin, ShieldAlert, ShoppingBag, Wrench } from "lucide-react";
import { resourceService } from "../../services/resource.service";
import type { ResourceResponse, ResourceStatus } from "../../services/resource.service";
import { resourceOpsService } from "../../services/resourceOps.service";
import type { OpeningRange } from "../../services/resourceOps.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, CheckField, EmptyState, ErrorBlock, Field, Section, StatusChip } from "../subscription/kit";
import { FIELD, apiMessage, formatDateTime } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { ImpactedBookingsList } from "./ImpactedBookings";
import { DAYS, DAY_LABEL, STATUSES, STATUS_LABEL } from "./resKit";

const numOrUndef = (v: string) => (v.trim() === "" ? undefined : Number(v));

/** HH:mm depuis "08:00:00" ou { hour, minute } */
const toHm = (v: unknown): string => {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 5);
  const t = v as { hour?: number; minute?: number };
  return `${String(t.hour ?? 0).padStart(2, "0")}:${String(t.minute ?? 0).padStart(2, "0")}`;
};

// ───────────────────────── Placement sur le plan ─────────────────────────

const Placement: React.FC<{ resource: ResourceResponse; canEdit: boolean }> = ({ resource, canEdit }) => {
  const queryClient = useQueryClient();
  const [siteCode, setSiteCode] = useState(resource.siteCode ?? "");
  const [floorCode, setFloorCode] = useState(resource.floorCode ?? "");
  const [planX, setPlanX] = useState(resource.planX == null ? "" : String(resource.planX));
  const [planY, setPlanY] = useState(resource.planY == null ? "" : String(resource.planY));
  const [error, setError] = useState<string | null>(null);

  const sites = useQuery({ queryKey: ["resource-sites"], queryFn: () => resourceOpsService.getSites() });
  const floors = useQuery({ queryKey: ["resource-floors", siteCode], queryFn: () => resourceOpsService.getFloors(siteCode), enabled: !!siteCode });

  const save = useMutation({
    mutationFn: () => resourceOpsService.placeResource(resource.code, { siteCode: siteCode || undefined, floorCode: floorCode || undefined, planX: numOrUndef(planX), planY: numOrUndef(planY) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resource", resource.code] });
      toast.success("Placement enregistré");
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Placement impossible")),
  });

  const bad = (v: string) => v !== "" && (Number(v) < 0 || Number(v) > 100);
  return (
    <Section title="Site, étage et position sur le plan" description="La position est en pourcentage depuis le coin haut gauche du plan (0 à 100). L'étage doit appartenir au site ; sans site, celui de l'étage est retenu." icon={MapPin}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Site">
          <select value={siteCode} disabled={!canEdit} onChange={(e) => { setSiteCode(e.target.value); setFloorCode(""); }} className={FIELD}>
            <option value="">Aucun</option>
            {(sites.data ?? []).map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Étage">
          <select value={floorCode} disabled={!canEdit || !siteCode} onChange={(e) => setFloorCode(e.target.value)} className={FIELD}>
            <option value="">Aucun</option>
            {(floors.data ?? []).map((f) => (
              <option key={f.code} value={f.code}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Position horizontale (%)" error={bad(planX) ? "Entre 0 et 100." : undefined}>
          <input type="number" min={0} max={100} step="0.5" value={planX} disabled={!canEdit} onChange={(e) => setPlanX(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Position verticale (%)" error={bad(planY) ? "Entre 0 et 100." : undefined}>
          <input type="number" min={0} max={100} step="0.5" value={planY} disabled={!canEdit} onChange={(e) => setPlanY(e.target.value)} className={FIELD} />
        </Field>
      </div>
      {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {canEdit && (
        <ActionButton pending={save.isPending} disabled={bad(planX) || bad(planY)} onClick={() => save.mutate()}>
          Enregistrer le placement
        </ActionButton>
      )}
    </Section>
  );
};

// ───────────────────────── Vente et usage ─────────────────────────

const SalesAndUsage: React.FC<{ resource: ResourceResponse; canEdit: boolean }> = ({ resource, canEdit }) => {
  const queryClient = useQueryClient();
  const [included, setIncluded] = useState(resource.includedParticipants == null ? "" : String(resource.includedParticipants));
  const [extra, setExtra] = useState(resource.extraParticipantPrice == null ? "" : String(resource.extraParticipantPrice));
  const [deposit, setDeposit] = useState(resource.depositAmount == null ? "" : String(resource.depositAmount));
  const [rules, setRules] = useState(resource.usageRules ?? "");
  const [checklist, setChecklist] = useState((resource.endChecklist ?? []).join("\n"));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resource", resource.code] });

  const sales = useMutation({
    mutationFn: () => resourceOpsService.saveSalesSettings(resource.code, { includedParticipants: numOrUndef(included), extraParticipantPrice: numOrUndef(extra), depositAmount: numOrUndef(deposit) }),
    onSuccess: async () => {
      await refresh();
      toast.success("Réglages de vente enregistrés");
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible")),
  });
  const usage = useMutation({
    mutationFn: () => resourceOpsService.saveUsageSettings(resource.code, { usageRules: rules, endChecklist: checklist.split("\n").map((l) => l.trim()).filter(Boolean) }),
    onSuccess: async () => {
      await refresh();
      toast.success("Règlement d'usage enregistré");
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible")),
  });

  return (
    <>
      <Section title="Réglages de vente" description="Participants compris dans le prix, prix d'un participant en plus, caution (ligne non taxée, ajoutée une fois avant la première facture)." icon={ShoppingBag}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Participants compris">
            <input type="number" min={0} value={included} disabled={!canEdit} onChange={(e) => setIncluded(e.target.value)} className={FIELD} />
          </Field>
          <Field label="Participant en plus (FCFA)">
            <input type="number" min={0} value={extra} disabled={!canEdit} onChange={(e) => setExtra(e.target.value)} className={FIELD} />
          </Field>
          <Field label="Caution (FCFA)">
            <input type="number" min={0} value={deposit} disabled={!canEdit} onChange={(e) => setDeposit(e.target.value)} className={FIELD} />
          </Field>
        </div>
        {canEdit && (
          <ActionButton pending={sales.isPending} onClick={() => sales.mutate()}>
            Enregistrer
          </ActionButton>
        )}
      </Section>
      <Section title="Règlement d'usage et état des lieux" description="Un règlement modifié doit être ré-accepté (la version est une empreinte du texte). L'acceptation ne bloque pas l'arrivée." icon={ShieldAlert}>
        <Field label="Règlement d'usage">
          <textarea value={rules} disabled={!canEdit} onChange={(e) => setRules(e.target.value)} rows={5} className={`${FIELD} resize-none`} />
        </Field>
        <Field label="Points de l'état des lieux de fin" hint="Un point par ligne.">
          <textarea value={checklist} disabled={!canEdit} onChange={(e) => setChecklist(e.target.value)} rows={4} className={`${FIELD} resize-none`} />
        </Field>
        {canEdit && (
          <ActionButton pending={usage.isPending} onClick={() => usage.mutate()}>
            Enregistrer
          </ActionButton>
        )}
      </Section>
    </>
  );
};

// ───────────────────────── Horaires propres ─────────────────────────

type DayRow = { open: string; close: string }[];

const OpeningHours: React.FC<{ code: string; canEdit: boolean }> = ({ code, canEdit }) => {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["resource-opening-hours", code], queryFn: () => resourceOpsService.getOpeningHours(code) });
  const [rows, setRows] = useState<Record<string, DayRow>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    const next: Record<string, DayRow> = {};
    DAYS.forEach((d) => (next[d] = []));
    q.data.hours.forEach((h) => next[h.dayOfWeek]?.push({ open: toHm(h.open), close: toHm(h.close) }));
    setRows(next);
  }, [q.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resource-opening-hours", code] });
  const save = useMutation({
    mutationFn: () => {
      const ranges: OpeningRange[] = [];
      DAYS.forEach((d) => (rows[d] ?? []).forEach((r) => ranges.push({ dayOfWeek: d, open: r.open, close: r.close })));
      return resourceOpsService.saveOpeningHours(code, ranges);
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Horaires enregistrés");
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });
  const clear = useMutation({ mutationFn: () => resourceOpsService.clearOpeningHours(code), onSuccess: refresh });

  const setRange = (d: string, i: number, patch: Partial<DayRow[number]>) => setRows((s) => ({ ...s, [d]: s[d].map((r, k) => (k === i ? { ...r, ...patch } : r)) }));
  const invalid = DAYS.some((d) => (rows[d] ?? []).some((r) => !r.open || !r.close || r.close <= r.open));

  return (
    <Section
      title="Horaires d'ouverture propres"
      description="Ils remplacent les horaires globaux. Un jour sans plage est fermé."
      icon={CalendarClock}
      action={q.data ? <StatusChip tone={q.data.custom ? "pink" : "neutral"}>{q.data.custom ? "Horaires propres" : "Horaires globaux"}</StatusChip> : undefined}
    >
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorBlock message="Les horaires n'ont pas pu être chargés." onRetry={() => q.refetch()} />
      ) : (
        <>
          {!q.data?.custom && <p className="text-sm text-gray-500">Cette ressource suit les horaires globaux. Ajoutez des plages puis enregistrez pour définir des horaires propres.</p>}
          <div className="space-y-2">
            {DAYS.map((d) => (
              <div key={d} className="flex flex-wrap items-center gap-3 rounded-2xl bg-gray-50 p-3">
                <span className="w-24 text-sm font-semibold text-gray-800">{DAY_LABEL[d]}</span>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {(rows[d] ?? []).length === 0 && <span className="text-sm text-gray-400">Fermé</span>}
                  {(rows[d] ?? []).map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5">
                      <input type="time" value={r.open} disabled={!canEdit} onChange={(e) => setRange(d, i, { open: e.target.value })} className={`${FIELD} !w-28`} />
                      <span className="text-gray-400">à</span>
                      <input type="time" value={r.close} disabled={!canEdit} onChange={(e) => setRange(d, i, { close: e.target.value })} className={`${FIELD} !w-28`} />
                      {canEdit && (
                        <button type="button" aria-label="Retirer la plage" className="px-1 text-gray-400 hover:text-red-600" onClick={() => setRows((s) => ({ ...s, [d]: s[d].filter((_, k) => k !== i) }))}>
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {canEdit && (
                  <ActionButton variant="ghost" onClick={() => setRows((s) => ({ ...s, [d]: [...(s[d] ?? []), { open: "08:00", close: "18:00" }] }))}>
                    Ajouter une plage
                  </ActionButton>
                )}
              </div>
            ))}
          </div>
          {invalid && <p className="text-sm text-red-600">Chaque plage doit avoir une ouverture et une fermeture postérieure.</p>}
          {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <ActionButton pending={save.isPending} disabled={invalid} onClick={() => save.mutate()}>
                Enregistrer les horaires
              </ActionButton>
              {q.data?.custom && (
                <ActionButton
                  variant="ghost"
                  onClick={() => toast.confirm({ message: "Revenir aux horaires globaux ?", detail: "Les horaires propres de cette ressource sont supprimés.", confirmLabel: "Revenir", pendingLabel: "Suppression", successMessage: "Horaires globaux rétablis", errorMessage: "Opération impossible", onConfirm: () => clear.mutateAsync() })}
                >
                  Utiliser les horaires globaux
                </ActionButton>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  );
};

// ───────────────────────── Statut et réservations touchées ─────────────────────────

const SafeStatus: React.FC<{ resource: ResourceResponse; canEdit: boolean }> = ({ resource, canEdit }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ResourceStatus>(resource.status as ResourceStatus);
  const [cancel, setCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocking = status !== "ACTIVE" && status !== resource.status;

  const apply = useMutation({
    mutationFn: () => resourceService.updateResourceStatus(resource.code, status, cancel),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["resource", resource.code] }), queryClient.invalidateQueries({ queryKey: ["resources"] })]);
      toast.success("Statut modifié");
      setCancel(false);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Changement de statut impossible")),
  });

  return (
    <Section title="Statut et réservations à venir" description="Une mise hors service, une maintenance ou une archive est refusée s'il reste des réservations à venir, sauf si vous choisissez de les annuler et de prévenir les clients." icon={ShieldAlert}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut">
          <select value={status} disabled={!canEdit} onChange={(e) => { setStatus(e.target.value as ResourceStatus); setCancel(false); }} className={FIELD}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {blocking && (
        <div className="space-y-2 rounded-2xl bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">Réservations à venir touchées</p>
          <ImpactedBookingsList resourceCode={resource.code} />
          <CheckField checked={cancel} onChange={setCancel} label="Annuler ces réservations et prévenir les clients (remboursement selon la politique)" />
        </div>
      )}
      {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {canEdit && (
        <ActionButton
          pending={apply.isPending}
          disabled={status === resource.status}
          onClick={() =>
            blocking && cancel
              ? toast.confirm({ message: "Annuler les réservations touchées ?", detail: "Les clients sont prévenus par courriel.", confirmLabel: "Changer le statut", pendingLabel: "Changement", tone: "danger", onConfirm: () => apply.mutateAsync() })
              : apply.mutate()
          }
        >
          Changer le statut
        </ActionButton>
      )}
    </Section>
  );
};

// ───────────────────────── Calendriers iCalendar ─────────────────────────

const Ical: React.FC<{ code: string; canCreate: boolean }> = ({ code, canCreate }) => {
  const [link, setLink] = useState<string | null>(null);
  const download = useMutation({
    mutationFn: () => resourceOpsService.getResourceIcs(code),
    onSuccess: (text) => {
      const url = URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${code}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(apiMessage(e, "Téléchargement impossible")),
  });
  const token = useMutation({
    mutationFn: () => resourceOpsService.createIcalToken(code),
    onSuccess: (r) => {
      const t = (r.token ?? r.jeton ?? r.url ?? r.link) as string | undefined;
      const url = t ? (String(t).startsWith("http") || String(t).startsWith("/") ? String(t) : resourceOpsService.publicIcalPath(String(t))) : JSON.stringify(r);
      setLink(url);
      toast.success("Lien créé : l'ancien ne fonctionne plus");
    },
    onError: (e) => toast.error(apiMessage(e, "Création du lien impossible")),
  });

  return (
    <Section title="Calendriers iCalendar" description="Le fichier de l'équipe contient les réservations (avec le contact) et les fermetures, de -7 à +90 jours. Le lien d'abonnement ne montre que « Occupé » et « Fermé »." icon={Link2}>
      <div className="flex flex-wrap gap-2">
        <ActionButton variant="ghost" icon={Download} pending={download.isPending} onClick={() => download.mutate()}>
          Télécharger le .ics
        </ActionButton>
        {canCreate && (
          <ActionButton
            variant="ghost"
            icon={Link2}
            pending={token.isPending}
            onClick={() => toast.confirm({ message: "Créer un lien d'abonnement ?", detail: "Le lien précédent cesse de fonctionner.", confirmLabel: "Créer le lien", pendingLabel: "Création", onConfirm: () => token.mutateAsync() })}
          >
            Lien d'abonnement
          </ActionButton>
        )}
      </div>
      {link && (
        <div className="space-y-1 rounded-2xl bg-gray-50 p-3">
          <p className="break-all font-mono text-xs text-gray-800">{link}</p>
          <p className="text-xs text-gray-500">Le flux public est désactivé par défaut : l'exploitant l'active avec le paramètre app.resources.ical.public-feed-enabled.</p>
        </div>
      )}
    </Section>
  );
};

// ───────────────────────── Historique de maintenance ─────────────────────────

const KIND: Record<string, string> = { INCIDENT: "Incident", CLOSURE: "Fermeture" };

const History: React.FC<{ code: string }> = ({ code }) => {
  const q = useQuery({ queryKey: ["resource-maintenance-history", code], queryFn: () => resourceOpsService.getMaintenanceHistory(code) });
  const list = q.data ?? [];
  return (
    <Section title="Historique de maintenance" description="Incidents et fermetures de nature maintenance, du plus récent au plus ancien." icon={Wrench}>
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorBlock message="L'historique n'a pas pu être chargé." onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon={Wrench} title="Aucune intervention" hint="Aucun incident ni maintenance enregistrés pour cette ressource." />
      ) : (
        <div className="space-y-2">
          {list.map((h, i) => (
            <div key={`${h.reference}-${i}`} className="flex flex-wrap items-center gap-3 rounded-2xl bg-gray-50 p-3 text-sm">
              <StatusChip tone={h.kind === "INCIDENT" ? "warn" : "info"}>{KIND[h.kind] ?? h.kind}</StatusChip>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{h.title || h.reference}</p>
                <p className="truncate text-xs text-gray-500">
                  {h.reference} · {formatDateTime(h.startedAt)}
                  {h.endedAt ? ` → ${formatDateTime(h.endedAt)}` : ""}
                  {h.detail ? ` · ${h.detail}` : ""}
                </p>
              </div>
              {h.status && <StatusChip tone="neutral">{h.status}</StatusChip>}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};

/** Onglet « Réglages » de la fiche ressource. Droits : RESOURCE:READ pour voir, UPDATE pour modifier, CREATE pour le lien iCalendar. */
export const ResourceSettingsPanel: React.FC<{ resource: ResourceResponse }> = ({ resource }) => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("RESOURCE:UPDATE");
  const canCreate = hasPermission("RESOURCE:CREATE");
  return (
    <div className="space-y-4">
      <SafeStatus resource={resource} canEdit={canEdit} />
      <Placement resource={resource} canEdit={canEdit} />
      <OpeningHours code={resource.code} canEdit={canEdit} />
      <SalesAndUsage resource={resource} canEdit={canEdit} />
      <Ical code={resource.code} canCreate={canCreate} />
      <History code={resource.code} />
    </div>
  );
};
