import React from "react";
import {
  X,
  Package,
  CheckCircle,
  XCircle,
  Tag,
  DollarSign,
} from "lucide-react";
import type { AmenityResponse } from "../../../services/resource.service";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface AmenityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  amenity: AmenityResponse | null;
  onEdit: (amenity: AmenityResponse) => void;
}

export const AmenityDetailModal: React.FC<AmenityDetailModalProps> = ({
  isOpen,
  onClose,
  amenity,
  onEdit,
}) => {
  if (!isOpen || !amenity) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between bg-white px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
            <Package size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{amenity.name}</h3>
            <p className="font-mono text-sm text-gray-400">{amenity.code}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-6 pb-6">
        <div className="mb-5 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${amenity.active ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}
          >
            {amenity.active ? <CheckCircle size={13} /> : <XCircle size={13} />}
            {amenity.active ? "Actif" : "Inactif"}
          </span>
          {amenity.optional !== null && amenity.optional !== undefined && (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              {amenity.optional ? "Optionnel" : "Inclus"}
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <div className="mb-2 flex items-center gap-2 text-gray-500">
              <Tag size={15} />
              <span className="text-sm">Quantité</span>
            </div>
            <p className="text-xl font-semibold text-gray-900">
              {amenity.quantity ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100 md:col-span-2">
            <div className="mb-2 flex items-center gap-2 text-gray-500">
              <DollarSign size={15} />
              <span className="text-sm">Supplément</span>
            </div>
            <p className="text-xl font-semibold text-gray-900">
              {(amenity.extraPrice ?? 0).toLocaleString("fr-FR")} FCFA
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-gray-100">
          <p className="mb-1 text-sm font-medium text-gray-700">Description</p>
          <p className="text-sm leading-6 text-gray-600">
            {amenity.description || "Aucune description renseignée."}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Fermer
          </button>
          <button
            onClick={() => onEdit(amenity)}
            className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Modifier
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};
