import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock, Menu } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { adminNavGroups, canAccess, isItemActive, primaryItems } from "./adminNavigation";
import { brandVars, NAV_ACTIVE, NAV_HOVER } from "./adminTheme";

export const AdminBottomNav: React.FC = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { hasPermission, isAdmin } = useAuth();
  const access = { isAdmin: isAdmin(), hasPermission };

  const moreActive = adminNavGroups
    .flatMap((group) => group.items)
    .some((item) => !item.primary && isItemActive(location.pathname, item));

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="fixed inset-x-3 bottom-3 z-50 lg:hidden" style={brandVars}>
      {moreOpen && (
        <div className="mb-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-950">Toutes les sections</p>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500"
            >
              Fermer
            </button>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {adminNavGroups.map((group) => (
              <div key={group.id}>
                {group.label && (
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {group.label}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    if (!canAccess(item.permissions, access)) {
                      return (
                        <span
                          key={item.path}
                          role="link"
                          aria-disabled="true"
                          className="flex cursor-not-allowed select-none items-center gap-2 rounded-full bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-400"
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2 opacity-60 blur-[1.5px]">
                            <Icon size={17} className="shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <Lock size={13} className="shrink-0" />
                          <span className="sr-only">(accès restreint)</span>
                        </span>
                      );
                    }

                    const active = isItemActive(location.pathname, item);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 rounded-full px-4 py-3 text-xs font-semibold transition ${
                          active
                            ? NAV_ACTIVE
                            : `bg-gray-50 text-gray-900 ${NAV_HOVER}`
                        }`}
                      >
                        <Icon size={17} className="shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav className="rounded-full border border-gray-100 bg-white px-3 py-2 shadow-lg">
        <div className="grid grid-cols-5 items-end gap-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const label = item.shortLabel ?? item.label;

            if (!canAccess(item.permissions, access)) {
              return (
                <span
                  key={item.path}
                  role="link"
                  aria-disabled="true"
                  className="flex cursor-not-allowed select-none flex-col items-center gap-1 rounded-full px-1 py-1.5 text-[10px] font-semibold text-gray-400 opacity-60 blur-[1.5px]"
                >
                  <Icon size={20} />
                  <span className="max-w-[64px] truncate">{label}</span>
                </span>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 rounded-full px-1 py-1.5 text-[10px] font-semibold transition ${
                  isItemActive(location.pathname, item)
                    ? "text-[color:var(--logo-pink-dark)]"
                    : "text-gray-900"
                }`}
              >
                <Icon size={20} />
                <span className="max-w-[64px] truncate">{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex flex-col items-center gap-1 rounded-full px-1 py-1.5 text-[10px] font-semibold transition ${
              moreOpen || moreActive ? "text-[color:var(--logo-pink-dark)]" : "text-gray-900"
            }`}
            aria-expanded={moreOpen}
            aria-label="Ouvrir les autres sections"
          >
            <Menu size={20} />
            <span className="max-w-[64px] truncate">Plus</span>
          </button>
        </div>
      </nav>
    </div>
  );
};