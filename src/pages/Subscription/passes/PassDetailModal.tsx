import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Calendar,
  Tag,
  Users,
  XCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Pass } from "../../../services/subscription.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface PassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pass: Pass;
}

const passTypeLabels: Record<string, string> = {
  DAY_PASS: "Pass journée",
  TIME_PACK: "Pack heures",
  VISITOR_PASS: "Pass visiteur",
  MEETING_ROOM_PACK: "Pack salle de réunion",
  PROMOTIONAL_PASS: "Pass promotionnel",
  SUBSCRIPTION_PASS: "Pass souscription",
  COMPANY_SHARED_PASS: "Pass entreprise partagé",
  CUSTOM: "Personnalisé",
};

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  ACTIVE: {
    label: "Actif",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle size={14} />,
  },
  CANCELLED: {
    label: "Annulé",
    color: "bg-red-100 text-red-700",
    icon: <XCircle size={14} />,
  },
  EXPIRED: {
    label: "Expiré",
    color: "bg-gray-100 text-gray-500",
    icon: <Clock size={14} />,
  },
  PENDING: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
    icon: <Clock size={14} />,
  },
};

export const PassDetailModal: React.FC<PassDetailModalProps> = ({
  isOpen,
  onClose,
  pass,
}) => {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () =>
      subscriptionService.cancelPass(pass.passNumber, "Annulé par admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
      onClose();
    },
    onError: (error: any) => {
      alert(
        error?.response?.data?.message ??
          "Erreur lors de l'annulation du pass.",
      );
    },
  });

  if (!isOpen) return null;

  const cfg = statusConfig[pass.status] ?? {
    label: pass.status,
    color: "bg-gray-100 text-gray-600",
    icon: null,
  };

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">{pass.name}</h3>
          <p className="text-sm text-gray-500 font-mono">{pass.passNumber}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Statut */}
        <div className="flex justify-center">
          <span
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${cfg.color}`}
          >
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        {/* Infos générales */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Type</p>
            <p className="font-medium text-sm">
              {passTypeLabels[pass.passType] ?? pass.passType}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Propriétaire</p>
            <p className="font-medium text-sm font-mono">{pass.ownerCode}</p>
            <p className="text-xs text-gray-400">{pass.ownerType}</p>
          </div>
          {pass.description && (
            <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-sm">{pass.description}</p>
            </div>
          )}
        </div>

        {/* Validité */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={11} /> Valide du
            </p>
            <p className="font-medium text-sm">
              {new Date(pass.validFrom).toLocaleString("fr-FR")}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={11} /> Jusqu'au
            </p>
            <p className="font-medium text-sm">
              {pass.validUntil
                ? new Date(pass.validUntil).toLocaleString("fr-FR")
                : "Illimité"}
            </p>
          </div>
          {pass.maxUses !== undefined && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Users size={11} /> Utilisations max
              </p>
              <p className="font-medium text-sm">{pass.maxUses}</p>
            </div>
          )}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Options</p>
            <p className="text-sm">
              {pass.transferable ? "✅ Transférable" : "❌ Non transférable"}
              {" · "}
              {pass.shareable ? "✅ Partageable" : "❌ Non partageable"}
            </p>
          </div>
        </div>

        {/* Droits inclus */}
        {pass.entitlements && pass.entitlements.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Tag size={11} /> Droits inclus
            </p>
            <div className="space-y-2">
              {pass.entitlements.map((ent, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium font-mono">
                      {ent.entitlementCode}
                    </p>
                    <span className="text-sm font-medium">
                      {ent.unlimited ? "Illimité" : ent.quantity}
                    </span>
                  </div>
                  {(ent.validFrom || ent.validUntil) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {ent.validFrom &&
                        `Du ${new Date(ent.validFrom).toLocaleString("fr-FR")}`}
                      {ent.validUntil &&
                        ` au ${new Date(ent.validUntil).toLocaleString("fr-FR")}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métadonnées */}
        {pass.metadataJson && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Métadonnées</p>
            <pre className="text-xs bg-gray-50 p-2 rounded-lg overflow-x-auto">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(pass.metadataJson), null, 2);
                } catch {
                  return pass.metadataJson;
                }
              })()}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {pass.status === "ACTIVE" && (
            <button
              onClick={() => {
                if (
                  confirm("Annuler ce pass ? Cette action est irréversible.")
                ) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2Icon size={16} className="animate-spin" />{" "}
                  Annulation...
                </>
              ) : (
                <>
                  <XCircle size={16} /> Annuler le pass
                </>
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};

// Mini import local pour éviter l'import circulaire avec lucide
const Loader2Icon: React.FC<{ size: number; className?: string }> = ({
  size,
  className,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
