import React from "react";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { X, CheckCircle, XCircle } from "lucide-react";
import type { DocumentRequirement } from "../../services/document.service";

interface DocumentRequirementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: DocumentRequirement;
}

export const DocumentRequirementDetailModal: React.FC<
  DocumentRequirementDetailModalProps
> = ({ isOpen, onClose, requirement }) => {
  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="lg">
      <div className="overflow-y-auto max-h-[85vh] relative bg-white rounded-2xl w-full max-w-xl">
        <div className="sticky top-0 bg-white border-b p-5 flex justify-between items-center rounded-t-2xl z-10">
          <h3 className="text-2xl font-bold">Détail de l'exigence</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-5">
          <div>
            <p className="text-sm text-gray-500 mb-1">Type de document</p>
            <p className="font-medium text-base">
              {requirement.documentTypeName}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Code</p>
            <p className="font-mono text-base">
              {requirement.documentTypeCode}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Propriétaire</p>
            <p className="font-medium text-base">{requirement.ownerType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Obligatoire</p>
            <p className="font-medium text-base">
              {requirement.required ? "Oui" : "Non"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Actif</p>
            <p className="font-medium text-base flex items-center gap-1">
              {requirement.active ? (
                <>
                  <CheckCircle size={16} className="text-green-600" /> Actif
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-red-600" /> Inactif
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
