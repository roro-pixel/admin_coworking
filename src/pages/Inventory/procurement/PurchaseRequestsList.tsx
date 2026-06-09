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
  Trash2,
  Eye,
} from "lucide-react";
import { ModalPortal } from "../../../components/ui/ModalPortal";
import { inventoryService } from "../../../services/inventory.service";
import type {
  PurchaseRequest,
  InventoryItem,
} from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  DRAFT: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: null },
  SUBMITTED: {
    label: "Soumise",
    color: "bg-yellow-100 text-yellow-700",
    icon: Send,
  },
  APPROVED: {
    label: "Approuvée",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejetée",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  CONVERTED: {
    label: "Convertie",
    color: "bg-blue-100 text-blue-700",
    icon: CheckCircle,
  },
};

export const PurchaseRequestsList: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    locationCode: "",
    lines: [{ itemCode: "", quantity: 1, unitCost: 0 }],
  });
  const [itemSearch, setItemSearch] = useState("");
  const [rejectModal, setRejectModal] = useState<{ code: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showItemResults, setShowItemResults] = useState(false);

  const [selectedRequest, setSelectedRequest] =
    useState<PurchaseRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["purchase-requests", statusFilter],
    queryFn: () =>
      inventoryService.getPurchaseRequests({
        status: statusFilter || undefined,
        size: 100,
      }),
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

  const requests = requestsData?.content || [];
  const items = itemsData?.content || [];

  const createMutation = useMutation({
    mutationFn: () =>
      inventoryService.createPurchaseRequest({
        locationCode: formData.locationCode,
        requestedBy: admin?.email || "admin",
        lines: formData.lines.filter((l) => l.itemCode && l.quantity > 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const submitMutation = useMutation({
    mutationFn: (requestCode: string) =>
      inventoryService.submitPurchaseRequest(requestCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ code, approvedBy }: { code: string; approvedBy: string }) =>
      inventoryService.approvePurchaseRequest(code, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      code,
      approvedBy,
      reason,
    }: {
      code: string;
      approvedBy: string;
      reason: string;
    }) => inventoryService.rejectPurchaseRequest(code, approvedBy, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      setRejectModal(null);
    },
  });

  const resetForm = () => {
    setFormData({
      locationCode: "",
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

  const handleViewDetail = (req: PurchaseRequest) => {
    setSelectedRequest(req);
    setIsDetailOpen(true);
  };

  const filteredRequests = requests.filter((req: PurchaseRequest) =>
    req.requestCode.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">
          Demandes d'achat
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-base font-medium"
        >
          <Plus size={20} />
          Nouvelle demande
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
            placeholder="Rechercher une demande..."
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
          <option value="SUBMITTED">Soumises</option>
          <option value="APPROVED">Approuvées</option>
          <option value="REJECTED">Rejetées</option>
          <option value="CONVERTED">Converties</option>
        </select>
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-base">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-5 py-4 text-left font-semibold">Code</th>
              <th className="px-5 py-4 text-left font-semibold">Emplacement</th>
              <th className="px-5 py-4 text-left font-semibold">Demandeur</th>
              <th className="px-5 py-4 text-right font-semibold">Montant</th>
              <th className="px-5 py-4 text-left font-semibold">Statut</th>
              <th className="px-5 py-4 text-left font-semibold">Date</th>
              <th className="px-5 py-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRequests.map((req: PurchaseRequest) => {
              const status = statusConfig[req.status];
              const StatusIcon = status?.icon;
              const totalAmount =
                req.lines?.reduce(
                  (sum, l) => sum + l.quantity * l.unitCost,
                  0,
                ) || 0;
              return (
                <tr key={req.requestCode} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono text-sm">
                    {req.requestCode}
                  </td>
                  <td className="px-5 py-4">{req.locationName}</td>
                  <td className="px-5 py-4">{req.requestedBy}</td>
                  <td className="px-5 py-4 text-right font-medium">
                    {totalAmount.toLocaleString()} FCFA
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
                    {new Date(req.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleViewDetail(req)}
                        className="p-1.5 text-gray-600 hover:text-primary-600"
                        title="Voir détail"
                      >
                        <Eye size={18} />
                      </button>
                      {req.status === "DRAFT" && (
                        <button
                          onClick={() => submitMutation.mutate(req.requestCode)}
                          className="p-1.5 text-yellow-600 hover:text-yellow-800"
                          title="Soumettre"
                        >
                          <Send size={18} />
                        </button>
                      )}
                      {req.status === "SUBMITTED" && (
                        <>
                          <button
                            onClick={() =>
                              approveMutation.mutate({
                                code: req.requestCode,
                                approvedBy: admin?.email || "admin",
                              })
                            }
                            className="p-1.5 text-green-600 hover:text-green-800"
                            title="Approuver"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setRejectModal({ code: req.requestCode });
                              setRejectReason("");
                            }}
                            className="p-1.5 text-red-600 hover:text-red-800"
                            title="Rejeter"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl">
          <p className="text-gray-500 text-base">Aucune demande trouvée</p>
        </div>
      )}

      {/* ========== MODAL CRÉATION DEMANDE - AGRANDI ========== */}
      {isModalOpen && (
        <ModalPortal onClose={() => setIsModalOpen(false)} size="2xl">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-2xl font-bold">Nouvelle demande d'achat</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8 space-y-6">
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

      {/* ========== MODAL DÉTAIL DEMANDE - AGRANDI ========== */}
      {isDetailOpen && selectedRequest && (
        <ModalPortal onClose={() => setIsDetailOpen(false)} size="2xl">
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-2xl font-bold">
                {selectedRequest.requestCode}
              </h3>
              <p className="text-base text-gray-500 mt-1">Demande d'achat</p>
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
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${statusConfig[selectedRequest.status]?.color}`}
                >
                  {statusConfig[selectedRequest.status]?.label}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Date de création</p>
                <p className="text-base">
                  {new Date(selectedRequest.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Emplacement</p>
                <p className="font-medium text-base">
                  {selectedRequest.locationName}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Demandeur</p>
                <p className="text-base">{selectedRequest.requestedBy}</p>
              </div>
              {selectedRequest.approvedBy && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Approuvé par</p>
                  <p className="text-base">{selectedRequest.approvedBy}</p>
                </div>
              )}
              {selectedRequest.rejectionReason && (
                <div className="p-4 bg-red-50 rounded-lg col-span-2">
                  <p className="text-sm text-red-500 mb-1">Motif de rejet</p>
                  <p className="text-base text-red-700">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-base font-semibold text-gray-700 mb-3">
                Lignes ({selectedRequest.lines?.length || 0})
              </h4>
              <div className="space-y-3">
                {selectedRequest.lines?.map((line, idx) => (
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
                        {(line.quantity * line.unitCost).toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedRequest.lines && selectedRequest.lines.length > 0 && (
                <div className="flex justify-between font-bold text-lg pt-4 border-t mt-3">
                  <span>Total</span>
                  <span>
                    {selectedRequest.lines
                      .reduce((sum, l) => sum + l.quantity * l.unitCost, 0)
                      .toLocaleString()}{" "}
                    FCFA
                  </span>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ========== MODAL REJET - AGRANDI ========== */}
      {rejectModal && (
        <ModalPortal onClose={() => setRejectModal(null)}>
          <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-2xl font-bold">Rejeter la demande</h3>
            <button
              onClick={() => setRejectModal(null)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Motif du rejet *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Expliquez le motif du rejet..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none text-base"
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 px-5 py-3 border rounded-lg text-gray-700 hover:bg-gray-50 text-base"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (rejectReason && rejectModal) {
                    rejectMutation.mutate({
                      code: rejectModal.code,
                      approvedBy: admin?.email || "admin",
                      reason: rejectReason,
                    });
                  }
                }}
                disabled={!rejectReason || rejectMutation.isPending}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 text-base font-medium"
              >
                {rejectMutation.isPending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "Confirmer le rejet"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
