import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, FileText, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { billingService } from '../../services/billing.service';
import type { BillingDocument } from '../../services/billing.service';
import { BillingDetailModal } from './BillingDetailModal';

const documentTypeLabels: Record<string, string> = {
  QUOTE:            'Devis',
  PROFORMA_INVOICE: 'Proforma',
  INVOICE:          'Facture',
  CREDIT_NOTE:      'Avoir',
  DEBIT_NOTE:       'Note de débit',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT:          { label: 'Brouillon',           color: 'bg-gray-100 text-gray-700'     },
  ISSUED:         { label: 'Émise',               color: 'bg-blue-100 text-blue-700'     },
  SENT:           { label: 'Envoyée',             color: 'bg-purple-100 text-purple-700' },
  ACCEPTED:       { label: 'Acceptée',            color: 'bg-green-100 text-green-700'   },
  REJECTED:       { label: 'Rejetée',             color: 'bg-red-100 text-red-700'       },
  EXPIRED:        { label: 'Expirée',             color: 'bg-gray-100 text-gray-500'     },
  CONVERTED:      { label: 'Convertie',           color: 'bg-blue-100 text-blue-700'     },
  PARTIALLY_PAID: { label: 'Partiellement payée', color: 'bg-yellow-100 text-yellow-700' },
  PAID:           { label: 'Payée',               color: 'bg-green-100 text-green-700'   },
  OVERDUE:        { label: 'En retard',           color: 'bg-red-100 text-red-700'       },
  CANCELLED:      { label: 'Annulée',             color: 'bg-gray-100 text-gray-500'     },
  VOIDED:         { label: 'Annulée',             color: 'bg-gray-100 text-gray-500'     },
  REFUNDED:       { label: 'Remboursée',          color: 'bg-orange-100 text-orange-700' },
  WRITTEN_OFF:    { label: 'Passée en perte',     color: 'bg-gray-100 text-gray-500'     },
};

const PAGE_SIZE = 20;

export const BillingCustomerStatement: React.FC = () => {
  const [customerType, setCustomerType] = useState('CUSTOMER');
  const [customerCodeInput, setCustomerCodeInput] = useState('');
  const [debouncedCode, setDebouncedCode] = useState('');
  const [page, setPage] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<BillingDocument | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // CORRECTION : debounce 500ms sur la saisie du code client
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(customerCodeInput.trim());
      setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [customerCodeInput]);

  const { data: statementData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customer-statement', customerType, debouncedCode, page],
    queryFn: () => billingService.getCustomerStatement(customerType, debouncedCode, {
      page,
      size: PAGE_SIZE,
      sort: 'createdAt,desc',
    }),
    enabled: debouncedCode.length >= 3,
  });

  const documents: BillingDocument[] = statementData?.content || [];
  const totalElements = statementData?.totalElements ?? 0;
  const totalPages    = statementData?.totalPages    ?? Math.ceil(totalElements / PAGE_SIZE);

  const handleDownloadPdf = async (doc: BillingDocument) => {
    try {
      const blob = await billingService.getPdf(doc.documentNumber);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.documentType}_${doc.documentNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erreur lors du téléchargement du PDF.');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Relevé client</h2>
      <p className="text-gray-500 text-sm mb-6">Historique des factures, devis et avoirs d&apos;un client</p>

      <div className="flex gap-3 mb-6">
        <select
          value={customerType}
          onChange={(e) => { setCustomerType(e.target.value); setPage(0); }}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm"
        >
          <option value="CUSTOMER">Customer</option>
          <option value="MEMBER">Membre</option>
          <option value="BUSINESS_ENTITY">Entreprise</option>
        </select>
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Code client (min 3 caractères : CUS-00001, MBR-00001...)"
            value={customerCodeInput}
            onChange={(e) => setCustomerCodeInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
          {isFetching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {debouncedCode.length >= 3 && isLoading && (
        <div className="text-center py-8">Chargement...</div>
      )}

      {debouncedCode.length >= 3 && !isLoading && (
        <>
          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mb-3">
              {totalElements} document{totalElements > 1 ? 's' : ''} pour {customerType} {debouncedCode}
            </p>
          )}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">N° Document</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Total</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold">Solde dû</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Statut</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Échéance</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents.map((doc) => (
                  <tr key={doc.documentNumber} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono">{doc.documentNumber}</td>
                    <td className="px-6 py-4 text-sm">{documentTypeLabels[doc.documentType] || doc.documentType}</td>
                    <td className="px-6 py-4 text-sm">{new Date(doc.issueDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-6 py-4 text-right font-semibold text-sm">
                      {doc.totalAmount.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      {doc.balanceDue > 0
                        ? <span className="text-red-600 font-medium">{doc.balanceDue.toLocaleString('fr-FR')} FCFA</span>
                        : <span className="text-green-600">—</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[doc.status]?.color || 'bg-gray-100'}`}>
                        {statusConfig[doc.status]?.label || doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setSelectedDocument(doc); setIsDetailOpen(true); }}
                          className="p-1 text-gray-600 hover:text-primary-600" title="Voir détail">
                          <Eye size={15} />
                        </button>
                        <button onClick={() => handleDownloadPdf(doc)}
                          className="p-1 text-gray-600 hover:text-primary-600" title="PDF">
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {documents.length === 0 && (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Aucun document pour ce client</p>
              </div>
            )}
          </div>

          {/* CORRECTION : pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-sm text-gray-500">Page {page + 1} / {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="p-1.5 border rounded-lg disabled:opacity-50 hover:bg-gray-50">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {(!debouncedCode || debouncedCode.length < 3) && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Search size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Entrez un code client (min 3 caractères) pour voir son relevé</p>
        </div>
      )}

      {selectedDocument && (
        <BillingDetailModal
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedDocument(null); }}
          document={selectedDocument}
          onRefresh={() => refetch()}
          onCreateCreditNote={() => {}}
        />
      )}
    </div>
  );
};