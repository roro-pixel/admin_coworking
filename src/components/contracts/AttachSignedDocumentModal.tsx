import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, FileCheck } from 'lucide-react';
import { contractService } from '../../services/contract.service';
import { ModalPortal } from '../ui/ModalPortal';
import { useAuth } from '../../contexts/AuthContext';

interface AttachSignedDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractCode: string;
  ownerType?: string;
  ownerCode?: string;
  onSuccess: () => void;
}

export const AttachSignedDocumentModal: React.FC<AttachSignedDocumentModalProps> = ({
  isOpen,
  onClose,
  contractCode,
  ownerType = 'BUSINESS',
  ownerCode = '',
  onSuccess,
}) => {
  const { admin } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // CORRECTION : reset à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setError('');
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (f.type !== 'application/pdf') {
        setError('Seuls les fichiers PDF sont acceptés.');
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) { setError('Veuillez sélectionner un fichier PDF.'); return; }

    setIsUploading(true);
    setError('');

    try {
      // 1. Upload du document via l'API document
      const formData = new FormData();
      // CORRECTION : utiliser les props ownerType/ownerCode
      formData.append('ownerType', ownerType);
      formData.append('ownerCode', ownerCode);
      formData.append('documentTypeCode', 'SIGNED_CONTRACT');
      formData.append('title', `Contrat signé — ${contractCode}`);
      // CORRECTION : admin?.email au lieu du hardcode '1'
      formData.append('uploadedBy', admin?.email || admin?.id?.toString() || '1');
      formData.append('file', file);

      const response = await fetch('/sni/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || `Erreur upload (${response.status})`);
      }

      const docResponse = await response.json();
      const documentCode = docResponse.code || docResponse.documentCode;
      if (!documentCode) throw new Error('Code document manquant dans la réponse.');

      // 2. Rattacher au contrat
      await contractService.attachSignedDocument(contractCode, documentCode);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'upload ou du rattachement.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  // CORRECTION : ModalPortal seul, sans double overlay
  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Rattacher le document signé</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
          Contrat : <span className="font-mono font-medium">{contractCode}</span>
        </div>

        {/* Zone de dépôt */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
          {file ? (
            <div className="space-y-2">
              <FileCheck size={40} className="mx-auto text-green-500" />
              <p className="font-medium text-green-700">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} Ko</p>
              <button onClick={() => setFile(null)} className="text-xs text-red-500 hover:underline">
                Changer de fichier
              </button>
            </div>
          ) : (
            <>
              <Upload size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 text-sm mb-1">Téléchargez le contrat signé</p>
              <p className="text-xs text-gray-400 mb-4">PDF uniquement · max 10 Mo</p>
              <label className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer text-sm">
                Sélectionner un fichier
                <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
              </label>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} disabled={isUploading}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Annuler
          </button>
          <button onClick={handleUpload} disabled={!file || isUploading}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isUploading ? 'Upload en cours...' : 'Rattacher'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};