import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Shield, Users, RefreshCw, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { authService } from '../../services/auth.service';
import type { AdminUser } from '../../services/auth.service';
import { CreateUserModal } from './CreateUserModal';
import { ModalPortal } from '../../components/ui/ModalPortal';

export const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Modal assigner rôle
  const [assignRoleUser, setAssignRoleUser] = useState<AdminUser | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [assignError, setAssignError] = useState<string | null>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => authService.getUsers({ page, size: 20 }),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['admin-users-search', search],
    queryFn: () => authService.searchUsers(search),
    enabled: search.length >= 2,
  });

  const { data: rolesData = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => authService.getRoles(),
    enabled: !!assignRoleUser,
  });

  const users = search.length >= 2
    ? (Array.isArray(searchResults) ? searchResults : [])
    : (usersData?.content || []);
  const totalPages = usersData?.totalPages ?? 1;

  const assignRoleMutation = useMutation({
    mutationFn: () => authService.assignRole(assignRoleUser!.userId, selectedRoleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAssignRoleUser(null);
      setSelectedRoleName('');
      setAssignError(null);
    },
    onError: (e: any) => setAssignError(e?.response?.data?.message || 'Erreur lors de l\'assignation.'),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Utilisateurs</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Nouvel utilisateur
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
        />
        {search.length === 1 && (
          <p className="text-xs text-gray-400 mt-1">Minimum 2 caractères</p>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-500">Chargement...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Rôles</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user: AdminUser) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{user.userId}</td>
                  <td className="px-4 py-3 text-sm font-medium">{user.email}</td>
                  <td className="px-4 py-3 text-center">
                    {user.accountEnabled ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">Actif</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                        {user.accountLocked ? 'Bloqué' : 'Désactivé'}
                      </span>
                    )}
                    {user.failedLoginAttempts > 0 && (
                      <span className="text-xs text-red-500 ml-2">
                        {user.failedLoginAttempts} échec{user.failedLoginAttempts > 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roleNames?.map(role => (
                        <span key={role} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                          <Shield size={10} />
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setAssignRoleUser(user); setSelectedRoleName(''); setAssignError(null); }}
                      className="px-2 py-1 text-blue-600 hover:text-blue-800 text-xs border border-blue-200 rounded-lg hover:bg-blue-50"
                    >
                      + Rôle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun utilisateur trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !search && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="p-2 border rounded-lg disabled:opacity-50">
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 py-2 text-sm text-gray-600">Page {page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="p-2 border rounded-lg disabled:opacity-50">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal création */}
      {isCreateOpen && (
        <CreateUserModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setIsCreateOpen(false);
          }}
        />
      )}

      {/* Modal assigner rôle — remplace prompt() */}
      {assignRoleUser && (
        <ModalPortal onClose={() => setAssignRoleUser(null)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">Assigner un rôle</h3>
              <p className="text-sm text-gray-500">{assignRoleUser.email}</p>
            </div>
            <button onClick={() => setAssignRoleUser(null)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {assignError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{assignError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôle à assigner *</label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {rolesData.map((role: any) => (
                  <label key={role.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                      selectedRoleName === role.name
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input type="radio" name="role" value={role.name}
                      checked={selectedRoleName === role.name}
                      onChange={() => setSelectedRoleName(role.name)}
                      className="rounded-full" />
                    <div>
                      <p className="font-medium">{role.displayName || role.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{role.name}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setAssignRoleUser(null)} className="flex-1 px-4 py-2 border rounded-lg text-gray-700">
                Annuler
              </button>
              <button
                onClick={() => assignRoleMutation.mutate()}
                disabled={!selectedRoleName || assignRoleMutation.isPending}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {assignRoleMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : '+ Assigner'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};