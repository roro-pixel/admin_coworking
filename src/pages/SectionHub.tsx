import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronRight, Lock } from "lucide-react";
import { AdminLayout } from "../components/layout/AdminLayout";
import { adminNavGroups, canAccess } from "../components/layout/adminNavigation";
import type { AdminNavItem } from "../components/layout/adminNavigation";
import { brandVars } from "../components/layout/adminTheme";
import { useAuth } from "../contexts/AuthContext";
import { PINK_SOFT } from "../components/subscription/kitUtils";

const CARD = "flex items-center gap-4 rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm";

const ModuleCard: React.FC<{ item: AdminNavItem; allowed: boolean }> = ({ item, allowed }) => {
  const Icon = item.icon;
  const body = (
    <>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}>
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold text-gray-950">{item.label}</span>
        {item.description && <span className="mt-0.5 block text-sm text-gray-500">{item.description}</span>}
      </span>
    </>
  );

  if (!allowed) {
    return (
      <span role="link" aria-disabled="true" title="Accès restreint" className={`${CARD} cursor-not-allowed select-none`}>
        <span className="flex min-w-0 flex-1 items-center gap-4 opacity-60 blur-[1.5px]">{body}</span>
        <Lock size={16} className="shrink-0 text-gray-400" />
        <span className="sr-only">(accès restreint)</span>
      </span>
    );
  }

  return (
    <Link
      to={item.path}
      className={`${CARD} group transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]`}
    >
      {body}
      <ChevronRight size={18} className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[color:var(--logo-pink-dark)]" />
    </Link>
  );
};

/** Page d'une famille du menu : ses modules, regroupés par rubrique, avec leur description. */
export const SectionHub: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { hasPermission, isAdmin } = useAuth();
  const access = { isAdmin: isAdmin(), hasPermission };

  const group = adminNavGroups.find((g) => g.id === groupId && g.label);
  if (!group) return <Navigate to="/" replace />;

  const sections: { title?: string; items: AdminNavItem[] }[] = [];
  group.items.forEach((item) => {
    const last = sections[sections.length - 1];
    if (last && last.title === item.section) last.items.push(item);
    else sections.push({ title: item.section, items: [item] });
  });

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-6xl" style={brandVars}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">{group.label}</h1>
          {group.description && <p className="mt-1 text-sm text-gray-500">{group.description}</p>}
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <section key={`${section.title ?? "x"}-${i}`}>
              {section.title && (
                <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">{section.title}</h2>
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {section.items.map((item) => (
                  <ModuleCard key={item.path} item={item} allowed={canAccess(item.permissions, access)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default SectionHub;
