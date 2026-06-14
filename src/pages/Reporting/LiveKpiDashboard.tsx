import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Clock,
  Activity,
  Gauge,
} from "lucide-react";
import { reportingService } from "../../services/reporting.service";

const formatFCFA = (amount: number | undefined | null): string => {
  const value = amount ?? 0;
  return `${value.toLocaleString("fr-FR")} FCFA`;
};

// Composant Jauge avec Arc
const GaugeChart: React.FC<{ value: number; size?: number }> = ({
  value,
  size = 200,
}) => {
  const percentage = Math.min(Math.max(value, 0), 100);
  const radius = size * 0.38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  const getColor = () => {
    if (percentage >= 80) return "#10b981";
    if (percentage >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getLabel = () => {
    if (percentage >= 80) return "Forte demande";
    if (percentage >= 50) return "Demande modérée";
    return "Faible demande";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Cercle de fond */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={size * 0.08}
        />
        {/* Cercle de progression */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={size * 0.08}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          className="transition-all duration-700 ease-out"
        />
        {/* Texte central */}
        <text
          x={size / 2}
          y={size / 2 - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-2xl font-bold"
          fill={getColor()}
        >
          {percentage.toFixed(0)}%
        </text>
        <text
          x={size / 2}
          y={size / 2 + 20}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-medium"
          fill="#6b7280"
        >
          {getLabel()}
        </text>
      </svg>
    </div>
  );
};

// Composant KpiCard réutilisable — style sobre pour back-office
const KpiCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  subtitle?: string;
  trend?: number;
}> = ({ title, value, icon: Icon, subtitle, trend }) => {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-3 text-2xl font-bold text-gray-950">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className="rounded-xl bg-gray-50 p-2.5 text-gray-500 ring-1 ring-gray-100">
          <Icon size={20} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-500">
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}% vs hier
        </div>
      )}
    </div>
  );
};

export const LiveKpiDashboard: React.FC = () => {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["live-kpis"],
    queryFn: () => reportingService.getLiveKpis(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <RefreshCw
            className="animate-spin mx-auto mb-4 text-primary-500"
            size={32}
          />
          <p className="text-gray-500">Chargement des KPIs temps réel...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm">
        <Activity size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Aucune donnée disponible</p>
      </div>
    );
  }

  const occupancyRate = data.occupancyRate ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            KPIs en temps réel
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Données actualisées automatiquement toutes les 30 secondes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg">
            <Clock size={12} />
            Mise à jour: {new Date(data.updatedAt).toLocaleTimeString("fr-FR")}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Cartes KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Réservations actives"
          value={data.currentActiveBookings}
          icon={Calendar}
          color="from-blue-500 to-blue-600"
          subtitle="en cours"
        />
        <KpiCard
          title="Revenu du jour"
          value={formatFCFA(data.todayRevenue)}
          icon={DollarSign}
          color="from-green-500 to-green-600"
          subtitle="aujourd'hui"
        />
        <KpiCard
          title="Réservations du jour"
          value={data.todayBookings}
          icon={Activity}
          color="from-purple-500 to-purple-600"
          subtitle="nouvelles réservations"
        />
        <KpiCard
          title="Check-ins en attente"
          value={data.pendingCheckins}
          icon={Users}
          color="from-orange-500 to-orange-600"
          subtitle="à vérifier"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Gauge size={18} className="text-primary-500" />
            Taux d'occupation actuel
          </h3>
          <div className="flex flex-col items-center">
            <GaugeChart value={occupancyRate} size={220} />
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Occupées:</span>
                  <span className="font-semibold text-gray-800 ml-1">
                    {data.currentOccupancy}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Capacité:</span>
                  <span className="font-semibold text-gray-800 ml-1">
                    {data.totalCapacity}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Percent size={18} className="text-primary-500" />
            Indicateurs clés
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Sessions actives</p>
              <p className="text-2xl font-bold text-gray-800">
                {data.activeSessions}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Capacité totale</p>
              <p className="text-2xl font-bold text-gray-800">
                {data.totalCapacity}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Taux d'occupation</p>
              <p className="text-2xl font-bold text-gray-800">
                {occupancyRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Panier moyen</p>
              <p className="text-2xl font-bold text-gray-800">
                {data.todayBookings > 0
                  ? formatFCFA(data.todayRevenue / data.todayBookings)
                  : "0 FCFA"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
