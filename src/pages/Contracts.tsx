import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../components/layout/AdminLayout';
import { 
  Plus, 
  Search, 
  Eye, 
  FileText, 
  Download,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Play,
  Pause,
  StopCircle,
  Ban
} from 'lucide-react';
import { contractService } from '../services/contract.service';
import type { ContractResponse } from '../services/contract.service';
import { ContractFormModal } from '../components/contracts/ContractFormModal';
import { useAuth } from '../contexts/AuthContext';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', icon: FileText },
  GENERATED: { label: 'Généré', color: 'bg-blue-100 text-blue-700', icon: FileText },
  UNDER_REVIEW: { label: 'En relecture', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  AWAITING_SIGNATURE: { label: 'Attente signature', color: 'bg-orange-100 text-orange-700', icon: Clock },
  SIGNED: { label: 'Signé', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  SUSPENDED: { label: 'Suspendu', color: 'bg-red-100 text-red-700', icon: Pause },
  TERMINATED: { label: 'Résilié', color: 'bg-gray-100 text-gray-700', icon: StopCircle },
  EXPIRED: { label: 'Expiré', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
  CANCELLED: { label: 'Annulé', color: 'bg-gray-100 text-gray-700', icon: Ban },
};

export const AdminContracts: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownerTypeFilter, setOwnerTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractResponse | null>(null);

  const { data: contractsData, isLoading } = useQuery({
    queryKey: ['contracts', page, statusFilter, ownerTypeFilter],
    queryFn: () => contractService.getAllContracts({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      ownerType: ownerTypeFilter !== 'all' ? ownerTypeFilter : undefined,
      page,
      size: 20,
    }),
  });

  const generateDraftMutation = useMutation({
    mutationFn: (contractCode: string) => 
      contractService.generateDraft(contractCode, parseInt(admin?.id || '0')),
    onSuccess: (data, contractCode) => {
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrat_${contractCode}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ contractCode, status }: { contractCode: string; status: string }) =>
      contractService.updateContractStatus(contractCode, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (contractCode: string) => contractService.activateContract(contractCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (contractCode: string) => contractService.suspendContract(contractCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: ({ contractCode, reason }: { contractCode: string; reason?: string }) =>
      contractService.terminateContract(contractCode, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const contracts = contractsData?.data || [];
  const totalPages = contractsData?.pageable?.totalPages || 0;

  const handleGenerateDraft = (contractCode: string) => {
    generateDraftMutation.mutate(contractCode);
  };

  const handleStatusChange = (contractCode: string, newStatus: string) => {
    updateStatusMutation.mutate({ contractCode, status: newStatus });
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats</h1>
          <p className="text-gray-600 mt-1">Gérez tous les contrats et leur workflow</p>
        </div>
        <button
          onClick={() => {
            setSelectedContract(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouveau contrat
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un contrat..."
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
            {Object.entries(statusConfig).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
          <select
            value={ownerTypeFilter}
            onChange={(e) => setOwnerTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          >
            <option value="all">Tous les propriétaires</option>
            <option value="MEMBER">Membres</option>
            <option value="CUSTOMER">Customers</option>
            <option value="BUSINESS">Business</option>
          </select>
        </div>
      </div>

      {/* Liste des contrats */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Contrat</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Propriétaire</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Dates</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Documents</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contracts.map((contract) => {
                const StatusIcon = statusConfig[contract.status]?.icon || FileText;
                const statusClass = statusConfig[contract.status]?.color || 'bg-gray-100 text-gray-700';
                
                return (
                  <tr key={contract.contractCode} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{contract.title}</p>
                        <p className="text-xs text-gray-500">{contract.contractCode}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{contract.ownerType}</p>
                      <p className="text-xs text-gray-500">{contract.ownerCode}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        Début: {new Date(contract.startDate).toLocaleDateString('fr-FR')}
                      </p>
                      {contract.endDate && (
                        <p className="text-xs text-gray-500">
                          Fin: {new Date(contract.endDate).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusClass}`}>
                        <StatusIcon size={12} className="mr-1" />
                        {statusConfig[contract.status]?.label || contract.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {contract.draftDocumentCode && (
                          <button
                            onClick={() => handleGenerateDraft(contract.contractCode)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Télécharger brouillon"
                          >
                            <Download size={16} />
                          </button>
                        )}
                        {contract.signedDocumentCode && (
                          <FileText size={16} className="text-green-600" title="Contrat signé disponible" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedContract(contract)}
                          className="text-primary-600 hover:text-primary-700"
                          title="Voir détail"
                        >
                          <Eye size={18} />
                        </button>
                        {contract.status === 'DRAFT' && (
                          <button
                            onClick={() => handleGenerateDraft(contract.contractCode)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Générer brouillon"
                          >
                            <FileText size={18} />
                          </button>
                        )}
                        {contract.status === 'GENERATED' && (
                          <button
                            onClick={() => handleStatusChange(contract.contractCode, 'UNDER_REVIEW')}
                            className="text-yellow-600 hover:text-yellow-700"
                            title="Mettre en relecture"
                          >
                            <Clock size={18} />
                          </button>
                        )}
                        {contract.status === 'SIGNED' && (
                          <button
                            onClick={() => activateMutation.mutate(contract.contractCode)}
                            className="text-green-600 hover:text-green-700"
                            title="Activer"
                          >
                            <Play size={18} />
                          </button>
                        )}
                        {contract.status === 'ACTIVE' && (
                          <button
                            onClick={() => suspendMutation.mutate(contract.contractCode)}
                            className="text-orange-600 hover:text-orange-700"
                            title="Suspendre"
                          >
                            <Pause size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </td>
                );
              })}
            </tbody>
          </table>
        </div>

        {contracts.length === 0 && (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucun contrat trouvé</p>
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
            <span className="text-sm text-gray-600">Page {page + 1} sur {totalPages}</span>
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

      {/* Modal de création/édition */}
      <ContractFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedContract(null);
        }}
        onSave={(data) => {
          contractService.createContract(data).then(() => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            setIsModalOpen(false);
          });
        }}
        initialData={selectedContract}
        isEditing={!!selectedContract}
      />
    </AdminLayout>
  );
};