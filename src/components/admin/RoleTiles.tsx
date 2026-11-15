import React from "react";
import { FOCUS } from "../subscription/kitUtils";
import type { Role } from "../../services/auth.service";

export const RoleTiles: React.FC<{
  roles: Role[];
  selected: string[];
  multiple?: boolean;
  onToggle: (roleName: string) => void;
  empty?: string;
}> = ({ roles, selected, multiple, onToggle, empty = "Aucun rôle disponible" }) => {
  if (roles.length === 0) return <p className="text-sm text-gray-400">{empty}</p>;
  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2"
    >
      {roles.map((role) => {
        const on = selected.includes(role.name);
        return (
          <button
            key={role.id}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={on}
            onClick={() => onToggle(role.name)}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-sm transition ${FOCUS} ${
              on
                ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_18%,white)] ring-2 ring-[color:var(--logo-pink)]"
                : "bg-white hover:bg-gray-50"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 ${
                multiple ? "rounded-md" : "rounded-full"
              } ${on ? "border-[color:var(--logo-pink-dark)] bg-[color:var(--logo-pink-dark)]" : "border-gray-300 bg-white"}`}
            >
              {on && <span className={`h-2 w-2 bg-white ${multiple ? "rounded-sm" : "rounded-full"}`} />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900">
                {role.displayName || role.name}
              </span>
              <span className="block truncate text-xs text-gray-400">
                {multiple ? role.description || role.name : role.name}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
