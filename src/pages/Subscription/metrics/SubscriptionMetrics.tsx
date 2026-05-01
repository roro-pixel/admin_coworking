import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Ticket, AlertCircle, Package, CreditCard, Clock, RefreshCw, TrendingUp } from 'lucide-react';
import { subscriptionService } from '../../../services/subscription.service';

export const SubscriptionMetrics: React.FC = () => {
  const { data: metrics, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['subscription-metrics'],
    queryFn: () => subscriptionService.getSubscriptionMetrics(),
    // Refresh automatique toutes les 5 minutes
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Métriques des abonnements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4" />
              <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Métriques des abonnements</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle size={32} className="mx-auto text-red-400 mb-3" />
          <p className="text-red-700 font-medium">Erreur de chargement des métriques</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // CORRECTION : accès défensif à tous les champs — l'API retourne `any`
  // On utilise `?? 0` pour éviter les NaN/undefined sur des champs inconnus
  const safeNum = (val: any): number =>
    typeof val === 'number' && !isNaN(val) ? val : 0;

  const cards = [
    {
      title: 'Souscriptions actives',
      value: safeNum(metrics?.activeSubscriptions),
      icon: Users,
      color: 'bg-green-100 text-green-600',
      format: 'number',
    },
    {
      title: 'En attente d\'activation',
      value: safeNum(metrics?.pendingSubscriptions ?? metrics?.pendingActivationSubscriptions),
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600',
      format: 'number',
    },
    {
      title: 'Souscriptions suspendues',
      value: safeNum(metrics?.suspendedSubscriptions),
      icon: AlertCircle,
      color: 'bg-orange-100 text-orange-600',
      format: 'number',
    },
    {
      title: 'MRR',
      value: safeNum(metrics?.activeSubscriptionMrr ?? metrics?.mrr ?? metrics?.monthlyRecurringRevenue),
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600',
      format: 'currency',
    },
    {
      title: 'Promotions actives',
      value: safeNum(metrics?.activePromotions),
      icon: Ticket,
      color: 'bg-pink-100 text-pink-600',
      format: 'number',
    },
    {
      title: 'Plans actifs',
      value: safeNum(metrics?.activePlans ?? metrics?.totalActivePlans),
      icon: Package,
      color: 'bg-indigo-100 text-indigo-600',
      format: 'number',
    },
    {
      title: 'Souscriptions expirées',
      value: safeNum(metrics?.expiredSubscriptions),
      icon: AlertCircle,
      color: 'bg-gray-100 text-gray-500',
      format: 'number',
    },
    {
      title: 'Factures en attente',
      value: safeNum(metrics?.pendingBillableAmount ?? metrics?.pendingInvoiceAmount),
      icon: CreditCard,
      color: 'bg-red-100 text-red-600',
      format: 'currency',
    },
  ];

  const formatValue = (value: number, format: string): string => {
    if (format === 'currency') {
      return `${value.toLocaleString('fr-FR')} FCFA`;
    }
    return value.toLocaleString('fr-FR');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Métriques des abonnements</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon size={24} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {formatValue(card.value, card.format)}
              </p>
              <p className="text-sm text-gray-600">{card.title}</p>
            </div>
          );
        })}
      </div>

    </div>
  );
};