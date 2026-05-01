import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, CheckCircle, XCircle, AlertCircle, Eye, Shield, 
  Users, Building2, FileText, Calendar, TrendingUp, RefreshCw 
} from 'lucide-react';
import { kycService } from '../../services/document.service';

export const KycDashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['kyc-dashboard'],
    queryFn: () => kycService.getKycDashboard(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement du dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  const statusCards = [
    { key: 'SUBMITTED', label: 'Soumis', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { key: 'UNDER_REVIEW', label: 'En revue', icon: Eye, color: 'text-orange-600', bg: 'bg-orange-50' },
    { key: 'APPROVED', label: 'Approuvés', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { key: 'REJECTED', label: 'Rejetés', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { key: 'PENDING_CORRECTION', label: 'Corrections', icon: AlertCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'RENEWAL_REQUIRED', label: 'Renouvellement', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'EXPIRED', label: 'Expirés', icon: Shield, color: 'text-gray-600', bg: 'bg-gray-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Dashboard KYC</h2>
        <p className="text-sm text-gray-500 mt-1">Vue d'ensemble de la conformité</p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total dossiers</p>
          <p className="text-3xl font-bold text-gray-900">{data.totalCases}</p>
        </div>
        <div className={`bg-white rounded-xl p-5 shadow-sm ${data.pendingReview > 0 ? 'border-l-4 border-yellow-500' : ''}`}>
          <p className="text-sm text-gray-500">En attente de revue</p>
          <p className="text-3xl font-bold text-yellow-600">{data.pendingReview}</p>
        </div>
        <div className={`bg-white rounded-xl p-5 shadow-sm ${data.overdueSla > 0 ? 'border-l-4 border-red-500' : ''}`}>
          <p className="text-sm text-gray-500">SLA dépassé</p>
          <p className={`text-3xl font-bold ${data.overdueSla > 0 ? 'text-red-600' : 'text-gray-900'}`}>{data.overdueSla}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500">Expirant sous 7 jours</p>
          <p className={`text-3xl font-bold ${data.expiring7Days > 0 ? 'text-red-600' : 'text-gray-900'}`}>{data.expiring7Days}</p>
        </div>
      </div>

      {/* Statuts détaillés */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par statut</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {statusCards.map((card) => (
           <div key={card.key} className={`${card.bg} rounded-xl p-4 text-center`}>
             <card.icon size={24} className={`mx-auto mb-2 ${card.color}`} />
             <p className="text-2xl font-bold">{data.byStatus?.[card.key] || 0}</p>
             <p className="text-sm text-gray-600">{card.label}</p>
           </div>
         ))}
        </div>
      </div>

      {/* Expiration et type de propriétaire */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expirations */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-amber-500" />
            Expirations à venir
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm">Sous 7 jours</span>
              <span className="text-xl font-bold text-red-600">{data.expiring7Days}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm">Sous 30 jours</span>
              <span className="text-xl font-bold text-orange-600">{data.expiring30Days}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm">Sous 60 jours</span>
              <span className="text-xl font-bold text-yellow-600">{data.expiring60Days}</span>
            </div>
          </div>
        </div>

        {/* Par type de propriétaire */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            Par type de propriétaire
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                <span className="text-sm">Membres</span>
              </div>
              <span className="text-xl font-bold text-blue-600">{data.byOwnerType?.MEMBER || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-green-600" />
                <span className="text-sm">Customers</span>
              </div>
              <span className="text-xl font-bold text-green-600">{data.byOwnerType?.CUSTOMER || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-purple-600" />
                <span className="text-sm">Business</span>
              </div>
              <span className="text-xl font-bold text-purple-600">{data.byOwnerType?.BUSINESS || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h3>
          <div className="space-y-2">
            {data.recentActivity.slice(0, 10).map((item) => (
              <div key={item.code} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-mono">{item.code}</p>
                    <p className="text-xs text-gray-500">{item.ownerType}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('fr-FR') : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};