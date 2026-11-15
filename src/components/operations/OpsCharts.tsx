import React from "react";
import { LOGO_PINK } from "../layout/adminTheme";
import { Skeleton } from "../ui/Skeleton";
import { GRID, niceMax } from "./opsChartData";
import type { Slice } from "./opsChartData";


const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
const fmt = (n: number) => n.toLocaleString("fr-FR");

//  Cadres 

export const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, children, className = "" }) => (
  <section className={`rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
    <h3 className="text-base font-bold text-gray-950">{title}</h3>
    {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

export const NoData: React.FC<{ text?: string }> = ({ text = "Aucune donnée sur la période." }) => (
  <p className="py-6 text-center text-sm text-gray-400">{text}</p>
);

//  Indicateurs
export interface Kpi {
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "success" | "pink";
  hint?: string;
}

const KPI_TONE: Record<NonNullable<Kpi["tone"]>, string> = {
  default: "text-gray-950",
  danger: "text-red-600",
  success: "text-emerald-600",
  pink: "text-[color:var(--logo-pink-dark)]",
};

/** Bandeau d'indicateurs : une seule carte, les chiffres respirent sans boîtes autour */
export const KpiRow: React.FC<{ items: Kpi[]; columns?: 3 | 4 | 5 }> = ({ items, columns = 4 }) => {
  const cols =
    columns === 5 ? "md:grid-cols-3 xl:grid-cols-5" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 gap-x-6 gap-y-6 rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6 ${cols}`}>
      {items.map((k) => (
        <div key={k.label} className="min-w-0">
          <p className="truncate text-xs font-semibold text-gray-400">{k.label}</p>
          <p className={`mt-1 break-words text-xl font-bold tracking-tight sm:text-3xl ${KPI_TONE[k.tone ?? "default"]}`}>
            {k.value}
          </p>
          {k.hint && <p className="mt-0.5 truncate text-xs text-gray-400">{k.hint}</p>}
        </div>
      ))}
    </div>
  );
};

export const KpiRowSkeleton: React.FC<{ count?: number; columns?: 3 | 4 | 5 }> = ({
  count = 4,
  columns = 4,
}) => {
  const cols =
    columns === 5 ? "md:grid-cols-3 xl:grid-cols-5" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-4";
  return (
    <div className={`grid grid-cols-2 gap-x-6 gap-y-6 rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-8 w-24" />
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
    <Skeleton className="h-4 w-40" />
    <div className="mt-6 space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  </div>
);

// Barres horizontales 

/** Classement : une barre par catégorie, valeur et part à droite */
export const BarBreakdown: React.FC<{ data: Slice[] }> = ({ data }) => {
  if (data.length === 0) return <NoData />;
  const total = data.reduce((a, s) => a + s.value, 0);
  const max = Math.max(1, ...data.map((s) => s.value));
  return (
    <ul className="space-y-4">
      {data.map((s) => (
        <li key={s.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-gray-800">{s.label}</span>
            <span className="shrink-0 tabular-nums text-gray-500">
              <b className="font-bold text-gray-950">{fmt(s.value)}</b> · {pct(s.value, total)} %
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(s.value / max) * 100}%`, backgroundColor: LOGO_PINK }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

/** Part réalisée sur un total (ex. tickets résolus / assignés) */
export const RatioBar: React.FC<{ value: number; total: number; color?: string }> = ({
  value,
  total,
  color = LOGO_PINK,
}) => (
  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
    <div
      className="h-full rounded-full"
      style={{ width: `${total > 0 ? Math.min(100, (value / total) * 100) : 0}%`, backgroundColor: color }}
    />
  </div>
);

// Anneau

export const DonutBreakdown: React.FC<{ data: Slice[]; centerLabel: string }> = ({
  data,
  centerLabel,
}) => {
  const total = data.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <NoData />;
  const R = 62;
  const C = 2 * Math.PI * R;
  const GAP = data.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" role="img" aria-label={centerLabel}>
          <circle cx="80" cy="80" r={R} fill="none" stroke={GRID} strokeWidth="20" />
          {data.map((s) => {
            const len = (s.value / total) * C;
            const dash = Math.max(0, len - GAP);
            const el = (
              <circle
                key={s.key}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="20"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight text-gray-950">{fmt(total)}</span>
          <span className="text-xs font-semibold text-gray-400">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {data.map((s) => (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">{s.label}</span>
            <span className="shrink-0 tabular-nums text-gray-500">
              <b className="font-bold text-gray-950">{fmt(s.value)}</b> · {pct(s.value, total)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Colonnes

export const ColumnChart: React.FC<{ data: Slice[]; height?: number }> = ({ data, height = 220 }) => {
  if (data.length === 0 || data.every((d) => d.value === 0)) return <NoData />;
  const top = niceMax(Math.max(...data.map((d) => d.value)));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round(top * f * 10) / 10);
  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-gray-400" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="leading-none">
            {fmt(t)}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {ticks.map((t, i) => (
            <div
              key={t}
              className="absolute inset-x-0 h-px"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%`, backgroundColor: GRID }}
            />
          ))}
          <div className="absolute inset-0 flex items-end justify-around gap-2 sm:gap-4">
            {data.map((d) => (
              <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-xs font-bold tabular-nums text-gray-800">{fmt(d.value)}</span>
                <div
                  className="w-full max-w-[3.25rem] rounded-t-xl"
                  style={{ height: `${(d.value / top) * 100}%`, backgroundColor: d.color, minHeight: d.value > 0 ? 4 : 0 }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-around gap-2 sm:gap-4">
          {data.map((d) => (
            <span key={d.key} className="min-w-0 flex-1 truncate text-center text-[11px] font-semibold text-gray-500 sm:text-xs">
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Barre empilée 

export const StackBar: React.FC<{ data: Slice[] }> = ({ data }) => {
  const total = data.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <NoData />;
  return (
    <div>
      <div className="flex h-4 gap-1 overflow-hidden rounded-full">
        {data
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.key} title={`${s.label} : ${s.value}`} style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }} />
          ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
        {data.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 truncate text-gray-500">{s.label}</span>
            <b className="font-bold tabular-nums text-gray-950">{fmt(s.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
};
