import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  Eye,
  Download,
  AlertCircle,
  FileText,
} from "lucide-react";
import { contractService } from "../../services/contract.service";
import { useAuth } from "../../contexts/AuthContext";

// PAS de AdminLayout - page totalement isolée
export const ContractPreviewPage: React.FC = () => {
  const { contractCode } = useParams<{ contractCode: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();

  const [html, setHtml] = useState<string | null>(null);
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ["contract", contractCode],
    queryFn: () => contractService.getContract(contractCode!),
    enabled: !!contractCode,
  });

  const buildPayload = () => {
    if (!contract) return null;
    const signatory = contract.parties?.find(
      (p: any) => p.role === "SIGNATORY",
    );
    return {
      templateCode: contract.templateCode,
      ownerType: contract.ownerType as any,
      ownerCode: contract.ownerCode,
      businessCode: contract.businessCode || undefined,
      title: contract.title,
      description: contract.description || undefined,
      effectiveDate: contract.effectiveDate || "",
      startDate: contract.startDate || "",
      endDate: contract.endDate || undefined,
      signatoryName: signatory?.displayName,
      signatoryRole: signatory?.partyType || "Signataire",
      uploadedBy: admin?.id ? Number(admin.id) : 1,
      variables: {},
    };
  };

  const handlePreviewHtml = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setIsLoadingHtml(true);
    setError(null);
    setHtml(null);
    try {
      const result = await contractService.previewContract(payload);
      setHtml(result.html);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de la génération.");
    } finally {
      setIsLoadingHtml(false);
    }
  };

  const handleDownloadPdf = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setIsLoadingPdf(true);
    setError(null);
    try {
      const result = await contractService.generateContract(payload);
      const documentUrl = result?.previewUrl || result?.downloadUrl || result?.fileUrl;
      if (documentUrl) {
        window.open(documentUrl, "_blank");
      } else {
        setError("Erreur: document non généré");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Erreur lors de la génération du PDF.",
      );
    } finally {
      setIsLoadingPdf(false);
    }
  };

  if (contractLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin h-10 w-10 text-primary-600" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <AlertCircle size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500">Contrat non trouvé</p>
        <button
          onClick={() => navigate("/contracts")}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
        >
          Retour aux contrats
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Barre supérieure simple */}
      <div className="sticky top-0 z-10 bg-white border-b gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/contracts/${contract.contractCode}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Retour au contrat</span>
          </button>
          <div className="w-px h-6 bg-gray-300" />
          <div>
            <p className="text-sm text-gray-500">Prévisualisation</p>
            <p className="text-xs text-gray-400 font-mono">
              {contract.contractCode}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePreviewHtml}
            disabled={isLoadingHtml}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            {isLoadingHtml ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Eye size={16} />
            )}
            {isLoadingHtml ? "Génération..." : "Aperçu HTML"}
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isLoadingPdf}
            className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            {isLoadingPdf ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isLoadingPdf ? "Génération..." : "Télécharger PDF"}
          </button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-6">
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {html ? (
          <div className="max-w-5xl mx-auto bg-white ring-1 ring-gray-100 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b">
              <h2 className="text-sm font-medium text-gray-700">
                Aperçu du document
              </h2>
            </div>
            <iframe
              srcDoc={html}
              title="Aperçu du contrat"
              className="w-full"
              style={{
                height: "calc(100vh - 140px)",
                minHeight: "600px",
                border: "none",
              }}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        ) : isLoadingHtml ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="animate-spin h-10 w-10 text-primary-600" />
            <span className="ml-3 text-gray-500">
              Génération de l'aperçu...
            </span>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto mt-20 text-center">
            <div className="bg-gray-50 rounded-2xl p-12 ring-1 ring-gray-100">
              <FileText size={64} className="mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Prévisualisation du contrat
              </h2>
              <p className="text-gray-400 mb-6">{contract.title}</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handlePreviewHtml}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 flex items-center gap-2"
                >
                  <Eye size={18} />
                  Voir l'aperçu HTML
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2"
                >
                  <Download size={18} />
                  Télécharger PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
