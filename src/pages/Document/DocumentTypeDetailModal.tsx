import React from 'react';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { X, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import type { DocumentType } from '../../services/document.service';

interface DocumentTypeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentType;
}

export const DocumentTypeDetailModal: React.FC<DocumentTypeDetailModalProps> = ({
  isOpen,
  onClose,
  documentType,
}) => {
  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ModalPortal onClose={onClose}>
      <div className="overflow-y-auto max-h-[85vh] relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl z-10">
          <h3 className="text-xl font-bold">Détail du type de document</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* En-tête */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText size={24} className="text-primary-600" />
              <h4 className="text-lg font-semibold text-gray-900">{documentType.name}</h4>
            </div>
            <p className="text-sm text-gray-500">Code: {documentType.code}</p>
          </div>

          {/* Description principale */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700">{documentType.description}</p>
          </div>

          {/* Détails du document */}
          <div>
            <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText size={16} />
              Détails du document
            </h5>
            <div className="p-4 bg-blue-50 rounded-lg text-blue-800">
              <p>{documentType.documentDetails}</p>
            </div>
          </div>

          {/* Texte d'aide */}
          <div>
            <h5 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              Texte d'aide
            </h5>
            <div className="p-4 bg-yellow-50 rounded-lg text-yellow-800">
              <p>{documentType.helpText}</p>
            </div>
          </div>

          {/* Spécifications techniques */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Catégorie</p>
              <p className="font-medium">{documentType.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Propriétaire</p>
              <p className="font-medium">{documentType.ownerType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Taille maximale</p>
              <p className="font-medium">{formatBytes(documentType.maxFileSizeBytes)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Formats acceptés</p>
              <p className="font-medium text-xs break-all">{documentType.allowedMimeTypes}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Date d'expiration requise</p>
              <p className="font-medium">{documentType.requiresExpiryDate ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Nécessite une revue</p>
              <p className="font-medium">{documentType.requiresReview ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Documents multiples autorisés</p>
              <p className="font-medium">{documentType.multipleAllowed ? 'Oui' : 'Non'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Statut</p>
              <p className="font-medium flex items-center gap-1">
                {documentType.active ? (
                  <><CheckCircle size={14} className="text-green-600" /> Actif</>
                ) : (
                  <><XCircle size={14} className="text-red-600" /> Inactif</>
                )}
              </p>
            </div>
          </div>

          {/* Règles */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500">
              {documentType.required ? (
                <span className="text-red-600">⚠️ Document obligatoire</span>
              ) : (
                <span className="text-gray-500">Document optionnel</span>
              )}
            </p>
          </div>
        </div>
        </div>
    </ModalPortal>
  );
};