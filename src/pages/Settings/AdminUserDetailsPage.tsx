import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Key, Unlock, UserCheck, UserX } from "lucide-react";
import { authService } from "../../services/auth.service";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { brandVars } from "../../components/layout/adminTheme";
import { Toaster } from "../../components/ui/Toaster";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import {
  ActionButton,
  Detail,
  EmptyState,
  PageHeader,
  Section,
  StatusChip,
  Tag,
} from "../../components/subscription/kit";
import { apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { CredentialsPanel } from "../../components/admin/CredentialsPanel";
import { userStatus } from "../../components/admin/adminUtils";
import type { UserDetails } from "../../components/admin/adminUtils";

const BACK = "/settings/master?tab=users";

const YesNo: React.FC<{ value: boolean; good: boolean; badTone?: "danger" | "warn" }> = ({
  value,
  good,
  badTone = "danger",
}) => <StatusChip tone={value === good ? "success" : badTone}>{value ? "Oui" : "Non"}</StatusChip>;

export const AdminUserDetailsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState<{ value?: string } | null>(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => authService.getUsers({ page: 0, size: 100 }),
    enabled: !!userId,
    select: (data) => data.content.find((u) => u.userId === userId) as UserDetails | undefined,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const resetPasswordMutation = useMutation({
    mutationFn: () => authService.resetPassword(userId!, true),
    onSuccess: (data) => setPassword({ value: data.generatedPassword }),
  });

  const enableUserMutation = useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      authService.enableUser(userId, enabled),
    onSuccess: refresh,
  });

  const unlockUserMutation = useMutation({
    mutationFn: (id: string) => authService.unlockUser(id),
    onSuccess: refresh,
  });

  const shell = (children: React.ReactNode) => (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        {children}
        <Toaster />
      </div>
    </AdminLayout>
  );

  if (isLoading) return shell(<DetailsSkeleton />);

  if (!user) {
    return shell(
      <EmptyState
        icon={UserX}
        title="Utilisateur non trouvé"
        action={<ActionButton onClick={() => navigate(BACK)}>Retour à la liste</ActionButton>}
      />,
    );
  }

  const status = userStatus(user);

  const askReset = () =>
    toast.confirm({
      message: `Réinitialiser le mot de passe de ${user.email} ?`,
      detail: "Un nouveau mot de passe temporaire sera généré. L'ancien ne fonctionnera plus.",
      confirmLabel: "Réinitialiser",
      tone: "primary",
      successMessage: "Mot de passe réinitialisé",
      errorMessage: "Erreur lors de la réinitialisation.",
      onConfirm: () => resetPasswordMutation.mutateAsync(),
    });

  const askDisable = () =>
    toast.confirm({
      message: `Désactiver le compte de ${user.email} ?`,
      detail: "L'utilisateur ne pourra plus se connecter.",
      confirmLabel: "Désactiver",
      successMessage: "Compte désactivé",
      onConfirm: () => enableUserMutation.mutateAsync({ userId: user.userId, enabled: false }),
    });

  const enable = () =>
    enableUserMutation
      .mutateAsync({ userId: user.userId, enabled: true })
      .then(() => toast.success("Compte activé"))
      .catch((e) => toast.error(apiMessage(e, "Erreur lors de l'activation")));

  const unlock = () =>
    unlockUserMutation
      .mutateAsync(user.userId)
      .then(() => toast.success("Compte déverrouillé"))
      .catch((e) => toast.error(apiMessage(e, "Erreur lors du déverrouillage")));

  const roles = user.roleNames ?? [];
  const authorities = user.authorities ?? [];

  return shell(
    <>
      <PageHeader
        title="Détails utilisateur"
        subtitle={<span className="font-mono text-xs">{user.userId}</span>}
        onBack={() => navigate(BACK)}
        backLabel="Retour à la liste"
        badge={<StatusChip tone={status.tone}>{status.label}</StatusChip>}
        actions={
          <>
            <ActionButton
              variant="ghost"
              icon={Key}
              disabled={resetPasswordMutation.isPending}
              onClick={askReset}
            >
              Réinitialiser le mot de passe
            </ActionButton>
            {user.accountEnabled ? (
              <ActionButton
                variant="danger"
                icon={UserX}
                pending={enableUserMutation.isPending}
                onClick={askDisable}
              >
                Désactiver
              </ActionButton>
            ) : (
              <ActionButton icon={UserCheck} pending={enableUserMutation.isPending} onClick={enable}>
                Activer
              </ActionButton>
            )}
            {user.accountLocked && (
              <ActionButton
                variant="ghost"
                icon={Unlock}
                pending={unlockUserMutation.isPending}
                onClick={unlock}
              >
                Déverrouiller
              </ActionButton>
            )}
          </>
        }
      />

      <div className="space-y-4">
        {password && (
          <CredentialsPanel
            title="Mot de passe réinitialisé"
            subtitle={user.email}
            password={password.value}
            note="Ce mot de passe ne sera plus affiché. L'utilisateur devra le changer lors de sa prochaine connexion."
            onClose={() => setPassword(null)}
          />
        )}

        <Section title="Identité">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail label="ID utilisateur" mono>
              {user.userId}
            </Detail>
            <Detail label="Email">{user.email}</Detail>
            <Detail label="Créé par">{user.createdBy}</Detail>
            <Detail label="Date de création">{formatDateTime(user.createdAt)}</Detail>
            <Detail label="Dernière modification">{formatDateTime(user.updatedAt)}</Detail>
            <Detail label="Dernière connexion">
              {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Jamais"}
            </Detail>
            <Detail label="Dernier changement de mot de passe">{formatDateTime(user.lastPasswordChangeAt)}</Detail>
          </div>
        </Section>

        <Section title="Sécurité du compte">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Detail label="Compte activé">
              <YesNo value={user.accountEnabled} good />
            </Detail>
            <Detail label="Compte bloqué">
              <YesNo value={user.accountLocked} good={false} />
            </Detail>
            <Detail label="Compte non expiré">
              <YesNo value={user.accountNonExpired ?? true} good badTone="warn" />
            </Detail>
            <Detail label="Identifiants non expirés">
              <YesNo value={user.credentialsNonExpired ?? true} good badTone="warn" />
            </Detail>
            <Detail label="Tentatives de connexion échouées">
              <span className={user.failedLoginAttempts > 0 ? "text-amber-600" : ""}>
                {user.failedLoginAttempts}
              </span>
            </Detail>
          </div>
        </Section>

        <Section title="Accès">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-400">Rôles</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Tag key={role} tone={role.includes("ADMIN") ? "pink" : "gray"}>
                      {role}
                    </Tag>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">Aucun rôle assigné</span>
                )}
              </div>
            </div>
            {authorities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400">Permissions</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {authorities.map((auth) => (
                    <span
                      key={auth}
                      className="inline-flex rounded-full bg-white px-2.5 py-1 font-mono text-xs text-gray-600 shadow-sm"
                    >
                      {auth}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      </div>
    </>,
  );
};
