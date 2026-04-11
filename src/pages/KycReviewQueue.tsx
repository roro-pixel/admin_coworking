import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/layout/AdminLayout';
import { 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Users,
  Building2,
  FileText
} from 'lucide-react';
import { kycService, documentService } from '../services/document.service';
import { DocumentReviewModal } from '../components/kyc/DocumentReviewModal';
import { useAuth } from '../contexts/AuthContext';

const statusConfig = {
  NOT_STARTED: { label: 'Non commencé', color: 'bg-gray-100 text-gray-700', icon: Clock },
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-700', icon: Clock },
  SUBMITTED: { label: 'Soumis', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  UNDER_REVIEW: { label: 'En revue', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  PENDING_CORRECTION: { label: 'Correction demandée', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export const AdminKycReviewQueue: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Récupérer les dossiers KYC
  const { data: kycCasesData, isLoading } = useQuery({
    queryKey: ['kycCases', page, statusFilter, ownerTypeFilter],
    queryFn: () => kycService.getAllKycCases({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      ownerType: ownerTypeFilter !== 'all' ? ownerTypeFilter : undefined,
      page,
      size: 20,
    }),
  });

  // Approuver un document
  const approveDocumentMutation = useMutation({
    mutationFn: ({ code, comment }: { code: string; comment?: string }) =>
      documentService.approveDocument(code, parseInt(admin?.id || '0'), comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kycCases'] });
      setIsModalOpen(false);
      setSelectedDocument(null);
    },
  });

  // Rejeter un document
  const rejectDocumentMutation = useMutation({
    mutationFn: ({ code, comment }: { code: string; comment: string }) =>
      documentService.rejectDocument(code, parseInt(admin?.id || '0'), comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kycCases'] });
      setIsModalOpen(false);
      setSelectedDocument(null);
    },
  });

  const kycCases = kycCasesData?.data || [];
  const totalElements = kycCasesData?.pageable?.totalElements || 0;
  const totalPages = kycCasesData?.pageable?.totalPages || 0;

  const filteredCases = kycCases.filter(kycCase =>
    kycCase.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleReviewDocument = (document: any) => {
    setSelectedDocument(document);
    setIsModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Revue KYC</h1>
        <p className="text-gray-600 mt-1">Validez ou rejetez les documents des membres</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {kycCases.filter(k => k.status === 'SUBMITTED' || k.status === 'UNDER_REVIEW').length}
              </p>
            </div>
            <Clock size={24} className="text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approuvés</p>
              <p className="text-2xl font-bold text-green-600">
                {kycCases.filter(k => k.status === 'APPROVED').length}
              </p>
            </div>
            <CheckCircle size={24} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Corrections demandées</p>
              <p className="text-2xl font-bold text-orange-600">
                {kycCases.filter(k => k.status === 'PENDING_CORRECTION').length}
              </p>
            </div>
            <AlertCircle size={24} className="text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total dossiers</p>
              <p className="text-2xl font-bold text-gray-900">{totalElements}</p>
            </div>
            <Users size={24} className="text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un dossier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="SUBMITTED">Soumis</option>
            <option value="UNDER_REVIEW">En revue</option>
            <option value="PENDING_CORRECTION">Correction demandée</option>
            <option value="APPROVED">Approuvé</option>
            <option value="REJECTED">Rejeté</option>
          </select>
          <select
            value={ownerTypeFilter}
            onChange={(e) => setOwnerTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="all">Tous les types</option>
            <option value="MEMBER">Membres</option>
            <option value="CUSTOMER">Customers</option>
            <option value="BUSINESS">Business</option>
          </select>
        </div>
      </div>

      {/* Liste des dossiers */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Dossier</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Propriétaire</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Documents</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Soumis le</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCases.map((kycCase) => {
                const StatusIcon = statusConfig[kycCase.status]?.icon || Clock;
                const statusClass = statusConfig[kycCase.status]?.color || 'bg-gray-100 text-gray-700';
                const pendingDocuments = kycCase.documents?.filter(d => d.status === 'PENDING_REVIEW').length || 0;
                const rejectedDocuments = kycCase.documents?.filter(d => d.status === 'REJECTED').length || 0;
                
                return (
                  <tr key={kycCase.code} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">{kycCase.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {kycCase.ownerType === 'BUSINESS' ? (
                          <Building2 size={16} className="text-gray-400" />
                        ) : (
                          <Users size={16} className="text-gray-400" />
                        )}
                        <span className="text-sm text-gray-600">{kycCase.ownerType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {kycCase.documents?.map((doc, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleReviewDocument(doc)}
                            className={`w-2 h-2 rounded-full ${
                              doc.status === 'APPROVED' ? 'bg-green-500' :
                              doc.status === 'REJECTED' ? 'bg-red-500' :
                              doc.status === 'PENDING_REVIEW' ? 'bg-yellow-500' : 'bg-gray-300'
                            }`}
                            title={doc.documentTypeName}
                          />
                        ))}
                      </div>
                      {pendingDocuments > 0 && (
                        <span className="text-xs text-yellow-600 mt-1 block">{pendingDocuments} en attente</span>
                      )}
                      {rejectedDocuments > 0 && (
                        <span className="text-xs text-red-600 mt-1 block">{rejectedDocuments} rejetés</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusClass}`}>
                        <StatusIcon size={12} className="mr-1" />
                        {statusConfig[kycCase.status]?.label || kycCase.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {kycCase.submittedAt ? new Date(kycCase.submittedAt).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {/* Naviguer vers détail */}}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCases.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun dossier KYC trouvé</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="text-sm text-gray-600">
              Page {page + 1} sur {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
              className="px-4 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* Modal de revue de document */}
      <DocumentReviewModal
        document={selectedDocument}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDocument(null);
        }}
        onApprove={(comment) => {
          if (selectedDocument) {
            approveDocumentMutation.mutate({ code: selectedDocument.code, comment });
          }
        }}
        onReject={(comment) => {
          if (selectedDocument) {
            rejectDocumentMutation.mutate({ code: selectedDocument.code, comment });
          }
        }}
        isProcessing={approveDocumentMutation.isPending || rejectDocumentMutation.isPending}
      />
    </AdminLayout>
  );
};