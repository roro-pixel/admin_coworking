import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";

export const ReservationsList: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: reservationsData, isLoading } = useQuery({
    queryKey: ["stock-reservations", statusFilter],
    queryFn: () =>
      inventoryService.getStockReservations({
        status: statusFilter || undefined,
        size: 100,
      }),
  });

  const reservations =
    reservationsData?.data || reservationsData?.content || [];

  const filteredReservations = reservations.filter(
    (r: any) =>
      r.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      r.reservationCode?.toLowerCase().includes(search.toLowerCase()),
  );

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: any }
  > = {
    ACTIVE: {
      label: "Active",
      color: "bg-green-100 text-green-700",
      icon: Clock,
    },
    CONSUMED: {
      label: "Consommée",
      color: "bg-blue-100 text-blue-700",
      icon: CheckCircle,
    },
    RELEASED: {
      label: "Libérée",
      color: "bg-gray-100 text-gray-700",
      icon: XCircle,
    },
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
          Réservations de stock
        </h3>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-5 py-2.5 ring-1 ring-gray-100 rounded-2xl bg-white text-sm sm:text-base"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actives</option>
          <option value="CONSUMED">Consommées</option>
          <option value="RELEASED">Libérées</option>
        </select>
      </div>

      {/* Recherche - AGRANDIE */}
      <div className="relative mb-8">
        <Search
          size={20}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher une réservation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
        />
      </div>

      {/* Tableau - AGRANDI */}
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <table className="w-full text-sm sm:text-base block md:table">
          <thead className="bg-gray-50 ring-1 ring-gray-100 hidden md:table-header-group">
            <tr>
              <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Code</th>
              <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Article</th>
              <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Emplacement</th>
              <th className="px-5 py-4 text-right font-semibold hidden md:table-cell">Quantité</th>
              <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Référence</th>
              <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Statut</th>
              <th className="px-5 py-4 text-left font-semibold hidden md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="space-y-2 md:space-y-0 block md:table-row-group">
            {filteredReservations.map((res: any) => {
              const status = statusConfig[res.status] || statusConfig.ACTIVE;
              const StatusIcon = status.icon;
              return (
                <tr key={res.reservationCode} className="hover:bg-gray-50 block md:table-row rounded-3xl bg-white p-4 mb-3 shadow-sm ring-1 ring-gray-100">
                  <td className="px-5 py-4 font-mono text-sm flex justify-between gap-4 md:table-cell text-sm">
                    {res.reservationCode}
                  </td>
                  <td className="px-5 py-4 font-medium flex justify-between gap-4 md:table-cell text-sm">{res.itemName}</td>
                  <td className="px-5 py-4 flex justify-between gap-4 md:table-cell text-sm">{res.locationName}</td>
                  <td className="px-5 py-4 text-right font-medium flex justify-between gap-4 md:table-cell text-sm">
                    {res.quantity}
                  </td>
                  <td className="px-5 py-4 text-gray-500 flex justify-between gap-4 md:table-cell text-sm">
                    {res.referenceCode || "-"}
                  </td>
                  <td className="px-5 py-4 flex justify-between gap-4 md:table-cell text-sm">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${status.color}`}
                    >
                      <StatusIcon size={14} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 flex justify-between gap-4 md:table-cell text-sm">
                    {new Date(res.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredReservations.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl">
          <p className="text-gray-500 text-sm sm:text-base">Aucune réservation trouvée</p>
        </div>
      )}
    </div>
  );
};
