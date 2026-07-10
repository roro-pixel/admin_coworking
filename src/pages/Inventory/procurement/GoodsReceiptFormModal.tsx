import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Package } from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import type { PurchaseOrder } from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";

interface GoodsReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderCode?: string;
}

export const GoodsReceiptFormModal: React.FC<GoodsReceiptFormModalProps> = ({
  isOpen,
  onClose,
  orderCode,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!isOpen) return;
  }, [isOpen]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
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
    queryFn: () =>
      inventoryService.getPurchaseOrders({ status: "ORDERED", size: 100 }),
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
        deliveryNoteDocumentCode:
          formData.deliveryNoteDocumentCode || undefined,
        proofDocumentCode: formData.proofDocumentCode || undefined,
        lines: formData.lines,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      onClose();
      resetForm();
    },
    onError: (err: any) =>
      setActionError(
        err?.response?.data?.message || "Une erreur est survenue.",
      ),
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
      <div className="sticky top-0 bg-white ring-1 ring-gray-100 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
        <h3 className="text-lg sm:text-xl sm:text-2xl font-bold">Réception de marchandises</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-2xl">
          <X size={24} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[80vh]">
        <div className="p-8 space-y-6">
          {!formData.orderCode && (
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Bon de commande *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => {
                    setOrderSearch(e.target.value);
                    setShowOrderResults(true);
                  }}
                  placeholder="Rechercher un bon de commande..."
                  className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
                />
              </div>
              {showOrderResults && orders.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-w-md bg-white ring-1 rounded-2xl shadow-lg max-h-60 overflow-y-auto">
                  {orders.map((order: PurchaseOrder) => (
                    <button
                      key={order.orderCode}
                      onClick={() => selectOrder(order)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 ring-1 ring-gray-100 text-sm sm:text-base"
                    >
                      <p className="font-medium">{order.orderCode}</p>
                      <p className="text-sm text-gray-500">
                        {order.supplierName}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedOrder && (
            <div className="p-4 bg-gray-50 rounded-2xl space-y-1">
              <p className="text-base">
                <span className="font-medium">Bon de commande:</span>{" "}
                {selectedOrder.orderCode}
              </p>
              <p className="text-base">
                <span className="font-medium">Fournisseur:</span>{" "}
                {selectedOrder.supplierName}
              </p>
              <p className="text-base">
                <span className="font-medium">Emplacement:</span>{" "}
                {selectedOrder.locationCode}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
              Emplacement de réception *
            </label>
            <select
              value={formData.locationCode}
              onChange={(e) =>
                setFormData({ ...formData, locationCode: e.target.value })
              }
              className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
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
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Document facture
              </label>
              <input
                value={formData.invoiceDocumentCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    invoiceDocumentCode: e.target.value,
                  })
                }
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
                placeholder="DOC-..."
              />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Bon de livraison
              </label>
              <input
                value={formData.deliveryNoteDocumentCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    deliveryNoteDocumentCode: e.target.value,
                  })
                }
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
                placeholder="DOC-..."
              />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                Preuve / justificatif
              </label>
              <input
                value={formData.proofDocumentCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    proofDocumentCode: e.target.value,
                  })
                }
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
                placeholder="DOC-..."
              />
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3">Articles reçus</h4>
            <div className="space-y-4">
              {formData.lines.map((line, idx) => (
                <div key={idx} className="border rounded-2xl p-4 sm:p-5">
                  <p className="font-medium text-sm sm:text-base mb-3">{line.itemCode}</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">
                        Commandé
                      </label>
                      <p className="font-medium text-sm sm:text-base">
                        {line.orderedQuantity}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">
                        Reçu *
                      </label>
                      <input
                        type="number"
                        value={line.receivedQuantity}
                        onChange={(e) =>
                          updateLine(
                            idx,
                            "receivedQuantity",
                            Number(e.target.value) || 0,
                          )
                        }
                        className="w-full px-3 py-2 ring-1 rounded text-sm sm:text-base"
                        min="0"
                        max={line.orderedQuantity}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 block mb-1">
                        Rejeté
                      </label>
                      <input
                        type="number"
                        value={line.rejectedQuantity}
                        onChange={(e) =>
                          updateLine(
                            idx,
                            "rejectedQuantity",
                            Number(e.target.value) || 0,
                          )
                        }
                        className="w-full px-3 py-2 ring-1 rounded text-sm sm:text-base"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {actionError && (
            <div className="p-4 bg-red-50 ring-1 ring-1 ring-red-100 rounded-2xl text-red-700 text-sm sm:text-base">
              {actionError}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 pt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:px-5 ring-1 rounded-2xl text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
            >
              Annuler
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={
                !formData.orderCode ||
                !formData.locationCode ||
                createMutation.isPending
              }
              className="flex-1 bg-primary-600 text-white py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base font-medium w-full sm:w-auto justify-center"
            >
              {createMutation.isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Package size={20} />
              )}
              Valider la réception
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
