import React from "react";
import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { adminNavGroups, canAccess, hubPath, isItemActive } from "./adminNavigation";
import type { AdminNavGroup } from "./adminNavigation";
import { brandVars, NAV_ACTIVE, NAV_FOCUS, NAV_HOVER, NAV_REST } from "./adminTheme";

/*
 * Rail étiqueté : chaque famille a son nom sous l'icône, toujours visible.
 * Un clic sur une famille ouvre sa page (/section/:id), où les modules sont présentés
 * avec leur description.
 * Tout est fluide : tailles liées à la hauteur de la fenêtre (les entrées tiennent sans
 * défilement sur un petit laptop) et à l'échelle globale en rem (fluid-scale.css).
 */
const RAIL_VARS = {
  ...brandVars,
  "--it": "clamp(3.4rem, 8.6vh, 5rem)",
} as CSSProperties;

const REST = NAV_REST;
const HOVER = NAV_HOVER;
const ACTIVE = NAV_ACTIVE;
const FOCUS = NAV_FOCUS;

const labelStyle: CSSProperties = { fontSize: "clamp(10px, 1.5vh, 0.8rem)" };
const iconStyle: CSSProperties = { width: "clamp(20px, 3.2vh, 1.7rem)", height: "clamp(20px, 3.2vh, 1.7rem)" };

export const AdminSidebar: React.FC = () => {
  const { pathname } = useLocation();
  const { hasPermission, isAdmin } = useAuth();
  const access = { isAdmin: isAdmin(), hasPermission };

  const homeGroup = adminNavGroups.find((g) => g.id === "home");
  const systemGroup = adminNavGroups.find((g) => g.pinned);
  const families = adminNavGroups.filter((g) => g.label && !g.pinned);

  const itemBox =
    "flex w-full flex-col items-center justify-center gap-[0.5em] rounded-[1.5rem] px-1.5 transition-colors";
  const boxStyle: CSSProperties = { height: "var(--it)" };

  // Entrée directe (Accueil, Réglages)
  const renderDirect = (group: AdminNavGroup | undefined) => {
    const item = group?.items[0];
    if (!item) return null;
    const Icon = item.icon;
    const label = item.shortLabel ?? item.label;

    if (!canAccess(item.permissions, access)) {
      return (
        <span
          role="link"
          aria-disabled="true"
          title="Accès restreint"
          className={`${itemBox} cursor-not-allowed select-none text-gray-400`}
          style={boxStyle}
        >
          <Icon style={iconStyle} strokeWidth={1.75} className="blur-[1.5px] opacity-60" />
          <span className="font-semibold opacity-60 blur-[1.5px]" style={labelStyle}>
            {label}
          </span>
          <span className="sr-only">(accès restreint)</span>
        </span>
      );
    }

    const active = isItemActive(pathname, item);
    return (
      <Link
        to={item.path}
        aria-current={active ? "page" : undefined}
        className={`${itemBox} ${FOCUS} ${active ? ACTIVE : `${REST} ${HOVER} font-semibold`}`}
        style={boxStyle}
      >
        <Icon style={iconStyle} strokeWidth={active ? 2 : 1.75} />
        <span style={labelStyle}>{label}</span>
      </Link>
    );
  };

  // Famille : ouvre la page de la famille
  const renderFamily = (group: AdminNavGroup) => {
    const Icon = group.icon;
    if (!Icon) return null;
    const label = group.shortLabel ?? group.label ?? "";
    const allLocked = group.items.every((item) => !canAccess(item.permissions, access));
    const target = hubPath(group);
    const active = pathname === target || group.items.some((item) => isItemActive(pathname, item));

    if (allLocked) {
      return (
        <span
          key={group.id}
          role="link"
          aria-disabled="true"
          title="Accès restreint"
          className={`${itemBox} cursor-not-allowed select-none text-gray-400`}
          style={boxStyle}
        >
          <Icon style={iconStyle} strokeWidth={1.75} className="blur-[1.5px] opacity-60" />
          <span className="font-semibold opacity-60 blur-[1.5px]" style={labelStyle}>
            {label}
          </span>
          <span className="sr-only">(accès restreint)</span>
        </span>
      );
    }

    return (
      <Link
        key={group.id}
        to={target}
        aria-current={pathname === target ? "page" : undefined}
        className={`${itemBox} ${FOCUS} ${active ? ACTIVE : `${REST} ${HOVER} font-semibold`}`}
        style={boxStyle}
      >
        <Icon style={iconStyle} strokeWidth={active ? 2 : 1.75} />
        <span style={labelStyle}>{label}</span>
      </Link>
    );
  };

  return (
    <aside
      className="hidden shrink-0 lg:block"
      style={{ ...RAIL_VARS, width: "calc(6rem + 1rem)" }}
    >
      <div className="flex h-screen items-center py-4 pl-4">
        <nav
          aria-label="Navigation principale"
          className="flex max-h-full w-full flex-col gap-2 overflow-y-auto rounded-[2.25rem] border border-gray-100 bg-white p-3 shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {renderDirect(homeGroup)}
          {families.map(renderFamily)}

          <div className="mt-1 border-t border-gray-100 pt-3">{renderDirect(systemGroup)}</div>
        </nav>
      </div>

    </aside>
  );
};