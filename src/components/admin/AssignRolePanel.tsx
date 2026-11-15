import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../../services/auth.service";
import type { AdminUser } from "../../services/auth.service";
import { PanelForm } from "../subscription/kit";
import { apiMessage } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { RoleTiles } from "./RoleTiles";

export const AssignRolePanel: React.FC<{ user: AdminUser; onClose: () => void }> = ({ user, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => authService.getRoles(),
  });

  const assignMutation = useMutation({
    mutationFn: () => authService.assignRole(user.userId, selectedRoleName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`Rôle ${selectedRoleName} assigné à ${user.email}`);
      onClose();
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de l'assignation.")),
  });

  return (
    <PanelForm
      title={`Assigner un rôle à ${user.email}`}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        assignMutation.mutate();
      }}
      onCancel={onClose}
      pending={assignMutation.isPending}
      submitLabel="Assigner"
      submitDisabled={!selectedRoleName}
      error={error}
    >
      <div className="rounded-2xl bg-gray-50 p-4 sm:p-5">
        <span className="mb-2 block text-xs font-semibold text-gray-600">
          Rôle à assigner <span className="text-[color:var(--logo-pink-dark)]">*</span>
        </span>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <RoleTiles
            roles={roles}
            selected={selectedRoleName ? [selectedRoleName] : []}
            onToggle={setSelectedRoleName}
          />
        )}
      </div>
    </PanelForm>
  );
};
