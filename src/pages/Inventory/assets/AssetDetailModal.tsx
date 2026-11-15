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
  { value: "AVAILABLE", label: "Disponible", dot: "bg-emerald-500" },
  { value: "RESERVED", label: "Réservé", dot: "bg-blue-500" },
  { value: "ASSIGNED", label: "Attribué", dot: "bg-violet-500" },
  { value: "IN_USE", label: "En utilisation", dot: "bg-cyan-500" },
  { value: "IN_MAINTENANCE", label: "En maintenance", dot: "bg-amber-500" },
  { value: "LOST", label: "Perdu", dot: "bg-red-500" },
  { value: "RETIRED", label: "Retiré", dot: "bg-gray-400" },
  { value: "DAMAGED", label: "Endommagé", dot: "bg-red-500" },
];

const inputClass =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-lg outline-none transition focus:border-gray-400 text-sm";

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="p-3.5 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function ActionButton({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

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

  // Body {reservedFor, reason} conforme a la doc (section 15).
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

  // Body {reason, reportedBy} conforme a la doc pour mark-damaged.
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

  // Body {reason, reportedBy} conforme a la doc pour retire.
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

  // Body {reason, reportedBy} conforme a la doc pour mark-lost.
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

  const currentStatus = statusOptions.find((s) => s.value === asset.status);

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {asset.assetCode} — {asset.itemName}
          </h3>
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${currentStatus?.dot}`} />
            {currentStatus?.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="border-b border-gray-100 px-6">
        <div className="flex gap-6">
          {[
            { key: "info", label: "Informations" },
            { key: "maintenance", label: "Maintenances" },
            { key: "history", label: "Historique" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === "info" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField label="Statut" value={currentStatus?.label} />
              <InfoField label="Condition" value={asset.condition} />
              <InfoField label="Emplacement" value={asset.locationName} />
              <InfoField label="Numéro de série" value={asset.serialNumber || "—"} />
              <InfoField label="Tag" value={asset.assetTag || "—"} />
              <InfoField
                label="Coût d'achat"
                value={`${asset.purchaseCost.toLocaleString()} FCFA`}
              />
              <InfoField
                label="Date d'achat"
                value={
                  asset.purchaseDate
                    ? new Date(asset.purchaseDate).toLocaleDateString("fr-FR")
                    : "—"
                }
              />
              <InfoField
                label="Fin garantie"
                value={
                  asset.warrantyEndDate
                    ? new Date(asset.warrantyEndDate).toLocaleDateString("fr-FR")
                    : "—"
                }
              />
            </div>

            {asset.notes && <InfoField label="Notes" value={asset.notes} />}

            {/* Actions — style neutre uniforme, rouge reserve aux actions
                destructrices (endommage / perdu) pour eviter l'effet
                arc-en-ciel de boutons colores. */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {canAssign && (
                <ActionButton onClick={() => setShowAssignForm(!showAssignForm)}>
                  Attribuer
                </ActionButton>
              )}
              {canReturn && (
                <ActionButton onClick={() => setShowReturnForm(!showReturnForm)}>
                  Retourner
                </ActionButton>
              )}
              {canMaintain && (
                <ActionButton
                  onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
                >
                  Maintenance
                </ActionButton>
              )}
              {canReserve && (
                <ActionButton
                  onClick={() => {
                    setPendingAction("reserve");
                    setActionReason("");
                  }}
                >
                  Réserver
                </ActionButton>
              )}
              {canCancelReservation && (
                <ActionButton
                  onClick={() => cancelReservationMutation.mutate()}
                >
                  {cancelReservationMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    "Annuler la réservation"
                  )}
                </ActionButton>
              )}
              {canRetire && (
                <ActionButton
                  onClick={() => {
                    setPendingAction("retire");
                    setActionReason("");
                  }}
                >
                  Retirer
                </ActionButton>
              )}
              {canMarkDamaged && (
                <ActionButton
                  danger
                  onClick={() => {
                    setPendingAction("damaged");
                    setActionReason("");
                  }}
                >
                  Marquer endommagé
                </ActionButton>
              )}
              {canMarkLost && (
                <ActionButton
                  danger
                  onClick={() => {
                    setPendingAction("lost");
                    setActionReason("");
                  }}
                >
                  Marquer perdu
                </ActionButton>
              )}
            </div>

            {/* Formulaire de motif partagé — reserver / endommager / retirer / perdre */}
            {pendingAction && (
              <div className="p-5 bg-gray-50 rounded-xl space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">
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
                  className={`${inputClass} bg-white`}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => {
                      setPendingAction(null);
                      setActionReason("");
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-white text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      if (pendingAction === "reserve") reserveMutation.mutate();
                      if (pendingAction === "damaged") markDamagedMutation.mutate();
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
                    className={`flex-1 justify-center text-white py-2.5 rounded-lg disabled:opacity-50 text-sm font-medium ${
                      pendingAction === "damaged" || pendingAction === "lost"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-gray-900 hover:bg-gray-800"
                    }`}
                  >
                    {reserveMutation.isPending ||
                    markDamagedMutation.isPending ||
                    retireMutation.isPending ||
                    markLostMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin mx-auto" />
                    ) : (
                      "Confirmer"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Formulaire d'attribution */}
            {showAssignForm && (
              <div className="p-5 bg-gray-50 rounded-xl space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Attribuer l'actif</h4>
                <select
                  value={assignData.assigneeType}
                  onChange={(e) =>
                    setAssignData({ ...assignData, assigneeType: e.target.value })
                  }
                  className={`${inputClass} bg-white`}
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
                    setAssignData({ ...assignData, assigneeCode: e.target.value })
                  }
                  className={`${inputClass} bg-white`}
                />
                <input
                  type="datetime-local"
                  value={assignData.expectedReturnAt}
                  onChange={(e) =>
                    setAssignData({ ...assignData, expectedReturnAt: e.target.value })
                  }
                  className={`${inputClass} bg-white`}
                />
                <input
                  type="text"
                  placeholder="Motif du prêt / usage prévu *"
                  value={assignData.purpose}
                  onChange={(e) =>
                    setAssignData({ ...assignData, purpose: e.target.value })
                  }
                  className={`${inputClass} bg-white`}
                />
                <textarea
                  placeholder="Notes (optionnel)"
                  value={assignData.notes}
                  onChange={(e) =>
                    setAssignData({ ...assignData, notes: e.target.value })
                  }
                  rows={3}
                  className={`${inputClass} bg-white`}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => setShowAssignForm(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-white text-sm font-medium"
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
                    className="flex-1 justify-center bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
                  >
                    {assignMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin mx-auto" />
                    ) : (
                      "Attribuer"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Formulaire maintenance */}
            {showMaintenanceForm && (
              <div className="p-5 bg-gray-50 rounded-xl space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">
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
                  className={`${inputClass} bg-white`}
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
                  className={`${inputClass} bg-white`}
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
                  className={`${inputClass} bg-white`}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => setShowMaintenanceForm(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-white text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => createMaintenanceMutation.mutate()}
                    disabled={
                      !maintenanceData.description ||
                      createMaintenanceMutation.isPending
                    }
                    className="flex-1 justify-center bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
                  >
                    {createMaintenanceMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin mx-auto" />
                    ) : (
                      "Créer"
                    )}
                  </button>
                </div>
              </div>
            )}

            {lastAssignment?.assignmentId && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-emerald-800">
                    Actif attribué avec succès
                  </p>
                  <p className="text-sm text-emerald-700">
                    Téléchargez la fiche de prêt pour signature immédiate.
                  </p>
                </div>
                <button
                  onClick={() => downloadLoanSheet(lastAssignment.assignmentId)}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium whitespace-nowrap"
                >
                  Télécharger la fiche de prêt
                </button>
              </div>
            )}

            {/* Formulaire de retour */}
            {showReturnForm && (
              <div className="p-5 bg-gray-50 rounded-xl space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Retourner l'actif</h4>
                <select
                  value={returnData.returnedToLocationCode}
                  onChange={(e) =>
                    setReturnData({
                      ...returnData,
                      returnedToLocationCode: e.target.value,
                    })
                  }
                  className={`${inputClass} bg-white`}
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
                  className={`${inputClass} bg-white`}
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
                  className={`${inputClass} bg-white`}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => setShowReturnForm(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-white text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => returnMutation.mutate()}
                    disabled={returnMutation.isPending}
                    className="flex-1 justify-center bg-gray-900 text-white py-2.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
                  >
                    {returnMutation.isPending ? (
                      <Loader2 size={16} className="animate-spin mx-auto" />
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
            <Wrench size={36} className="mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Liste des maintenances à venir…</p>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-2">
            {locationHistory && locationHistory.length > 0 ? (
              locationHistory.map((h: any, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3.5 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{h.locationName}</p>
                    <p className="text-xs text-gray-500">Déplacé par : {h.movedBy}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(h.movedAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Clock size={36} className="mx-auto mb-4 text-gray-300" />
                <p className="text-sm">Aucun historique de localisation</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  );
};