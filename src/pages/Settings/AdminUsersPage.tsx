import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Shield,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Mail,
  Calendar,
  AlertCircle,
  MoreVertical,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Key,
  Clock,
  UserCheck,
  UserX,
  Eye,
} from "lucide-react";
import { authService } from "../../services/auth.service";
import type { AdminUser } from "../../services/auth.service";
import { CreateUserModal } from "./CreateUserModal";
import { ModalPortal } from "../../components/ui/ModalPortal";

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionMenuUser, setActionMenuUser] = useState<AdminUser | null>(null);

  // Modal assigner rôle
  const [assignRoleUser, setAssignRoleUser] = useState<AdminUser | null>(null);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  // Modal reset password
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(
    null,
  );
  const [resetPasswordData, setResetPasswordData] = useState<{
    generatedPassword?: string;
  } | null>(null);
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => authService.getUsers({ page, size: 20 }),
  });

  const { data: searchResults } = useQuery({
    queryKey: ["admin-users-search", search],
    queryFn: () => authService.searchUsers(search),
    enabled: search.length >= 2,
  });

  const { data: rolesData = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => authService.getRoles(),
    enabled: !!assignRoleUser,
  });

  const users =
    search.length >= 2
      ? Array.isArray(searchResults)
        ? searchResults
        : []
      : usersData?.content || [];
  const totalPages = usersData?.totalPages ?? 1;

  const assignRoleMutation = useMutation({
    mutationFn: () =>
      authService.assignRole(assignRoleUser!.userId, selectedRoleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setAssignRoleUser(null);
      setSelectedRoleName("");
      setAssignError(null);
    },
    onError: (e: any) =>
      setAssignError(
        e?.response?.data?.message || "Erreur lors de l'assignation.",
      ),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () =>
      authService.resetPassword(resetPasswordUser!.userId, true),
    onSuccess: (data) => {
      setResetPasswordData(data);
    },
    onError: (e: any) => {
      alert(
        e?.response?.data?.message || "Erreur lors de la réinitialisation.",
      );
    },
  });

  const enableUserMutation = useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      authService.enableUser(userId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setActionMenuUser(null);
    },
  });

  const unlockUserMutation = useMutation({
    mutationFn: (userId: string) => authService.unlockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setActionMenuUser(null);
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (user: AdminUser) => {
    if (!user.accountEnabled) {
      return {
        label: "Désactivé",
        color: "bg-gray-100 text-gray-600",
        icon: UserX,
      };
    }
    if (user.accountLocked) {
      return { label: "Bloqué", color: "bg-red-100 text-red-700", icon: Lock };
    }
    return {
      label: "Actif",
      color: "bg-green-100 text-green-700",
      icon: UserCheck,
    };
  };

  const handleViewDetails = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/settings/users/${userId}`);
  };

  const handleRowClick = (userId: string) => {
    navigate(`/settings/users/${userId}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Utilisateurs</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {users.length > 0 &&
              `${users.length} utilisateur${users.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Nouvel utilisateur
        </button>
      </div>

      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Rechercher par email, ID utilisateur..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Activité
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                    Rôles
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user: AdminUser) => {
                  const status = getStatusBadge(user);
                  const StatusIcon = status.icon;
                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(user.userId)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <Mail size={14} className="text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.email.split("@")[0]}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {user.userId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <Mail size={12} className="text-gray-400" />
                            <span className="font-mono text-xs">
                              {user.email}
                            </span>
                          </div>
                          {user.createdBy && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <UserCheck size={10} />
                              <span>Créé par: {user.createdBy}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {user.createdAt && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar size={12} />
                              <span>Créé: {formatDate(user.createdAt)}</span>
                            </div>
                          )}
                          {user.lastLoginAt && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock size={12} />
                              <span>
                                Dernière connexion:{" "}
                                {formatDate(user.lastLoginAt)}
                              </span>
                            </div>
                          )}
                          {user.lastPasswordChangeAt && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Key size={10} />
                              <span>
                                Mot de passe changé:{" "}
                                {formatDate(user.lastPasswordChangeAt)}
                              </span>
                            </div>
                          )}
                          {user.failedLoginAttempts > 0 && (
                            <div className="flex items-center gap-1 text-xs text-orange-600">
                              <AlertCircle size={12} />
                              <span>
                                {user.failedLoginAttempts} tentative
                                {user.failedLoginAttempts > 1 ? "s" : ""}{" "}
                                échouée{user.failedLoginAttempts > 1 ? "s" : ""}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}
                          >
                            <StatusIcon size={10} />
                            {status.label}
                          </span>
                          {!user.accountNonExpired && (
                            <span className="text-xs text-orange-500">
                              Compte expiré
                            </span>
                          )}
                          {!user.credentialsNonExpired && (
                            <span className="text-xs text-orange-500">
                              Mot de passe expiré
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.roleNames?.length > 0 ? (
                            user.roleNames.map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
                              >
                                <Shield size={10} />
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">
                              Aucun rôle
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => handleViewDetails(user.userId, e)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye size={16} />
                          </button>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuUser(
                                  actionMenuUser?.id === user.id ? null : user,
                                );
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {actionMenuUser?.id === user.id && (
                              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-10">
                                <div className="py-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAssignRoleUser(user);
                                      setActionMenuUser(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Shield size={14} />
                                    Assigner un rôle
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setResetPasswordUser(user);
                                      setResetPasswordData(null);
                                      setActionMenuUser(null);
                                      resetPasswordMutation.mutate();
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Key size={14} />
                                    Réinitialiser mot de passe
                                  </button>
                                  <hr className="my-1" />
                                  {!user.accountEnabled ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        enableUserMutation.mutate({
                                          userId: user.userId,
                                          enabled: true,
                                        });
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                    >
                                      <CheckCircle size={14} />
                                      Activer
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        enableUserMutation.mutate({
                                          userId: user.userId,
                                          enabled: false,
                                        });
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                      <XCircle size={14} />
                                      Désactiver
                                    </button>
                                  )}
                                  {user.accountLocked && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        unlockUserMutation.mutate(user.userId);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                    >
                                      <Unlock size={14} />
                                      Déverrouiller
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 py-2 text-sm text-gray-600">
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
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
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            setIsCreateOpen(false);
          }}
        />
      )}

      {/* Modal assigner rôle */}
      {assignRoleUser && (
        <ModalPortal onClose={() => setAssignRoleUser(null)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">Assigner un rôle</h3>
              <p className="text-sm text-gray-500">{assignRoleUser.email}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                {assignRoleUser.userId}
              </p>
            </div>
            <button
              onClick={() => setAssignRoleUser(null)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {assignError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {assignError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rôle à assigner *
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {rolesData.map((role: any) => (
                  <label
                    key={role.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                      selectedRoleName === role.name
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.name}
                      checked={selectedRoleName === role.name}
                      onChange={() => setSelectedRoleName(role.name)}
                      className="rounded-full"
                    />
                    <div>
                      <p className="font-medium">
                        {role.displayName || role.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        {role.name}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAssignRoleUser(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => assignRoleMutation.mutate()}
                disabled={!selectedRoleName || assignRoleMutation.isPending}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {assignRoleMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  "+ Assigner"
                )}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal reset password */}
      {resetPasswordUser && resetPasswordData && (
        <ModalPortal
          onClose={() => {
            setResetPasswordUser(null);
            setResetPasswordData(null);
          }}
        >
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">Mot de passe réinitialisé</h3>
              <p className="text-sm text-gray-500">{resetPasswordUser.email}</p>
            </div>
            <button
              onClick={() => {
                setResetPasswordUser(null);
                setResetPasswordData(null);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-2">
                Mot de passe temporaire généré :
              </p>
              <div className="flex items-center gap-2 justify-between">
                <code className="text-xl font-mono bg-white px-3 py-2 rounded border">
                  {showGeneratedPassword
                    ? resetPasswordData.generatedPassword
                    : "••••••••"}
                </code>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setShowGeneratedPassword(!showGeneratedPassword)
                    }
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    {showGeneratedPassword ? "Cacher" : "Afficher"}
                  </button>
                  <button
                    onClick={() => {
                      if (resetPasswordData.generatedPassword) {
                        navigator.clipboard.writeText(
                          resetPasswordData.generatedPassword,
                        );
                      }
                    }}
                    className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Copier
                  </button>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Ce mot de passe ne sera plus affiché. L'utilisateur devra le
              changer lors de sa prochaine connexion.
            </p>
            <button
              onClick={() => {
                setResetPasswordUser(null);
                setResetPasswordData(null);
              }}
              className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
            >
              Fermer
            </button>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
