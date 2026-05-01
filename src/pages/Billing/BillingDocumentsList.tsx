import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Eye, FileText, Download, Send, RefreshCw, Plus,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { billingService } from '../../services/billing.service';
import type { BillingDocument } from '../../services/billing.service';
import { BillingDetailModal } from './BillingDetailModal';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { CreateQuoteModal } from './CreateQuoteModal';
import { CreateCreditNoteModal } from './CreateCreditNoteModal';

const documentTypeLabels: Record<string, string> = {
  QUOTE:            'Devis',
  PROFORMA_INVOICE: 'Proforma',
  INVOICE:          'Facture',
  CREDIT_NOTE:      'Avoir',
  DEBIT_NOTE:       'Note de débit',
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT:           { label: 'Brouillon',           color: 'bg-gray-100 text-gray-700'    },
  ISSUED:          { label: 'Émise',               color: 'bg-blue-100 text-blue-700'    },
  SENT:            { label: 'Envoyée',             color: 'bg-purple-100 text-purple-700'},
  ACCEPTED:        { label: 'Acceptée',            color: 'bg-green-100 text-green-700'  },
  REJECTED:        { label: 'Rejetée',             color: 'bg-red-100 text-red-700'      },
  EXPIRED:         { label: 'Expirée',             color: 'bg-gray-100 text-gray-500'    },
  CONVERTED:       { label: 'Convertie',           color: 'bg-blue-100 text-blue-700'    },
  PARTIALLY_PAID:  { label: 'Partiellement payée', color: 'bg-yellow-100 text-yellow-700'},
  PAID:            { label: 'Payée',               color: 'bg-green-100 text-green-700'  },
  OVERDUE:         { label: 'En retard',           color: 'bg-red-100 text-red-700'      },
  CANCELLED:       { label: 'Annulée',             color: 'bg-gray-100 text-gray-500'    },
  VOIDED:          { label: 'Annulée',             color: 'bg-gray-100 text-gray-500'    },
  REFUNDED:        { label: 'Remboursée',          color: 'bg-orange-100 text-orange-700'},
  WRITTEN_OFF:     { label: 'Passée en perte',     color: 'bg-gray-100 text-gray-500'    },
};

const PAGE_SIZE = 20;

export const BillingDocumentsList: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);

  const [selectedDocument, setSelectedDocument] = useState<BillingDocument | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isCreateQuoteOpen, setIsCreateQuoteOpen] = useState(false);
  const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('');
  

  const fromDate = '';
  const toDate = '';

  // CORRECTION : debounce 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // CORRECTION : reset page sur changement filtre
  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const { data: documentsData, isLoading, isFetching } = useQuery({
    queryKey: ['billing-documents', fromDate, toDate, page, typeFilter, statusFilter, debouncedSearch],
    queryFn: () => billingService.getDocuments({
      type:       typeFilter    || undefined,
      status:     statusFilter  || undefined,
      searchText: debouncedSearch || undefined,
      page,
      size:       PAGE_SIZE,
      sort:       'createdAt,desc',
    }),
  });

  const documents: BillingDocument[] = documentsData?.content || [];
  const totalElements = documentsData?.totalElements ?? 0;
  const totalPages    = documentsData?.totalPages    ?? Math.ceil(totalElements / PAGE_SIZE);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['billing-documents'] });

  const issueMutation = useMutation({
    mutationFn: (documentNumber: string) => billingService.issueDocument(documentNumber),
    onSuccess: invalidate,
    onError: () => alert('Erreur lors de l\'émission du document.'),
  });

  const sendMutation = useMutation({
    mutationFn: (documentNumber: string) => billingService.sendDocument(documentNumber),
    onSuccess: invalidate,
    onError: () => alert('Erreur lors de l\'envoi du document.'),
  });

  const sendEmailMutation = useMutation({
    mutationFn: (documentNumber: string) => billingService.sendEmail(documentNumber),
    onError: () => alert('Erreur lors de l\'envoi de l\'email.'),
  });

  const anyPending = issueMutation.isPending || sendMutation.isPending || sendEmailMutation.isPending;

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

  const handleCreateCreditNote = (invoiceNumber: string) => {
    setSelectedInvoiceNumber(invoiceNumber);
    setIsCreditNoteOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Documents de facturation</h2>
          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{totalElements} document{totalElements > 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCreateInvoiceOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm">
            <Plus size={16} /> Nouvelle facture
          </button>
          <button onClick={() => setIsCreateQuoteOpen(true)}
            className="border border-primary-600 text-primary-600 px-4 py-2 rounded-lg hover:bg-primary-50 flex items-center gap-2 text-sm">
            <Plus size={16} /> Nouveau devis
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Rechercher par numéro, client..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg" />
          {isFetching && search && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
          )}
        </div>
        <select value={typeFilter} onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white">
          <option value="">Tous les types</option>
          {Object.entries(documentTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white">
          <option value="">Tous les statuts</option>
          {Object.entries(statusConfig).map(([key, v]) => (
            <option key={key} value={key}>{v.label}</option>
          ))}
        </select>
        {(typeFilter || statusFilter || search) && (
          <button onClick={() => { setSearch(''); setDebouncedSearch(''); setTypeFilter(''); setStatusFilter(''); setPage(0); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap">
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">N° Document</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Client</th>
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
                <td className="px-6 py-4">
                  <p className="text-sm font-medium">{doc.customerName || doc.customerCode || '—'}</p>
                  {doc.customerEmail && <p className="text-xs text-gray-500">{doc.customerEmail}</p>}
                </td>
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
                  <span className={`px-2 py-1 rounded-full text-xs ${statusConfig[doc.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {statusConfig[doc.status]?.label || doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-1 flex-wrap">
                    <button onClick={() => { setSelectedDocument(doc); setIsDetailOpen(true); }}
                      className="p-1 text-gray-600 hover:text-primary-600" title="Voir détail">
                      <Eye size={15} />
                    </button>
                    <button onClick={() => handleDownloadPdf(doc)}
                      className="p-1 text-gray-600 hover:text-primary-600" title="Télécharger PDF">
                      <Download size={15} />
                    </button>
                    {/* CORRECTION : avoir possible aussi sur PARTIALLY_PAID */}
                    {doc.documentType === 'INVOICE' && ['PAID', 'PARTIALLY_PAID'].includes(doc.status) && (
                      <button onClick={() => handleCreateCreditNote(doc.documentNumber)}
                        className="p-1 text-orange-600 hover:text-orange-800" title="Créer un avoir">
                        <FileText size={15} />
                      </button>
                    )}
                    {doc.status === 'DRAFT' && (
                      <button onClick={() => issueMutation.mutate(doc.documentNumber)}
                        disabled={anyPending}
                        className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-40" title="Émettre">
                        {issueMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={15} />}
                      </button>
                    )}
                    {doc.status === 'ISSUED' && (
                      <>
                        <button onClick={() => sendMutation.mutate(doc.documentNumber)}
                          disabled={anyPending}
                          className="p-1 text-green-600 hover:text-green-800 disabled:opacity-40" title="Marquer envoyé">
                          <Send size={15} />
                        </button>
                        <button onClick={() => sendEmailMutation.mutate(doc.documentNumber)}
                          disabled={anyPending}
                          className="p-1 text-purple-600 hover:text-purple-800 disabled:opacity-40" title="Envoyer par email">
                          {sendEmailMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileText size={15} />}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {documents.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun document trouvé</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-500">
            {totalElements} document{totalElements > 1 ? 's' : ''} — Page {page + 1} / {totalPages}
          </p>
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

      {/* Modals */}
      {selectedDocument && (
        <BillingDetailModal
          isOpen={isDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedDocument(null); }}
          document={selectedDocument}
          onRefresh={invalidate}
          onCreateCreditNote={handleCreateCreditNote}
        />
      )}
      <CreateInvoiceModal isOpen={isCreateInvoiceOpen} onClose={() => setIsCreateInvoiceOpen(false)}
        onSuccess={() => { invalidate(); setIsCreateInvoiceOpen(false); }} />
      <CreateQuoteModal isOpen={isCreateQuoteOpen} onClose={() => setIsCreateQuoteOpen(false)}
        onSuccess={() => { invalidate(); setIsCreateQuoteOpen(false); }} />
      <CreateCreditNoteModal isOpen={isCreditNoteOpen} onClose={() => setIsCreditNoteOpen(false)}
        invoiceNumber={selectedInvoiceNumber}
        onSuccess={() => { invalidate(); setIsCreditNoteOpen(false); }} />
    </div>
  );
};