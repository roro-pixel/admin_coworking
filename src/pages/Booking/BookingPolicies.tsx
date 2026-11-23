import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Power, Shield } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingAudiencePolicy } from "../../services/booking.service";
import { resourceService } from "../../services/resource.service";
import { ActionButton, EmptyState, ErrorBlock, Field, IconButton, ItemRow, ListHeader, PanelForm, StatusChip, Switch, Tabs, Tag } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { OWNER_LABEL, label } from "../../components/bookings/bookingKit";
import { formatDuration } from "../../components/resources/resKit";

type Filter = "all" | "active" | "inactive";
const FILTERS: TabItem<Filter>[] = [
  { id: "all", label: "Toutes" },
  { id: "active", label: "Actives" },
  { id: "inactive", label: "Inactives" },
];

const DEFAULTS = {
  audienceType: "MEMBER",
  resourceTypeCode: "",
  resourceGroupCode: "",
  approvalRequired: false,
  maxActiveBookings: 3,
  maxBookingsPerDay: 2,
  maxBookingsPerWeek: 5,
  maxBookingsPerMonth: 20,
  maxNoShowsPerMonth: 2,
  minBookingNoticeMinutes: 60,
  maxBookingDurationMinutes: 240,
};
type Form = typeof DEFAULTS;

const NUMBERS: { key: keyof Form; label: string; hint?: string }[] = [
  { key: "maxActiveBookings", label: "Réservations actives" },
  { key: "maxBookingsPerDay", label: "Par jour" },
  { key: "maxBookingsPerWeek", label: "Par semaine" },
  { key: "maxBookingsPerMonth", label: "Par mois" },
  { key: "maxNoShowsPerMonth", label: "Absences tolérées par mois" },
  { key: "minBookingNoticeMinutes", label: "Préavis minimum (minutes)" },
  { key: "maxBookingDurationMinutes", label: "Durée maximale (minutes)" },
];

const PolicyForm: React.FC<{ policy: BookingAudiencePolicy | null; onDone: () => void; onCancel: () => void }> = ({ policy, onDone, onCancel }) => {
  const [form, setForm] = useState<Form>(policy ? { ...DEFAULTS, ...policy, resourceTypeCode: policy.resourceTypeCode ?? "", resourceGroupCode: policy.resourceGroupCode ?? "" } : DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const types = useQuery({ queryKey: ["resource-types-list"], queryFn: () => resourceService.getResourceTypes({ size: 500 }) });
  const groups = useQuery({ queryKey: ["resource-groups-list"], queryFn: () => resourceService.getResourceGroups({ size: 500 }) });

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        ...form,
        resourceTypeCode: form.resourceTypeCode || undefined,
        resourceGroupCode: form.resourceGroupCode || undefined,
      };
      return policy?.policyNumber
        ? bookingService.updatePolicy(policy.policyNumber, body)
        : bookingService.createPolicy({ ...body, active: true });
    },
    onSuccess: () => {
      toast.success(policy ? "Politique modifiée" : "Politique créée");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });

  return (
    <PanelForm
      title={policy ? `Modifier la politique ${policy.policyNumber ?? ""}` : "Nouvelle politique"}
      pending={mutation.isPending}
      submitLabel={policy ? "Enregistrer" : "Créer"}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Public" required>
          <select value={form.audienceType} onChange={(e) => setForm({ ...form, audienceType: e.target.value })} className={FIELD}>
            {Object.entries(OWNER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Type de ressource">
          <select value={form.resourceTypeCode} onChange={(e) => setForm({ ...form, resourceTypeCode: e.target.value })} className={FIELD}>
            <option value="">Tous les types</option>
            {(types.data?.content ?? []).map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Groupe de ressources">
          <select value={form.resourceGroupCode} onChange={(e) => setForm({ ...form, resourceGroupCode: e.target.value })} className={FIELD}>
            <option value="">Tous les groupes</option>
            {(groups.data?.content ?? []).map((g) => <option key={g.code} value={g.code}>{g.name}</option>)}
          </select>
        </Field>
      </div>
      <Switch checked={form.approvalRequired} onChange={(v) => setForm({ ...form, approvalRequired: v })} label="Approbation requise" hint="Les réservations attendent la validation d'un membre de l'équipe." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NUMBERS.map((n) => (
          <Field key={n.key} label={n.label}>
            <input type="number" min={0} value={form[n.key] as number} onChange={(e) => setForm({ ...form, [n.key]: Math.max(0, Number(e.target.value)) })} className={FIELD} />
          </Field>
        ))}
      </div>
    </PanelForm>
  );
};

export const BookingPolicies: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("BOOKING:CREATE");
  const canUpdate = hasPermission("BOOKING:UPDATE");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<BookingAudiencePolicy | "new" | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["booking-policies", filter],
    queryFn: () => bookingService.getPolicies(filter === "all" ? undefined : { active: filter === "active" }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["booking-policies"] });
  const toggle = useMutation({
    mutationFn: (p: BookingAudiencePolicy) => bookingService.setPolicyActive(p.policyNumber!, !p.active),
    onSuccess: (p) => {
      toast.success(p.active ? "Politique activée" : "Politique désactivée");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Changement impossible")),
  });

  const rows = data ?? [];
  return (
    <div className="space-y-5">
      <ListHeader
        title="Politiques de réservation"
        subtitle="Limites et règles par public, type ou groupe de ressources."
        action={canCreate ? <ActionButton icon={Plus} onClick={() => setEditing("new")}>Nouvelle politique</ActionButton> : undefined}
      />
      {editing && <PolicyForm policy={editing === "new" ? null : editing} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />}
      <Tabs items={FILTERS} active={filter} onChange={setFilter} variant="soft" />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les politiques." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Shield} title="Aucune politique" />
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <ItemRow key={p.policyNumber ?? String(p.id)} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">
                  {label(OWNER_LABEL, p.audienceType)} <span className="font-mono text-xs font-normal text-gray-400">{p.policyNumber}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Tag>{p.resourceTypeCode || "Tous types"}</Tag>
                  <Tag>{p.resourceGroupCode || "Tous groupes"}</Tag>
                  {p.approvalRequired && <Tag tone="pink">Approbation</Tag>}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {p.maxActiveBookings} actives · {p.maxBookingsPerDay}/jour · {p.maxBookingsPerWeek}/semaine · {p.maxBookingsPerMonth}/mois · {p.maxNoShowsPerMonth} absence(s)/mois · préavis {formatDuration(p.minBookingNoticeMinutes)} · durée max {formatDuration(p.maxBookingDurationMinutes)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusChip tone={p.active ? "success" : "neutral"}>{p.active ? "Active" : "Inactive"}</StatusChip>
                {canUpdate && p.policyNumber && (
                  <>
                    <IconButton icon={Pencil} label="Modifier" onClick={() => setEditing(p)} />
                    <IconButton icon={Power} label={p.active ? "Désactiver" : "Activer"} tone={p.active ? "danger" : "success"} pending={toggle.isPending && toggle.variables?.policyNumber === p.policyNumber} onClick={() => toggle.mutate(p)} />
                  </>
                )}
              </div>
            </ItemRow>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingPolicies;
