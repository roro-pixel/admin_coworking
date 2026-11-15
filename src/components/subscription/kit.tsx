import React from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Search } from "lucide-react";
import { Dots } from "../ui/Toaster";
import { FIELD_SOFT, FOCUS, PINK_SOFT } from "./kitUtils";
import type { Tone } from "./kitUtils";

/*
 * Briques communes du module Abonnements.
 * Pages et en-têtes posent style={brandVars} sur leur racine : les variables
 * --logo-pink / --logo-pink-dark sont donc disponibles ici.
 */

// ───────────────────────── Onglets ─────────────────────────

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ElementType;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  /** "main" : barre blanche pleine ; "soft" : petit sélecteur gris pour les sous-onglets */
  variant?: "main" | "soft";
}

export function Tabs<T extends string>({ items, active, onChange, variant = "main" }: TabsProps<T>) {
  const scroll =
    "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  if (variant === "soft") {
    return (
      <div className={`max-w-full ${scroll}`}>
        <div role="tablist" className="inline-flex min-w-max gap-1 rounded-full bg-gray-100 p-1 lg:flex lg:min-w-0 lg:flex-wrap lg:rounded-[1.5rem]">
          {items.map((t) => {
            const Icon = t.icon;
            const on = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onChange(t.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${
                  on
                    ? "bg-white text-[color:var(--logo-pink-dark)] shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {Icon && <Icon size={15} />}
                {t.label}
                {typeof t.count === "number" && (
                  <span className="text-xs font-bold text-gray-400">{t.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-full bg-white p-1.5 shadow-sm ${scroll}`}>
      <div role="tablist" className="flex min-w-max items-center gap-1">
        {items.map((t) => {
          const Icon = t.icon;
          const on = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(t.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition ${FOCUS} ${
                on
                  ? "bg-[color:var(--logo-pink-dark)] text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {Icon && <Icon size={16} />}
              {t.label}
              {typeof t.count === "number" && (
                <span
                  className={`rounded-full px-1.5 text-xs font-bold ${
                    on ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Boutons ─────────────────────────

type ButtonVariant = "primary" | "ghost" | "danger";

const BTN_BASE =
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-[color:var(--logo-pink-dark)] text-white hover:opacity-90",
  ghost: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Action en cours : trois points à la place du libellé, bouton inactif, largeur inchangée */
  pending?: boolean;
  icon?: React.ElementType;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  variant = "primary",
  pending = false,
  icon: Icon,
  children,
  className = "",
  disabled,
  type = "button",
  ...rest
}) => (
  <button
    {...rest}
    type={type}
    disabled={disabled || pending}
    className={`${BTN_BASE} ${BTN_VARIANT[variant]} ${FOCUS} ${className}`}
  >
    <span className={`inline-flex items-center gap-2 ${pending ? "invisible" : ""}`}>
      {Icon && <Icon size={16} />}
      {children}
    </span>
    {pending && (
      <span className="absolute inset-0 flex items-center justify-center">
        <Dots />
      </span>
    )}
  </button>
);

const ICON_TONE: Record<"neutral" | "pink" | "success" | "danger", string> = {
  neutral: "text-gray-500 hover:bg-gray-100 hover:text-gray-800",
  pink: "text-gray-500 hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] hover:text-[color:var(--logo-pink-dark)]",
  success: "text-gray-500 hover:bg-emerald-50 hover:text-emerald-700",
  danger: "text-gray-500 hover:bg-red-50 hover:text-red-600",
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  label: string;
  tone?: keyof typeof ICON_TONE;
  pending?: boolean;
}

/** Bouton rond d'une ligne de liste. `label` sert d'infobulle et de nom accessible. */
export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  tone = "pink",
  pending = false,
  className = "",
  disabled,
  type = "button",
  ...rest
}) => (
  <button
    {...rest}
    type={type}
    title={label}
    aria-label={label}
    disabled={disabled || pending}
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${ICON_TONE[tone]} ${FOCUS} ${className}`}
  >
    {pending ? <Dots /> : <Icon size={16} />}
  </button>
);

// ───────────────────────── Statuts ─────────────────────────

const CHIP: Record<Tone, { box: string; dot: string }> = {
  success: { box: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  warn: { box: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  danger: { box: "bg-red-50 text-red-700", dot: "bg-red-500" },
  neutral: { box: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  info: { box: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  pink: {
    box: `${PINK_SOFT} text-[color:var(--logo-pink-dark)]`,
    dot: "bg-[color:var(--logo-pink-dark)]",
  },
};

export const StatusChip: React.FC<{ tone: Tone; children: React.ReactNode }> = ({
  tone,
  children,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${CHIP[tone].box}`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${CHIP[tone].dot}`} />
    {children}
  </span>
);

/** Petite étiquette sans point (type, rôle, cycle...) */
export const Tag: React.FC<{ children: React.ReactNode; tone?: "gray" | "pink" }> = ({
  children,
  tone = "gray",
}) => (
  <span
    className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
      tone === "pink"
        ? `${PINK_SOFT} text-[color:var(--logo-pink-dark)]`
        : "bg-gray-100 text-gray-600"
    }`}
  >
    {children}
  </span>
);

// ───────────────────────── Mise en page ─────────────────────────

/** Titre d'un contenu d'onglet (liste) avec son action principale à droite */
export const ListHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h2 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/** En-tête des pages détail et création : retour, titre, actions. */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, subtitle, onBack, backLabel = "Retour", badge, actions }) => (
  <div className="mb-6">
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        className={`mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 ${FOCUS}`}
      >
        <ArrowLeft size={16} />
        {backLabel}
      </button>
    )}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="break-words text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  </div>
);

/** Carte avec panneau gris intérieur. Les champs posés dedans doivent utiliser FIELD. */
export const Section: React.FC<{
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, description, icon: Icon, action, children, className = "" }) => (
  <section className={`rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
            >
              <Icon size={17} />
            </span>
          )}
          <div className="min-w-0">
            {title && <h3 className="truncate text-base font-bold text-gray-950">{title}</h3>}
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
    )}
    <div className="rounded-2xl bg-gray-50 p-4 sm:p-5">{children}</div>
  </section>
);

export const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, required, hint, error, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-xs font-semibold text-gray-600">
      {label}
      {required && <span className="text-[color:var(--logo-pink-dark)]"> *</span>}
    </span>
    {children}
    {error ? (
      <span className="mt-1 block text-xs text-red-600">{error}</span>
    ) : (
      hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>
    )}
  </label>
);

/** Valeur en lecture seule d'une page détail. N'affiche rien si la valeur est absente. */
export const Detail: React.FC<{
  label: string;
  children?: React.ReactNode;
  mono?: boolean;
  wide?: boolean;
}> = ({ label, children, mono, wide }) => {
  if (children === undefined || children === null || children === "" || children === false) {
    return null;
  }
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      <div
        className={`mt-1 break-words text-sm font-semibold text-gray-900 ${mono ? "font-mono text-xs" : ""}`}
      >
        {children}
      </div>
    </div>
  );
};

export const ErrorBanner: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="whitespace-pre-line rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  ) : null;

export const ErrorBlock: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div role="alert" className="rounded-[1.75rem] bg-red-50 p-8 text-center">
    <p className="font-semibold text-red-700">{message}</p>
    {onRetry && (
      <ActionButton variant="danger" onClick={onRetry} className="mt-4">
        Réessayer
      </ActionButton>
    )}
  </div>
);

export const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, hint, action }) => (
  <div className="rounded-[1.75rem] border border-gray-100 bg-white p-10 text-center shadow-sm">
    <div
      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
    >
      <Icon size={24} />
    </div>
    <p className="mt-4 font-semibold text-gray-900">{title}</p>
    {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

// ───────────────────────── Recherche & pagination ─────────────────────────

export const SearchField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}> = ({ value, onChange, placeholder, className = "" }) => (
  <div className={`relative ${className}`}>
    <Search
      size={16}
      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
    />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${FIELD_SOFT} pl-10`}
    />
  </div>
);

export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  total: number;
  noun: string;
  onChange: (page: number) => void;
}> = ({ page, totalPages, total, noun, onChange }) => {
  if (totalPages <= 1) return null;
  const btn = `flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 px-1">
      <p className="text-sm text-gray-500">
        {total.toLocaleString("fr-FR")} {noun}
        {total > 1 && !noun.endsWith("s") ? "s" : ""}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Page précédente"
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className={btn}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[5rem] text-center text-sm font-semibold text-gray-600">
          {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          aria-label="Page suivante"
          onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className={btn}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

// ───────────────────────── Listes ─────────────────────────

/** Carte qui contient les lignes d'une liste */
export const DataCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm ${className}`}>
    {children}
  </div>
);

/** En-tête de colonnes (visible dès `lg`). `cols` = classe grid-cols écrite en toutes lettres. */
export const HeadRow: React.FC<{ cols: string; children: React.ReactNode }> = ({
  cols,
  children,
}) => (
  <div
    className={`hidden items-center gap-4 px-4 pb-2 pt-1 text-xs font-semibold text-gray-400 lg:grid ${cols}`}
  >
    {children}
  </div>
);

export const FilterButton: React.FC<{
  open: boolean;
  active: boolean;
  onClick: () => void;
}> = ({ open, active, onClick }) => (
  <button
    type="button"
    aria-expanded={open}
    onClick={onClick}
    className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${FOCUS} ${
      open || active
        ? `${PINK_SOFT} text-[color:var(--logo-pink-dark)]`
        : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
    }`}
  >
    <Filter size={16} />
    Filtres
    {active && <span className="h-2 w-2 rounded-full bg-[color:var(--logo-pink-dark)]" />}
  </button>
);

export const FilterPanel: React.FC<{
  children: React.ReactNode;
  canReset: boolean;
  onReset: () => void;
}> = ({ children, canReset, onReset }) => (
  <div className="rounded-[1.75rem] border border-gray-100 bg-white p-4 shadow-sm">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>
    {canReset && (
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className={`rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--logo-pink-dark)] transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] ${FOCUS}`}
        >
          Réinitialiser les filtres
        </button>
      </div>
    )}
  </div>
);

// ───────────────────────── Formulaires ─────────────────────────

export const Switch: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition hover:bg-gray-50 ${FOCUS}`}
  >
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[color:var(--logo-pink-dark)]" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-gray-800">{label}</span>
      {hint && <span className="block text-xs text-gray-400">{hint}</span>}
    </span>
  </button>
);

export const CheckField: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
    />
    {label}
  </label>
);

/**
 * Petit formulaire qui s'ouvre dans un onglet (à la place d'une modale).
 * Les champs posés dedans utilisent FIELD (blanc sur gris).
 */
export const PanelForm: React.FC<{
  title: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  pending: boolean;
  submitLabel: string;
  submitDisabled?: boolean;
  error?: string | null;
  children: React.ReactNode;
}> = ({ title, onSubmit, onCancel, pending, submitLabel, submitDisabled, error, children }) => (
  <form
    onSubmit={onSubmit}
    className="mb-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 ring-[color:color-mix(in_srgb,var(--logo-pink)_30%,white)] sm:p-5"
  >
    <h4 className="mb-4 text-base font-bold text-gray-950">{title}</h4>
    <div className="space-y-4">
      <ErrorBanner message={error ?? null} />
      {children}
    </div>
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <ActionButton variant="ghost" onClick={onCancel} disabled={pending}>
        Annuler
      </ActionButton>
      <ActionButton type="submit" pending={pending} disabled={submitDisabled}>
        {submitLabel}
      </ActionButton>
    </div>
  </form>
);

/** Ligne blanche d'une liste posée sur le panneau gris d'une Section */
export const ItemRow: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>{children}</div>
);
