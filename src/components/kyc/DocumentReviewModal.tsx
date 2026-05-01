import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Eye, Download, Loader2, History } from 'lucide-react';
import type { DocumentResponse } from '../../services/document.service';
import { ModalPortal } from '../ui/ModalPortal';

interface DocumentReviewModalProps {
  document: DocumentResponse | null;
  onClose: () => void;
  onApprove: (comment?: string) => void;
  onReject: (comment: string, reasonCode: string) => void;
  isProcessing: boolean;
  error?: string | null;
}

const REJECTION_REASONS = [
  { code: 'UNREADABLE',  label: 'Document illisible ou flou'        },
  { code: 'EXPIRED',     label: 'Document expiré'                    },
  { code: 'INVALID',     label: 'Document invalide ou non conforme'  },
  { code: 'WRONG_TYPE',  label: 'Mauvais type de document'           },
  { code: 'INCOMPLETE',  label: 'Document incomplet'                 },
  { code: 'FRAUDULENT',  label: 'Document suspect / frauduleux'      },
  { code: 'OTHER',       label: 'Autre motif'                        },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW: { label: 'En attente de revue', color: 'bg-yellow-100 text-yellow-700' },
  APPROVED:       { label: 'Approuvé',             color: 'bg-green-100 text-green-700'  },
  REJECTED:       { label: 'Rejeté',               color: 'bg-red-100 text-red-700'      },
  EXPIRED:        { label: 'Expiré',               color: 'bg-gray-100 text-gray-500'    },
};

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  document,
  onClose,
  onApprove,
  onReject,
  isProcessing,
  error,
}) => {
  const [comment, setComment]                   = useState('');
  const [rejectionReason, setRejectionReason]   = useState('UNREADABLE');
  const [showPreview, setShowPreview]           = useState(false);
  const [activeTab, setActiveTab]               = useState<'review' | 'versions'>('review');

  // CORRECTION : reset à chaque ouverture
  useEffect(() => {
    if (document) {
      setComment('');
      setRejectionReason('UNREADABLE');
      setShowPreview(false);
      setActiveTab('review');
    }
  }, [document]);

  if (!document) return null;

  const sc = statusConfig[document.status];
  const isPdf   = document.mimeType?.includes('pdf');
  const isImage = document.mimeType?.startsWith('image/');
  const isExpired = document.expiryDate && new Date(document.expiryDate) < new Date();

  return (
    // CORRECTION : ModalPortal au lieu du double overlay fixed inset-0
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between rounded-t-2xl z-10">
        <div>
          <h3 className="text-xl font-bold">Revue du document</h3>
          <p className="text-sm text-gray-500 mt-0.5">{document.documentTypeName}</p>
        </div>
        <div className="flex items-center gap-3">
          {sc && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
          )}
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[80vh] p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
        )}

        {/* Aperçu fichier */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
            <span className="font-medium text-sm">{document.title}</span>
            <div className="flex gap-3">
              <button onClick={() => setShowPreview(!showPreview)}
                className="text-primary-600 text-xs flex items-center gap-1 hover:underline">
                <Eye size={13} /> {showPreview ? 'Masquer' : 'Aperçu'}
              </button>
              <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" download
                className="text-gray-500 text-xs flex items-center gap-1 hover:underline">
                <Download size={13} /> Télécharger
              </a>
            </div>
          </div>
          {showPreview && (
            <div className="bg-gray-50 p-2">
              {isPdf ? (
                <iframe src={document.fileUrl} className="w-full h-80 rounded" title={document.title} />
              ) : isImage ? (
                <img src={document.fileUrl} alt={document.title} className="max-w-full max-h-80 mx-auto rounded" />
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Aperçu non disponible —{' '}
                  <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                    ouvrir dans un nouvel onglet
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Métadonnées */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl text-sm">
          <div>
            <p className="text-xs text-gray-500">Propriétaire</p>
            <p className="font-medium">{document.ownerType} · {document.ownerCode || `#${document.ownerId}`}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Format / Taille</p>
            <p className="font-medium">{document.mimeType?.split('/')[1]?.toUpperCase()} · {(document.fileSize / 1024 / 1024).toFixed(2)} Mo</p>
          </div>
          {document.issueDate && (
            <div>
              <p className="text-xs text-gray-500">Date d'émission</p>
              <p className="font-medium">{new Date(document.issueDate).toLocaleDateString('fr-FR')}</p>
            </div>
          )}
          {document.expiryDate && (
            <div>
              <p className="text-xs text-gray-500">Date d'expiration</p>
              <p className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                {new Date(document.expiryDate).toLocaleDateString('fr-FR')}
                {isExpired && ' ⚠ Expiré'}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Version</p>
            <p className="font-medium">v{document.currentVersionNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Uploadé le</p>
            <p className="font-medium">{new Date(document.uploadedAt).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200">
          <div className="flex gap-6">
            {(['review', 'versions'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`pb-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'review' ? 'Décision' : <><History size={13} /> Versions ({document.versions?.length || 0})</>}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'review' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Commentaire
                <span className="text-gray-400 font-normal ml-1">(obligatoire pour rejet)</span>
              </label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                rows={3} placeholder="Justifiez votre décision..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 resize-none text-sm" />
            </div>

            {/* CORRECTION : motif de rejet sélectionnable (pas hardcodé) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Motif de rejet <span className="text-gray-400 font-normal">(si rejet)</span>
              </label>
              <select value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm">
                {REJECTION_REASONS.map(r => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => onReject(comment, rejectionReason)}
                disabled={isProcessing || !comment.trim()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm">
                {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                Rejeter
              </button>
              <button onClick={() => onApprove(comment || undefined)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm">
                {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                Approuver
              </button>
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-2">
            {(document.versions || []).length === 0 && (
              <p className="text-center py-6 text-gray-400 text-sm">Aucune version enregistrée</p>
            )}
            {(document.versions || []).map(v => (
              <div key={v.versionNumber}
                className={`p-3 rounded-lg border text-sm ${v.current ? 'border-primary-200 bg-primary-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">v{v.versionNumber}</span>
                    {v.current && <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">Courante</span>}
                  </div>
                  <a href={v.storagePath} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                    <Eye size={11} /> Voir
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
                  <span>Upload : {new Date(v.uploadedAt).toLocaleDateString('fr-FR')}</span>
                  <span>Fichier : {v.originalFileName}</span>
                  <span className={v.antivirusStatus === 'CLEAN' ? 'text-green-600' : v.antivirusStatus === 'INFECTED' ? 'text-red-600' : ''}>
                    Antivirus : {v.antivirusStatus}
                  </span>
                  <span className={v.uploadStatus === 'READY' ? 'text-green-600' : ''}>
                    Statut : {v.uploadStatus}
                  </span>
                  <span>Taille : {(v.fileSizeBytes / 1024).toFixed(0)} Ko</span>
                  <span>Format : {v.fileExtension?.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalPortal>
  );
};