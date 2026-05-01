import React, { useState } from 'react';
import { X, Eye, Download, FileText, AlertCircle } from 'lucide-react';
import { ModalPortal } from '../../components/ui/ModalPortal';
import type { DocumentResponse } from '../../services/document.service';

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentResponse;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const [showVersions, setShowVersions] = useState(false);

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Détail du document</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[80vh]">

        <div className="p-6 space-y-6">
          {/* En-tête */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{document.title}</h4>
            <p className="text-sm text-gray-500">{document.documentTypeName}</p>
            <p className="text-xs text-gray-400 mt-1">Code: {document.code}</p>
          </div>

          {/* Statut */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
            <span className={`text-xs px-2 py-1 rounded-full ${
              document.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
              document.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {document.status === 'APPROVED' ? 'Validé' : document.status === 'REJECTED' ? 'Rejeté' : 'En revue'}
            </span>
            {document.expiryDate && new Date(document.expiryDate) < new Date() && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                <AlertCircle size={12} /> Expiré
              </span>
            )}
          </div>

          {/* Métadonnées */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Propriétaire</p>
              <p className="font-medium">{document.ownerType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ID propriétaire</p>
              <p className="font-medium">{document.ownerId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Taille</p>
              <p className="font-medium">{(document.fileSize / 1024 / 1024).toFixed(2)} Mo</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Format</p>
              <p className="font-medium">{document.mimeType.split('/')[1]?.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Uploadé le</p>
              <p className="font-medium">{new Date(document.uploadedAt).toLocaleDateString('fr-FR')}</p>
            </div>
            {document.expiryDate && (
              <div>
                <p className="text-xs text-gray-500">Expire le</p>
                <p className="font-medium">{new Date(document.expiryDate).toLocaleDateString('fr-FR')}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => window.open(document.fileUrl, '_blank')}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              Voir le document
            </button>
            <button
              onClick={() => window.open(document.fileUrl, '_blank')}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Télécharger
            </button>
          </div>

          {/* Historique des versions */}
          {document.versions && document.versions.length > 0 && (
            <div>
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
              >
                <FileText size={16} />
                Historique des versions ({document.versions.length})
              </button>

              {showVersions && (
                <div className="mt-3 space-y-2">
                  {document.versions.map((version) => (
                    <div key={version.versionNumber} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Version {version.versionNumber}</p>
                          <p className="text-xs text-gray-500">Uploadé le {new Date(version.uploadedAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {version.current && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Version actuelle</span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-gray-500">
                        <span>Taille: {(version.fileSizeBytes / 1024).toFixed(0)} KB</span>
                        <span>Format: {version.mimeTypeDetected?.split('/')[1]?.toUpperCase()}</span>
                        <span>Antivirus: {version.antivirusStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};