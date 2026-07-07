import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Eye,
  Filter,
  Loader2,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type {
  CashMovement,
  CashSession,
  CreateCashMovementPayload,
} from "../../services/payment.service";
import { useAuth } from "../../contexts/AuthContext";
import { ModalPortal } from "../../components/ui/ModalPortal";

const movementTypeLabels: Record<string, string> = {
  PAYMENT: "Paiement",
  REFUND: "Remboursement",
  CASH_IN: "Entrée caisse",
  CASH_OUT: "Sortie caisse",
  SAFE_DEPOSIT: "Dépôt coffre",
  TRANSFER_IN: "Transfert entrant",
  TRANSFER_OUT: "Transfert sortant",
  ADJUSTMENT: "Ajustement",
  OPENING_FLOAT: "Fond de caisse",
  CLOSING_COUNT: "Comptage clôture",
};

const MANUAL_TYPES = [
  "CASH_IN",
  "CASH_OUT",
  "SAFE_DEPOSIT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "ADJUSTMENT",
] as const;

const REASON_REQUIRED = [
  "REFUND",
  "CASH_OUT",
  "SAFE_DEPOSIT",
  "TRANSFER_OUT",
  "ADJUSTMENT",
] as const;

const isPositive = (type: string) =>
  ["PAYMENT", "CASH_IN", "TRANSFER_IN", "OPENING_FLOAT"].includes(type) ||
  type === "ADJUSTMENT";

type ManualCashMovementType = CreateCashMovementPayload["movementType"];

interface CashMovementsListProps {
  sessionNumber?: string;
}

const buildDefaultFormData = (): {
  movementType: ManualCashMovementType;
  amount: number;
  reason: string;
  documentType: string;
  documentNumber: string;
  flowCategory: string;
  referenceType: string;
  referenceCode: string;
  counterpartyType: string;
  counterpartyCode: string;
  counterpartyName: string;
  subCategory: string;
  tags: string;
  deviceCode: string;
  deviceIp: string;
  channel: "MANUAL" | "AUTO_PAYMENT" | "IMPORT" | "API" | "POS";
  metadataJson: string;
} => ({
  movementType: "CASH_IN",
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
  channel: "MANUAL",
  metadataJson: "",
});

const formatAmount = (amount?: number | null) =>
  `${(amount ?? 0).toLocaleString("fr-FR")} FCFA`;

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR") : "—";

export const CashMovementsList: React.FC<CashMovementsListProps> = ({
  sessionNumber,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const isEmbedded = !!sessionNumber;

  const [sessionFilter, setSessionFilter] = useState(sessionNumber || "");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(buildDefaultFormData);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<CashMovement | null>(
    null,
  );

  useEffect(() => {
    if (isModalOpen) {
      setFormData(buildDefaultFormData());
      setErrorMessage(null);
    }
  }, [isModalOpen]);

  const { data: sessionsData } = useQuery({
    queryKey: ["cash-sessions-open"],
    queryFn: () => paymentService.getCashSessions({ status: "OPEN", size: 100 }),
    enabled: !isEmbedded,
  });

  const openSessions: CashSession[] = sessionsData?.content || [];

  const { data: movementsData, isLoading, isFetching } = useQuery({
    queryKey: [
      "cash-movements",
      sessionFilter,
      typeFilter,
      searchText,
      fromDate,
      toDate,
      page,
      sessionNumber,
    ],
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

  const reasonRequired = (REASON_REQUIRED as readonly string[]).includes(
    formData.movementType,
  );

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
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la création du mouvement.",
      );
    },
  });

  const handleSubmit = () => {
    if (formData.amount <= 0) {
      setErrorMessage("Le montant doit être supérieur à 0.");
      return;
    }
    if (reasonRequired && !formData.reason.trim()) {
      setErrorMessage(
        `Le motif est obligatoire pour un mouvement de type "${movementTypeLabels[formData.movementType]}".`,
      );
      return;
    }
    const targetSession = sessionFilter || sessionNumber;
    if (!targetSession) {
      setErrorMessage("Veuillez sélectionner une session ouverte.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  const resetFilters = () => {
    if (!isEmbedded) setSessionFilter("");
    setTypeFilter("");
    setSearchText("");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className={isEmbedded ? "font-semibold" : "text-xl font-semibold text-gray-900"}>
            Mouvements de caisse
          </h2>
          {!isEmbedded && (
            <p className="mt-1 text-sm text-gray-500">
              Entrées, sorties, paiements, ajustements et justificatifs associés.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <Plus size={17} />
          Nouveau mouvement
        </button>
      </div>

      {!isEmbedded && (
        <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto]">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setPage(0);
                }}
                placeholder="Rechercher mouvement, client, référence, reçu..."
                className="h-11 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-50"
              />
            </div>

            <select
              value={sessionFilter}
              onChange={(e) => {
                setSessionFilter(e.target.value);
                setPage(0);
              }}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
            >
              <option value="">Toutes les sessions</option>
              {openSessions.map((s) => (
                <option key={s.sessionNumber} value={s.sessionNumber}>
                  {s.sessionNumber} — {s.registerCode}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
            >
              <option value="">Tous les types</option>
              {Object.entries(movementTypeLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(0);
              }}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(0);
              }}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
            />

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Filter size={16} />
              Réinitialiser
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {totalElements} mouvement(s)
            </p>
            <p className="text-xs text-gray-500">
              {isFetching ? "Mise à jour..." : "Classés du plus récent au plus ancien"}
            </p>
          </div>
          {isFetching && <Loader2 size={18} className="animate-spin text-gray-400" />}
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-500">
            <Loader2 className="mx-auto mb-2 animate-spin" />
            Chargement des mouvements...
          </div>
        ) : movements.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 py-10 text-center text-sm text-gray-500">
            Aucun mouvement trouvé.
          </div>
        ) : (
          <div className="grid gap-3">
            {movements.map((movement) => (
              <MovementCard
                key={movement.movementNumber}
                movement={movement}
                onOpen={() => {
                  setSelectedMovement(movement);
                  setIsDetailOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {!isEmbedded && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="rounded-xl bg-white px-3 py-2 text-sm text-gray-600 ring-1 ring-gray-100">
            {page + 1}/{Math.max(totalPages, 1)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}

      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)} size="3xl">
          <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-5 rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Nouveau mouvement de caisse
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Créez uniquement les mouvements manuels. Les paiements et comptages sont automatisés.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-5 p-6">
            {errorMessage && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <section className="rounded-2xl bg-gray-50 p-4">
              <h4 className="mb-4 text-sm font-semibold text-gray-900">
                Informations principales
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                {!isEmbedded && (
                  <Field label="Session ouverte *">
                    <select
                      value={sessionFilter}
                      onChange={(e) => setSessionFilter(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                    >
                      <option value="">Sélectionner une session ouverte</option>
                      {openSessions.map((s) => (
                        <option key={s.sessionNumber} value={s.sessionNumber}>
                          {s.sessionNumber} — {s.registerCode}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Type de mouvement *">
                  <select
                    value={formData.movementType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        movementType: e.target.value as ManualCashMovementType,
                        reason: "",
                      })
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  >
                    {MANUAL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {movementTypeLabels[type]}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Montant (FCFA) *">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.amount === 0 ? "" : formData.amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        amount: val === "" ? 0 : parseInt(val, 10),
                      });
                    }}
                    placeholder="25000"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>

                <Field label="Canal">
                  <select
                    value={formData.channel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        channel: e.target.value as typeof formData.channel,
                      })
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  >
                    <option value="MANUAL">Manuel</option>
                    <option value="POS">Point de vente</option>
                    <option value="IMPORT">Import</option>
                    <option value="API">API</option>
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label={`Motif ${reasonRequired ? "*" : "(optionnel)"}`}>
                  <textarea
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    rows={3}
                    required={reasonRequired}
                    placeholder={
                      reasonRequired
                        ? "Motif obligatoire pour ce type de mouvement"
                        : "Motif ou observation..."
                    }
                    className="min-h-[96px] w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50 resize-none"
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl bg-gray-50 p-4">
              <h4 className="mb-4 text-sm font-semibold text-gray-900">
                Références et contrepartie
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Type document">
                  <input
                    value={formData.documentType}
                    onChange={(e) =>
                      setFormData({ ...formData, documentType: e.target.value })
                    }
                    placeholder="INVOICE, RECEIPT..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
                <Field label="N° document">
                  <input
                    value={formData.documentNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, documentNumber: e.target.value })
                    }
                    placeholder="FAC-..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
                <Field label="Catégorie de flux">
                  <input
                    value={formData.flowCategory}
                    onChange={(e) =>
                      setFormData({ ...formData, flowCategory: e.target.value })
                    }
                    placeholder="EXPENSE, TRANSFER..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
                <Field label="Sous-catégorie">
                  <input
                    value={formData.subCategory}
                    onChange={(e) =>
                      setFormData({ ...formData, subCategory: e.target.value })
                    }
                    placeholder="Frais transport, achat..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
                <Field label="Type référence">
                  <input
                    value={formData.referenceType}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceType: e.target.value })
                    }
                    placeholder="ORDER, TICKET..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
                <Field label="Code référence">
                  <input
                    value={formData.referenceCode}
                    onChange={(e) =>
                      setFormData({ ...formData, referenceCode: e.target.value })
                    }
                    placeholder="REF-..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
                <Field label="Type contrepartie">
                  <input
                    value={formData.counterpartyType}
                    onChange={(e) =>
                      setFormData({ ...formData, counterpartyType: e.target.value })
                    }
                    placeholder="SUPPLIER, MEMBER..."
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
                <Field label="Nom contrepartie">
                  <input
                    value={formData.counterpartyName}
                    onChange={(e) =>
                      setFormData({ ...formData, counterpartyName: e.target.value })
                    }
                    placeholder="Nom du bénéficiaire"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                  />
                </Field>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Enregistrer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {isDetailOpen && selectedMovement && (
        <ModalPortal onClose={() => setIsDetailOpen(false)} size="2xl">
          <div className="flex items-start justify-between border-b bg-white px-6 py-5 rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Détail mouvement
              </h3>
              <p className="mt-1 font-mono text-sm text-gray-500">
                {selectedMovement.movementNumber}
              </p>
            </div>
            <button
              onClick={() => setIsDetailOpen(false)}
              className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-50 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4 p-6">
            <MovementCard movement={selectedMovement} onOpen={() => undefined} detail />
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="Session" value={selectedMovement.sessionNumber} />
              <Info label="Caisse" value={selectedMovement.registerCode} />
              <Info label="Créé par" value={selectedMovement.createdBy} />
              <Info label="Créé le" value={formatDateTime(selectedMovement.createdAt)} />
              <Info label="Document" value={selectedMovement.documentNumber || "—"} />
              <Info label="Référence" value={selectedMovement.referenceCode || "—"} />
              <Info label="Client lié" value={selectedMovement.relatedCustomerName || "—"} />
              <Info label="Reçu lié" value={selectedMovement.relatedReceiptNumber || "—"} />
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

function MovementCard({
  movement,
  onOpen,
  detail = false,
}: {
  movement: CashMovement;
  onOpen: () => void;
  detail?: boolean;
}) {
  const positive = isPositive(movement.movementType);
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            }`}
          >
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-gray-900">
                {movementTypeLabels[movement.movementType] || movement.movementType}
              </p>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {movement.status || "CONFIRMED"}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-gray-400">
              {movement.movementNumber}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="font-mono">{movement.sessionNumber}</span>
              <span>{movement.registerName || movement.registerCode}</span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} />
                {formatDateTime(movement.createdAt)}
              </span>
            </div>
            {movement.reason && (
              <p className="mt-2 text-sm text-gray-600">{movement.reason}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {movement.relatedCustomerName && <Tag text={movement.relatedCustomerName} />}
              {movement.relatedTransactionNumber && <Tag text={movement.relatedTransactionNumber} mono />}
              {movement.relatedReceiptNumber && <Tag text={movement.relatedReceiptNumber} tone="green" mono />}
              {movement.referenceCode && <Tag text={movement.referenceCode} mono />}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
          <p
            className={`text-lg font-bold ${
              positive ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {positive ? "+" : "-"}
            {formatAmount(movement.amount)}
          </p>
          {!detail && (
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-primary-700"
            >
              <Eye size={15} />
              Détail
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

const Tag: React.FC<{ text: string; mono?: boolean; tone?: "green" }> = ({
  text,
  mono,
  tone,
}) => (
  <span
    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
      tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
    } ${mono ? "font-mono" : ""}`}
  >
    {text}
  </span>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">
      {label}
    </span>
    {children}
  </label>
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-gray-50 p-3">
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold text-gray-900">
      {value}
    </p>
  </div>
);
