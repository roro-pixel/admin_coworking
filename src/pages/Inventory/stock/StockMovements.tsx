import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, RefreshCw, ArrowUp, ArrowDown, Repeat, X } from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import type { StockMovement } from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";

const movementTypes = [
  {
    value: "IN",
    label: "Entrée",
    icon: ArrowUp,
    color: "text-green-600 bg-green-50",
  },
  {
    value: "OUT",
    label: "Sortie",
    icon: ArrowDown,
    color: "text-red-600 bg-red-50",
  },
  {
    value: "TRANSFER",
    label: "Transfert",
    icon: Repeat,
    color: "text-blue-600 bg-blue-50",
  },
  {
    value: "ADJUSTMENT_IN",
    label: "Ajustement +",
    icon: ArrowUp,
    color: "text-green-600 bg-green-50",
  },
  {
    value: "ADJUSTMENT_OUT",
    label: "Ajustement -",
    icon: ArrowDown,
    color: "text-red-600 bg-red-50",
  },
];

export const StockMovements: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [selectedMovement, setSelectedMovement] =
    useState<StockMovement | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ["stock-movements", movementTypeFilter, fromDate, toDate],
    queryFn: () =>
      inventoryService.getStockMovements({
        movementType: movementTypeFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        size: 100,
      }),
  });

  const reverseMutation = useMutation({
    mutationFn: ({ code, reason }: { code: string; reason: string }) =>
      inventoryService.reverseMovement(code, admin?.email || "admin", reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      setShowReverseModal(false);
      setSelectedMovement(null);
      setReverseReason("");
    },
    onError: (err: any) => {
      alert(
        err?.response?.data?.message ||
          "Erreur lors de l'inversion du mouvement.",
      );
    },
  });

  const movements = movementsData?.content || [];

  const filteredMovements = movements.filter(
    (m) =>
      m.itemName.toLowerCase().includes(search.toLowerCase()) ||
      m.itemCode.toLowerCase().includes(search.toLowerCase()) ||
      m.movementCode.toLowerCase().includes(search.toLowerCase()),
  );

  const handleReverse = (movement: StockMovement) => {
    if (movement.reversed) {
      alert("Ce mouvement a déjà été inversé");
      return;
    }
    setSelectedMovement(movement);
    setShowReverseModal(true);
  };

  const confirmReverse = () => {
    if (selectedMovement && reverseReason) {
      reverseMutation.mutate({
        code: selectedMovement.movementCode,
        reason: reverseReason,
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900">
          Historique des mouvements
        </h3>
      </div>

      {/* Filtres - AGRANDIS */}
      <div className="flex flex-col md:flex-row gap-5 mb-8">
        <div className="flex-1 relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher un mouvement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-base"
          />
        </div>
        <select
          value={movementTypeFilter}
          onChange={(e) => setMovementTypeFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-lg bg-white text-base min-w-[160px]"
        >
          <option value="">Tous les types</option>
          {movementTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-lg text-base min-w-[160px]"
          placeholder="Du"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-lg text-base min-w-[160px]"
          placeholder="Au"
        />
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Code</th>
                <th className="px-5 py-4 text-left font-semibold">Date</th>
                <th className="px-5 py-4 text-left font-semibold">Type</th>
                <th className="px-5 py-4 text-left font-semibold">Article</th>
                <th className="px-5 py-4 text-right font-semibold">Quantité</th>
                <th className="px-5 py-4 text-left font-semibold">Référence</th>
                <th className="px-5 py-4 text-left font-semibold">Opérateur</th>
                <th className="px-5 py-4 text-center font-semibold">Statut</th>
                <th className="px-5 py-4 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredMovements.map((movement) => {
                const typeConfig = movementTypes.find(
                  (t) => t.value === movement.movementType,
                );
                const Icon = typeConfig?.icon;
                return (
                  <tr key={movement.movementCode} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-mono text-sm">
                      {movement.movementCode}
                    </td>
                    <td className="px-5 py-4">
                      {new Date(movement.performedAt).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${typeConfig?.color}`}
                      >
                        {Icon && <Icon size={14} />}
                        {typeConfig?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{movement.itemName}</p>
                      <p className="text-sm text-gray-500">
                        {movement.itemCode}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-right font-medium">
                      {movement.quantity > 0
                        ? `+${movement.quantity}`
                        : movement.quantity}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {movement.referenceCode || "-"}
                    </td>
                    <td className="px-5 py-4">{movement.performedBy}</td>
                    <td className="px-5 py-4 text-center">
                      {movement.reversed ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                          Annulé
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {!movement.reversed && (
                        <button
                          onClick={() => handleReverse(movement)}
                          className="p-1.5 text-red-600 hover:text-red-800"
                          title="Annuler le mouvement"
                        >
                          <RefreshCw size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredMovements.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-gray-500 text-base">Aucun mouvement trouvé</p>
        </div>
      )}

      {/* Modal d'inversion - AGRANDI */}
      {showReverseModal && selectedMovement && (
        <ModalPortal onClose={() => setShowReverseModal(false)} size="2xl">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-2xl font-bold">Annuler le mouvement</h3>
            <button
              onClick={() => setShowReverseModal(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8 space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg space-y-1">
              <p className="text-base">
                <span className="font-medium">Mouvement:</span>{" "}
                {selectedMovement.movementCode}
              </p>
              <p className="text-base">
                <span className="font-medium">Article:</span>{" "}
                {selectedMovement.itemName}
              </p>
              <p className="text-base">
                <span className="font-medium">Quantité:</span>{" "}
                {selectedMovement.quantity}
              </p>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Motif d'annulation *
              </label>
              <textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                rows={4}
                placeholder="Expliquez pourquoi vous annulez ce mouvement..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>
            <div className="flex gap-4 pt-6">
              <button
                onClick={() => setShowReverseModal(false)}
                className="flex-1 px-5 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-base"
              >
                Annuler
              </button>
              <button
                onClick={confirmReverse}
                disabled={!reverseReason || reverseMutation.isPending}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 text-base font-medium"
              >
                {reverseMutation.isPending
                  ? "Annulation..."
                  : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
