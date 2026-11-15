import React, { useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, ChevronDown, Download, RefreshCw } from "lucide-react";
import { ActionButton, EmptyState, ErrorBlock, IconButton } from "../subscription/kit";
import { FIELD, FOCUS, ROW_HOVER } from "../subscription/kitUtils";
import { ChartSkeleton, KpiRowSkeleton } from "../operations/OpsCharts";

import type { DateRange } from "./reportUtils";

/* Briques de mise en page communes aux rapports. */

/** Titre du rapport à gauche, filtres et exports à droite (sous le titre sur mobile) */
export const ReportHead: React.FC<{ title: string; subtitle: string; children?: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div className="min-w-0">
      <h2 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
    {children && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{children}</div>}
  </div>
);

/** Sélecteur de période : le début ne dépasse jamais la fin */
export const PeriodBar: React.FC<{ value: DateRange; onChange: (r: DateRange) => void }> = ({ value, onChange }) => (
  <div className="flex items-center gap-2">
    <div className="w-40">
      <input
        type="date"
        aria-label="Date de début"
        value={value.from}
        max={value.to || undefined}
        onChange={(e) => onChange({ from: e.target.value, to: value.to && e.target.value > value.to ? e.target.value : value.to })}
        className={FIELD}
      />
    </div>
    <span className="text-sm font-semibold text-gray-400">au</span>
    <div className="w-40">
      <input
        type="date"
        aria-label="Date de fin"
        value={value.to}
        min={value.from || undefined}
        onChange={(e) => onChange({ from: value.from && e.target.value < value.from ? e.target.value : value.from, to: e.target.value })}
        className={FIELD}
      />
    </div>
  </div>
);

/** Menu déroulant posé sur le fond de page */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="min-w-[8.5rem]">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
        className={FIELD}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export const ExportButton: React.FC<{ label: string; busy: boolean; disabled?: boolean; onClick: () => void }> = ({
  label,
  busy,
  disabled,
  onClick,
}) => (
  <ActionButton variant="ghost" icon={Download} pending={busy} disabled={disabled} onClick={onClick} className="bg-white shadow-sm hover:bg-gray-100">
    {label}
  </ActionButton>
);

export const RefreshButton: React.FC<{ fetching: boolean; onClick: () => void; disabled?: boolean }> = ({
  fetching,
  onClick,
  disabled,
}) => (
  <IconButton
    icon={RefreshCw}
    label="Actualiser"
    tone="pink"
    pending={fetching}
    disabled={disabled}
    onClick={onClick}
    className="bg-white shadow-sm"
  />
);

/** Écran de chargement d'un rapport : bandeau de chiffres puis deux graphiques */
export const ReportSkeleton: React.FC<{ kpis?: 3 | 4 | 5 }> = ({ kpis = 4 }) => (
  <div className="space-y-6">
    <KpiRowSkeleton count={kpis} columns={kpis} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);

/** Chargement, erreur avec relance, absence de données, puis le contenu du rapport */
export const ReportBody: React.FC<{
  loading: boolean;
  error: boolean;
  hasData: boolean;
  onRetry: () => void;
  kpis?: 3 | 4 | 5;
  emptyTitle?: string;
  emptyHint?: string;
  children: React.ReactNode;
}> = ({ loading, error, hasData, onRetry, kpis, emptyTitle = "Aucune donnée disponible", emptyHint = "Essayez une autre période.", children }) => {
  if (loading) return <ReportSkeleton kpis={kpis} />;
  if (error) return <ErrorBlock message="Impossible de charger ce rapport." onRetry={onRetry} />;
  if (!hasData) return <EmptyState icon={BarChart3} title={emptyTitle} hint={emptyHint} />;
  return <>{children}</>;
};

/** Variation entre deux périodes. `inverse` : une hausse est une mauvaise nouvelle (impayés, annulations). */
export const Delta: React.FC<{ value?: number | null; inverse?: boolean }> = ({ value, inverse = false }) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const up = value > 0;
  const down = value < 0;
  const good = inverse ? down : up;
  const bad = inverse ? up : down;
  const tone = good
    ? "bg-emerald-50 text-emerald-700"
    : bad
      ? "bg-red-50 text-red-700"
      : "bg-gray-100 text-gray-600";
  const Icon = down ? ArrowDownRight : ArrowUpRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${tone}`}>
      {(up || down) && <Icon size={12} />}
      {up ? "+" : ""}
      {value.toFixed(1).replace(".", ",")} %
    </span>
  );
};

/** Liste libellé / valeur sans filets */
export const StatList: React.FC<{ rows: { label: string; value: React.ReactNode }[] }> = ({ rows }) => (
  <dl className="space-y-2.5">
    {rows.map((r) => (
      <div key={r.label} className="flex items-baseline justify-between gap-4 text-sm">
        <dt className="min-w-0 text-gray-500">{r.label}</dt>
        <dd className="shrink-0 text-right font-semibold tabular-nums text-gray-950">{r.value}</dd>
      </div>
    ))}
  </dl>
);

/** Zone repliable pour les détails volumineux (jour par jour) */
export const Disclosure: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 ${FOCUS}`}
      >
        {label}
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
};

// ───────────────────────── Tableau ─────────────────────────

export interface Col {
  key: string;
  label: string;
  /** Largeur de colonne CSS (défaut : 1fr) */
  width?: string;
  align?: "left" | "right";
}

export interface TableRow {
  id: string;
  cells: Record<string, React.ReactNode>;
}

/** Tableau en lignes arrondies sans filets ; sur mobile chaque ligne devient un bloc libellé / valeur */
export const ReportTable: React.FC<{ cols: Col[]; rows: TableRow[]; empty?: string }> = ({
  cols,
  rows,
  empty = "Aucune donnée sur la période.",
}) => {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-gray-400">{empty}</p>;
  const template = cols.map((c) => c.width ?? "minmax(0,1fr)").join(" ");
  const [first, ...rest] = cols;
  return (
    <div className="-mx-2">
      <div
        className="hidden items-center gap-4 px-4 pb-2 text-xs font-semibold text-gray-400 lg:grid"
        style={{ gridTemplateColumns: template }}
      >
        {cols.map((c) => (
          <span key={c.key} className={c.align === "right" ? "text-right" : ""}>
            {c.label}
          </span>
        ))}
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.id} className={`rounded-2xl px-4 py-3 text-sm ${ROW_HOVER}`}>
            <div className="hidden items-center gap-4 lg:grid" style={{ gridTemplateColumns: template }}>
              {cols.map((c) => (
                <div key={c.key} className={`min-w-0 ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                  {r.cells[c.key]}
                </div>
              ))}
            </div>
            <div className="lg:hidden">
              <div className="min-w-0 font-semibold text-gray-950">{r.cells[first.key]}</div>
              <dl className="mt-2 space-y-1.5">
                {rest.map((c) => (
                  <div key={c.key} className="flex items-baseline justify-between gap-4">
                    <dt className="text-xs text-gray-400">{c.label}</dt>
                    <dd className="min-w-0 text-right tabular-nums text-gray-800">{r.cells[c.key]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Valeur secondaire sous un libellé principal (code, ancienneté) */
export const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="block truncate text-xs font-medium text-gray-400">{children}</span>
);

