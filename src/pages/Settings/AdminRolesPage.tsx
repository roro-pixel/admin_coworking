import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings, Shield } from "lucide-react";
import { authService } from "../../services/auth.service";
import type { Role } from "../../services/auth.service";
import { TableSkeleton } from "../../components/ui/Skeleton";
import {
  ActionButton,
  DataCard,
  EmptyState,
  HeadRow,
  ListHeader,
  SearchField,
} from "../../components/subscription/kit";
import { PINK_SOFT, ROW_HOVER } from "../../components/subscription/kitUtils";
import { RolePermissionsPanel } from "../../components/admin/RolePermissionsPanel";

const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,2fr)_13rem]";

export const AdminRolesPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => authService.getRoles(),
  });

  const q = search.toLowerCase();
  const filteredRoles = roles.filter(
    (role) => role.name.toLowerCase().includes(q) || (role.displayName && role.displayName.toLowerCase().includes(q)),
  );

  return (
    <div className="space-y-4">
      <ListHeader
        title="Rôles"
        subtitle={roles.length > 0 ? `${roles.length} rôle${roles.length > 1 ? "s" : ""}` : undefined}
      />

      {selectedRole ? (
        <RolePermissionsPanel key={selectedRole.id} role={selectedRole} onClose={() => setSelectedRole(null)} />
      ) : (
        <>
          <SearchField value={search} onChange={setSearch} placeholder="Rechercher un rôle..." />

          {isLoading ? (
            <TableSkeleton rows={6} cols={4} />
          ) : filteredRoles.length === 0 ? (
            <EmptyState icon={Shield} title="Aucun rôle trouvé" />
          ) : (
            <DataCard>
              <HeadRow cols={COLS}>
                <span>Rôle</span>
                <span>Nom</span>
                <span>Description</span>
                <span />
              </HeadRow>
              <div className="space-y-2">
                {filteredRoles.map((role) => {
                  const manage = (
                    <ActionButton variant="ghost" icon={Settings} onClick={() => setSelectedRole(role)}>
                      Gérer les permissions
                    </ActionButton>
                  );
                  return (
                    <div key={role.id} className={`rounded-2xl bg-gray-50 p-3 ${ROW_HOVER}`}>
                      <div className={`hidden items-center gap-4 px-1 lg:grid ${COLS}`}>
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
                          >
                            <Shield size={16} />
                          </span>
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {role.displayName || role.name}
                          </span>
                        </div>
                        <span className="truncate font-mono text-xs text-gray-600">{role.name}</span>
                        <span className="text-sm text-gray-500">{role.description}</span>
                        <div className="flex justify-end">{manage}</div>
                      </div>

                      <div className="lg:hidden">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
                          >
                            <Shield size={17} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">{role.displayName || role.name}</p>
                            <p className="truncate font-mono text-xs text-gray-500">{role.name}</p>
                          </div>
                        </div>
                        {role.description && <p className="mt-2 text-sm text-gray-500">{role.description}</p>}
                        <div className="mt-3 flex justify-end">{manage}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DataCard>
          )}
        </>
      )}
    </div>
  );
};
