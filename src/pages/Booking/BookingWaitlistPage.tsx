import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingPaymentMode, LookupItem, WaitlistEntry } from "../../services/booking.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ItemRow, ListHeader, PanelForm, Pagination, StatusChip, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { ResourceAutocomplete } from "../../components/resources/ResourceAutocomplete";
import { withSeconds } from "../../components/resources/resKit";
import { useAuth } from "../../contexts/AuthContext";
import { OwnerPicker, PAYMENT_MODE_LABEL, WAITLIST_LABEL, WAITLIST_TONE, errorReason, errorText, label, money, ownerFields } from "../../components/bookings/bookingKit";

const FILTERS: TabItem<string>[] = [
  { id: "", label: "Toutes" },
  { id: "WAITING", label: "En attente" },
  { id: "OFFERED", label: "Offres en cours" },
  { id: "BOOKED", label: "Réservées" },
  { id: "EXPIRED", label: "Expirées" },
  { id: "CANCELLED", label: "Annulées" },
];
const PAGE_SIZE = 20;

const JoinForm: React.FC<{ onDone: () => void; onCancel: () => void }> = ({ onDone, onCancel }) => {
  const [resource, setResource] = useState("");
  const [owner, setOwner] = useState<LookupItem | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<BookingPaymentMode>("DIRECT");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      bookingService.joinWaitlist({
        resourceCode: resource,
        identityLookup: ownerFields(owner),
        startedAt: withSeconds(start),
        endedAt: withSeconds(end),
        quantity: quantity > 1 ? quantity : undefined,
        paymentMode: mode,
      }),
    onSuccess: () => {
      toast.success("Inscrit sur la liste d'attente");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Inscription impossible")),
  });
  return (
    <PanelForm
      title="Inscrire sur la liste d'attente"
      pending={mutation.isPending}
      submitLabel="Inscrire"
      submitDisabled={!resource || !owner || !start || !end || end <= start}
      error={error}
      onCancel={onCancel}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Ressource" required><ResourceAutocomplete selectedCode={resource} onSelect={(r) => setResource(r?.code ?? "")} /></Field>
      <Field label="Client" required><OwnerPicker value={owner} onChange={setOwner} /></Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Début" required><input type="datetime-local" step={900} value={start} onChange={(e) => setStart(e.target.value)} className={FIELD} /></Field>
        <Field label="Fin" required><input type="datetime-local" step={900} value={end} onChange={(e) => setEnd(e.target.value)} className={FIELD} /></Field>
        <Field label="Quantité"><input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} className={FIELD} /></Field>
        <Field label="Paiement">
          <select value={mode} onChange={(e) => setMode(e.target.value as BookingPaymentMode)} className={FIELD}>
            {Object.entries(PAYMENT_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
    </PanelForm>
  );
};

export const BookingWaitlistPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("BOOKING:CREATE");
  const canCancel = hasPermission("BOOKING:CANCEL");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [joining, setJoining] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["booking-waitlist", status, page],
    queryFn: () => bookingService.getWaitlist({ status, page, size: PAGE_SIZE }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["booking-waitlist"] });

  const fail = (fallback: string) => (e: unknown) => {
    const r = errorReason(e);
    toast.error(r === "WAITLIST_OFFER_EXPIRED" || r === "WAITLIST_OFFER_NOT_OPEN" ? errorText(e, "Cette offre n'est plus disponible") : apiMessage(e, fallback));
    refresh();
  };
  const accept = useMutation({
    mutationFn: (id: number | string) => bookingService.acceptWaitlist(id),
    onSuccess: (w) => {
      toast.success("Offre acceptée, réservation créée");
      refresh();
      if (w.bookingNumber) navigate(`/bookings/${w.bookingNumber}`);
    },
    onError: fail("Acceptation impossible"),
  });
  const decline = useMutation({
    mutationFn: (id: number | string) => bookingService.declineWaitlist(id),
    onSuccess: () => {
      toast.success("Offre refusée");
      refresh();
    },
    onError: fail("Action impossible"),
  });
  const promote = useMutation({
    mutationFn: () => bookingService.promoteWaitlist(),
    onSuccess: (n) => {
      toast.success(`${n} offre(s) envoyée(s)`);
      refresh();
    },
    onError: fail("Action impossible"),
  });
  const expire = useMutation({
    mutationFn: () => bookingService.expireWaitlistOffers(),
    onSuccess: (n) => {
      toast.success(`${n} offre(s) expirée(s)`);
      refresh();
    },
    onError: fail("Action impossible"),
  });

  const cancel = (w: WaitlistEntry) =>
    toast.confirm({
      tone: "danger",
      message: "Retirer cette demande de la liste d'attente ?",
      confirmLabel: "Retirer",
      successMessage: "Demande retirée",
      errorMessage: "Action impossible",
      onConfirm: async () => {
        await bookingService.cancelWaitlist(w.id);
        refresh();
      },
    });

  const rows = data?.data ?? [];
  return (
    <div className="space-y-5">
      <ListHeader
        title="Liste d'attente"
        subtitle="Quand une place se libère, la première demande reçoit une offre limitée dans le temps."
        action={
          canCreate ? (
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="ghost" icon={RefreshCw} pending={promote.isPending} onClick={() => promote.mutate()}>Proposer les places libres</ActionButton>
              <ActionButton variant="ghost" icon={Clock} pending={expire.isPending} onClick={() => expire.mutate()}>Expirer les offres</ActionButton>
              <ActionButton icon={Plus} onClick={() => setJoining(true)}>Inscrire</ActionButton>
            </div>
          ) : undefined
        }
      />
      {joining && <JoinForm onDone={() => { setJoining(false); refresh(); }} onCancel={() => setJoining(false)} />}
      <Tabs items={FILTERS} active={status} onChange={(s) => { setStatus(s); setPage(0); }} variant="soft" />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger la liste d'attente." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Clock} title="Personne en attente" />
      ) : (
        <DataCard>
          <div className="space-y-2">
            {rows.map((w) => (
              <ItemRow key={String(w.id)} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{w.contactName || w.ownerCode || "Client"} · {w.resourceName || w.resourceCode}</p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(w.startedAt)} → {String(w.endedAt).slice(11, 16)}
                    {w.quantity && w.quantity > 1 ? ` · ${w.quantity} places` : ""}
                    {w.expiresAt && w.status === "OFFERED" ? ` · offre valable jusqu'au ${formatDateTime(w.expiresAt)}` : ""}
                  </p>
                  {(w.alternatives ?? []).length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      Alternatives : {w.alternatives!.map((a) => `${a.resourceName} ${String(a.startedAt).slice(11, 16)} (${money(a.estimatedAmount)})`).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusChip tone={WAITLIST_TONE[w.status] ?? "neutral"}>{label(WAITLIST_LABEL, w.status)}</StatusChip>
                  {canCreate && w.status === "OFFERED" && (
                    <>
                      <IconButton icon={Check} label="Accepter l'offre" tone="success" pending={accept.isPending && accept.variables === w.id} onClick={() => accept.mutate(w.id)} />
                      <IconButton icon={X} label="Refuser l'offre" tone="danger" pending={decline.isPending && decline.variables === w.id} onClick={() => decline.mutate(w.id)} />
                    </>
                  )}
                  {canCancel && (w.status === "WAITING" || w.status === "OFFERED") && <IconButton icon={Trash2} label="Retirer de la liste" tone="danger" onClick={() => cancel(w)} />}
                </div>
              </ItemRow>
            ))}
          </div>
        </DataCard>
      )}
      <Pagination page={page} totalPages={Number(data?.pageable?.totalPages ?? 1)} total={Number(data?.pageable?.totalElements ?? rows.length)} noun="demandes" onChange={setPage} />
    </div>
  );
};

export default BookingWaitlistPage;
