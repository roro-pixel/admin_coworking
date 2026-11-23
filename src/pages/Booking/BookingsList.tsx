import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { LookupItem } from "../../services/booking.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, FilterButton, FilterPanel, HeadRow, ListHeader, Pagination, SearchField, Tag } from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, formatDateTime } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { Cell, useDebounced } from "../../components/resources/resKit";
import { RefreshButton } from "../../components/reporting/reportKit";
import { ResourceAutocomplete } from "../../components/resources/ResourceAutocomplete";
import { useAuth } from "../../contexts/AuthContext";
import { BookingStatusChip, OwnerPicker, PaymentChip, STATUSES, STATUS_LABEL, money } from "../../components/bookings/bookingKit";

const COLS = "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_7rem_6rem]";
const PAGE_SIZE = 20;
const SORTS: { value: string; label: string }[] = [
  { value: "startedAt,desc", label: "Début, du plus récent" },
  { value: "startedAt,asc", label: "Début, du plus ancien" },
  { value: "createdAt,desc", label: "Création, la plus récente" },
  { value: "totalAmount,desc", label: "Montant, du plus élevé" },
  { value: "bookingNumber,desc", label: "Numéro" },
  { value: "contactName,asc", label: "Contact, A à Z" },
  { value: "resourceCode,asc", label: "Ressource, A à Z" },
];

export const BookingsList: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [resourceCode, setResourceCode] = useState("");
  const [owner, setOwner] = useState<LookupItem | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState(SORTS[0].value);
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const q = useDebounced(search.trim());

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["bookings", q, status, resourceCode, owner?.type, owner?.code, from, to, sort, page],
    queryFn: () =>
      bookingService.getBookings({
        query: q,
        status,
        resourceCode,
        ownerType: owner?.type,
        ownerCode: owner?.code,
        startedFrom: from ? `${from}T00:00:00` : undefined,
        startedTo: to ? `${to}T23:59:59` : undefined,
        page,
        size: PAGE_SIZE,
        sort,
      }),
  });
  const rows = data?.data ?? [];
  const total = Number(data?.pageable?.totalElements ?? rows.length);
  const totalPages = Number(data?.pageable?.totalPages ?? 1);
  const active = !!(status || resourceCode || owner || from || to);
  const reset = () => {
    setStatus("");
    setResourceCode("");
    setOwner(null);
    setFrom("");
    setTo("");
    setPage(0);
  };

  return (
    <div className="space-y-5">
      <ListHeader
        title="Réservations"
        subtitle="Toutes les réservations, de la plus récente à la plus ancienne par défaut."
        action={
          <div className="flex items-center gap-2">
            <RefreshButton fetching={isFetching} onClick={() => refetch()} />
            {hasPermission("BOOKING:CREATE") && (
              <ActionButton icon={Plus} onClick={() => navigate("/bookings/create")}>Nouvelle réservation</ActionButton>
            )}
          </div>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Numéro, contact, ressource…" className="flex-1" />
        <FilterButton open={open} active={active} onClick={() => setOpen(!open)} />
      </div>
      {open && (
        <FilterPanel canReset={active} onReset={reset}>
          <Field label="Statut">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={FIELD}>
              <option value="">Tous</option>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Ressource">
            <ResourceAutocomplete selectedCode={resourceCode} onSelect={(r) => { setResourceCode(r?.code ?? ""); setPage(0); }} placeholder="Toutes les ressources" />
          </Field>
          <Field label="Titulaire">
            <OwnerPicker value={owner} onChange={(o) => { setOwner(o); setPage(0); }} />
          </Field>
          <Field label="Début à partir du">
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={FIELD} />
          </Field>
          <Field label="Début jusqu'au">
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={FIELD} />
          </Field>
          <Field label="Tri">
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} className={FIELD}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </FilterPanel>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les réservations." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Aucune réservation" hint={active || q ? "Aucune réservation ne correspond à ces critères." : "Les réservations apparaîtront ici."} />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>Numéro</span><span>Ressource</span><span>Titulaire</span><span>Créneau</span><span>Statut</span><span className="text-right">Total</span>
          </HeadRow>
          <div className="space-y-1">
            {rows.map((b) => (
              <div
                key={b.bookingNumber}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/bookings/${b.bookingNumber}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/bookings/${b.bookingNumber}`)}
                className={`grid cursor-pointer grid-cols-1 items-center gap-2 rounded-2xl px-4 py-3 transition lg:gap-4 ${COLS} ${ROW_HOVER}`}
              >
                <Cell title="Numéro">
                  <span className="font-mono text-sm font-semibold text-gray-900">{b.bookingNumber}</span>
                  {!!b.modificationCount && <span className="ml-2"><Tag>Modifiée {b.modificationCount}×</Tag></span>}
                </Cell>
                <Cell title="Ressource"><span className="block truncate text-sm text-gray-900">{b.resourceName}</span></Cell>
                <Cell title="Titulaire">
                  <span className="block truncate text-sm text-gray-900">{b.ownerName || b.contactName || b.ownerCode}</span>
                  {b.payOnSite && <span className="text-xs font-semibold text-amber-700">À régler sur place</span>}
                </Cell>
                <Cell title="Créneau">
                  <span className="text-sm text-gray-700">{formatDateTime(b.startedAt)} → {String(b.endedAt).slice(11, 16)}</span>
                </Cell>
                <Cell title="Statut">
                  <span className="flex flex-wrap gap-1"><BookingStatusChip status={b.status} /><PaymentChip status={b.paymentStatus === "PENDING" ? "PENDING" : undefined} text="À payer" /></span>
                </Cell>
                <Cell title="Total" className="lg:text-right"><span className="text-sm font-bold text-gray-900">{money(b.grandTotal ?? b.totalAmount, b.currency)}</span></Cell>
              </div>
            ))}
          </div>
        </DataCard>
      )}
      <Pagination page={page} totalPages={totalPages} total={total} noun="réservations" onChange={setPage} />
    </div>
  );
};

export default BookingsList;
