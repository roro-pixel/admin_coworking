import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Package, AlertTriangle } from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import type { PurchaseOrder } from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";

interface GoodsReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderCode?: string;
}

const inputClass =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg outline-none transition focus:border-gray-400 text-sm";
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

export const GoodsReceiptFormModal: React.FC<GoodsReceiptFormModalProps> = ({
  isOpen,
  onClose,
  orderCode,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [actionError, setActionError] = React.useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    orderCode: orderCode || "",
    locationCode: "",
    invoiceDocumentCode: "",
    deliveryNoteDocumentCode: "",
    proofDocumentCode: "",
    lines: [] as any[],
  });
  const [orderSearch, setOrderSearch] = useState("");
  const [showOrderResults, setShowOrderResults] = useState(false);

  const { data: ordersData } = useQuery({
    queryKey: ["purchase-orders-ordered", orderSearch],
    queryFn: () => inventoryService.getPurchaseOrders({ status: "ORDERED", size: 100 }),
    enabled: orderSearch.length > 1,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: () => inventoryService.getLocations(true),
  });

  const orders = ordersData?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryService.createGoodsReceipt({
        orderCode: formData.orderCode,
        locationCode: formData.locationCode,
        receivedBy: admin?.email || "admin",
        invoiceDocumentCode: formData.invoiceDocumentCode || undefined,
        deliveryNoteDocumentCode: formData.deliveryNoteDocumentCode || undefined,
        proofDocumentCode: formData.proofDocumentCode || undefined,
        lines: formData.lines,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      onClose();
      resetForm();
    },
    onError: (err: any) =>
      setActionError(err?.response?.data?.message || "Une erreur est survenue."),
  });

  const resetForm = () => {
    setFormData({
      orderCode: "",
      locationCode: "",
      invoiceDocumentCode: "",
      deliveryNoteDocumentCode: "",
      proofDocumentCode: "",
      lines: [],
    });
    setSelectedOrder(null);
  };

  const selectOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setFormData({
      orderCode: order.orderCode,
      locationCode: order.locationCode,
      invoiceDocumentCode: "",
      deliveryNoteDocumentCode: "",
      proofDocumentCode: "",
      lines: order.lines.map((line) => ({
        itemCode: line.itemCode,
        orderedQuantity: line.quantity,
        receivedQuantity: 0,
        rejectedQuantity: 0,
        qualityAccepted: true,
        quarantineAcceptedStock: false,
        unitCost: line.unitCost,
      })),
    });
    setOrderSearch("");
    setShowOrderResults(false);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Réception de marchandises</h3>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[80vh]">
        <div className="p-6 space-y-5">
          {!formData.orderCode && (
            <div>
              <label className={labelClass}>Bon de commande *</label>
              <div className="relative">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => {
                    setOrderSearch(e.target.value);
                    setShowOrderResults(true);
                  }}
                  placeholder="Rechercher un bon de commande…"
                  className={inputClass}
                />
                {showOrderResults && orders.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {orders.map((order: PurchaseOrder) => (
                      <button
                        key={order.orderCode}
                        onClick={() => selectOrder(order)}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 text-sm"
                      >
                        <p className="font-medium text-gray-900">{order.orderCode}</p>
                        <p className="text-xs text-gray-500">{order.supplierName}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedOrder && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-1 text-sm">
              <p>
                <span className="font-medium text-gray-700">Bon de commande :</span>{" "}
                {selectedOrder.orderCode}
              </p>
              <p>
                <span className="font-medium text-gray-700">Fournisseur :</span>{" "}
                {selectedOrder.supplierName}
              </p>
              <p>
                <span className="font-medium text-gray-700">Emplacement :</span>{" "}
                {selectedOrder.locationCode}
              </p>
            </div>
          )}

          <div>
            <label className={labelClass}>Emplacement de réception *</label>
            <select
              value={formData.locationCode}
              onChange={(e) => setFormData({ ...formData, locationCode: e.target.value })}
              className={inputClass}
            >
              <option value="">Sélectionner</option>
              {locations.map((loc: any) => (
                <option key={loc.locationCode} value={loc.locationCode}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Document facture</label>
              <input
                value={formData.invoiceDocumentCode}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceDocumentCode: e.target.value })
                }
                className={inputClass}
                placeholder="DOC-…"
              />
            </div>
            <div>
              <label className={labelClass}>Bon de livraison</label>
              <input
                value={formData.deliveryNoteDocumentCode}
                onChange={(e) =>
                  setFormData({ ...formData, deliveryNoteDocumentCode: e.target.value })
                }
                className={inputClass}
                placeholder="DOC-…"
              />
            </div>
            <div>
              <label className={labelClass}>Preuve / justificatif</label>
              <input
                value={formData.proofDocumentCode}
                onChange={(e) =>
                  setFormData({ ...formData, proofDocumentCode: e.target.value })
                }
                className={inputClass}
                placeholder="DOC-…"
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Articles reçus</h4>
            <div className="space-y-3">
              {formData.lines.map((line, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-3">{line.itemCode}</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Commandé</label>
                      <p className="text-sm font-medium text-gray-900">{line.orderedQuantity}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Reçu *</label>
                      <input
                        type="number"
                        value={line.receivedQuantity}
                        onChange={(e) =>
                          updateLine(idx, "receivedQuantity", Number(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400"
                        min="0"
                        max={line.orderedQuantity}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Rejeté</label>
                      <input
                        type="number"
                        value={line.rejectedQuantity}
                        onChange={(e) =>
                          updateLine(idx, "rejectedQuantity", Number(e.target.value) || 0)
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gray-400"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {actionError && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertTriangle size={16} className="shrink-0" />
              {actionError}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
            >
              Annuler
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!formData.orderCode || !formData.locationCode || createMutation.isPending}
              className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
            >
              {createMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Package size={16} />
              )}
              Valider la réception
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};