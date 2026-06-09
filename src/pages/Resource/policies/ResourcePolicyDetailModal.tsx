import React from "react";
import { X, Shield, Clock, CalendarClock, Power } from "lucide-react";
import type { ResourcePolicyResponse } from "../../../services/resource.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface ResourcePolicyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: ResourcePolicyResponse | null;
  onEdit: (policy: ResourcePolicyResponse) => void;
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
};

export const ResourcePolicyDetailModal: React.FC<
  ResourcePolicyDetailModalProps
> = ({ isOpen, onClose, policy, onEdit }) => {
  if (!isOpen || !policy) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">Détail de la politique</h3>
          <p className="text-sm text-gray-500">{policy.code}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-primary-600" />
            <h4 className="font-semibold text-gray-900">{policy.name}</h4>
          </div>
          <p className="text-sm text-gray-600">
            {policy.description || "Aucune description"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock size={16} />
              <span className="text-sm">Durée minimale</span>
            </div>
            <p className="text-lg font-semibold">
              {formatDuration(policy.minBookingDurationMinutes)}
            </p>
          </div>
          <div className="border rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock size={16} />
              <span className="text-sm">Durée maximale</span>
            </div>
            <p className="text-lg font-semibold">
              {formatDuration(policy.maxBookingDurationMinutes)}
            </p>
          </div>
          <div className="border rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CalendarClock size={16} />
              <span className="text-sm">Préavis réservation</span>
            </div>
            <p className="text-lg font-semibold">
              {formatDuration(policy.minBookingNoticeMinutes)}
            </p>
          </div>
          <div className="border rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CalendarClock size={16} />
              <span className="text-sm">Annulation</span>
            </div>
            <p className="text-lg font-semibold">
              {policy.allowCancellation
                ? `Autorisée jusqu’à ${formatDuration(policy.cancellationNoticeMinutes)} avant`
                : "Non autorisée"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Power
              size={16}
              className={policy.active ? "text-green-600" : "text-gray-400"}
            />
            <span className="text-sm text-gray-600">Statut</span>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs ${policy.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
          >
            {policy.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
          <button
            onClick={() => onEdit(policy)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Modifier
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};
