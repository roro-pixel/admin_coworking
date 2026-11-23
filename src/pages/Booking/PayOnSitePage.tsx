import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Search } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { LookupItem, PayOnSiteGrant } from "../../services/booking.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, ItemRow, ListHeader, PanelForm, Section, StatusChip, Switch } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatDateTime } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { BookingStatusChip, OWNER_LABEL, OwnerPicker, label, money, todayIso } from "../../components/bookings/bookingKit";

const ReliabilityBadge: React.FC<{ ownerType: string; ownerCode: string }> = ({ ownerType, ownerCode }) => {
  const { data } = useQuery({ queryKey: ["booking-reliability", ownerType, ownerCode], queryFn: () => bookingService.getReliability(ownerType, ownerCode), retry: false });
  if (!data) return null;
  const tone = data.score >= data.threshold ? "success" : "danger";
  return (
    <span className="flex flex-wrap items-center gap-2">
      <StatusChip tone={tone}>Fiabilité {data.score}/100</StatusChip>
      {data.guaranteeRequired && <StatusChip tone="warn">Garantie exigée{data.depositRate ? ` (${Math.round(data.depositRate * 100)} %)` : ""}</StatusChip>}
      <span className="text-xs text-gray-500">{data.bookings} réservation(s), {data.noShows} absence(s), {data.lateCancellations} annulation(s) tardive(s) sur {data.windowDays} j</span>
    </span>
  );
};

const GrantForm: React.FC<{ owner: LookupItem; onDone: () => void; onCancel: () => void }> = ({ owner, onDone, onCancel }) => {
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const current = useQuery({ queryKey: ["booking-pos-access", owner.type, owner.code], queryFn: () => bookingService.getPayOnSiteAccess(owner.type, owner.code) });
  const mutation = useMutation({
    mutationFn: () => bookingService.setPayOnSite(owner.type, owner.code, { enabled, reason: reason.trim() || undefined }),
    onSuccess: () => {
      toast.success(enabled ? "Règlement sur place autorisé" : "Règlement sur place retiré");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Modification impossible")),
  });
  return (
    <PanelForm
      title={`Règlement sur place : ${owner.label}`}
      pending={mutation.isPending}
      submitLabel="Enregistrer"
      submitDisabled={!enabled && !reason.trim()}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      {current.data && (
        <p className="text-sm text-gray-600">
          Actuellement : {current.data.allowed ? "autorisé" : "non autorisé"}
          {current.data.source === "GLOBAL_SETTING" ? " (réglage général)" : current.data.source === "CLIENT_OPTION" ? " (option du client)" : ""}.
        </p>
      )}
      <ReliabilityBadge ownerType={owner.type} ownerCode={owner.code} />
      <Switch checked={enabled} onChange={setEnabled} label="Autoriser le règlement sur place" hint="Le client pourra réserver sans payer d'avance." />
      <Field label={enabled ? "Motif (facultatif)" : "Motif"} required={!enabled}>
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={FIELD} />
      </Field>
    </PanelForm>
  );
};

export const PayOnSitePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BOOKING:UPDATE");
  const [owner, setOwner] = useState<LookupItem | null>(null);
  const [date, setDate] = useState(todayIso());

  const grants = useQuery({ queryKey: ["booking-pos-grants"], queryFn: () => bookingService.getPayOnSiteGrants() });
  const due = useQuery({ queryKey: ["booking-pos-due", date], queryFn: () => bookingService.getPayOnSiteDue(date) });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["booking-pos-grants"] });
    queryClient.invalidateQueries({ queryKey: ["booking-pos-access"] });
    queryClient.invalidateQueries({ queryKey: ["booking-reliability"] });
  };
  const edit = (g: PayOnSiteGrant) => setOwner({ type: g.ownerType, code: g.ownerCode, label: g.ownerCode });

  return (
    <div className="space-y-5">
      <ListHeader title="Règlement sur place" subtitle="Clients autorisés à payer à l'arrivée, fiabilité et sommes à encaisser." />

      <Section title="Autoriser ou retirer pour un client" icon={Search}>
        <OwnerPicker value={owner} onChange={setOwner} />
      </Section>
      {owner && canUpdate && <GrantForm owner={owner} onDone={() => { setOwner(null); refresh(); }} onCancel={() => setOwner(null)} />}

      <Section title="Clients concernés">
        {grants.isLoading ? (
          <ListSkeleton />
        ) : grants.isError ? (
          <ErrorBlock message="Impossible de charger les clients." onRetry={() => grants.refetch()} />
        ) : (grants.data ?? []).length === 0 ? (
          <EmptyState icon={Banknote} title="Aucun réglage par client" hint="Le réglage général s'applique à tous." />
        ) : (
          <div className="space-y-2">
            {(grants.data ?? []).map((g) => (
              <ItemRow key={`${g.ownerType}-${g.ownerCode}`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{g.ownerCode} <span className="text-xs font-normal text-gray-500">· {label(OWNER_LABEL, g.ownerType)}</span></p>
                  <p className="text-xs text-gray-500">
                    {g.reason}
                    {g.revokedAutomatically ? " · retiré automatiquement" : ""}
                    {g.updatedBy ? ` · ${g.updatedBy}` : ""}
                    {g.updatedAt ? ` · ${formatDateTime(g.updatedAt)}` : ""}
                  </p>
                  <ReliabilityBadge ownerType={g.ownerType} ownerCode={g.ownerCode} />
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip tone={g.enabled ? "success" : "neutral"}>{g.enabled ? "Autorisé" : "Non autorisé"}</StatusChip>
                  {canUpdate && <ActionButton variant="ghost" onClick={() => edit(g)}>Modifier</ActionButton>}
                </div>
              </ItemRow>
            ))}
          </div>
        )}
      </Section>

      <Section title="À encaisser sur place" action={<input type="date" value={date} onChange={(e) => setDate(e.target.value || todayIso())} className={`${FIELD} w-44`} aria-label="Date" />}>
        {due.isLoading ? (
          <ListSkeleton />
        ) : due.isError ? (
          <ErrorBlock message="Impossible de charger les sommes à encaisser." onRetry={() => due.refetch()} />
        ) : (due.data ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">Rien à encaisser le {formatDate(date)}.</p>
        ) : (
          <DataCard>
            <div className="space-y-2">
              {(due.data ?? []).map((b) => (
                <button key={b.bookingNumber} type="button" onClick={() => navigate(`/bookings/${b.bookingNumber}`)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white p-4 text-left shadow-sm hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{b.ownerName || b.contactName || b.ownerCode} · {b.resourceName}</p>
                    <p className="text-xs text-gray-500"><span className="font-mono">{b.bookingNumber}</span> · {formatDateTime(b.startedAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <BookingStatusChip status={b.status} />
                    <span className="text-sm font-bold text-gray-900">{money(b.grandTotal ?? b.totalAmount, b.currency)}</span>
                  </div>
                </button>
              ))}
            </div>
          </DataCard>
        )}
      </Section>
    </div>
  );
};

export default PayOnSitePage;
