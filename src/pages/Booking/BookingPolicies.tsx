import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Shield } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingAudiencePolicy } from "../../services/booking.service";
import { toast } from "../../components/ui/toastStore";
import { TableSkeleton } from "../../components/ui/Skeleton";
import {
  ActionButton,
  DataCard,
  EmptyState,
  Field,
  HeadRow,
  IconButton,
  ListHeader,
  PanelForm,
  SearchField,
  StatusChip,
  Switch,
} from "../../components/subscription/kit";
import { FIELD_SOFT, ROW_HOVER, apiMessage } from "../../components/subscription/kitUtils";
import { formatDuration } from "../../components/bookings/bookingUtils";

const AUDIENCE_LABELS: Record<string, string> = {
  MEMBER: "Membre",
  CUSTOMER: "Customer",
  BUSINESS_ENTITY: "Entreprise",
};

const COLS =
  "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_6.5rem_5.5rem_5.5rem_6rem_6rem_6rem_3rem]";

const buildDefaultFormData = (policy: BookingAudiencePolicy | null) => ({
  audienceType: policy?.audienceType || "MEMBER",
  resourceTypeCode: policy?.resourceTypeCode || "",
  resourceGroupCode: policy?.resourceGroupCode || "",
  approvalRequired: policy?.approvalRequired ?? false,
  maxActiveBookings: policy?.maxActiveBookings ?? 3,
  maxBookingsPerDay: policy?.maxBookingsPerDay ?? 2,
  maxBookingsPerWeek: policy?.maxBookingsPerWeek ?? 5,
  maxBookingsPerMonth: policy?.maxBookingsPerMonth ?? 20,
  maxNoShowsPerMonth: policy?.maxNoShowsPerMonth ?? 2,
  minBookingNoticeMinutes: policy?.minBookingNoticeMinutes ?? 60,
  maxBookingDurationMinutes: policy?.maxBookingDurationMinutes ?? 240,
  active: policy?.active ?? true,
});

type NumericKey =
  | "maxActiveBookings"
  | "maxBookingsPerDay"
  | "maxBookingsPerWeek"
  | "maxBookingsPerMonth"
  | "maxNoShowsPerMonth"
  | "minBookingNoticeMinutes"
  | "maxBookingDurationMinutes";

const NUMBER_FIELDS: { key: NumericKey; label: string; duration?: boolean }[] = [
  { key: "maxActiveBookings", label: "Actives max" },
  { key: "maxBookingsPerDay", label: "Par jour" },
  { key: "maxBookingsPerWeek", label: "Par semaine" },
  { key: "maxBookingsPerMonth", label: "Par mois" },
  { key: "maxNoShowsPerMonth", label: "No-show max par mois" },
  { key: "minBookingNoticeMinutes", label: "Délai mini (min)", duration: true },
  { key: "maxBookingDurationMinutes", label: "Durée max (min)", duration: true },
];

export const BookingPolicies: React.FC = () => {
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<BookingAudiencePolicy | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => buildDefaultFormData(null));

  // Resynchronisation du formulaire à chaque ouverture
  useEffect(() => {
    if (isPanelOpen) {
      setFormData(buildDefaultFormData(editingPolicy));
      setErrorMessage(null);
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [isPanelOpen, editingPolicy]);

  const { data: policiesRaw = [], isLoading } = useQuery({
    queryKey: ["booking-policies"],
    queryFn: () => bookingService.getPolicies(),
  });

  // Wrapper défensif : getPolicies peut retourner un tableau ou { data: [] }
  const policies: BookingAudiencePolicy[] = Array.isArray(policiesRaw)
    ? policiesRaw
    : (policiesRaw as any)?.data || (policiesRaw as any)?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      bookingService.createPolicy({
        ...formData,
        resourceTypeCode: formData.resourceTypeCode || undefined,
        resourceGroupCode: formData.resourceGroupCode || undefined,
      } as BookingAudiencePolicy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-policies"] });
      setIsPanelOpen(false);
      toast.success("Politique créée");
    },
    onError: (error: unknown) => setErrorMessage(apiMessage(error, "Erreur lors de la création.")),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingPolicy?.id) throw new Error("ID manquant");
      return bookingService.updatePolicy(editingPolicy.id, {
        ...formData,
        resourceTypeCode: formData.resourceTypeCode || undefined,
        resourceGroupCode: formData.resourceGroupCode || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-policies"] });
      setIsPanelOpen(false);
      toast.success("Politique mise à jour");
    },
    onError: (error: unknown) => setErrorMessage(apiMessage(error, "Erreur lors de la mise à jour.")),
  });

  const handleOpen = (policy?: BookingAudiencePolicy) => {
    setEditingPolicy(policy || null);
    setIsPanelOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (editingPolicy) updateMutation.mutate();
    else createMutation.mutate();
  };

  const needle = search.toLowerCase();
  const filteredPolicies = search
    ? policies.filter(
        (p) =>
          p.audienceType.toLowerCase().includes(needle) ||
          (p.resourceTypeCode && p.resourceTypeCode.toLowerCase().includes(needle)) ||
          (p.resourceGroupCode && p.resourceGroupCode.toLowerCase().includes(needle)),
      )
    : policies;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      <ListHeader
        title="Politiques de réservation"
        action={
          <ActionButton icon={Plus} className="w-full sm:w-auto" onClick={() => handleOpen()}>
            Nouvelle politique
          </ActionButton>
        }
      />

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Rechercher par audience ou type/groupe de ressource..."
      />

      {isPanelOpen && (
        <div ref={panelRef}>
          <PanelForm
            title={editingPolicy ? "Modifier la politique" : "Nouvelle politique"}
            onSubmit={handleSubmit}
            onCancel={() => setIsPanelOpen(false)}
            pending={isPending}
            submitLabel={editingPolicy ? "Mettre à jour" : "Créer"}
            error={errorMessage}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Audience" required>
                <select
                  value={formData.audienceType}
                  onChange={(e) => setFormData({ ...formData, audienceType: e.target.value })}
                  className={FIELD_SOFT}
                >
                  {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type de ressource">
                <input
                  value={formData.resourceTypeCode}
                  onChange={(e) => setFormData({ ...formData, resourceTypeCode: e.target.value })}
                  placeholder="ex: MEETING_ROOM"
                  className={FIELD_SOFT}
                />
              </Field>
              <Field label="Groupe de ressource">
                <input
                  value={formData.resourceGroupCode}
                  onChange={(e) => setFormData({ ...formData, resourceGroupCode: e.target.value })}
                  placeholder="ex: ROOMS"
                  className={FIELD_SOFT}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {NUMBER_FIELDS.map((f) => (
                <Field
                  key={f.key}
                  label={f.label}
                  hint={f.duration && formData[f.key] > 0 ? `= ${formatDuration(formData[f.key])}` : undefined}
                >
                  <input
                    type="number"
                    min="0"
                    value={formData[f.key]}
                    onChange={(e) => setFormData({ ...formData, [f.key]: parseInt(e.target.value) || 0 })}
                    className={FIELD_SOFT}
                  />
                </Field>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Switch
                checked={formData.approvalRequired}
                onChange={(v) => setFormData({ ...formData, approvalRequired: v })}
                label="Approbation requise"
              />
              <Switch
                checked={formData.active}
                onChange={(v) => setFormData({ ...formData, active: v })}
                label="Actif"
              />
            </div>
          </PanelForm>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : filteredPolicies.length === 0 ? (
        <EmptyState icon={Shield} title="Aucune politique trouvée" />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>Audience</span>
            <span>Type / Groupe</span>
            <span>Approbation</span>
            <span>Actives max</span>
            <span>Par jour</span>
            <span>No-show/mois</span>
            <span>Durée max</span>
            <span>Statut</span>
            <span />
          </HeadRow>

          <div className="space-y-2">
            {filteredPolicies.map((policy) => {
              const audience = AUDIENCE_LABELS[policy.audienceType] ?? policy.audienceType;
              const scope =
                [policy.resourceTypeCode, policy.resourceGroupCode].filter(Boolean).join(" / ") || "Toutes";
              return (
                <div
                  key={policy.id}
                  className={`rounded-2xl bg-gray-50 p-3 ${ROW_HOVER} ${!policy.active ? "opacity-60" : ""}`}
                >
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <span className="truncate text-sm font-semibold text-gray-900">{audience}</span>
                    <span className="truncate text-sm text-gray-600">{scope}</span>
                    <span>
                      <StatusChip tone={policy.approvalRequired ? "warn" : "success"}>
                        {policy.approvalRequired ? "Requise" : "Non"}
                      </StatusChip>
                    </span>
                    <span className="text-sm text-gray-700">{policy.maxActiveBookings}</span>
                    <span className="text-sm text-gray-700">{policy.maxBookingsPerDay}</span>
                    <span className="text-sm text-gray-700">{policy.maxNoShowsPerMonth}</span>
                    <span className="text-sm text-gray-700">{formatDuration(policy.maxBookingDurationMinutes)}</span>
                    <span>
                      <StatusChip tone={policy.active ? "success" : "neutral"}>
                        {policy.active ? "Actif" : "Inactif"}
                      </StatusChip>
                    </span>
                    <div className="flex justify-end">
                      <IconButton icon={Pencil} label="Modifier" onClick={() => handleOpen(policy)} />
                    </div>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{audience}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{scope}</p>
                      </div>
                      <StatusChip tone={policy.active ? "success" : "neutral"}>
                        {policy.active ? "Actif" : "Inactif"}
                      </StatusChip>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      {[
                        ["Approbation", policy.approvalRequired ? "Requise" : "Non"],
                        ["Actives max", String(policy.maxActiveBookings)],
                        ["Par jour", String(policy.maxBookingsPerDay)],
                        ["Durée max", formatDuration(policy.maxBookingDurationMinutes)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-white p-2">
                          <p className="text-gray-400">{label}</p>
                          <p className="font-bold text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <IconButton icon={Pencil} label="Modifier" onClick={() => handleOpen(policy)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
};
