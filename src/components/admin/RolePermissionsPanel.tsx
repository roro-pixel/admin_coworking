import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus } from "lucide-react";
import { authService } from "../../services/auth.service";
import type { Permission, Role } from "../../services/auth.service";
import { PanelForm } from "../subscription/kit";
import { FOCUS, apiMessage } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { groupByModule } from "./adminUtils";

const Box: React.FC<{ state: "all" | "some" | "none" }> = ({ state }) => (
  <span
    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
      state === "none"
        ? "border-gray-300 bg-white"
        : "border-[color:var(--logo-pink-dark)] bg-[color:var(--logo-pink-dark)] text-white"
    }`}
  >
    {state === "all" && <Check size={12} strokeWidth={3} />}
    {state === "some" && <Minus size={12} strokeWidth={3} />}
  </span>
);

export const RolePermissionsPanel: React.FC<{ role: Role; onClose: () => void }> = ({ role, onClose }) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => authService.getPermissions({ activeOnly: true, size: 200 }),
  });

  const { data: current, isLoading: currentLoading } = useQuery({
    queryKey: ["admin-role-permissions", role.id],
    queryFn: () => authService.getRolePermissions(role.id),
  });

  useEffect(() => {
    if (current) setSelected(current.map((p) => p.fullPermissionName));
  }, [current]);

  const permissions: Permission[] = permissionsData?.content || [];
  const grouped = useMemo(() => groupByModule(permissions), [permissions]);

  const updateMutation = useMutation({
    mutationFn: () => authService.updateRolePermissions(role.id, selected),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-role-permissions", role.id] });
      toast.success(`Permissions du rôle ${role.displayName || role.name} enregistrées`);
      onClose();
    },
    onError: (err: unknown) => setError(apiMessage(err, "Erreur lors de la mise à jour.")),
  });

  const toggle = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));

  const toggleModule = (module: string) => {
    const names = grouped[module].map((p) => p.fullPermissionName);
    const all = names.every((n) => selected.includes(n));
    setSelected((prev) => (all ? prev.filter((p) => !names.includes(p)) : [...new Set([...prev, ...names])]));
  };

  const loading = isLoading || currentLoading;

  return (
    <PanelForm
      title={`Permissions du rôle ${role.displayName || role.name}`}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        updateMutation.mutate();
      }}
      onCancel={onClose}
      pending={updateMutation.isPending}
      submitLabel="Enregistrer"
      submitDisabled={loading}
      error={error}
    >
      {loading ? (
        <div role="status" aria-label="Chargement des permissions" className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {selected.length} permission{selected.length > 1 ? "s" : ""} sélectionnée
            {selected.length > 1 ? "s" : ""}
          </p>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {Object.entries(grouped).map(([module, perms]) => {
              const count = perms.filter((p) => selected.includes(p.fullPermissionName)).length;
              const state = count === perms.length ? "all" : count > 0 ? "some" : "none";
              return (
                <div key={module} className="rounded-2xl bg-gray-50 p-3">
                  <button
                    type="button"
                    onClick={() => toggleModule(module)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-gray-100 ${FOCUS}`}
                  >
                    <span className="text-sm font-bold text-gray-900">
                      {module}
                      <span className="ml-2 text-xs font-medium text-gray-400">
                        {count} / {perms.length}
                      </span>
                    </span>
                    <Box state={state} />
                  </button>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {perms.map((perm) => {
                      const on = selected.includes(perm.fullPermissionName);
                      return (
                        <button
                          key={perm.id}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => toggle(perm.fullPermissionName)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left shadow-sm transition ${FOCUS} ${
                            on
                              ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_18%,white)]"
                              : "bg-white hover:bg-gray-50"
                          }`}
                        >
                          <Box state={on ? "all" : "none"} />
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-xs font-semibold text-gray-900">
                              {perm.fullPermissionName}
                            </span>
                            {perm.displayName && (
                              <span className="block truncate text-xs text-gray-400">{perm.displayName}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PanelForm>
  );
};
