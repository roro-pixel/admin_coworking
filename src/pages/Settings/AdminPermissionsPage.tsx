import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Key } from 'lucide-react';
import { authService } from '../../services/auth.service';
import type { Permission } from '../../services/auth.service';

export const AdminPermissionsPage: React.FC = () => {
  const [search, setSearch] = useState('');

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => authService.getPermissions({ activeOnly: true, size: 200 }),
  });

  const permissions: Permission[] = permissionsData?.content || [];

  const filteredPermissions = permissions.filter(perm =>
    perm.fullPermissionName.toLowerCase().includes(search.toLowerCase()) ||
    perm.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    perm.module.toLowerCase().includes(search.toLowerCase())
  );

  // Grouper par module
  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Permissions</h2>
        <p className="text-sm text-gray-500">{permissions.length} permissions</p>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, module, action..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(([module, perms]) => (
            <div key={module} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-sm text-gray-700">{module}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4">
                {perms.map((perm) => (
                  <div key={perm.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <Key size={14} className="text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-mono">{perm.fullPermissionName}</p>
                      {perm.displayName && (
                        <p className="text-xs text-gray-400">{perm.displayName}</p>
                      )}
                    </div>
                    {!perm.isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 ml-auto">
                        Inactif
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredPermissions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl">
          <Key size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Aucune permission trouvée</p>
        </div>
      )}
    </div>
  );
};