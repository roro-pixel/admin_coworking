import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Save, AlertTriangle, Search, Loader2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";

interface InventoryCountEntryProps {
  isOpen: boolean;
  onClose: () => void;
  count: any;
}

export const InventoryCountEntry: React.FC<InventoryCountEntryProps> = ({
  isOpen,
  onClose,
  count,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: countDetail, refetch } = useQuery({
    queryKey: ["inventory-count-detail", count.countCode],
    queryFn: () => inventoryService.getInventoryCount(count.countCode),
    enabled: isOpen && !!count.countCode,
  });

  const saveLineMutation = useMutation({
    mutationFn: ({
      itemCode,
      countedQuantity,
    }: {
      itemCode: string;
      countedQuantity: number;
    }) =>
      inventoryService.saveInventoryCountLine(
        count.countCode,
        itemCode,
        countedQuantity,
      ),
    onSuccess: () => {
      refetch();
    },
  });

  useEffect(() => {
    if (countDetail?.items) {
      setItems(countDetail.items);
    }
  }, [countDetail]);

  const handleQuantityChange = (itemCode: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.itemCode === itemCode ? { ...item, countedQuantity: value } : item,
      ),
    );
  };

  const handleSaveLine = async (itemCode: string, countedQuantity: number) => {
    setSaving(true);
    await saveLineMutation.mutateAsync({ itemCode, countedQuantity });
    setSaving(false);
  };

  const filteredItems = items.filter(
    (item) =>
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(search.toLowerCase()),
  );

  const completedCount = items.filter(
    (i) => i.countedQuantity !== null && i.countedQuantity !== undefined,
  ).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto border border-gray-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Comptage physique — {count.countCode}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Emplacement : {count.locationName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progression</span>
              <span>
                {completedCount} / {totalCount} articles
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="relative mb-6">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Rechercher un article…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none transition focus:border-gray-400 text-sm max-w-sm"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredItems.map((item) => {
              const variance =
                item.countedQuantity !== null &&
                item.countedQuantity !== undefined
                  ? item.countedQuantity - item.systemQuantity
                  : null;
              const hasVariance = variance !== null && variance !== 0;

              return (
                <div
                  key={item.itemCode}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50/60"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.itemName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Code : {item.itemCode}</p>
                      <p className="text-xs text-gray-500">
                        Stock système : {item.systemQuantity}
                      </p>
                      {hasVariance && (
                        <p
                          className={`text-xs font-medium mt-1 ${variance > 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          Écart : {variance > 0 ? `+${variance}` : variance}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          item.countedQuantity !== null &&
                          item.countedQuantity !== undefined
                            ? item.countedQuantity
                            : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          handleQuantityChange(
                            item.itemCode,
                            val === "" ? 0 : parseInt(val),
                          );
                        }}
                        placeholder="Quantité comptée"
                        className="w-36 px-3.5 py-2 border border-gray-200 rounded-lg text-center text-sm outline-none focus:border-gray-400"
                      />
                      <button
                        onClick={() =>
                          handleSaveLine(item.itemCode, item.countedQuantity || 0)
                        }
                        disabled={
                          saving ||
                          item.countedQuantity === null ||
                          item.countedQuantity === undefined
                        }
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2 text-sm font-medium whitespace-nowrap"
                      >
                        {saving ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Save size={15} />
                        )}
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-gray-500">Aucun article trouvé</p>
            </div>
          )}

          {completedCount === totalCount && totalCount > 0 && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  Tous les articles ont été comptés. Vous pouvez maintenant
                  envoyer en revue.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};