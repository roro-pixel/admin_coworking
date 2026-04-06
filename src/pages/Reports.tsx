import React, { useState } from 'react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { BarChart3, TrendingUp, Users, Calendar, Download } from 'lucide-react';

export const AdminReports: React.FC = () => {
  const [period, setPeriod] = useState('month');

  const stats = {
    totalMembers: 234,
    activeMembers: 189,
    newMembersThisMonth: 23,
    occupancyRate: 68,
    totalRevenue: 2450000,
    avgRevenuePerMember: 12900
  };

  return (
    <AdminLayout>
      <div className="mb-6 opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
            <p className="text-gray-600 mt-1">Analysez les performances de votre espace</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center">
              <Download size={16} className="mr-2" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users size={24} className="text-blue-600" />
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{stats.totalMembers}</p>
          <p className="text-sm text-gray-600">Membres actifs</p>
          <p className="text-xs text-gray-400 mt-2">{stats.activeMembers} actifs</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar size={24} className="text-green-600" />
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">+{stats.newMembersThisMonth}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{stats.newMembersThisMonth}</p>
          <p className="text-sm text-gray-600">Nouveaux membres</p>
          <p className="text-xs text-gray-400 mt-2">Ce mois</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <TrendingUp size={24} className="text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{stats.occupancyRate}%</p>
          <p className="text-sm text-gray-600">Taux d'occupation</p>
          <p className="text-xs text-gray-400 mt-2">Moyenne des espaces</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <BarChart3 size={24} className="text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{stats.totalRevenue.toLocaleString()} FCFA</p>
          <p className="text-sm text-gray-600">Chiffre d'affaires</p>
          <p className="text-xs text-gray-400 mt-2">Moy. {stats.avgRevenuePerMember.toLocaleString()} FCFA/membre</p>
        </div>
      </div>

      {/* Graphiques (placeholders) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des réservations</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Graphique des réservations</p>
              <p className="text-xs text-gray-400">(Intégration chart.js ou recharts)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.35s' }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par type d'espace</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Graphique des espaces</p>
              <p className="text-xs text-gray-400">(Intégration chart.js ou recharts)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top membres */}
      <div className="mt-6 bg-white rounded-xl p-6 shadow-sm opacity-0 animate-[fadeUp_0.6s_ease-out_forwards]" style={{ animationDelay: '0.4s' }}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 membres actifs</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-semibold">{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Jean Malala</p>
                  <p className="text-xs text-gray-500">Membre depuis Jan 2026</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">12 réservations</p>
                <p className="text-xs text-gray-500">245 000 FCFA</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};