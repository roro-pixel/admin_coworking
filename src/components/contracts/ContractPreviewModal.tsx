import React, { useState } from 'react';
import { X, Loader2, Eye, FileText, AlertCircle } from 'lucide-react';
import { contractService } from '../../services/contract.service';
import { ModalPortal } from '../../components/ui/ModalPortal';
import { useAuth } from '../../contexts/AuthContext';

interface ContractPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractData: any;
  templateCode: string;
}

export const ContractPreviewModal: React.FC<ContractPreviewModalProps> = ({
  isOpen,
  onClose,
  contractData,
  templateCode,
}) => {
  const { admin } = useAuth();
  const [html, setHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  // CORRECTION : gestion d'erreur
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const buildPayload = () => ({
    templateCode,
    ownerType: contractData.ownerType,
    ownerCode: contractData.ownerCode,
    businessCode: contractData.businessCode,
    title: contractData.title,
    description: contractData.description,
    effectiveDate: contractData.effectiveDate,
    startDate: contractData.startDate,
    endDate: contractData.endDate,
    signatoryName: contractData.parties?.find((p: any) => p.role === 'SIGNATORY')?.displayName,
    signatoryRole: contractData.parties?.find((p: any) => p.role === 'SIGNATORY')?.partyType || 'Signataire',
    variables: {},
  });

  const handlePreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const previewHtml = await contractService.previewContract(buildPayload());
      setHtml(previewHtml);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la génération de l\'aperçu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    setPdfError(null);
    try {
      const blob = await contractService.generateContract({
        ...buildPayload(),
        // CORRECTION : uploadedBy depuis admin au lieu du hardcode 1
        uploadedBy: admin?.id || 1,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat_${templateCode}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setPdfError(err?.response?.data?.message || 'Erreur lors de la génération du PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">Prévisualisation du contrat</h3>
          <p className="text-sm text-gray-500">Template : <span className="font-mono">{templateCode}</span></p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        {/* État initial */}
        {!html && !isLoading && (
          <div className="text-center py-12">
            <Eye size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">Visualisez le contrat avant de générer le PDF</p>
            <p className="text-xs text-gray-400 mb-6">
              {contractData.title || 'Contrat sans titre'} — {contractData.ownerType} {contractData.ownerCode}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4 flex items-center gap-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button onClick={handlePreview}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                <Eye size={16} /> Aperçu HTML
              </button>
              <button onClick={handleGeneratePdf} disabled={isGeneratingPdf}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                PDF direct
              </button>
            </div>

            {pdfError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mt-4 flex items-center gap-2">
                <AlertCircle size={14} />
                {pdfError}
              </div>
            )}
          </div>
        )}

        {/* Chargement */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 size={40} className="mx-auto text-primary-600 animate-spin mb-4" />
            <p className="text-gray-500">Génération de l&apos;aperçu...</p>
          </div>
        )}

        {/* Aperçu HTML */}
        {html && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <button onClick={() => { setHtml(null); setError(null); setPdfError(null); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                ← Retour
              </button>
              <div className="flex gap-2">
                {pdfError && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> {pdfError}
                  </span>
                )}
                <button onClick={handleGeneratePdf} disabled={isGeneratingPdf}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm">
                  {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Télécharger PDF
                </button>
              </div>
            </div>
            <div
              className="border rounded-xl p-6 bg-white prose max-w-none overflow-y-auto max-h-[60vh]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        )}
      </div>
    </ModalPortal>
  );
};