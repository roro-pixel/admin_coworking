import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Key } from "lucide-react";
import { authService } from "../../services/auth.service";
import type { Permission } from "../../services/auth.service";
import { GroupsSkeleton } from "../../components/ui/Skeleton";
import { EmptyState, ListHeader, SearchField, Section, StatusChip } from "../../components/subscription/kit";
import { groupByModule } from "../../components/admin/adminUtils";

export const AdminPermissionsPage: React.FC = () => {
  const [search, setSearch] = useState("");

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => authService.getPermissions({ activeOnly: true, size: 200 }),
  });

  const permissions: Permission[] = permissionsData?.content || [];
  const q = search.toLowerCase();

  const filteredPermissions = permissions.filter(
    (perm) =>
      perm.fullPermissionName.toLowerCase().includes(q) ||
      perm.displayName?.toLowerCase().includes(q) ||
      perm.module.toLowerCase().includes(q),
  );

  const grouped = groupByModule(filteredPermissions);

  return (
    <div className="space-y-4">
      <ListHeader
        title="Permissions"
        subtitle={`${permissions.length} permission${permissions.length > 1 ? "s" : ""}`}
      />

      <SearchField value={search} onChange={setSearch} placeholder="Rechercher par nom, module, action..." />

      {isLoading ? (
        <GroupsSkeleton />
      ) : filteredPermissions.length === 0 ? (
        <EmptyState icon={Key} title="Aucune permission trouvée" />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([module, perms]) => (
            <Section
              key={module}
              title={module}
              description={`${perms.length} permission${perms.length > 1 ? "s" : ""}`}
              icon={Key}
            >
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {perms.map((perm) => (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-gray-900">
                        {perm.fullPermissionName}
                      </p>
                      {perm.displayName && <p className="mt-0.5 truncate text-xs text-gray-400">{perm.displayName}</p>}
                    </div>
                    {!perm.isActive && <StatusChip tone="danger">Inactif</StatusChip>}
                  </div>
                ))}
              </div>
            </Section>
          ))}
        </div>
      )}
    </div>
  );
};
