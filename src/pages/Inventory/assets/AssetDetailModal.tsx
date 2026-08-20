import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Wrench, Clock, Loader2 } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import type { Asset } from "../../../services/inventory.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
}

const statusOptions = [
  {
    value: "AVAILABLE",
    label: "Disponible",
    color: "bg-green-100 text-green-700",
  },
  { value: "RESERVED", label: "Réservé", color: "bg-blue-100 text-blue-700" },
  {
    value: "ASSIGNED",
    label: "Attribué",
    color: "bg-purple-100 text-purple-700",
  },
  {
    value: "IN_USE",
    label: "En utilisation",
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    value: "IN_MAINTENANCE",
    label: "En maintenance",
    color: "bg-orange-100 text-orange-700",
  },
  { value: "LOST", label: "Perdu", color: "bg-red-100 text-red-700" },
  { value: "RETIRED", label: "Retiré", color: "bg-gray-100 text-gray-700" },
  { value: "DAMAGED", label: "Endommagé", color: "bg-red-100 text-red-700" },
];

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  asset,
}) => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "info" | "maintenance" | "history"
  >("info");
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [assignData, setAssignData] = useState({
    assigneeType: "MEMBER",
    assigneeCode: "",
    expectedReturnAt: "",
    purpose: "",
    notes: "",
  });
  const [returnData, setReturnData] = useState({
    returnedToLocationCode: asset.locationCode,
    condition: "GOOD",
    notes: "",
  });
  const [maintenanceData, setMaintenanceData] = useState({
    maintenanceType: "CORRECTIVE",
    description: "",
    scheduledDate: "",
  });
  const [pendingAction, setPendingAction] = useState<
    "reserve" | "damaged" | "retire" | "lost" | null
  >(null);
  const [actionReason, setActionReason] = useState("");
  const [lastAssignment, setLastAssignment] = useState<any>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory-locations"],
    queryFn: () => inventoryService.getLocations(true),
  });

  const { data: locationHistory } = useQuery({
    queryKey: ["asset-location-history", asset.assetCode],
    queryFn: () => inventoryService.getAssetLocationHistory(asset.assetCode),
    enabled: activeTab === "history",
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      inventoryService.assignAsset(asset.assetCode, {
        assigneeType: assignData.assigneeType,
        assigneeCode: assignData.assigneeCode,
        expectedReturnAt: assignData.expectedReturnAt,
        assignedBy: admin?.email || String(admin?.id || "1"),
        purpose: assignData.purpose,
        notes: assignData.notes || undefined,
      }),
    onSuccess: (assignment) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setLastAssignment(assignment);
      setShowAssignForm(false);
      setAssignData({
        assigneeType: "MEMBER",
        assigneeCode: "",
        expectedReturnAt: "",
        purpose: "",
        notes: "",
      });
    },
  });

  const returnMutation = useMutation({
    mutationFn: () =>
      inventoryService.returnAsset(asset.assetCode, {
        returnedBy: admin?.email || String(admin?.id || "1"),
        returnedToLocationCode: returnData.returnedToLocationCode,
        condition: returnData.condition,
        notes: returnData.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setShowReturnForm(false);
    },
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: () =>
      inventoryService.createAssetMaintenance(asset.assetCode, {
        maintenanceType: maintenanceData.maintenanceType,
        description: maintenanceData.description,
        scheduledDate: maintenanceData.scheduledDate || undefined,
        requestedBy: admin?.email || String(admin?.id || "1"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-maintenances"] });
      setShowMaintenanceForm(false);
      setMaintenanceData({
        maintenanceType: "CORRECTIVE",
        description: "",
        scheduledDate: "",
      });
    },
  });

  const reserveMutation = useMutation({
    mutationFn: () =>
      inventoryService.reserveAsset(asset.assetCode, {
        reservedFor: assignData.assigneeCode,
        reason: actionReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setPendingAction(null);
      setActionReason("");
    },
  });

  const markDamagedMutation = useMutation({
    mutationFn: () =>
      inventoryService.markAssetDamaged(asset.assetCode, {
        reason: actionReason,
        reportedBy: admin?.email || String(admin?.id || "1"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setPendingAction(null);
      setActionReason("");
    },
  });

  const retireMutation = useMutation({
    mutationFn: () =>
      inventoryService.retireAsset(asset.assetCode, {
        reason: actionReason,
        reportedBy: admin?.email || String(admin?.id || "1"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setPendingAction(null);
      setActionReason("");
    },
  });

  const markLostMutation = useMutation({
    mutationFn: () =>
      inventoryService.markAssetLost(asset.assetCode, {
        reason: actionReason,
        reportedBy: admin?.email || String(admin?.id || "1"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setPendingAction(null);
      setActionReason("");
    },
  });

  const cancelReservationMutation = useMutation({
    mutationFn: () => inventoryService.cancelAssetReservation(asset.assetCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const downloadLoanSheet = async (assignmentId?: number) => {
    const id = assignmentId ?? lastAssignment?.assignmentId;
    if (!id) return;
    const pdf = await inventoryService.getAssetLoanSheetPdf(
      asset.assetCode,
      id,
    );
    const url = window.URL.createObjectURL(pdf);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiche_pret_${asset.assetCode}_${id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const canAssign = asset.status === "AVAILABLE" || asset.status === "RESERVED";
  const canReturn = asset.status === "ASSIGNED" || asset.status === "IN_USE";
  const canMaintain =
    asset.status !== "IN_MAINTENANCE" &&
    asset.status !== "RETIRED" &&
    asset.status !== "LOST";
  const canReserve = asset.status === "AVAILABLE";
  const canMarkDamaged =
    asset.status !== "DAMAGED" && asset.status !== "RETIRED";
  const canRetire = asset.status !== "RETIRED";
  const canMarkLost = asset.status !== "LOST" && asset.status !== "RETIRED";
  const canCancelReservation = asset.status === "RESERVED";

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 bg-white p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-t-2xl">
        <h3 className="text-xl sm:text-2xl font-bold">
          {asset.assetCode} - {asset.itemName}
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-2xl">
          <X size={24} />
        </button>
      </div>

      {/* Onglets - AGRANDIS */}
      <div className="ring-0 ring-gray-100 px-8">
        <div className="flex min-w-max gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab("info")}
            className={`py-4 text-sm sm:text-base font-medium ring-0-2 transition-colors ${activeTab === "info" ? "border-primary-600 text-primary-600" : "ring-0ransparent text-gray-500"}`}
          >
            Informations
          </button>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`py-4 text-sm sm:text-base font-medium ring-0-2 transition-colors ${activeTab === "maintenance" ? "border-primary-600 text-primary-600" : "ring-0ransparent text-gray-500"}`}
          >
            Maintenances
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-4 text-sm sm:text-base font-medium ring-0-2 transition-colors ${activeTab === "history" ? "border-primary-600 text-primary-600" : "ring-0ransparent text-gray-500"}`}
          >
            Historique
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-8">
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:p-6">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Statut</p>
                <p className="font-medium text-sm sm:text-base">
                  {statusOptions.find((s) => s.value === asset.status)?.label}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Condition</p>
                <p className="font-medium text-sm sm:text-base">{asset.condition}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Emplacement</p>
                <p className="font-medium text-sm sm:text-base">{asset.locationName}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Numéro de série</p>
                <p className="font-medium text-sm sm:text-base">
                  {asset.serialNumber || "-"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Tag</p>
                <p className="font-medium text-sm sm:text-base">{asset.assetTag || "-"}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Coût d'achat</p>
                <p className="font-medium text-sm sm:text-base">
                  {asset.purchaseCost.toLocaleString()} FCFA
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Date d'achat</p>
                <p className="font-medium text-sm sm:text-base">
                  {asset.purchaseDate
                    ? new Date(asset.purchaseDate).toLocaleDateString("fr-FR")
                    : "-"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Fin garantie</p>
                <p className="font-medium text-sm sm:text-base">
                  {asset.warrantyEndDate
                    ? new Date(asset.warrantyEndDate).toLocaleDateString(
                        "fr-FR",
                      )
                    : "-"}
                </p>
              </div>
            </div>

            {asset.notes && (
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-sm sm:text-base">{asset.notes}</p>
              </div>
            )}

            {/* Actions - AGRANDIES */}
            <div className="flex flex-wrap gap-4 pt-6 ring-0">
              {canAssign && (
                <button
                  onClick={() => setShowAssignForm(!showAssignForm)}
                  className="px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 text-sm sm:text-base"
                >
                  Attribuer
                </button>
              )}
              {canReturn && (
                <button
                  onClick={() => setShowReturnForm(!showReturnForm)}
                  className="px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 text-sm sm:text-base"
                >
                  Retourner
                </button>
              )}
              {canMaintain && (
                <button
                  onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
                  className="px-4 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 text-sm sm:text-base"
                >
                  Maintenance
                </button>
              )}
              {canReserve && (
                <button
                  onClick={() => {
                    setPendingAction("reserve");
                    setActionReason("");
                  }}
                  className="px-4 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 text-sm sm:text-base"
                >
                  Réserver
                </button>
              )}
              {canMarkDamaged && (
                <button
                  onClick={() => {
                    setPendingAction("damaged");
                    setActionReason("");
                  }}
                  className="px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 text-sm sm:text-base"
                >
                  Marquer endommagé
                </button>
              )}
              {canRetire && (
                <button
                  onClick={() => {
                    setPendingAction("retire");
                    setActionReason("");
                  }}
                  className="px-4 py-3 bg-gray-600 text-white rounded-2xl hover:bg-gray-700 text-sm sm:text-base"
                >
                  Retirer
                </button>
              )}
              {canMarkLost && (
                <button
                  onClick={() => {
                    setPendingAction("lost");
                    setActionReason("");
                  }}
                  className="px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 text-sm sm:text-base"
                >
                  Marquer perdu
                </button>
              )}
              {canCancelReservation && (
                <button
                  onClick={() => cancelReservationMutation.mutate()}
                  disabled={cancelReservationMutation.isPending}
                  className="px-4 py-3 bg-yellow-600 text-white rounded-2xl hover:bg-yellow-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  {cancelReservationMutation.isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    "Annuler la réservation"
                  )}
                </button>
              )}
            </div>

            {/* Formulaire de motif partage — reserver / endommager / retirer */}
            {pendingAction && (
              <div className="p-5 sm:p-6 bg-gray-50 rounded-2xl space-y-4">
                <h4 className="font-semibold text-lg">
                  {pendingAction === "reserve" && "Réserver l'actif"}
                  {pendingAction === "damaged" && "Marquer l'actif endommagé"}
                  {pendingAction === "retire" && "Retirer l'actif"}
                  {pendingAction === "lost" && "Marquer l'actif perdu"}
                </h4>
                <textarea
                  placeholder="Motif *"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <button
                    onClick={() => {
                      setPendingAction(null);
                      setActionReason("");
                    }}
                    className="flex-1 px-5 py-3 border rounded-2xl text-gray-700 text-sm sm:text-base"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (pendingAction === "reserve") reserveMutation.mutate();
                      if (pendingAction === "damaged")
                        markDamagedMutation.mutate();
                      if (pendingAction === "retire") retireMutation.mutate();
                      if (pendingAction === "lost") markLostMutation.mutate();
                    }}
                    disabled={
                      !actionReason.trim() ||
                      reserveMutation.isPending ||
                      markDamagedMutation.isPending ||
                      retireMutation.isPending ||
                      markLostMutation.isPending
                    }
                    className={`flex-1 justify-center text-white py-3 rounded-2xl disabled:opacity-50 text-sm sm:text-base ${
                      pendingAction === "damaged" || pendingAction === "lost"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-primary-600 hover:bg-primary-700"
                    }`}
                  >
                    {reserveMutation.isPending ||
                    markDamagedMutation.isPending ||
                    retireMutation.isPending ||
                    markLostMutation.isPending ? (
                      <Loader2 size={20} className="animate-spin mx-auto" />
                    ) : (
                      "Confirmer"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Formulaire d'attribution - AGRANDI */}
            {showAssignForm && (
              <div className="p-5 sm:p-6 bg-gray-50 rounded-2xl space-y-4">
                <h4 className="font-semibold text-lg">Attribuer l'actif</h4>
                <select
                  value={assignData.assigneeType}
                  onChange={(e) =>
                    setAssignData({
                      ...assignData,
                      assigneeType: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                >
                  <option value="MEMBER">Membre</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="BUSINESS">Business</option>
                  <option value="ROOM">Salle</option>
                  <option value="LOCATION">Emplacement</option>
                </select>
                <input
                  type="text"
                  placeholder="Code du bénéficiaire (ex: MBR-00001)"
                  value={assignData.assigneeCode}
                  onChange={(e) =>
                    setAssignData({
                      ...assignData,
                      assigneeCode: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                />
                <input
                  type="datetime-local"
                  value={assignData.expectedReturnAt}
                  onChange={(e) =>
                    setAssignData({
                      ...assignData,
                      expectedReturnAt: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                />
                <input
                  type="text"
                  placeholder="Motif du prêt / usage prévu *"
                  value={assignData.purpose}
                  onChange={(e) =>
                    setAssignData({ ...assignData, purpose: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                />
                <textarea
                  placeholder="Notes (optionnel)"
                  value={assignData.notes}
                  onChange={(e) =>
                    setAssignData({ ...assignData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <button
                    onClick={() => setShowAssignForm(false)}
                    className="flex-1 px-5 py-3 border rounded-2xl text-gray-700 text-sm sm:text-base"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => assignMutation.mutate()}
                    disabled={
                      !assignData.assigneeCode ||
                      !assignData.expectedReturnAt ||
                      !assignData.purpose ||
                      assignMutation.isPending
                    }
                    className="flex-1 justify-center bg-primary-600 text-white py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base"
                  >
                    {assignMutation.isPending ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      "Attribuer"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Formulaire maintenance - AGRANDI */}
            {showMaintenanceForm && (
              <div className="p-5 sm:p-6 bg-gray-50 rounded-2xl space-y-4">
                <h4 className="font-semibold text-lg">
                  Demande de maintenance
                </h4>
                <select
                  value={maintenanceData.maintenanceType}
                  onChange={(e) =>
                    setMaintenanceData({
                      ...maintenanceData,
                      maintenanceType: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                >
                  <option value="PREVENTIVE">Préventive</option>
                  <option value="CORRECTIVE">Corrective</option>
                  <option value="INSPECTION">Inspection</option>
                </select>
                <textarea
                  placeholder="Description du problème"
                  value={maintenanceData.description}
                  onChange={(e) =>
                    setMaintenanceData({
                      ...maintenanceData,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                  required
                />
                <input
                  type="date"
                  placeholder="Date planifiée"
                  value={maintenanceData.scheduledDate}
                  onChange={(e) =>
                    setMaintenanceData({
                      ...maintenanceData,
                      scheduledDate: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <button
                    onClick={() => setShowMaintenanceForm(false)}
                    className="flex-1 px-5 py-3 border rounded-2xl text-gray-700 text-sm sm:text-base"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => createMaintenanceMutation.mutate()}
                    disabled={
                      !maintenanceData.description ||
                      createMaintenanceMutation.isPending
                    }
                    className="flex-1 justify-center bg-primary-600 text-white py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base"
                  >
                    {createMaintenanceMutation.isPending ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      "Créer"
                    )}
                  </button>
                </div>
              </div>
            )}

            {lastAssignment?.assignmentId && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex flex-col lg:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-medium text-green-800">
                    Actif attribué avec succès
                  </p>
                  <p className="text-sm text-green-700">
                    Téléchargez la fiche de prêt pour signature immédiate.
                  </p>
                </div>
                <button
                  onClick={() => downloadLoanSheet(lastAssignment.assignmentId)}
                  className="px-4 py-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 text-sm"
                >
                  Télécharger la fiche de prêt
                </button>
              </div>
            )}

            {/* Formulaire de retour - AGRANDI */}
            {showReturnForm && (
              <div className="p-5 sm:p-6 bg-gray-50 rounded-2xl space-y-4">
                <h4 className="font-semibold text-lg">Retourner l'actif</h4>
                <select
                  value={returnData.returnedToLocationCode}
                  onChange={(e) =>
                    setReturnData({
                      ...returnData,
                      returnedToLocationCode: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                >
                  {locations.map((loc: any) => (
                    <option key={loc.locationCode} value={loc.locationCode}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <select
                  value={returnData.condition}
                  onChange={(e) =>
                    setReturnData({ ...returnData, condition: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                >
                  <option value="NEW">Neuf</option>
                  <option value="GOOD">Bon</option>
                  <option value="FAIR">Correct</option>
                  <option value="POOR">Mauvais</option>
                  <option value="DAMAGED">Endommagé</option>
                </select>
                <textarea
                  placeholder="Notes (optionnel)"
                  value={returnData.notes}
                  onChange={(e) =>
                    setReturnData({ ...returnData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border rounded-2xl text-sm sm:text-base"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <button
                    onClick={() => setShowReturnForm(false)}
                    className="flex-1 px-5 py-3 border rounded-2xl text-gray-700 text-sm sm:text-base"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => returnMutation.mutate()}
                    disabled={returnMutation.isPending}
                    className="flex-1 justify-center bg-primary-600 text-white py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base"
                  >
                    {returnMutation.isPending ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      "Retourner"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "maintenance" && (
          <div className="text-center py-12 text-gray-500">
            <Wrench size={64} className="mx-auto mb-6 text-gray-300" />
            <p className="text-sm sm:text-base">Liste des maintenances à venir...</p>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            {locationHistory && locationHistory.length > 0 ? (
              locationHistory.map((h: any, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 rounded-2xl"
                >
                  <div>
                    <p className="font-medium text-sm sm:text-base">{h.locationName}</p>
                    <p className="text-sm text-gray-500">
                      Déplacé par: {h.movedBy}
                    </p>
                  </div>
                  <p className="text-sm sm:text-base text-gray-500">
                    {new Date(h.movedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Clock size={64} className="mx-auto mb-6 text-gray-300" />
                <p className="text-sm sm:text-base">Aucun historique de localisation</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
