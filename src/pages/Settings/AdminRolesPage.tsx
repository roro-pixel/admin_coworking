import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Shield, Settings } from 'lucide-react';
import { authService } from '../../services/auth.service';
import type { Role } from '../../services/auth.service';
import { RolePermissionsModal } from './RolePermissionsModal';

export const AdminRolesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => authService.getRoles(),
  });

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(search.toLowerCase()) ||
    (role.displayName && role.displayName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role);
    setIsPermissionsOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Rôles</h2>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un rôle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Rôle</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Nom</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRoles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-primary-600" />
                      <span className="font-medium">{role.displayName || role.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">{role.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{role.description || '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleManagePermissions(role)}
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700 flex items-center gap-1 mx-auto"
                    >
                      <Settings size={12} />
                      Gérer les permissions
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRoles.length === 0 && (
            <div className="text-center py-12">
              <Shield size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun rôle trouvé</p>
            </div>
          )}
        </div>
      )}

      {selectedRole && (
        <RolePermissionsModal
          isOpen={isPermissionsOpen}
          onClose={() => {
            setIsPermissionsOpen(false);
            setSelectedRole(null);
          }}
          role={selectedRole}
        />
      )}
    </div>
  );
};