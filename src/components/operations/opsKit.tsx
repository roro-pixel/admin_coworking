import React from "react";
import { FOCUS, PINK_SOFT, initials } from "../subscription/kitUtils";


export interface ViewItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ElementType;
  count?: number;
}

/**
 * Sélecteur de vue d'un onglet (Kanban, Liste, Analytics...).
 * Plus léger que Tabs : il vit sous les onglets principaux et à côté du bouton d'action.
 */
export function ViewSwitch<T extends string>({
  items,
  active,
  onChange,
}: {
  items: ViewItem<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div role="tablist" className="inline-flex min-w-max gap-1">
        {items.map((v) => {
          const Icon = v.icon;
          const on = active === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(v.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${
                on
                  ? `${PINK_SOFT} text-[color:var(--logo-pink-dark)]`
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              {Icon && <Icon size={15} />}
              {v.label}
              {v.count !== undefined && (
                <span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/70" : "bg-gray-100"}`}>{v.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Barre d'un onglet : sélecteur de vue à gauche, action principale à droite */
export const SectionBar: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({
  children,
  action,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">{children}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/** Choix unique sous forme de pastilles (priorité, catégorie, type d'activité) */
export function PillChoice<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${
              on
                ? "bg-[color:var(--logo-pink-dark)] text-white"
                : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pastille ronde avec les initiales */
/** `name` peut arriver de l'API sous forme de nombre (identifiant d'agent) : on le convertit avant de calculer les initiales. */
export const Avatar: React.FC<{ name: string | number | null | undefined; size?: "sm" | "md" }> = ({ name, size = "md" }) => (
  <span
    aria-hidden
    className={`flex shrink-0 items-center justify-center rounded-full font-bold text-[color:var(--logo-pink-dark)] ${PINK_SOFT} ${
      size === "sm" ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-xs"
    }`}
  >
    {initials(String(name ?? ""))}
  </span>
);

/** Date d'échéance, en rouge si dépassée */
export const DueText: React.FC<{ value?: string | null; overdue?: boolean; withTime?: boolean }> = ({
  value,
  overdue,
  withTime,
}) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const text = withTime
    ? `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString("fr-FR");
  return <span className={overdue ? "font-semibold text-red-600" : "text-gray-500"}>{text}</span>;
};

/** Contenu HTML riche venant de l'éditeur (description, message, note) */
export const RichHtml: React.FC<{ html?: string | null; className?: string }> = ({ html, className = "" }) =>
  html ? (
    <div
      className={`prose prose-sm max-w-none text-gray-800 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : null;