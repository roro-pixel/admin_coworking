import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Key, Plus, Shield, Unlock, UserCheck, UserX, Users } from "lucide-react";
import { authService } from "../../services/auth.service";
import type { AdminUser } from "../../services/auth.service";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import {
  ActionButton,
  DataCard,
  EmptyState,
  HeadRow,
  IconButton,
  ListHeader,
  Pagination,
  SearchField,
  StatusChip,
  Tag,
} from "../../components/subscription/kit";
import { ROW_HOVER, apiMessage, formatDateTime, initials } from "../../components/subscription/kitUtils";
import { CreateUserPanel } from "../../components/admin/CreateUserPanel";
import { AssignRolePanel } from "../../components/admin/AssignRolePanel";
import { CredentialsPanel } from "../../components/admin/CredentialsPanel";
import { MIN_SEARCH, userStatus } from "../../components/admin/adminUtils";

const COLS =
  "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_12rem]";

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignRoleUser, setAssignRoleUser] = useState<AdminUser | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password?: string } | null>(null);

  const searching = search.length >= MIN_SEARCH;

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => authService.getUsers({ page, size: 20 }),
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["admin-users-search", search],
    queryFn: () => authService.searchUsers(search),
    enabled: searching,
  });

  const users: AdminUser[] = searching
    ? Array.isArray(searchResults)
      ? searchResults
      : []
    : usersData?.content || [];
  const totalPages = usersData?.totalPages ?? 1;
  const loading = searching ? searchLoading : isLoading;

  const resetPasswordMutation = useMutation({
    mutationFn: (user: AdminUser) => authService.resetPassword(user.userId, true),
    onSuccess: (data, user) => {
      setCredentials({ email: user.email, password: data.generatedPassword });
    },
  });

  const enableUserMutation = useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      authService.enableUser(userId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const unlockUserMutation = useMutation({
    mutationFn: (userId: string) => authService.unlockUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const askReset = (user: AdminUser) =>
    toast.confirm({
      message: `Réinitialiser le mot de passe de ${user.email} ?`,
      detail: "Un nouveau mot de passe temporaire sera généré. L'ancien ne fonctionnera plus.",
      confirmLabel: "Réinitialiser",
      tone: "primary",
      successMessage: "Mot de passe réinitialisé",
      errorMessage: "Erreur lors de la réinitialisation.",
      onConfirm: () => resetPasswordMutation.mutateAsync(user),
    });

  const askDisable = (user: AdminUser) =>
    toast.confirm({
      message: `Désactiver le compte de ${user.email} ?`,
      detail: "L'utilisateur ne pourra plus se connecter.",
      confirmLabel: "Désactiver",
      successMessage: "Compte désactivé",
      onConfirm: () => enableUserMutation.mutateAsync({ userId: user.userId, enabled: false }),
    });

  const enable = (user: AdminUser) =>
    enableUserMutation
      .mutateAsync({ userId: user.userId, enabled: true })
      .then(() => toast.success("Compte activé"))
      .catch((e) => toast.error(apiMessage(e, "Erreur lors de l'activation")));

  const unlock = (user: AdminUser) =>
    unlockUserMutation
      .mutateAsync(user.userId)
      .then(() => toast.success("Compte déverrouillé"))
      .catch((e) => toast.error(apiMessage(e, "Erreur lors du déverrouillage")));

  const busy = (mutation: { isPending: boolean; variables?: unknown }, key: string) =>
    mutation.isPending &&
    (typeof mutation.variables === "string"
      ? mutation.variables === key
      : (mutation.variables as { userId?: string } | undefined)?.userId === key);

  const open = (userId: string) => navigate(`/settings/users/${userId}`);

  return (
    <div className="space-y-4">
      <ListHeader
        title="Utilisateurs"
        subtitle={users.length > 0 ? `${users.length} utilisateur${users.length > 1 ? "s" : ""}` : undefined}
        action={
          !isCreateOpen && (
            <ActionButton icon={Plus} onClick={() => setIsCreateOpen(true)}>
              Nouvel utilisateur
            </ActionButton>
          )
        }
      />

      <div>
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Rechercher par email, ID utilisateur..."
        />
        {search.length === 1 && <p className="mt-1.5 px-2 text-xs text-gray-400">Minimum 2 caractères</p>}
      </div>

      {isCreateOpen && (
        <CreateUserPanel
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
        />
      )}

      {assignRoleUser && <AssignRolePanel user={assignRoleUser} onClose={() => setAssignRoleUser(null)} />}

      {credentials && (
        <CredentialsPanel
          title="Mot de passe réinitialisé"
          subtitle={credentials.email}
          password={credentials.password}
          note="Ce mot de passe ne sera plus affiché. L'utilisateur devra le changer lors de sa prochaine connexion."
          onClose={() => setCredentials(null)}
        />
      )}

      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Aucun utilisateur trouvé" />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>Utilisateur</span>
            <span>Email</span>
            <span>Activité</span>
            <span>Statut</span>
            <span>Rôles</span>
            <span />
          </HeadRow>

          <div className="space-y-2">
            {users.map((user) => {
              const status = userStatus(user);
              const roles = user.roleNames ?? [];
              const name = user.email.split("@")[0];
              const statusBlock = (
                <div className="flex flex-col items-start gap-1">
                  <StatusChip tone={status.tone}>{status.label}</StatusChip>
                  {user.accountNonExpired === false && <span className="text-xs text-amber-600">Compte expiré</span>}
                  {user.credentialsNonExpired === false && (
                    <span className="text-xs text-amber-600">Mot de passe expiré</span>
                  )}
                </div>
              );
              const rolesBlock =
                roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {roles.map((role) => (
                      <Tag key={role}>{role}</Tag>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Aucun rôle</span>
                );
              const activity = (
                <div className="space-y-0.5 text-xs text-gray-500">
                  {user.createdAt && <p>Créé le {formatDateTime(user.createdAt)}</p>}
                  {user.lastLoginAt && <p>Connexion le {formatDateTime(user.lastLoginAt)}</p>}
                  {user.lastPasswordChangeAt && (
                    <p className="text-gray-400">Mot de passe changé le {formatDateTime(user.lastPasswordChangeAt)}</p>
                  )}
                  {user.failedLoginAttempts > 0 && (
                    <p className="text-amber-600">
                      {user.failedLoginAttempts} tentative{user.failedLoginAttempts > 1 ? "s" : ""} échouée
                      {user.failedLoginAttempts > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              );
              const actions = (
                <>
                  <IconButton icon={Eye} label="Voir les détails" onClick={() => open(user.userId)} />
                  <IconButton icon={Shield} label="Assigner un rôle" onClick={() => setAssignRoleUser(user)} />
                  <IconButton
                    icon={Key}
                    label="Réinitialiser le mot de passe"
                    disabled={resetPasswordMutation.isPending}
                    onClick={() => askReset(user)}
                  />
                  {user.accountEnabled ? (
                    <IconButton
                      icon={UserX}
                      label="Désactiver"
                      tone="danger"
                      pending={busy(enableUserMutation, user.userId)}
                      onClick={() => askDisable(user)}
                    />
                  ) : (
                    <IconButton
                      icon={UserCheck}
                      label="Activer"
                      tone="success"
                      pending={busy(enableUserMutation, user.userId)}
                      onClick={() => enable(user)}
                    />
                  )}
                  {user.accountLocked && (
                    <IconButton
                      icon={Unlock}
                      label="Déverrouiller"
                      pending={busy(unlockUserMutation, user.userId)}
                      onClick={() => unlock(user)}
                    />
                  )}
                </>
              );
              return (
                <div key={user.id} className={`rounded-2xl bg-gray-50 p-3 ${ROW_HOVER}`}>
                  {/* Desktop */}
                  <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                    <button
                      type="button"
                      onClick={() => open(user.userId)}
                      className="flex min-w-0 items-center gap-3 rounded-xl text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--logo-pink)_22%,white)] text-xs font-bold text-[color:var(--logo-pink-dark)]">
                        {initials(name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900">{name}</span>
                        <span className="block truncate font-mono text-xs text-gray-400">{user.userId}</span>
                      </span>
                    </button>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-gray-700">{user.email}</p>
                      {user.createdBy && <p className="mt-0.5 truncate text-xs text-gray-400">Créé par {user.createdBy}</p>}
                    </div>
                    {activity}
                    {statusBlock}
                    {rolesBlock}
                    <div className="flex flex-wrap justify-end gap-0.5">{actions}</div>
                  </div>

                  {/* Mobile et tablette */}
                  <div className="lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => open(user.userId)}
                        className="flex min-w-0 items-center gap-3 text-left"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--logo-pink)_22%,white)] text-xs font-bold text-[color:var(--logo-pink-dark)]">
                          {initials(name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-gray-900">{name}</span>
                          <span className="block truncate font-mono text-xs text-gray-500">{user.email}</span>
                        </span>
                      </button>
                      {statusBlock}
                    </div>
                    <div className="mt-3">{rolesBlock}</div>
                    <div className="mt-3">{activity}</div>
                    <div className="mt-3 flex flex-wrap justify-end gap-0.5">{actions}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </DataCard>
      )}

      {!searching && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={usersData?.totalElements ?? users.length}
          noun="utilisateur"
          onChange={setPage}
        />
      )}
    </div>
  );
};
