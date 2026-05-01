import React from 'react';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { X, CheckCircle, XCircle } from 'lucide-react';
import type { DocumentRequirement } from '../../services/document.service';

interface DocumentRequirementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement: DocumentRequirement;
}

export const DocumentRequirementDetailModal: React.FC<DocumentRequirementDetailModalProps> = ({
  isOpen,
  onClose,
  requirement,
}) => {
  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="overflow-y-auto max-h-[85vh] relative bg-white rounded-2xl w-full max-w-md">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl z-10">
          <h3 className="text-xl font-bold">Détail de l'exigence</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-500">Type de document</p>
            <p className="font-medium">{requirement.documentTypeName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Code</p>
            <p className="font-mono text-sm">{requirement.documentTypeCode}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Propriétaire</p>
            <p className="font-medium">{requirement.ownerType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Obligatoire</p>
            <p className="font-medium">{requirement.required ? 'Oui' : 'Non'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Actif</p>
            <p className="font-medium flex items-center gap-1">
              {requirement.active ? (
                <><CheckCircle size={14} className="text-green-600" /> Actif</>
              ) : (
                <><XCircle size={14} className="text-red-600" /> Inactif</>
              )}
            </p>
          </div>
        </div>
        </div>
    </ModalPortal>
  );
};