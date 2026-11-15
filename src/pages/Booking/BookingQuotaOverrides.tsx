import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Plus } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingQuotaOverride } from "../../services/booking.service";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "../../components/ui/toastStore";
import { TableSkeleton } from "../../components/ui/Skeleton";
import {
  ActionButton,
  DataCard,
  EmptyState,
  Field,
  HeadRow,
  ListHeader,
  PanelForm,
  StatusChip,
  Tabs,
} from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD_SOFT, ROW_HOVER, apiMessage, formatDate } from "../../components/subscription/kitUtils";

type OwnerType = "MEMBER" | "CUSTOMER" | "BUSINESS_ENTITY";

const OWNER_TYPES: Record<OwnerType, { label: string; codeLabel: string; placeholder: string }> = {
  MEMBER: { label: "Membre", codeLabel: "Code membre", placeholder: "MBR-00001" },
  CUSTOMER: { label: "Customer", codeLabel: "Code customer", placeholder: "CUS-00001" },
  BUSINESS_ENTITY: { label: "Business", codeLabel: "Code business", placeholder: "BUS-00001" },
};

const OWNER_TABS: TabItem<OwnerType>[] = (Object.keys(OWNER_TYPES) as OwnerType[]).map((id) => ({
  id,
  label: OWNER_TYPES[id].label,
}));

const COLS =
  "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_6rem]";

const buildDefaultFormData = () => ({
  resourceCode: "",
  extraActiveBookings: 0,
  extraBookingsPerDay: 0,
  extraBookingsPerWeek: 0,
  extraBookingsPerMonth: 0,
  reason: "",
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: "",
});

type ExtraKey =
  | "extraActiveBookings"
  | "extraBookingsPerDay"
  | "extraBookingsPerWeek"
  | "extraBookingsPerMonth";

const EXTRAS: { key: ExtraKey; label: string }[] = [
  { key: "extraActiveBookings", label: "Réservations actives +" },
  { key: "extraBookingsPerDay", label: "Par jour +" },
  { key: "extraBookingsPerWeek", label: "Par semaine +" },
  { key: "extraBookingsPerMonth", label: "Par mois +" },
];

export const BookingQuotaOverrides: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const panelRef = useRef<HTMLDivElement>(null);

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [ownerType, setOwnerType] = useState<OwnerType>("MEMBER");
  const [ownerCode, setOwnerCode] = useState("");
  const [formData, setFormData] = useState(buildDefaultFormData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Remise à zéro complète à chaque ouverture
  useEffect(() => {
    if (isPanelOpen) {
      setOwnerType("MEMBER");
      setOwnerCode("");
      setFormData(buildDefaultFormData());
      setErrorMessage(null);
      setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [isPanelOpen]);

  const { data: overridesRaw, isLoading } = useQuery({
    queryKey: ["booking-quota-overrides"],
    queryFn: () => bookingService.getQuotaOverrides(),
  });

  // Wrapper défensif
  const overrides: BookingQuotaOverride[] = Array.isArray(overridesRaw)
    ? overridesRaw
    : (overridesRaw as any)?.data || (overridesRaw as any)?.content || [];

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        ownerType,
        ownerCode,
        reason: formData.reason,
        approvedBy: admin?.email || "admin",
        extraActiveBookings: formData.extraActiveBookings,
        extraBookingsPerDay: formData.extraBookingsPerDay,
        extraBookingsPerWeek: formData.extraBookingsPerWeek,
        extraBookingsPerMonth: formData.extraBookingsPerMonth,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil || undefined,
      };
      if (formData.resourceCode) payload.resourceCode = formData.resourceCode;
      return bookingService.createQuotaOverride(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-quota-overrides"] });
      setIsPanelOpen(false);
      toast.success("Dérogation créée");
    },
    onError: (error: unknown) =>
      setErrorMessage(apiMessage(error, "Erreur lors de la création de la dérogation.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerCode.trim()) {
      setErrorMessage("Le code du bénéficiaire est obligatoire.");
      return;
    }
    if (!formData.reason.trim()) {
      setErrorMessage("Le motif est obligatoire.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  const owner = OWNER_TYPES[ownerType];

  return (
    <div className="space-y-5">
      <ListHeader
        title="Dérogations de quotas"
        action={
          <ActionButton icon={Plus} className="w-full sm:w-auto" onClick={() => setIsPanelOpen(true)}>
            Nouvelle dérogation
          </ActionButton>
        }
      />

      {isPanelOpen && (
        <div ref={panelRef}>
          <PanelForm
            title="Nouvelle dérogation de quota"
            onSubmit={handleSubmit}
            onCancel={() => setIsPanelOpen(false)}
            pending={createMutation.isPending}
            submitLabel="Créer"
            error={errorMessage}
          >
            <Field label="Type de bénéficiaire" required>
              <Tabs
                items={OWNER_TABS}
                active={ownerType}
                variant="soft"
                onChange={(t) => {
                  setOwnerType(t);
                  setOwnerCode("");
                }}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={owner.codeLabel} required>
                <input
                  value={ownerCode}
                  onChange={(e) => setOwnerCode(e.target.value)}
                  placeholder={owner.placeholder}
                  required
                  className={FIELD_SOFT}
                />
              </Field>
              <Field label="Ressource spécifique" hint="Laisser vide pour toutes les ressources">
                <input
                  value={formData.resourceCode}
                  onChange={(e) => setFormData({ ...formData, resourceCode: e.target.value })}
                  placeholder="ROOM-001"
                  className={FIELD_SOFT}
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-600">Quotas supplémentaires accordés</p>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {EXTRAS.map((x) => (
                  <Field key={x.key} label={x.label}>
                    <input
                      type="number"
                      min="0"
                      value={formData[x.key]}
                      onChange={(e) => setFormData({ ...formData, [x.key]: parseInt(e.target.value) || 0 })}
                      className={FIELD_SOFT}
                    />
                  </Field>
                ))}
              </div>
            </div>

            <Field label="Motif" required>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={2}
                required
                placeholder="Ex : événement exceptionnel, client VIP..."
                className={`${FIELD_SOFT} resize-none`}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Valide du" required>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  required
                  className={FIELD_SOFT}
                />
              </Field>
              <Field label="Valide au" hint="Laisser vide pour une durée illimitée">
                <input
                  type="date"
                  value={formData.validUntil}
                  min={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className={FIELD_SOFT}
                />
              </Field>
            </div>
          </PanelForm>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : overrides.length === 0 ? (
        <EmptyState icon={Award} title="Aucune dérogation" />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>N°</span>
            <span>Bénéficiaire</span>
            <span>Ressource</span>
            <span>Extras (actives / jour / semaine / mois)</span>
            <span>Période et motif</span>
            <span>Statut</span>
          </HeadRow>

          <div className="space-y-2">
            {overrides.map((o) => {
              const extras = `+${o.extraActiveBookings} / +${o.extraBookingsPerDay} / +${o.extraBookingsPerWeek} / +${o.extraBookingsPerMonth}`;
              const ownerLabel = OWNER_TYPES[o.ownerType as OwnerType]?.label ?? o.ownerType;
              return (
                <div
                  key={o.overrideNumber}
                  className={`rounded-2xl bg-gray-50 p-3 ${ROW_HOVER} ${!o.active ? "opacity-60" : ""}`}
                >
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <span className="truncate font-mono text-xs text-gray-500">{o.overrideNumber}</span>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-gray-900">{o.ownerCode}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{ownerLabel}</p>
                    </div>
                    <span className="truncate text-sm text-gray-700">{o.resourceCode || "Toutes"}</span>
                    <span className="text-sm font-semibold text-emerald-700">{extras}</span>
                    <div className="min-w-0 text-sm text-gray-700">
                      <p>
                        Du {formatDate(o.validFrom)}
                        {o.validUntil && ` au ${formatDate(o.validUntil)}`}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-400" title={o.reason}>
                        {o.reason}
                      </p>
                    </div>
                    <span>
                      <StatusChip tone={o.active ? "success" : "neutral"}>{o.active ? "Actif" : "Inactif"}</StatusChip>
                    </span>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold text-gray-900">{o.ownerCode}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-500">{o.overrideNumber}</p>
                      </div>
                      <StatusChip tone={o.active ? "success" : "neutral"}>{o.active ? "Actif" : "Inactif"}</StatusChip>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-emerald-700">{extras}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {o.resourceCode || "Toutes les ressources"} · du {formatDate(o.validFrom)}
                      {o.validUntil && ` au ${formatDate(o.validUntil)}`}
                    </p>
                    <p className="mt-2 rounded-xl bg-white p-2 text-xs text-gray-600">{o.reason}</p>
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
