import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import type { DocumentResponse } from '../../services/document.service';

interface DocumentReviewModalProps {
  document: DocumentResponse | null;
  onClose: () => void;
  onApprove: (comment?: string) => void;
  onReject: (comment: string) => void;
  isProcessing: boolean;
}

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  document,
  onClose,
  onApprove,
  onReject,
  isProcessing,
}) => {
  const [comment, setComment] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Revue du document</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Aperçu du document */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">{document.title}</h4>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
              >
                <Eye size={16} />
                {showPreview ? 'Masquer' : 'Aperçu'}
              </button>
            </div>
            
            {showPreview && (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                {document.mimeType.includes('pdf') ? (
                  <iframe
                    src={document.fileUrl}
                    className="w-full h-96"
                    title={document.title}
                  />
                ) : (
                  <img
                    src={document.fileUrl}
                    alt={document.title}
                    className="max-w-full max-h-96 mx-auto"
                  />
                )}
              </div>
            )}
          </div>

          {/* Métadonnées */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Type de document</p>
              <p className="font-medium">{document.documentTypeName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Propriétaire</p>
              <p className="font-medium">{document.ownerType}</p>
            </div>
            {document.documentNumber && (
              <div>
                <p className="text-xs text-gray-500">Numéro de document</p>
                <p className="font-medium">{document.documentNumber}</p>
              </div>
            )}
            {document.expiryDate && (
              <div>
                <p className="text-xs text-gray-500">Date d'expiration</p>
                <p className="font-medium">{new Date(document.expiryDate).toLocaleDateString('fr-FR')}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Taille</p>
              <p className="font-medium">{(document.fileSize / 1024 / 1024).toFixed(2)} Mo</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Format</p>
              <p className="font-medium">{document.mimeType.split('/')[1]?.toUpperCase()}</p>
            </div>
          </div>

          {/* Commentaire */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commentaire (obligatoire pour rejet)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Ajoutez un commentaire pour justifier votre décision..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3">
            <button
              onClick={() => onReject(comment)}
              disabled={isProcessing || !comment}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <XCircle size={18} />
              Rejeter
            </button>
            <button
              onClick={() => onApprove(comment)}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Approuver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};