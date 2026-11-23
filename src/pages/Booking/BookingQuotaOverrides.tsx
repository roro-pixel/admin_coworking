import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Pencil, Plus, Power } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingQuotaOverride, LookupItem } from "../../services/booking.service";
import { ActionButton, EmptyState, ErrorBlock, Field, IconButton, ItemRow, ListHeader, PanelForm, StatusChip, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { ResourceAutocomplete } from "../../components/resources/ResourceAutocomplete";
import { useAuth } from "../../contexts/AuthContext";
import { OWNER_LABEL, OwnerPicker, label, ownerFields } from "../../components/bookings/bookingKit";
import { toLocalInput } from "../../components/resources/resKit";

type Filter = "all" | "active" | "inactive";
const FILTERS: TabItem<Filter>[] = [
  { id: "all", label: "Toutes" },
  { id: "active", label: "Actives" },
  { id: "inactive", label: "Inactives" },
];

const Form: React.FC<{ item: BookingQuotaOverride | null; onDone: () => void; onCancel: () => void }> = ({ item, onDone, onCancel }) => {
  const [owner, setOwner] = useState<LookupItem | null>(null);
  const [resourceCode, setResourceCode] = useState(item?.resourceCode ?? "");
  const [num, setNum] = useState({
    extraActiveBookings: item?.extraActiveBookings ?? 0,
    extraBookingsPerDay: item?.extraBookingsPerDay ?? 0,
    extraBookingsPerWeek: item?.extraBookingsPerWeek ?? 0,
    extraBookingsPerMonth: item?.extraBookingsPerMonth ?? 0,
  });
  const [reason, setReason] = useState(item?.reason ?? "");
  const [from, setFrom] = useState(toLocalInput(item?.validFrom));
  const [until, setUntil] = useState(toLocalInput(item?.validUntil));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        resourceCode: resourceCode || undefined,
        ...num,
        reason: reason.trim(),
        validFrom: from ? `${from}:00` : undefined,
        validUntil: until ? `${until}:00` : undefined,
      };
      return item ? bookingService.updateQuotaOverride(item.overrideNumber, body) : bookingService.createQuotaOverride({ ...ownerFields(owner), ...body });
    },
    onSuccess: () => {
      toast.success(item ? "Dérogation modifiée" : "Dérogation créée");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible")),
  });

  const fields: { key: keyof typeof num; label: string }[] = [
    { key: "extraActiveBookings", label: "Actives en plus" },
    { key: "extraBookingsPerDay", label: "Par jour en plus" },
    { key: "extraBookingsPerWeek", label: "Par semaine en plus" },
    { key: "extraBookingsPerMonth", label: "Par mois en plus" },
  ];
  return (
    <PanelForm
      title={item ? `Modifier ${item.overrideNumber}` : "Nouvelle dérogation"}
      pending={mutation.isPending}
      submitLabel={item ? "Enregistrer" : "Créer"}
      submitDisabled={(!item && !owner) || !reason.trim()}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      {!item && <Field label="Titulaire" required><OwnerPicker value={owner} onChange={setOwner} /></Field>}
      <Field label="Ressource" hint="Vide : toutes les ressources.">
        <ResourceAutocomplete selectedCode={resourceCode} onSelect={(r) => setResourceCode(r?.code ?? "")} placeholder="Toutes les ressources" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <input type="number" min={0} value={num[f.key]} onChange={(e) => setNum({ ...num, [f.key]: Math.max(0, Number(e.target.value)) })} className={FIELD} />
          </Field>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valable à partir du"><input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} /></Field>
        <Field label="Valable jusqu'au" hint="Vide : sans limite."><input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className={FIELD} /></Field>
      </div>
      <Field label="Motif" required><input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} /></Field>
    </PanelForm>
  );
};

export const BookingQuotaOverrides: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("BOOKING:CREATE");
  const canUpdate = hasPermission("BOOKING:UPDATE");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<BookingQuotaOverride | "new" | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["booking-quota-overrides", filter],
    queryFn: () => bookingService.getQuotaOverrides(filter === "all" ? undefined : { active: filter === "active" }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["booking-quota-overrides"] });
  const toggle = useMutation({
    mutationFn: (o: BookingQuotaOverride) => bookingService.setQuotaOverrideActive(o.overrideNumber, !o.active),
    onSuccess: (o) => {
      toast.success(o.active ? "Dérogation activée" : "Dérogation désactivée");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Changement impossible")),
  });

  const rows = data ?? [];
  return (
    <div className="space-y-5">
      <ListHeader
        title="Dérogations de quota"
        subtitle="Réservations supplémentaires accordées à un client, pour une durée donnée."
        action={canCreate ? <ActionButton icon={Plus} onClick={() => setEditing("new")}>Nouvelle dérogation</ActionButton> : undefined}
      />
      {editing && <Form item={editing === "new" ? null : editing} onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />}
      <Tabs items={FILTERS} active={filter} onChange={setFilter} variant="soft" />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les dérogations." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Award} title="Aucune dérogation" />
      ) : (
        <div className="space-y-2">
          {rows.map((o) => (
            <ItemRow key={o.overrideNumber} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">
                  {o.ownerCode} <span className="text-xs font-normal text-gray-500">· {label(OWNER_LABEL, o.ownerType)}</span>{" "}
                  <span className="font-mono text-xs font-normal text-gray-400">{o.overrideNumber}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  +{o.extraActiveBookings} actives · +{o.extraBookingsPerDay}/jour · +{o.extraBookingsPerWeek}/semaine · +{o.extraBookingsPerMonth}/mois
                  {o.resourceCode ? ` · ${o.resourceCode}` : " · toutes ressources"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Du {formatDate(o.validFrom)}{o.validUntil ? ` au ${formatDate(o.validUntil)}` : ""} · {o.reason} · accordée par {o.approvedBy}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusChip tone={o.active ? "success" : "neutral"}>{o.active ? "Active" : "Inactive"}</StatusChip>
                {canUpdate && (
                  <>
                    <IconButton icon={Pencil} label="Modifier" onClick={() => setEditing(o)} />
                    <IconButton icon={Power} label={o.active ? "Désactiver" : "Activer"} tone={o.active ? "danger" : "success"} pending={toggle.isPending && toggle.variables?.overrideNumber === o.overrideNumber} onClick={() => toggle.mutate(o)} />
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

export default BookingQuotaOverrides;
