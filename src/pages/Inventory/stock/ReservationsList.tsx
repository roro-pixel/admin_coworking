import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { inventoryService } from '../../../services/inventory.service';

export const ReservationsList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: reservationsData, isLoading } = useQuery({
    queryKey: ['stock-reservations', statusFilter],
    queryFn: () => inventoryService.getStockReservations({ status: statusFilter || undefined, size: 100 }),
  });

  const reservations = reservationsData?.data || reservationsData?.content || [];

  const filteredReservations = reservations.filter((r: any) =>
    r.itemName?.toLowerCase().includes(search.toLowerCase()) ||
    r.reservationCode?.toLowerCase().includes(search.toLowerCase())
  );

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700', icon: Clock },
    CONSUMED: { label: 'Consommée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    RELEASED: { label: 'Libérée', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Réservations de stock</h3>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actives</option>
          <option value="CONSUMED">Consommées</option>
          <option value="RELEASED">Libérées</option>
        </select>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une réservation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Article</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Emplacement</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Quantité</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Référence</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Statut</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredReservations.map((res: any) => {
              const status = statusConfig[res.status] || statusConfig.ACTIVE;
              const StatusIcon = status.icon;
              return (
                <tr key={res.reservationCode} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{res.reservationCode}</td>
                  <td className="px-4 py-3 text-sm font-medium">{res.itemName}</td>
                  <td className="px-4 py-3 text-sm">{res.locationName}</td>
                  <td className="px-4 py-3 text-right font-medium">{res.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{res.referenceCode || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(res.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredReservations.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500">Aucune réservation trouvée</p>
        </div>
      )}
    </div>
  );
};