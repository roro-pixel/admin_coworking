import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Eye, CheckCircle, XCircle, AlertCircle, FileText,
  RefreshCw, Loader2
} from 'lucide-react';
import { kycService } from '../../services/document.service';
import { KycCaseDetailModal } from '../../components/kyc/KycCaseDetailModal';
import { useAuth } from '../../contexts/AuthContext';
import type { KycCaseResponse } from '../../services/document.service';

const statusConfig: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: 'Soumis', color: 'bg-yellow-100 text-yellow-700' },
  UNDER_REVIEW: { label: 'En revue', color: 'bg-orange-100 text-orange-700' },
  PENDING_CORRECTION: { label: 'Correction', color: 'bg-red-100 text-red-700' },
};

export const KycMyQueuePage: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCase, setSelectedCase] = useState<KycCaseResponse | null>(null);
  const adminId = Number(admin?.id) || 1;

  const { data: myCases, isLoading } = useQuery({
    queryKey: ['kyc-my-queue'],
    queryFn: () => kycService.getMyQueue(adminId),
    refetchInterval: 60000,
  });

  const approveMutation = useMutation({
    mutationFn: (code: string) => kycService.approveKycCase(code, adminId, 'Approuvé depuis ma file'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kyc-my-queue'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (code: string) => kycService.rejectKycCase(code, adminId, 'Rejeté depuis ma file'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kyc-my-queue'] }),
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement de votre file...</p>
      </div>
    );
  }

  const cases = myCases || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Mes dossiers</h2>
          <p className="text-sm text-gray-500 mt-1">Dossiers assignés à vous pour revue</p>
        </div>
        <div className="flex gap-3">
          <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
            {cases.length} dossier{cases.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <CheckCircle size={48} className="mx-auto text-green-300 mb-4" />
          <p className="text-gray-500">Votre file est vide</p>
          <p className="text-sm text-gray-400">Tous les dossiers ont été traités</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((kycCase) => {
            const isSlaOverdue = kycCase.slaDeadline && new Date(kycCase.slaDeadline) < new Date();
            return (
              <div key={kycCase.code} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText size={18} className="text-primary-600" />
                      <span className="font-mono font-medium">{kycCase.code}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[kycCase.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                        {statusConfig[kycCase.status]?.label || kycCase.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {kycCase.ownerType} · {kycCase.ownerCode || `ID: ${kycCase.ownerId}`}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>Soumis : {kycCase.submittedAt ? new Date(kycCase.submittedAt).toLocaleDateString('fr-FR') : '—'}</span>
                      {kycCase.slaDeadline && (
                        <span className={isSlaOverdue ? 'text-red-500 font-medium flex items-center gap-1' : ''}>
                          {isSlaOverdue && <AlertCircle size={10} />}
                          SLA : {new Date(kycCase.slaDeadline).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCase(kycCase)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Eye size={14} /> Examiner
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Approuver le dossier ${kycCase.code} ?`)) {
                          approveMutation.mutate(kycCase.code);
                        }
                      }}
                      disabled={approveMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      {approveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Approuver
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Rejeter le dossier ${kycCase.code} ?`)) {
                          rejectMutation.mutate(kycCase.code);
                        }
                      }}
                      disabled={rejectMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      {rejectMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedCase && (
        <KycCaseDetailModal
          kycCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ['kyc-my-queue'] });
            setSelectedCase(null);
          }}
        />
      )}
    </div>
  );
};