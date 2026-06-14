import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Building2, Percent } from "lucide-react";
import { reportingService } from "../../services/reporting.service";

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const format = (d: Date) => d.toISOString().split("T")[0];
  return { fromDate: format(firstDay), toDate: format(lastDay) };
};

const getOccupancyColor = (rate: number) => {
  if (rate >= 80) return "bg-green-500";
  if (rate >= 60) return "bg-blue-500";
  if (rate >= 30) return "bg-yellow-500";
  return "bg-red-400";
};

const getOccupancyLabel = (rate: number) => {
  if (rate >= 80) return "Très demandée";
  if (rate >= 60) return "Bonne performance";
  if (rate >= 30) return "Utilisation normale";
  return "Sous-utilisée";
};

export const OccupancyReport: React.FC = () => {
  const [dateRange, setDateRange] = useState(getCurrentMonthRange());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["occupancy-report", dateRange.fromDate, dateRange.toDate],
    queryFn: () =>
      reportingService.getOccupancyReport({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      }),
  });

  const formatFCFA = (amount: number | undefined | null) =>
    `${(amount ?? 0).toLocaleString("fr-FR")} FCFA`;
  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
        <p className="text-gray-500">Chargement du rapport...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Taux d'occupation
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.fromDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, fromDate: e.target.value }))
              }
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={dateRange.toDate}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, toDate: e.target.value }))
              }
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          {isFetching && (
            <RefreshCw size={14} className="animate-spin text-gray-400" />
          )}
        </div>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Résumé */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Taux global</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-gray-900">
                  {(data.overallOccupancyRate ?? 0).toFixed(1)}%
                </p>
                <Percent size={18} className="text-gray-400 mb-1" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Réservations</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.totalBookings}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Minutes réservées</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMinutes(data.totalBookedMinutes)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">Période</p>
              <p className="text-2xl font-bold text-gray-900">
                {data.periodDays} jours
              </p>
            </div>
          </div>

          {/* Par type de ressource */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Par type de ressource
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-2">
                <thead className="bg-transparent">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      Type
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">
                      Ressources
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">
                      Réservations
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">
                      Temps réservé
                    </th>
                    <th className="px-4 py-2 text-right text-sm font-semibold">
                      Revenu
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">
                      Occupation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.byResourceType.map((type) => (
                    <tr key={type.typeCode} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">
                        {type.typeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {type.resourceCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {type.totalBookings}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatMinutes(type.totalBookedMinutes)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatFCFA(type.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 w-64">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full ${getOccupancyColor(type.occupancyRate)}`}
                              style={{
                                width: `${Math.min(type.occupancyRate, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium w-14 text-right">
                            {(type.occupancyRate ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Par ressource */}
          {data.byResource.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Par ressource
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead className="bg-transparent">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">
                        Ressource
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">
                        Type
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">
                        Réservations
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">
                        Temps réservé
                      </th>
                      <th className="px-4 py-2 text-right text-sm font-semibold">
                        Revenu
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">
                        Occupation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byResource.map((res) => (
                      <tr key={res.resourceCode} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">
                                {res.resourceName}
                              </p>
                              <p className="text-xs text-gray-400 font-mono">
                                {res.resourceCode}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{res.typeName}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {res.bookingCount}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {formatMinutes(res.bookedMinutes)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatFCFA(res.revenue)}
                        </td>
                        <td className="px-4 py-3 w-64">
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${getOccupancyColor(res.occupancyRate)}`}
                                style={{
                                  width: `${Math.min(res.occupancyRate, 100)}%`,
                                }}
                              />
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium">
                                {(res.occupancyRate ?? 0).toFixed(1)}%
                              </span>
                              <p className="text-xs text-gray-400">
                                {getOccupancyLabel(res.occupancyRate)}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!data && !isLoading && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            Aucune donnée disponible pour cette période
          </p>
        </div>
      )}
    </div>
  );
};
