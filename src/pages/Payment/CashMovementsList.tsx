import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, TrendingUp, TrendingDown, Eye, X } from "lucide-react";
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
  TRANSFER_IN: "Virement reçu",
  TRANSFER_OUT: "Virement émis",
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
  ["PAYMENT", "CASH_IN", "TRANSFER_IN", "OPENING_FLOAT", "ADJUSTMENT"].includes(
    type,
  );

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

export const CashMovementsList: React.FC<CashMovementsListProps> = ({
  sessionNumber,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const isEmbedded = !!sessionNumber;

  const [sessionFilter, setSessionFilter] = useState(sessionNumber || "");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(buildDefaultFormData);

  // Détail mouvement
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
    queryFn: () =>
      paymentService.getCashSessions({ status: "OPEN", size: 100 }),
    enabled: !isEmbedded,
  });
  const openSessions: CashSession[] = sessionsData?.content || [];

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["cash-movements", sessionFilter, typeFilter, page],
    queryFn: () =>
      paymentService.getCashMovements({
        sessionNumber: sessionFilter || undefined,
        movementType: typeFilter || undefined,
        page,
        size: isEmbedded ? 100 : 20,
      }),
    enabled: isEmbedded ? true : !!sessionFilter || !!typeFilter,
  });

  const movements: CashMovement[] = movementsData?.content || [];
  const totalPages = (movementsData as any)?.totalPages ?? 0;

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
      setErrorMessage("Veuillez sélectionner une session.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  if (isLoading && isEmbedded) {
    return <div className="text-center py-4">Chargement...</div>;
  }

  return (
    <div>
      {/* En-tête */}
      <div className="flex justify-between items-center mb-4">
        {!isEmbedded && (
          <h2 className="text-xl font-semibold text-gray-900">
            Mouvements de caisse
          </h2>
        )}
        {isEmbedded && <h3 className="font-semibold">Mouvements de caisse</h3>}
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-1 ${
            isEmbedded
              ? "text-primary-600 text-sm"
              : "bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm"
          }`}
        >
          <Plus size={isEmbedded ? 14 : 18} />
          {isEmbedded ? "Ajouter" : "Nouveau mouvement"}
        </button>
      </div>

      {/* Filtres en mode standalone */}
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white w-full md:w-64"
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
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="">Tous les types</option>
            {Object.entries(movementTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Liste */}
      <div className="space-y-2">
        {movements.map((movement) => (
          <div
            key={movement.movementNumber}
            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              {isPositive(movement.movementType) ? (
                <TrendingUp
                  size={16}
                  className="text-green-600 flex-shrink-0"
                />
              ) : (
                <TrendingDown
                  size={16}
                  className="text-red-600 flex-shrink-0"
                />
              )}
              <div>
                <p className="font-medium text-sm">
                  {movementTypeLabels[movement.movementType] ||
                    movement.movementType}
                </p>
                {movement.reason && (
                  <p className="text-xs text-gray-500">{movement.reason}</p>
                )}
                {movement.referenceCode && (
                  <p className="text-xs text-gray-400 font-mono">
                    {movement.referenceCode}
                  </p>
                )}
                {movement.relatedCustomerName && (
                  <p className="text-xs text-blue-500">
                    {movement.relatedCustomerName}
                  </p>
                )}
                {movement.relatedSourceLabel && (
                  <p className="text-xs text-gray-400">
                    {movement.relatedSourceLabel}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {movement.relatedTransactionNumber && (
                    <span className="text-xs text-primary-600 font-mono">
                      {movement.relatedTransactionNumber}
                    </span>
                  )}
                  {movement.relatedReceiptNumber && (
                    <span className="text-xs text-green-600 font-mono">
                      {movement.relatedReceiptNumber}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {new Date(movement.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p
                className={`font-semibold text-sm ${
                  isPositive(movement.movementType)
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {isPositive(movement.movementType) ? "+" : "-"}
                {movement.amount.toLocaleString("fr-FR")} FCFA
              </p>
              {/* Bouton détail */}
              <button
                onClick={() => {
                  setSelectedMovement(movement);
                  setIsDetailOpen(true);
                }}
                className="p-1 text-gray-400 hover:text-primary-600"
                title="Voir détail"
              >
                <Eye size={15} />
              </button>
            </div>
          </div>
        ))}
        {movements.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500 text-sm">
            {isEmbedded
              ? "Aucun mouvement"
              : "Sélectionnez une session pour voir les mouvements"}
          </div>
        )}
      </div>

      {/* Pagination mode standalone */}
      {!isEmbedded && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Modal création mouvement */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Nouveau mouvement de caisse</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            {!isEmbedded && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session *
                </label>
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Sélectionner une session ouverte</option>
                  {openSessions.map((s) => (
                    <option key={s.sessionNumber} value={s.sessionNumber}>
                      {s.sessionNumber} — {s.registerCode}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de mouvement *
              </label>
              <select
                value={formData.movementType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    movementType: e.target.value as ManualCashMovementType,
                    reason: "",
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                {MANUAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {movementTypeLabels[type]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Les types PAYMENT, OPENING_FLOAT et CLOSING_COUNT sont générés
                automatiquement par le système
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (FCFA) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.amount === 0 ? "" : formData.amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setFormData({
                    ...formData,
                    amount: val === "" ? 0 : parseInt(val),
                  });
                }}
                placeholder="25000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif {reasonRequired ? "*" : "(optionnel)"}
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                rows={2}
                required={reasonRequired}
                placeholder={
                  reasonRequired
                    ? "Motif obligatoire pour ce type de mouvement"
                    : "Motif optionnel..."
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Informations complémentaires
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={formData.documentType}
                  onChange={(e) =>
                    setFormData({ ...formData, documentType: e.target.value })
                  }
                  placeholder="Type document"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.documentNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, documentNumber: e.target.value })
                  }
                  placeholder="N° document"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.flowCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, flowCategory: e.target.value })
                  }
                  placeholder="Catégorie flux"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.referenceType}
                  onChange={(e) =>
                    setFormData({ ...formData, referenceType: e.target.value })
                  }
                  placeholder="Type référence"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.referenceCode}
                  onChange={(e) =>
                    setFormData({ ...formData, referenceCode: e.target.value })
                  }
                  placeholder="Code référence"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.counterpartyType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      counterpartyType: e.target.value,
                    })
                  }
                  placeholder="Type contrepartie"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.counterpartyCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      counterpartyCode: e.target.value,
                    })
                  }
                  placeholder="Code contrepartie"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.counterpartyName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      counterpartyName: e.target.value,
                    })
                  }
                  placeholder="Nom contrepartie"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.subCategory}
                  onChange={(e) =>
                    setFormData({ ...formData, subCategory: e.target.value })
                  }
                  placeholder="Sous-catégorie"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="Tags"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.deviceCode}
                  onChange={(e) =>
                    setFormData({ ...formData, deviceCode: e.target.value })
                  }
                  placeholder="Device code"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  value={formData.deviceIp}
                  onChange={(e) =>
                    setFormData({ ...formData, deviceIp: e.target.value })
                  }
                  placeholder="Device IP"
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <select
                  value={formData.channel}
                  onChange={(e) =>
                    setFormData({ ...formData, channel: e.target.value as any })
                  }
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="MANUAL">Manuel</option>
                  <option value="IMPORT">Import</option>
                  <option value="API">API</option>
                  <option value="POS">POS</option>
                </select>
              </div>
              <textarea
                value={formData.metadataJson}
                onChange={(e) =>
                  setFormData({ ...formData, metadataJson: e.target.value })
                }
                rows={2}
                placeholder="Métadonnées JSON"
                className="w-full mt-3 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || formData.amount <= 0}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal détail mouvement */}
      {isDetailOpen && selectedMovement && (
        <ModalPortal onClose={() => setIsDetailOpen(false)} size="lg">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">
              {selectedMovement.movementNumber}
            </h3>
            <button
              onClick={() => setIsDetailOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Type</p>
                <p className="font-medium">
                  {movementTypeLabels[selectedMovement.movementType] ||
                    selectedMovement.movementType}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Montant</p>
                <p
                  className={`font-bold text-lg ${isPositive(selectedMovement.movementType) ? "text-green-600" : "text-red-600"}`}
                >
                  {isPositive(selectedMovement.movementType) ? "+" : "-"}
                  {selectedMovement.amount?.toLocaleString("fr-FR")} FCFA
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Registre</p>
                <p className="font-mono text-sm">
                  {selectedMovement.registerCode}
                </p>
                {selectedMovement.registerName && (
                  <p className="text-xs text-gray-400">
                    {selectedMovement.registerName}
                  </p>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Session</p>
                <p className="font-mono text-sm">
                  {selectedMovement.sessionNumber}
                </p>
                {selectedMovement.sessionStatus && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedMovement.sessionStatus === "OPEN"
                        ? "bg-green-100 text-green-700"
                        : selectedMovement.sessionStatus === "CLOSING_REVIEW"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {selectedMovement.sessionStatus}
                  </span>
                )}
              </div>
              {selectedMovement.sessionOpenedBy && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Ouverte par</p>
                  <p className="text-sm">{selectedMovement.sessionOpenedBy}</p>
                </div>
              )}
              {selectedMovement.sessionOpenedAt && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Ouverte le</p>
                  <p className="text-sm">
                    {new Date(selectedMovement.sessionOpenedAt).toLocaleString(
                      "fr-FR",
                    )}
                  </p>
                </div>
              )}
              {selectedMovement.reason && (
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500">Motif</p>
                  <p className="text-sm">{selectedMovement.reason}</p>
                </div>
              )}
            </div>

            {/* Champs enrichis */}
            {(selectedMovement.relatedTransactionNumber ||
              selectedMovement.relatedIntentNumber ||
              selectedMovement.relatedReceiptNumber ||
              selectedMovement.relatedCustomerName ||
              selectedMovement.relatedSourceLabel) && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Liens et source
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {selectedMovement.relatedTransactionNumber && (
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-500">Transaction</p>
                      <p className="font-mono text-sm text-blue-700">
                        {selectedMovement.relatedTransactionNumber}
                      </p>
                    </div>
                  )}
                  {selectedMovement.relatedIntentNumber && (
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-500">Intention</p>
                      <p className="font-mono text-sm text-purple-700">
                        {selectedMovement.relatedIntentNumber}
                      </p>
                    </div>
                  )}
                  {selectedMovement.relatedReceiptNumber && (
                    <div className="p-2 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-500">Reçu</p>
                      <p className="font-mono text-sm text-green-700">
                        {selectedMovement.relatedReceiptNumber}
                      </p>
                    </div>
                  )}
                  {selectedMovement.relatedCustomerName && (
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <p className="text-xs text-amber-500">Client</p>
                      <p className="text-sm text-amber-700">
                        {selectedMovement.relatedCustomerName}
                      </p>
                    </div>
                  )}
                  {selectedMovement.relatedSourceLabel && (
                    <div className="p-2 bg-indigo-50 rounded-lg col-span-2">
                      <p className="text-xs text-indigo-500">Source</p>
                      <p className="text-sm text-indigo-700">
                        {selectedMovement.relatedSourceLabel}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
