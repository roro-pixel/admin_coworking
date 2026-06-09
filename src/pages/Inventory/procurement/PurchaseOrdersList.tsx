import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Search,
  X,
  Loader2,
  Truck,
  Package,
  Clock,
  Trash2,
  Eye,
} from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import type {
  PurchaseOrder,
  Supplier,
  InventoryItem,
} from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: null },
  PENDING_APPROVAL: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  APPROVED: {
    label: "Approuvé",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
  ORDERED: {
    label: "Commandé",
    color: "bg-purple-100 text-purple-700",
    icon: Send,
  },
  PARTIALLY_RECEIVED: {
    label: "Partiellement reçu",
    color: "bg-orange-100 text-orange-700",
    icon: Truck,
  },
  RECEIVED: {
    label: "Reçu",
    color: "bg-green-100 text-green-700",
    icon: Package,
  },
  CANCELLED: {
    label: "Annulé",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

export const PurchaseOrdersList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplierCode: "",
    locationCode: "",
    expectedDeliveryDate: "",
    lines: [{ itemCode: "", quantity: 1, unitCost: 0 }],
  });
  const [itemSearch, setItemSearch] = useState("");
  const [showItemResults, setShowItemResults] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["purchase-orders", statusFilter],
    queryFn: () =>
      inventoryService.getPurchaseOrders({
        status: statusFilter || undefined,
        size: 100,
      }),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: () =>
      inventoryService.getSuppliers({ status: "ACTIVE", size: 100 }),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: () => inventoryService.getLocations(true),
  });

  const { data: itemsData } = useQuery({
    queryKey: ["inventory-items-search", itemSearch],
    queryFn: () =>
      inventoryService.getItems({ query: itemSearch || undefined, size: 20 }),
    enabled: itemSearch.length > 1,
  });

  const orders = ordersData?.content || [];
  const suppliers = suppliersData?.content || [];
  const items = itemsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryService.createPurchaseOrder({
        supplierCode: formData.supplierCode,
        locationCode: formData.locationCode,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        orderedBy: admin?.email || "admin",
        lines: formData.lines.filter((l) => l.itemCode && l.quantity > 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ code, approvedBy }: { code: string; approvedBy: string }) =>
      inventoryService.approvePurchaseOrder(code, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const markOrderedMutation = useMutation({
    mutationFn: ({ code, orderedBy }: { code: string; orderedBy: string }) =>
      inventoryService.markOrdered(code, orderedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (code: string) => inventoryService.cancelPurchaseOrder(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const resetForm = () => {
    setFormData({
      supplierCode: "",
      locationCode: "",
      expectedDeliveryDate: "",
      lines: [{ itemCode: "", quantity: 1, unitCost: 0 }],
    });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { itemCode: "", quantity: 1, unitCost: 0 }],
    });
  };

  const removeLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    });
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const selectItemForLine = (index: number, item: InventoryItem) => {
    updateLine(index, "itemCode", item.itemCode);
    setItemSearch("");
    setShowItemResults(false);
  };

  const handleViewDetail = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const filteredOrders = orders.filter(
    (order: PurchaseOrder) =>
      order.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      order.supplierName.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">
          Bons de commande
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-base font-medium"
        >
          <Plus size={20} />
          Nouveau bon de commande
        </button>
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
            placeholder="Rechercher un bon de commande..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-base"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-5 py-3 border border-gray-200 rounded-lg bg-white text-base min-w-[180px]"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PENDING_APPROVAL">En attente</option>
          <option value="APPROVED">Approuvé</option>
          <option value="ORDERED">Commandé</option>
          <option value="PARTIALLY_RECEIVED">Partiellement reçu</option>
          <option value="RECEIVED">Reçu</option>
          <option value="CANCELLED">Annulé</option>
        </select>
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Code</th>
              <th className="px-5 py-4 text-left font-semibold">Fournisseur</th>
              <th className="px-5 py-4 text-left font-semibold">Emplacement</th>
              <th className="px-5 py-4 text-right font-semibold">Montant</th>
              <th className="px-5 py-4 text-left font-semibold">Statut</th>
              <th className="px-5 py-4 text-left font-semibold">Date</th>
              <th className="px-5 py-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredOrders.map((order: PurchaseOrder) => {
              const status = statusConfig[order.status];
              const StatusIcon = status?.icon;
              return (
                <tr key={order.orderCode} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-sm">
                    {order.orderCode}
                  </td>
                  <td className="px-5 py-4">{order.supplierName}</td>
                  <td className="px-5 py-4">{order.locationCode}</td>
                  <td className="px-5 py-4 text-right font-medium">
                    {order.totalAmount.toLocaleString()} FCFA
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${status?.color}`}
                    >
                      {StatusIcon && <StatusIcon size={14} />}
                      {status?.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleViewDetail(order)}
                        className="p-1.5 text-gray-600 hover:text-primary-600"
                        title="Voir détail"
                      >
                        <Eye size={18} />
                      </button>
                      {order.status === "DRAFT" && (
                        <button
                          onClick={() =>
                            approveMutation.mutate({
                              code: order.orderCode,
                              approvedBy: admin?.email || "admin",
                            })
                          }
                          className="p-1.5 text-blue-600 hover:text-blue-800"
                          title="Approuver"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {order.status === "APPROVED" && (
                        <button
                          onClick={() =>
                            markOrderedMutation.mutate({
                              code: order.orderCode,
                              orderedBy: admin?.email || "admin",
                            })
                          }
                          className="p-1.5 text-purple-600 hover:text-purple-800"
                          title="Marquer comme commandé"
                        >
                          <Send size={18} />
                        </button>
                      )}
                      {(order.status === "DRAFT" ||
                        order.status === "PENDING_APPROVAL") && (
                        <button
                          onClick={() => cancelMutation.mutate(order.orderCode)}
                          className="p-1.5 text-red-600 hover:text-red-800"
                          title="Annuler"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-gray-500 text-base">
            Aucun bon de commande trouvé
          </p>
        </div>
      )}

      {/* ========== MODAL DÉTAIL BON DE COMMANDE - AGRANDI ========== */}
      {isDetailOpen && selectedOrder && (
        <ModalPortal onClose={() => setIsDetailOpen(false)} size="2xl">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-2xl font-bold">{selectedOrder.orderCode}</h3>
              <p className="text-base text-gray-500 mt-1">Bon de commande</p>
            </div>
            <button
              onClick={() => setIsDetailOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Statut</p>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${statusConfig[selectedOrder.status]?.color}`}
                >
                  {statusConfig[selectedOrder.status]?.label}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Date de création</p>
                <p className="text-base">
                  {new Date(selectedOrder.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Fournisseur</p>
                <p className="font-medium text-base">
                  {selectedOrder.supplierName}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Emplacement</p>
                <p className="text-base">{selectedOrder.locationCode}</p>
              </div>
              {selectedOrder.expectedDeliveryDate && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Livraison prévue</p>
                  <p className="text-base">
                    {new Date(
                      selectedOrder.expectedDeliveryDate,
                    ).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              )}
              {selectedOrder.approvedBy && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Approuvé par</p>
                  <p className="text-base">{selectedOrder.approvedBy}</p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-base font-semibold text-gray-700 mb-3">
                Lignes ({selectedOrder.lines?.length || 0})
              </h4>
              <div className="space-y-3">
                {selectedOrder.lines?.map((line, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-base">
                        {line.itemName || line.itemCode}
                      </p>
                      <p className="text-sm text-gray-500 font-mono">
                        {line.itemCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base">
                        {line.quantity} × {line.unitCost.toLocaleString()} FCFA
                      </p>
                      <p className="font-bold text-base">
                        {line.totalCost.toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-lg pt-4 border-t mt-3">
                <span>Total</span>
                <span>{selectedOrder.totalAmount.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL CRÉATION BON DE COMMANDE - AGRANDI ========== */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)} size="2xl">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-2xl font-bold">Nouveau bon de commande</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Fournisseur *
                </label>
                <select
                  value={formData.supplierCode}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierCode: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                >
                  <option value="">Sélectionner</option>
                  {suppliers.map((sup: Supplier) => (
                    <option key={sup.code} value={sup.code}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Emplacement *
                </label>
                <select
                  value={formData.locationCode}
                  onChange={(e) =>
                    setFormData({ ...formData, locationCode: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                >
                  <option value="">Sélectionner</option>
                  {locations.map((loc: any) => (
                    <option key={loc.locationCode} value={loc.locationCode}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Date livraison prévue
              </label>
              <input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expectedDeliveryDate: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-3">
                Articles
              </label>
              {formData.lines.map((line, idx) => (
                <div key={idx} className="flex gap-3 mb-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Rechercher un article..."
                      value={itemSearch}
                      onChange={(e) => {
                        setItemSearch(e.target.value);
                        setShowItemResults(true);
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base"
                    />
                    {showItemResults && items.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {items.map((item: InventoryItem) => (
                          <button
                            key={item.itemCode}
                            type="button"
                            onClick={() => {
                              selectItemForLine(idx, item);
                              setItemSearch("");
                              setShowItemResults(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b text-base"
                          >
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              {item.itemCode}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Qté"
                    value={line.quantity === 0 ? "" : line.quantity}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      updateLine(
                        idx,
                        "quantity",
                        val === "" ? 0 : parseInt(val),
                      );
                    }}
                    className="w-28 px-4 py-3 border border-gray-200 rounded-lg text-base text-center"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Prix"
                    value={line.unitCost === 0 ? "" : line.unitCost}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      updateLine(
                        idx,
                        "unitCost",
                        val === "" ? 0 : parseInt(val),
                      );
                    }}
                    className="w-36 px-4 py-3 border border-gray-200 rounded-lg text-base text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addLine}
                className="mt-3 text-primary-600 text-base flex items-center gap-1 hover:text-primary-700"
              >
                <Plus size={18} /> Ajouter un article
              </button>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-5 py-3 border rounded-lg text-gray-700 hover:bg-gray-50 text-base"
              >
                Annuler
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={
                  !formData.supplierCode ||
                  !formData.locationCode ||
                  formData.lines.length === 0 ||
                  createMutation.isPending
                }
                className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 text-base font-medium flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Créer"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
