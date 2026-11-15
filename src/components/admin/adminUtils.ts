import type { AdminUser, Permission } from "../../services/auth.service";
import type { Tone } from "../subscription/kitUtils";

export interface UserDetails extends AdminUser {
  authorities?: string[];
  updatedAt?: string;
}

export const userStatus = (u: Pick<AdminUser, "accountEnabled" | "accountLocked">): { label: string; tone: Tone } => {
  if (!u.accountEnabled) return { label: "Désactivé", tone: "neutral" };
  if (u.accountLocked) return { label: "Bloqué", tone: "danger" };
  return { label: "Actif", tone: "success" };
};

export const MIN_SEARCH = 2;

export const groupByModule = (perms: Permission[]): Record<string, Permission[]> =>
  perms.reduce(
    (acc, perm) => {
      if (!acc[perm.module]) acc[perm.module] = [];
      acc[perm.module].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );
