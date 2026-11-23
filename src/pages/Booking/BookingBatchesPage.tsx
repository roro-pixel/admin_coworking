import React, { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Plus, Trash2, X } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BatchLine, BatchResponse, BookingPaymentMode, BookingUnit, LookupItem } from "../../services/booking.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ItemRow, ListHeader, PageHeader, Pagination, Section, StatusChip, Tag } from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, formatDateTime } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { ResourceAutocomplete } from "../../components/resources/ResourceAutocomplete";
import { withSeconds } from "../../components/resources/resKit";
import { useAuth } from "../../contexts/AuthContext";
import { BookingStatusChip, ErrorLines, OwnerPicker, PAYMENT_MODE_LABEL, UNIT_LABEL, errorList, errorText, label, money } from "../../components/bookings/bookingKit";

const PAGE_SIZE = 20;
const newKey = () => `lot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

interface LineForm {
  key: number;
  resourceCode: string;
  startedAt: string;
  endedAt: string;
  quantity: number;
  bookingUnit: BookingUnit | "";
  members: LookupItem[];
}

/** Liste de membres : puces + champ de recherche. */
const MemberChips: React.FC<{ value: LookupItem[]; onChange: (v: LookupItem[]) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <div className="space-y-2">
    {value.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {value.map((m) => (
          <span key={m.code} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-3 pr-1.5 text-sm font-semibold text-gray-800">
            {m.label}
            <button type="button" aria-label={`Retirer ${m.label}`} onClick={() => onChange(value.filter((x) => x.code !== m.code))} className="rounded-full p-0.5 hover:bg-gray-200">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
    )}
    <OwnerPicker
      value={null}
      types="MEMBER"
      placeholder={placeholder}
      onChange={(it) => it && !value.some((x) => x.code === it.code) && onChange([...value, it])}
    />
  </div>
);

const BatchResult: React.FC<{ batch: BatchResponse }> = ({ batch }) => (
  <div className="space-y-4">
    <Section title="Factures" description="Une facture par membre. Quand elle est entièrement payée, toutes ses réservations passent en confirmée.">
      <div className="grid gap-3 sm:grid-cols-2">
        {batch.invoices.map((inv) => (
          <ItemRow key={inv.documentNumber}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-gray-900">{inv.customerName || inv.customerCode}</p>
                <p className="font-mono text-xs text-gray-500">{inv.documentNumber}</p>
              </div>
              <StatusChip tone={inv.balanceDue <= 0 ? "success" : "warn"}>{inv.balanceDue <= 0 ? "Payée" : "À encaisser"}</StatusChip>
            </div>
            <p className="mt-3 text-sm text-gray-700">
              Total {money(inv.totalAmount, inv.currency)} · payé {money(inv.paidAmount, inv.currency)} ·{" "}
              <span className="font-bold">reste {money(inv.balanceDue, inv.currency)}</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">{inv.bookingNumbers.length} réservation(s)</p>
            <Link to={`/billing/documents/${inv.documentNumber}`} className="mt-3 inline-block text-sm font-semibold text-[color:var(--logo-pink-dark)] hover:underline">
              {inv.balanceDue > 0 ? "Encaisser sur la facture" : "Ouvrir la facture"}
            </Link>
          </ItemRow>
        ))}
      </div>
      {batch.uninvoicedBookingNumbers.length > 0 && (
        <div className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">Réservations sans facture (anomalie à signaler) :</p>
          <p className="font-mono">{batch.uninvoicedBookingNumbers.join(", ")}</p>
        </div>
      )}
    </Section>
    <Section title={`Réservations (${batch.bookings.length})`}>
      <div className="space-y-2">
        {batch.bookings.map((b) => (
          <Link key={b.bookingNumber} to={`/bookings/${b.bookingNumber}`} className="block">
            <ItemRow className="flex items-center justify-between gap-3 hover:bg-gray-50">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{b.resourceName} · {b.ownerName || b.contactName || b.ownerCode}</p>
                <p className="text-xs text-gray-500"><span className="font-mono">{b.bookingNumber}</span> · {formatDateTime(b.startedAt)} → {String(b.endedAt).slice(11, 16)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <BookingStatusChip status={b.status} />
                <span className="text-sm font-bold text-gray-900">{money(b.totalAmount, b.currency)}</span>
              </div>
            </ItemRow>
          </Link>
        ))}
      </div>
    </Section>
  </div>
);

const emptyLine = (key: number): LineForm => ({ key, resourceCode: "", startedAt: "", endedAt: "", quantity: 1, bookingUnit: "", members: [] });

const BatchForm: React.FC<{ onCancel: () => void; onCreated: (b: BatchResponse) => void }> = ({ onCancel, onCreated }) => {
  const idem = useRef(newKey());
  const seq = useRef(1);
  const [members, setMembers] = useState<LookupItem[]>([]);
  const [lines, setLines] = useState<LineForm[]>([emptyLine(0)]);
  const [paymentMode, setPaymentMode] = useState<BookingPaymentMode>("DIRECT");
  const [company, setCompany] = useState("");
  const [confirmNow, setConfirmNow] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const patch = (key: number, p: Partial<LineForm>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const count = lines.reduce((sum, l) => sum + (l.members.length || members.length), 0);
  const complete = lines.every((l) => l.resourceCode && l.startedAt && l.endedAt && l.endedAt > l.startedAt && (l.members.length || members.length));
  const valid = complete && count > 0 && count <= 200 && lines.length <= 50;

  const mutation = useMutation({
    mutationFn: () => {
      const body: BatchLine[] = lines.map((l) => ({
        resourceCode: l.resourceCode,
        startedAt: withSeconds(l.startedAt),
        endedAt: withSeconds(l.endedAt),
        quantity: l.quantity > 1 ? l.quantity : undefined,
        bookingUnit: l.bookingUnit || undefined,
        memberIds: l.members.length ? l.members.map((m) => m.code) : undefined,
      }));
      return bookingService.createBatch({
        memberIds: members.map((m) => m.code),
        lines: body,
        paymentMode,
        billingCompanyCode: company.trim() || undefined,
        confirmImmediately: confirmNow || undefined,
        sendEmail,
        notes: notes.trim() || undefined,
        idempotencyKey: idem.current,
      });
    },
    onSuccess: (b) => {
      toast.success(`Lot ${b.batchNumber} créé`);
      onCreated(b);
    },
    onError: (e) => {
      setError(errorText(e, "Création impossible"));
      setErrors(errorList(e));
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setErrors([]);
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <Section title="Membres" description="Chaque membre reçoit une seule facture pour tout le lot.">
        <MemberChips value={members} onChange={setMembers} placeholder="Ajouter un membre : nom, code ou courriel" />
      </Section>

      <Section title="Lignes" description="Une ligne par ressource et créneau. « Seulement pour » limite la ligne à certains membres.">
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.key} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Ligne {i + 1}</p>
                {lines.length > 1 && <IconButton icon={Trash2} label="Retirer la ligne" tone="danger" onClick={() => setLines(lines.filter((x) => x.key !== l.key))} />}
              </div>
              <Field label="Ressource" required>
                <ResourceAutocomplete selectedCode={l.resourceCode} onSelect={(r) => patch(l.key, { resourceCode: r?.code ?? "" })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Début" required><input type="datetime-local" step={900} value={l.startedAt} onChange={(e) => patch(l.key, { startedAt: e.target.value })} className={FIELD} /></Field>
                <Field label="Fin" required><input type="datetime-local" step={900} value={l.endedAt} onChange={(e) => patch(l.key, { endedAt: e.target.value })} className={FIELD} /></Field>
                <Field label="Quantité"><input type="number" min={1} value={l.quantity} onChange={(e) => patch(l.key, { quantity: Math.max(1, Number(e.target.value)) })} className={FIELD} /></Field>
                <Field label="Unité">
                  <select value={l.bookingUnit} onChange={(e) => patch(l.key, { bookingUnit: e.target.value as BookingUnit | "" })} className={FIELD}>
                    <option value="">Selon la ressource</option>
                    {Object.entries(UNIT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Seulement pour (facultatif)" hint="Vide : tous les membres du lot.">
                <MemberChips value={l.members} onChange={(v) => patch(l.key, { members: v })} placeholder="Limiter cette ligne à certains membres" />
              </Field>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <ActionButton variant="ghost" icon={Plus} disabled={lines.length >= 50} onClick={() => setLines([...lines, emptyLine(seq.current++)])}>Ajouter une ligne</ActionButton>
        </div>
      </Section>

      <Section title="Paiement et envoi">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode de paiement" required>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as BookingPaymentMode)} className={FIELD}>
              {Object.entries(PAYMENT_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Entreprise qui paie (facultatif)" hint="Code client de l'entreprise.">
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={FIELD} />
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold text-gray-800">
            <input type="checkbox" checked={confirmNow} onChange={(e) => setConfirmNow(e.target.checked)} className="h-4 w-4 accent-[color:var(--logo-pink-dark)]" />
            Confirmer tout de suite
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-gray-800">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 accent-[color:var(--logo-pink-dark)]" />
            Envoyer les courriels
          </label>
          <Field label="Notes" className="sm:col-span-2"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={FIELD} /></Field>
        </div>
      </Section>

      <ErrorLines message={error} lines={errors} />

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Aperçu : <span className="font-bold text-gray-900">{count}</span> réservation(s){count > 200 ? " (200 au plus)" : ""}. Les prix sont calculés à la création.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <ActionButton variant="ghost" onClick={onCancel} disabled={mutation.isPending}>Annuler</ActionButton>
          <ActionButton type="submit" pending={mutation.isPending} disabled={!valid}>Créer le lot</ActionButton>
        </div>
      </div>
    </form>
  );
};

/** Lot de ressources prédéfini (ex. salle + projecteur + café) réservé en une fois. */
const BundleForm: React.FC<{ onCancel: () => void; onCreated: (b: BatchResponse) => void }> = ({ onCancel, onCreated }) => {
  const idem = useRef(newKey());
  const [code, setCode] = useState("");
  const [members, setMembers] = useState<LookupItem[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [paymentMode, setPaymentMode] = useState<BookingPaymentMode>("DIRECT");
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const mutation = useMutation({
    mutationFn: () =>
      bookingService.bookBundle(code.trim(), {
        memberIds: members.map((m) => m.code),
        startedAt: withSeconds(start),
        endedAt: withSeconds(end),
        paymentMode,
        idempotencyKey: idem.current,
      }),
    onSuccess: (b) => {
      toast.success(`Lot ${b.batchNumber} créé`);
      onCreated(b);
    },
    onError: (e) => {
      setError(errorText(e, "Réservation impossible"));
      setErrors(errorList(e));
    },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setErrors([]);
        mutation.mutate();
      }}
    >
      <Section title="Lot de ressources" description="Code d'un lot défini dans l'onglet Lots de la gestion des espaces.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code du lot" required><input value={code} onChange={(e) => setCode(e.target.value)} className={FIELD} /></Field>
          <Field label="Mode de paiement">
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as BookingPaymentMode)} className={FIELD}>
              {Object.entries(PAYMENT_MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Début" required><input type="datetime-local" step={900} value={start} onChange={(e) => setStart(e.target.value)} className={FIELD} /></Field>
          <Field label="Fin" required><input type="datetime-local" step={900} value={end} onChange={(e) => setEnd(e.target.value)} className={FIELD} /></Field>
        </div>
        <div className="mt-4"><MemberChips value={members} onChange={setMembers} placeholder="Ajouter un membre" /></div>
      </Section>
      <ErrorLines message={error} lines={errors} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ActionButton variant="ghost" onClick={onCancel} disabled={mutation.isPending}>Annuler</ActionButton>
        <ActionButton type="submit" pending={mutation.isPending} disabled={!code.trim() || !start || !end || end <= start || members.length === 0}>Réserver le lot</ActionButton>
      </div>
    </form>
  );
};

export const BookingBatchesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [params, setParams] = useSearchParams();
  const selected = params.get("batch");
  const [mode, setMode] = useState<null | "batch" | "bundle">(null);
  const [created, setCreated] = useState<BatchResponse | null>(null);
  const [page, setPage] = useState(0);
  const canCreate = hasPermission("BOOKING:CREATE");

  const list = useQuery({ queryKey: ["booking-batches", page], queryFn: () => bookingService.getBatches({ page, size: PAGE_SIZE }) });
  const detail = useQuery({
    queryKey: ["booking-batch", selected],
    queryFn: () => bookingService.getBatch(selected!),
    enabled: !!selected && !created,
  });

  const open = (n: string | null) => {
    const next = new URLSearchParams(params);
    if (n) next.set("batch", n);
    else next.delete("batch");
    setParams(next);
  };
  const afterCreate = (b: BatchResponse) => {
    queryClient.invalidateQueries({ queryKey: ["booking-batches"] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    setMode(null);
    setCreated(b);
    open(b.batchNumber);
  };

  const shown = created && created.batchNumber === selected ? created : detail.data;

  if (mode) {
    return (
      <div className="space-y-5">
        <PageHeader title={mode === "batch" ? "Nouveau lot multi-ressources" : "Réserver un lot de ressources"} onBack={() => setMode(null)} backLabel="Lots" />
        {mode === "batch" ? <BatchForm onCancel={() => setMode(null)} onCreated={afterCreate} /> : <BundleForm onCancel={() => setMode(null)} onCreated={afterCreate} />}
      </div>
    );
  }

  if (selected) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={selected}
          subtitle={shown ? `${shown.bookingCount} réservation(s) · ${shown.memberCount} membre(s) · ${label(PAYMENT_MODE_LABEL, shown.paymentMode)}` : undefined}
          onBack={() => {
            setCreated(null);
            open(null);
          }}
          backLabel="Lots"
          actions={shown && <ActionButton variant="ghost" onClick={() => { setCreated(null); detail.refetch(); }}>Actualiser</ActionButton>}
        />
        {!shown ? (detail.isError ? <ErrorBlock message="Lot introuvable." onRetry={() => detail.refetch()} /> : <ListSkeleton />) : <BatchResult batch={shown} />}
      </div>
    );
  }

  const rows = list.data?.data ?? [];
  return (
    <div className="space-y-5">
      <ListHeader
        title="Lots multi-ressources"
        subtitle="Plusieurs ressources pour un ou plusieurs membres, avec une seule facture par membre."
        action={
          canCreate ? (
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="ghost" onClick={() => setMode("bundle")}>Lot de ressources</ActionButton>
              <ActionButton icon={Plus} onClick={() => setMode("batch")}>Nouveau lot</ActionButton>
            </div>
          ) : undefined
        }
      />
      {list.isLoading ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorBlock message="Impossible de charger les lots." onRetry={() => list.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Boxes} title="Aucun lot" hint="Créez un lot pour réserver plusieurs ressources d'un coup." />
      ) : (
        <DataCard>
          <div className="space-y-1">
            {rows.map((b) => (
              <button key={b.batchNumber} type="button" onClick={() => open(b.batchNumber)} className={`flex w-full flex-col gap-1 rounded-2xl px-4 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between ${ROW_HOVER}`}>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-900">{b.batchNumber}</p>
                  <p className="truncate text-xs text-gray-500">{b.notes || "Sans note"}{b.createdBy ? ` · ${b.createdBy}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                  <Tag>{b.bookingCount} réservation(s)</Tag>
                  <Tag>{b.memberCount} membre(s)</Tag>
                  <span className="text-xs text-gray-400">{formatDateTime(b.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </DataCard>
      )}
      <Pagination page={page} totalPages={Number(list.data?.pageable?.totalPages ?? 1)} total={Number(list.data?.pageable?.totalElements ?? rows.length)} noun="lots" onChange={setPage} />
    </div>
  );
};

export default BookingBatchesPage;
