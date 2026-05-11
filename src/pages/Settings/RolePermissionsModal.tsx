import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, CheckSquare, Square, Shield } from 'lucide-react';
import { authService } from '../../services/auth.service';
import type { Role, Permission } from '../../services/auth.service';
import { ModalPortal } from '../../components/ui/ModalPortal';

interface RolePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
}

export const RolePermissionsModal: React.FC<RolePermissionsModalProps> = ({ isOpen, onClose, role }) => {
  const queryClient = useQueryClient();
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => authService.getPermissions({ activeOnly: true, size: 200 }),
    enabled: isOpen,
  });

  const permissions: Permission[] = permissionsData?.content || [];

  // Grouper par module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  useEffect(() => {
    if (isOpen) {
      // Pré-charger les permissions existantes du rôle si disponible depuis l'API
      setSelectedPermissions([]);
      setError(null);
    }
  }, [isOpen]);

  const updateMutation = useMutation({
    mutationFn: () => authService.updateRolePermissions(role.id, selectedPermissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Erreur lors de la mise à jour.');
    },
  });

  const togglePermission = (fullName: string) => {
    setSelectedPermissions(prev =>
      prev.includes(fullName) ? prev.filter(p => p !== fullName) : [...prev, fullName]
    );
  };

  const toggleModule = (module: string) => {
    const modulePerms = groupedPermissions[module].map(p => p.fullPermissionName);
    const allSelected = modulePerms.every(p => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !modulePerms.includes(p)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...modulePerms])]);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="3xl">
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">Permissions du rôle</h3>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
            <Shield size={14} />
            {role.displayName || role.name}
          </p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
            <p className="text-sm text-gray-500">Chargement des permissions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([module, perms]) => {
              const allSelected = perms.every(p => selectedPermissions.includes(p.fullPermissionName));
              const someSelected = perms.some(p => selectedPermissions.includes(p.fullPermissionName));
              return (
                <div key={module} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleModule(module)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    <span className="font-semibold text-sm text-gray-700">{module}</span>
                    <span className="text-gray-400">
                      {allSelected ? <CheckSquare size={16} className="text-primary-600" /> :
                       someSelected ? <Square size={16} className="text-yellow-500" /> :
                       <Square size={16} />}
                    </span>
                  </button>
                  <div className="p-3 grid grid-cols-2 gap-2">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
                          selectedPermissions.includes(perm.fullPermissionName)
                            ? 'bg-primary-50 text-primary-700'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm.fullPermissionName)}
                          onChange={() => togglePermission(perm.fullPermissionName)}
                          className="rounded"
                        />
                        <div>
                          <p className="font-medium">{perm.fullPermissionName}</p>
                          {perm.displayName && (
                            <p className="text-xs text-gray-400">{perm.displayName}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white py-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
};