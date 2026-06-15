import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Shield,
  Users,
  Building2,
  Calendar,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { kycService } from "../../services/document.service";

export const KycDashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["kyc-dashboard"],
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

  // Extraire les données avec des valeurs par défaut
  const totalCases =
    data.summary?.totalCases ??
    Object.values(data.summary ?? {}).reduce(
      (sum: number, value: any) =>
        sum + (typeof value === "number" ? value : 0),
      0,
    );
  const pendingReview =
    data.summary?.PENDING_REVIEW ??
    (data.byOwnerType || []).reduce(
      (sum, item) => sum + (item.pendingReview || 0),
      0,
    );
  const overdueSla = data.sla?.casesExceeding48h ?? 0;
  const expiring7Days = data.expiringSoon?.within7Days ?? 0;
  const expiring30Days = data.expiringSoon?.within30Days ?? 0;
  const expiring60Days = data.expiringSoon?.within60Days ?? 0;

  // Statuts depuis summary
  const statusMap = {
    PENDING_REVIEW:
      data.summary?.PENDING_REVIEW ?? data.summary?.SUBMITTED ?? 0,
    IN_REVIEW: data.summary?.IN_REVIEW ?? data.summary?.UNDER_REVIEW ?? 0,
    APPROVED: data.summary?.APPROVED ?? 0,
    REJECTED: data.summary?.REJECTED ?? 0,
    CANCELLED: data.summary?.CANCELLED ?? 0,
    DRAFT:
      data.summary?.DRAFT ??
      data.summary?.NOT_STARTED ??
      data.summary?.IN_PROGRESS ??
      0,
    EXPIRED: data.summary?.EXPIRED ?? 0,
  };

  // Par type de propriétaire (depuis le tableau)
  const getOwnerCount = (ownerType: string) => {
    const item = (data.byOwnerType || []).find(
      (o) => o.ownerType === ownerType,
    );
    return item?.count ?? 0;
  };

  const statusCards = [
    {
      key: "PENDING_REVIEW",
      label: "En attente",
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      key: "IN_REVIEW",
      label: "En revue",
      icon: Eye,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      key: "APPROVED",
      label: "Approuvés",
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      key: "REJECTED",
      label: "Rejetés",
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      key: "CANCELLED",
      label: "Annulés",
      icon: AlertCircle,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
    {
      key: "DRAFT",
      label: "Brouillons",
      icon: Calendar,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      key: "EXPIRED",
      label: "Expirés",
      icon: Shield,
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Dashboard KYC</h2>
        <p className="text-sm text-gray-500 mt-1">
          Vue d'ensemble de la conformité
        </p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Total dossiers</p>
          <p className="text-3xl font-bold text-gray-900">{totalCases}</p>
        </div>
        <div
          className={`bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 ${pendingReview > 0 ? "border-l-4 border-yellow-500" : ""}`}
        >
          <p className="text-sm text-gray-500">En attente de revue</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingReview}</p>
        </div>
        <div
          className={`bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 ${overdueSla > 0 ? "border-l-4 border-red-500" : ""}`}
        >
          <p className="text-sm text-gray-500">SLA dépassé</p>
          <p
            className={`text-3xl font-bold ${overdueSla > 0 ? "text-red-600" : "text-gray-900"}`}
          >
            {overdueSla}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Expirant sous 7 jours</p>
          <p
            className={`text-3xl font-bold ${expiring7Days > 0 ? "text-red-600" : "text-gray-900"}`}
          >
            {expiring7Days}
          </p>
        </div>
      </div>

      {/* Statuts détaillés */}
      <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Répartition par statut
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statusCards.map((card) => (
            <div
              key={card.key}
              className={`${card.bg} rounded-xl p-4 text-center`}
            >
              <card.icon size={24} className={`mx-auto mb-2 ${card.color}`} />
              <p className="text-2xl font-bold">
                {statusMap[card.key as keyof typeof statusMap]}
              </p>
              <p className="text-sm text-gray-600">{card.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Expiration et type de propriétaire */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expirations */}
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-amber-500" />
            Expirations à venir
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm">Sous 7 jours</span>
              <span className="text-xl font-bold text-red-600">
                {expiring7Days}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm">Sous 30 jours</span>
              <span className="text-xl font-bold text-orange-600">
                {expiring30Days}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
              <span className="text-sm">Sous 60 jours</span>
              <span className="text-xl font-bold text-yellow-600">
                {expiring60Days}
              </span>
            </div>
          </div>
        </div>

        {/* Par type de propriétaire */}
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
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
              <span className="text-xl font-bold text-blue-600">
                {getOwnerCount("MEMBER")}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-green-600" />
                <span className="text-sm">Customers</span>
              </div>
              <span className="text-xl font-bold text-green-600">
                {getOwnerCount("CUSTOMER")}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-gray-600" />
                <span className="text-sm">Business</span>
              </div>
              <span className="text-xl font-bold text-gray-600">
                {getOwnerCount("BUSINESS")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Activité récente (optionnel - à adapter selon ce que le backend retourne) */}
      {data.recentActivity && data.recentActivity.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Activité récente (7 jours)
          </h3>
          <div className="space-y-2">
            {data.recentActivity.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {item.action === "APPROVED" ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  <span className="text-sm font-medium">{item.action}</span>
                </div>
                <span className="text-lg font-bold text-gray-700">
                  {item.count}
                </span>
                <span className="text-xs text-gray-400">
                  {item.period?.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
