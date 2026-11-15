import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Banknote, Plus, X } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashMovement, CreateCashMovementPayload } from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { brandVars } from "../../components/layout/adminTheme";
import {
  ActionButton,
  DataCard,
  Detail,
  EmptyState,
  ErrorBlock,
  Field,
  FilterButton,
  FilterPanel,
  HeadRow,
  IconButton,
  ListHeader,
  PanelForm,
  Pagination,
  SearchField,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD_SOFT, FOCUS, ROW_HOVER, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { Dots } from "../../components/ui/Toaster";
import { toast } from "../../components/ui/toastStore";
import { ListSkeleton } from "../../components/ui/Skeleton";
import {
  MANUAL_MOVEMENT_TYPES,
  MOVEMENT_STATUS,
  MOVEMENT_TYPES,
  REASON_REQUIRED_TYPES,
} from "../../components/payment/paymentLabels";

type ManualCashMovementType = CreateCashMovementPayload["movementType"];
type Channel = NonNullable<CreateCashMovementPayload["channel"]>;

interface CashMovementsListProps {
  /** Si renseigné, la liste est limitée à cette session (affichage intégré, sans filtres) */
  sessionNumber?: string;
}

const COLS = "lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_9rem_9rem]";

const buildDefaultFormData = () => ({
  movementType: "CASH_IN" as ManualCashMovementType,
  amount: 0,
  reason: "",
  documentType: "",
  documentNumber: "",
  flowCategory: "",
  referenceType: "",
  referenceCode: "",
  counterpartyType: "",
  counterpartyCode: "",
  counterpartyName: "",
  subCategory: "",
  tags: "",
  deviceCode: "",
  deviceIp: "",
  channel: "MANUAL" as Channel,
  metadataJson: "",
});

const typeLabel = (t: string) => MOVEMENT_TYPES[t]?.label ?? t;

export const CashMovementsList: React.FC<CashMovementsListProps> = ({ sessionNumber }) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const isEmbedded = !!sessionNumber;

  const [sessionFilter, setSessionFilter] = useState(sessionNumber || "");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(buildDefaultFormData);
  const [selectedMovement, setSelectedMovement] = useState<CashMovement | null>(null);

  const { data: sessionsData } = useQuery({
    queryKey: ["cash-sessions-open"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
    enabled: !isEmbedded,
  });
  const openSessions = sessionsData?.content || [];

  const { data: movementsData, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["cash-movements", sessionFilter, typeFilter, searchText, fromDate, toDate, page, sessionNumber],
    queryFn: () =>
      paymentService.getCashMovements({
        sessionNumber: sessionFilter || sessionNumber || undefined,
        movementType: typeFilter || undefined,
        searchText: searchText || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        size: isEmbedded ? 100 : 20,
        sort: "createdAt,desc",
      }),
  });
  const movements: CashMovement[] = movementsData?.content || [];
  const totalPages = movementsData?.totalPages ?? 0;
  const totalElements = movementsData?.totalElements ?? 0;

  const reasonRequired = REASON_REQUIRED_TYPES.includes(formData.movementType);

  const createMutation = useMutation({
    mutationFn: () =>
      paymentService.createCashMovement({
        sessionNumber: sessionFilter || sessionNumber!,
        movementType: formData.movementType,
        amount: formData.amount,
        reason: formData.reason || undefined,
        documentType: formData.documentType || undefined,
        documentNumber: formData.documentNumber || undefined,
        flowCategory: formData.flowCategory || undefined,
        referenceType: formData.referenceType || undefined,
        referenceCode: formData.referenceCode || undefined,
        counterpartyType: formData.counterpartyType || undefined,
        counterpartyCode: formData.counterpartyCode || undefined,
        counterpartyName: formData.counterpartyName || undefined,
        subCategory: formData.subCategory || undefined,
        tags: formData.tags || undefined,
        deviceCode: formData.deviceCode || undefined,
        deviceIp: formData.deviceIp || undefined,
        channel: formData.channel,
        metadataJson: formData.metadataJson || undefined,
        createdBy: admin?.email || String(admin?.id || "admin"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-movements"] });
      queryClient.invalidateQueries({ queryKey: ["cash-metrics-overview"] });
      setIsFormOpen(false);
      toast.success("Mouvement enregistré");
    },
    onError: (e: unknown) => setErrorMessage(apiMessage(e, "Erreur lors de la création du mouvement.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0) return setErrorMessage("Le montant doit être supérieur à 0.");
    if (reasonRequired && !formData.reason.trim()) {
      return setErrorMessage(`Le motif est obligatoire pour un mouvement de type « ${typeLabel(formData.movementType)} ».`);
    }
    if (!(sessionFilter || sessionNumber)) return setErrorMessage("Veuillez sélectionner une session ouverte.");
    setErrorMessage(null);
    createMutation.mutate();
  };

  const openForm = () => {
    setFormData(buildDefaultFormData());
    setErrorMessage(null);
    setIsFormOpen(true);
  };

  const resetFilters = () => {
    if (!isEmbedded) setSessionFilter("");
    setTypeFilter("");
    setSearchText("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const hasFilters = !!((!isEmbedded && sessionFilter) || typeFilter || fromDate || toDate);
  const set = <K extends keyof ReturnType<typeof buildDefaultFormData>>(k: K, v: ReturnType<typeof buildDefaultFormData>[K]) =>
    setFormData((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Mouvements de caisse"
        subtitle={isEmbedded ? undefined : "Entrées, sorties, paiements, ajustements et justificatifs associés."}
        action={
          <ActionButton icon={Plus} onClick={openForm} className="w-full sm:w-auto">
            Nouveau mouvement
          </ActionButton>
        }
      />

      {isFormOpen && (
        <PanelForm
          title="Nouveau mouvement manuel"
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          pending={createMutation.isPending}
          submitLabel="Enregistrer"
          error={errorMessage}
        >
          <p className="-mt-2 text-sm text-gray-500">Les paiements et les comptages sont créés automatiquement.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {!isEmbedded && (
              <Field label="Session ouverte" required>
                <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} className={FIELD_SOFT}>
                  <option value="">Choisir</option>
                  {openSessions.map((s) => (
                    <option key={s.sessionNumber} value={s.sessionNumber}>
                      {s.sessionNumber} · {s.registerCode}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Type de mouvement" required>
              <select
                value={formData.movementType}
                onChange={(e) => setFormData({ ...formData, movementType: e.target.value as ManualCashMovementType, reason: "" })}
                className={FIELD_SOFT}
              >
                {MANUAL_MOVEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Montant (FCFA)" required>
              <input
                type="text"
                inputMode="numeric"
                value={formData.amount === 0 ? "" : formData.amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  set("amount", v === "" ? 0 : parseInt(v, 10));
                }}
                placeholder="25000"
                className={FIELD_SOFT}
              />
            </Field>
            <Field label="Canal">
              <select value={formData.channel} onChange={(e) => set("channel", e.target.value as Channel)} className={FIELD_SOFT}>
                <option value="MANUAL">Manuel</option>
                <option value="POS">Point de vente</option>
                <option value="IMPORT">Import</option>
                <option value="API">API</option>
              </select>
            </Field>
          </div>
          <Field label="Motif" required={reasonRequired} hint={reasonRequired ? "Obligatoire pour ce type de mouvement" : "Facultatif"}>
            <textarea rows={2} value={formData.reason} onChange={(e) => set("reason", e.target.value)} className={FIELD_SOFT} />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Type de document">
              <input value={formData.documentType} onChange={(e) => set("documentType", e.target.value)} placeholder="INVOICE, RECEIPT" className={FIELD_SOFT} />
            </Field>
            <Field label="N° de document">
              <input value={formData.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} placeholder="FAC-…" className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Catégorie de flux">
              <input value={formData.flowCategory} onChange={(e) => set("flowCategory", e.target.value)} placeholder="EXPENSE, TRANSFER" className={FIELD_SOFT} />
            </Field>
            <Field label="Sous-catégorie">
              <input value={formData.subCategory} onChange={(e) => set("subCategory", e.target.value)} placeholder="Frais de transport" className={FIELD_SOFT} />
            </Field>
            <Field label="Type de référence">
              <input value={formData.referenceType} onChange={(e) => set("referenceType", e.target.value)} placeholder="ORDER, TICKET" className={FIELD_SOFT} />
            </Field>
            <Field label="Code de référence">
              <input value={formData.referenceCode} onChange={(e) => set("referenceCode", e.target.value)} placeholder="REF-…" className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Type de contrepartie">
              <input value={formData.counterpartyType} onChange={(e) => set("counterpartyType", e.target.value)} placeholder="SUPPLIER, MEMBER" className={FIELD_SOFT} />
            </Field>
            <Field label="Nom de la contrepartie">
              <input value={formData.counterpartyName} onChange={(e) => set("counterpartyName", e.target.value)} placeholder="Bénéficiaire" className={FIELD_SOFT} />
            </Field>
          </div>
        </PanelForm>
      )}

      {!isEmbedded && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchField
              className="flex-1"
              value={searchText}
              onChange={(v) => {
                setSearchText(v);
                setPage(0);
              }}
              placeholder="Mouvement, client, référence, reçu"
            />
            <FilterButton open={filtersOpen} active={hasFilters} onClick={() => setFiltersOpen((o) => !o)} />
          </div>
          {filtersOpen && (
            <FilterPanel canReset={hasFilters || !!searchText} onReset={resetFilters}>
              <Field label="Session">
                <select
                  value={sessionFilter}
                  onChange={(e) => {
                    setSessionFilter(e.target.value);
                    setPage(0);
                  }}
                  className={FIELD_SOFT}
                >
                  <option value="">Toutes les sessions</option>
                  {openSessions.map((s) => (
                    <option key={s.sessionNumber} value={s.sessionNumber}>
                      {s.sessionNumber} · {s.registerCode}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Type">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(0);
                  }}
                  className={FIELD_SOFT}
                >
                  <option value="">Tous les types</option>
                  {Object.entries(MOVEMENT_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Du">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setPage(0);
                    }}
                    className={FIELD_SOFT}
                  />
                </Field>
                <Field label="Au">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setPage(0);
                    }}
                    className={FIELD_SOFT}
                  />
                </Field>
              </div>
            </FilterPanel>
          )}
        </div>
      )}

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les mouvements." onRetry={() => refetch()} />
      ) : movements.length === 0 ? (
        <EmptyState icon={Banknote} title="Aucun mouvement" hint="Ajustez les filtres ou créez un mouvement." />
      ) : (
        <>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>
              <b className="text-gray-950">{totalElements}</b> mouvement{totalElements > 1 ? "s" : ""}, du plus récent au plus ancien
            </span>
            {isFetching && <Dots />}
          </div>
          <HeadRow cols={COLS}>
            <span>Mouvement</span>
            <span>Session</span>
            <span>Lié à</span>
            <span>Date</span>
            <span className="text-right">Montant</span>
          </HeadRow>
          <DataCard>
            {movements.map((m) => {
              const inflow = MOVEMENT_TYPES[m.movementType]?.inflow ?? true;
              const Icon = inflow ? ArrowDownLeft : ArrowUpRight;
              const st = m.status && m.status !== "CONFIRMED" ? statusOf(MOVEMENT_STATUS, m.status) : null;
              return (
                <button
                  key={m.movementNumber}
                  type="button"
                  onClick={() => setSelectedMovement(m)}
                  className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 text-left transition max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER} ${FOCUS}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        inflow ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      }`}
                    >
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-semibold text-gray-950">
                        {typeLabel(m.movementType)}
                        {st && <StatusChip tone={st.tone}>{st.label}</StatusChip>}
                      </p>
                      <p className="truncate font-mono text-xs text-gray-400">{m.movementNumber}</p>
                      {m.reason && <p className="truncate text-xs text-gray-500">{m.reason}</p>}
                    </div>
                  </div>
                  <p className={`whitespace-nowrap text-right text-base font-bold tabular-nums lg:order-last ${inflow ? "text-emerald-600" : "text-red-600"}`}>
                    {inflow ? "+" : "−"} {formatMoney(m.amount)}
                  </p>
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <p className="truncate font-mono text-xs text-gray-600">{m.sessionNumber}</p>
                    <p className="truncate text-xs text-gray-400">{m.registerName || m.registerCode}</p>
                  </div>
                  <p className="min-w-0 truncate text-sm text-gray-600 max-lg:hidden">
                    {m.relatedCustomerName || m.relatedReceiptNumber || m.referenceCode || ""}
                  </p>
                  <p className="text-xs text-gray-500">{formatDateTime(m.createdAt)}</p>
                </button>
              );
            })}
          </DataCard>
          {!isEmbedded && totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} total={totalElements} noun="mouvement" onChange={setPage} />
          )}
        </>
      )}

      {selectedMovement && (
        <ModalPortal onClose={() => setSelectedMovement(null)} size="2xl">
          <div style={brandVars} className="rounded-[1.75rem] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-950">{typeLabel(selectedMovement.movementType)}</h3>
                <p className="font-mono text-xs text-gray-400">{selectedMovement.movementNumber}</p>
              </div>
              <IconButton icon={X} label="Fermer" onClick={() => setSelectedMovement(null)} />
            </div>
            <p
              className={`mt-4 text-3xl font-bold tracking-tight ${
                (MOVEMENT_TYPES[selectedMovement.movementType]?.inflow ?? true) ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {(MOVEMENT_TYPES[selectedMovement.movementType]?.inflow ?? true) ? "+" : "−"} {formatMoney(selectedMovement.amount)}
            </p>
            {selectedMovement.reason && <p className="mt-2 text-sm text-gray-600">{selectedMovement.reason}</p>}
            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Session" mono>{selectedMovement.sessionNumber}</Detail>
              <Detail label="Caisse">{selectedMovement.registerName || selectedMovement.registerCode}</Detail>
              <Detail label="Créé par">{selectedMovement.createdBy}</Detail>
              <Detail label="Créé le">{formatDateTime(selectedMovement.createdAt)}</Detail>
              <Detail label="Document" mono>{selectedMovement.documentNumber}</Detail>
              <Detail label="Référence" mono>{selectedMovement.referenceCode}</Detail>
              <Detail label="Client lié">{selectedMovement.relatedCustomerName}</Detail>
              <Detail label="Reçu lié" mono>{selectedMovement.relatedReceiptNumber}</Detail>
              <Detail label="Transaction liée" mono>{selectedMovement.relatedTransactionNumber}</Detail>
              <Detail label="Contrepartie">{selectedMovement.counterpartyName}</Detail>
            </dl>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
