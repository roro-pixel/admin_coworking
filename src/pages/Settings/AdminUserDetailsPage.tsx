// src/pages/admin/AdminUserDetailsPage.tsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Clock,
  Key,
  Shield,
  AlertCircle,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Hash,
  IdCard,
  User,
  CalendarDays,
  Activity,
  Fingerprint,
} from "lucide-react";
import { authService } from "../../services/auth.service";
import { ModalPortal } from "../../components/ui/ModalPortal";
import { AdminLayout } from "../../components/layout/AdminLayout";

interface UserDetails {
  id: number;
  userId: string;
  email: string;
  accountEnabled: boolean;
  accountLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  failedLoginAttempts: number;
  roleNames?: string[];
  authorities?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  lastPasswordChangeAt?: string;
}

export const AdminUserDetailsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState<{
    generatedPassword?: string;
  } | null>(null);
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data: usersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => authService.getUsers({ page: 0, size: 100 }),
    enabled: !!userId,
    select: (data) => {
      const user = data.content.find((u: any) => u.userId === userId);
      return user as UserDetails | undefined;
    },
  });

  const user = usersData;

  const resetPasswordMutation = useMutation({
    mutationFn: () => authService.resetPassword(userId!, true),
    onSuccess: (data) => {
      setResetPasswordData(data);
      setShowPasswordModal(true);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      alert(
        err?.response?.data?.message || "Erreur lors de la réinitialisation.",
      );
    },
  });

  const enableUserMutation = useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      authService.enableUser(userId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const unlockUserMutation = useMutation({
    mutationFn: (userId: string) => authService.unlockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getRoleColor = (roleName: string): string => {
    if (roleName.includes("ADMIN")) return "bg-purple-100 text-purple-700";
    if (roleName.includes("MANAGER")) return "bg-blue-100 text-blue-700";
    if (roleName.includes("USER")) return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  const getStatusBadge = () => {
    if (!user) return null;
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

  const handleCopyPassword = () => {
    if (resetPasswordData?.generatedPassword) {
      navigator.clipboard.writeText(resetPasswordData.generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw
              className="animate-spin mx-auto mb-4 text-primary-600"
              size={32}
            />
            <p className="text-gray-500">Chargement des informations...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="bg-red-50 inline-flex p-4 rounded-full mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <p className="text-gray-500">Utilisateur non trouvé</p>
          <button
            onClick={() => navigate("/settings/master?tab=users")}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Retour à la liste
          </button>
        </div>
      </AdminLayout>
    );
  }

  const status = getStatusBadge();
  const StatusIcon = status?.icon;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/settings/master?tab=users")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={18} />
            Retour à la liste
          </button>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Détails utilisateur
              </h1>
              <p className="text-gray-500 mt-1 font-mono text-sm">
                {user.userId}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => resetPasswordMutation.mutate()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Key size={16} />
                Réinitialiser mot de passe
              </button>
              {!user.accountEnabled ? (
                <button
                  onClick={() =>
                    enableUserMutation.mutate({
                      userId: user.userId,
                      enabled: true,
                    })
                  }
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Activer
                </button>
              ) : (
                <button
                  onClick={() =>
                    enableUserMutation.mutate({
                      userId: user.userId,
                      enabled: false,
                    })
                  }
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <XCircle size={16} />
                  Désactiver
                </button>
              )}
              {user.accountLocked && (
                <button
                  onClick={() => unlockUserMutation.mutate(user.userId)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                >
                  <Unlock size={16} />
                  Déverrouiller
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium truncate max-w-48">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Créé le</p>
                <p className="text-sm font-medium">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Dernière connexion</p>
                <p className="text-sm font-medium">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Jamais"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${status?.color
                  .replace("text", "bg")
                  .replace("700", "100")}`}
              >
                {StatusIcon && (
                  <StatusIcon
                    size={18}
                    className={status?.color.replace("bg", "text")}
                  />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Statut</p>
                <p className={`text-sm font-medium ${status?.color}`}>
                  {status?.label}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Tableau propre */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-900">
              Informations détaillées
            </h2>
          </div>
          <div className="divide-y">
            {/* Identifiants */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Hash size={14} />
                  <span>ID utilisateur</span>
                </div>
              </div>
              <div className="p-4">
                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {user.userId}
                </code>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail size={14} />
                  <span>Email</span>
                </div>
              </div>
              <div className="p-4">
                <span className="text-sm">{user.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <User size={14} />
                  <span>Créé par</span>
                </div>
              </div>
              <div className="p-4">
                <span className="text-sm">{user.createdBy || "—"}</span>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarDays size={14} />
                  <span>Date de création</span>
                </div>
              </div>
              <div className="p-4">
                <span className="text-sm">
                  {formatDateTime(user.createdAt)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarDays size={14} />
                  <span>Dernière modification</span>
                </div>
              </div>
              <div className="p-4">
                <span className="text-sm">
                  {formatDateTime(user.updatedAt)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>Dernière connexion</span>
                </div>
              </div>
              <div className="p-4">
                <span className="text-sm">
                  {user.lastLoginAt
                    ? formatDateTime(user.lastLoginAt)
                    : "Jamais"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Key size={14} />
                  <span>Dernier changement mot de passe</span>
                </div>
              </div>
              <div className="p-4">
                <span className="text-sm">
                  {user.lastPasswordChangeAt
                    ? formatDateTime(user.lastPasswordChangeAt)
                    : "—"}
                </span>
              </div>
            </div>

            {/* Statut */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Activity size={14} />
                  <span>Compte activé</span>
                </div>
              </div>
              <div className="p-4">
                {user.accountEnabled ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle size={14} /> Oui
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <XCircle size={14} /> Non
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Lock size={14} />
                  <span>Compte bloqué</span>
                </div>
              </div>
              <div className="p-4">
                {user.accountLocked ? (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <Lock size={14} /> Oui
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle size={14} /> Non
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Activity size={14} />
                  <span>Compte non expiré</span>
                </div>
              </div>
              <div className="p-4">
                {user.accountNonExpired ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle size={14} /> Oui
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-orange-600">
                    <XCircle size={14} /> Non
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Fingerprint size={14} />
                  <span>Identifiants non expirés</span>
                </div>
              </div>
              <div className="p-4">
                {user.credentialsNonExpired ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle size={14} /> Oui
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-orange-600">
                    <XCircle size={14} /> Non
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <AlertCircle size={14} />
                  <span>Tentatives échouées</span>
                </div>
              </div>
              <div className="p-4">
                <span
                  className={`text-sm ${user.failedLoginAttempts > 0 ? "text-orange-600 font-medium" : "text-gray-600"}`}
                >
                  {user.failedLoginAttempts}
                </span>
              </div>
            </div>

            {/* Rôles */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-4 bg-gray-50/50 border-r">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Shield size={14} />
                  <span>Rôles</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1">
                  {user.roleNames && user.roleNames.length > 0 ? (
                    user.roleNames.map((role: string) => (
                      <span
                        key={role}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">
                      Aucun rôle assigné
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions */}
            {user.authorities && user.authorities.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-4 bg-gray-50/50 border-r">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <IdCard size={14} />
                    <span>Permissions</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {user.authorities.map((auth: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-600"
                      >
                        {auth}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal réinitialisation mot de passe */}
      {showPasswordModal && resetPasswordData && (
        <ModalPortal
          onClose={() => {
            setShowPasswordModal(false);
            setResetPasswordData(null);
          }}
        >
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-xl font-bold">Mot de passe réinitialisé</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setResetPasswordData(null);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <XCircle size={20} />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 mb-2">
                Mot de passe temporaire généré :
              </p>
              <div className="flex items-center gap-2 justify-between flex-wrap">
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
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
                  >
                    {showGeneratedPassword ? (
                      <EyeOff size={14} />
                    ) : (
                      <Eye size={14} />
                    )}
                    {showGeneratedPassword ? "Cacher" : "Afficher"}
                  </button>
                  <button
                    onClick={handleCopyPassword}
                    className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
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
                setShowPasswordModal(false);
                setResetPasswordData(null);
              }}
              className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
            >
              Fermer
            </button>
          </div>
        </ModalPortal>
      )}
    </AdminLayout>
  );
};
