import React, { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { Calendar, Clock, MapPin, User, Search, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Booking {
  id: string;
  bookingNumber: string;
  spaceName: string;
  memberName: string;
  memberEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  location: string;
  createdAt: string;
}

const mockBookings: Booking[] = [
  {
    id: '1',
    bookingNumber: 'BK-2026-001',
    spaceName: 'Bureau Privé Lumière',
    memberName: 'Jean Malala',
    memberEmail: 'jean@email.com',
    date: '24 Fév 2026',
    startTime: '09:00',
    endTime: '17:00',
    duration: 8,
    price: 40000,
    status: 'confirmed',
    location: 'Étage 3 - Bureau 305',
    createdAt: '2026-02-20'
  },
  {
    id: '2',
    bookingNumber: 'BK-2026-002',
    spaceName: 'Salle de Réunion Innovation',
    memberName: 'Marie Konde',
    memberEmail: 'marie@email.com',
    date: '26 Fév 2026',
    startTime: '14:00',
    endTime: '16:00',
    duration: 2,
    price: 16000,
    status: 'pending',
    location: 'Étage 1 - Salle 105',
    createdAt: '2026-02-21'
  },
  {
    id: '3',
    bookingNumber: 'BK-2026-003',
    spaceName: 'Espace Collaboratif',
    memberName: 'Paul Ndinga',
    memberEmail: 'paul@email.com',
    date: '28 Fév 2026',
    startTime: '10:00',
    endTime: '12:00',
    duration: 2,
    price: 6000,
    status: 'cancelled',
    location: 'Étage 2 - Open Space',
    createdAt: '2026-02-22'
  }
];

const statusConfig = {
  confirmed: { label: 'Confirmée', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  pending: { label: 'En attente', color: 'text-yellow-600 bg-yellow-50', icon: AlertCircle },
  cancelled: { label: 'Annulée', color: 'text-red-600 bg-red-50', icon: XCircle },
  completed: { label: 'Terminée', color: 'text-gray-600 bg-gray-50', icon: CheckCircle }
};

export const AdminBookings: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredBookings = mockBookings.filter(booking => {
    if (search && !booking.bookingNumber.toLowerCase().includes(search.toLowerCase()) && !booking.memberName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    if (dateFilter && !booking.date.includes(dateFilter)) return false;
    return true;
  });

  const totalRevenue = filteredBookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + b.price, 0);

  return (
    <AdminLayout>
      <div className="mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]">
        <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
        <p className="text-gray-600 mt-1">Gérez toutes les réservations des membres</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total réservations</p>
          <p className="text-2xl font-bold text-gray-900">{filteredBookings.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">En attente</p>
          <p className="text-2xl font-bold text-yellow-600">{filteredBookings.filter(b => b.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Chiffre d'affaires</p>
          <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString()} FCFA</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Taux d'occupation</p>
          <p className="text-2xl font-bold text-primary-600">68%</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.2s' }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro ou membre..."
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
            <option value="confirmed">Confirmées</option>
            <option value="pending">En attente</option>
            <option value="completed">Terminées</option>
            <option value="cancelled">Annulées</option>
          </select>
          <input
            type="month"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.3s' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">N° Réservation</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Espace</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Membre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date & Horaire</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Montant</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Statut</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.map((booking, _) => {
                const StatusIcon = statusConfig[booking.status].icon;
                return (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{booking.bookingNumber}</p>
                      <p className="text-xs text-gray-500">{booking.createdAt}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{booking.spaceName}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <MapPin size={10} className="mr-1" />
                        {booking.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <User size={14} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">{booking.memberName}</p>
                          <p className="text-xs text-gray-500">{booking.memberEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar size={14} className="mr-1 text-gray-400" />
                        {booking.date}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Clock size={14} className="mr-1 text-gray-400" />
                        {booking.startTime} - {booking.endTime}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{booking.price.toLocaleString()} FCFA</p>
                      <p className="text-xs text-gray-500">{booking.duration}h</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full flex items-center w-fit ${statusConfig[booking.status].color}`}>
                        <StatusIcon size={12} className="mr-1" />
                        {statusConfig[booking.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/bookings/${booking.id}`} className="text-primary-600 hover:text-primary-700">
                        <Eye size={18} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredBookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune réservation trouvée</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};