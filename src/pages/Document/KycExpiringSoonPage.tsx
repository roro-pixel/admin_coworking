import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Eye, RefreshCw } from 'lucide-react';
import { kycService, kycStatusLabels } from '../../services/document.service';
import { KycCaseDetailModal } from '../../components/kyc/KycCaseDetailModal';
import type { KycCaseResponse } from '../../services/document.service';

export const KycExpiringSoonPage: React.FC = () => {
  const [days, setDays] = useState(30);
  const [selectedCase, setSelectedCase] = useState<KycCaseResponse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['kyc-expiring-soon', days],
    queryFn: () => kycService.getExpiringSoon(days),
  });

  const cases = data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Expirations à venir</h2>
          <p className="text-sm text-gray-500 mt-1">Dossiers avec documents qui expirent bientôt</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-sm"
        >
          <option value={7}>7 jours</option>
          <option value={30}>30 jours</option>
          <option value={60}>60 jours</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-500">Chargement...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun document n'expire dans les {days} prochains jours</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((kycCase) => (
            <div key={kycCase.code} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar size={18} className="text-amber-500" />
                    <span className="font-mono font-medium">{kycCase.code}</span>
                    <span className={`text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700`}>
                      Expiration proche
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {kycCase.ownerType} · {kycCase.ownerCode || `ID: ${kycCase.ownerId}`}
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Documents : {kycCase.documents?.length || 0}</span>
                    <span>Statut : {kycStatusLabels[kycCase.status] || kycCase.status}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCase(kycCase)}
                  className="px-4 py-2 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 flex items-center gap-2 text-sm"
                >
                  <Eye size={14} /> Voir dossier
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCase && (
        <KycCaseDetailModal
          kycCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRefresh={() => setSelectedCase(null)}
        />
      )}
    </div>
  );
};