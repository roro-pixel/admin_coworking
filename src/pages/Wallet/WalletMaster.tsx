import React from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { WalletsList } from './WalletsList';

export const WalletMaster: React.FC = () => {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Portefeuilles</h1>
        <p className="text-gray-600 mt-1">Gérez les portefeuilles clients et les transactions</p>
      </div>

      <WalletsList />
    </AdminLayout>
  );
};