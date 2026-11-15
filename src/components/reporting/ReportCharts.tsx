import React, { useState } from "react";
import { LOGO_PINK } from "../layout/adminTheme";
import { GRID, niceMax } from "../operations/opsChartData";
import { NoData } from "../operations/OpsCharts";
import { compact } from "./reportUtils";

/*
 * Graphiques temporels et comparatifs des rapports : SVG et CSS purs, aplats sans dégradé.
 * Les libellés d'axes sont en HTML pour rester nets sur mobile ; l'infobulle suit le survol ou le toucher.
 */

export interface Series {
  key: string;
  name: string;
  color: string;
  values: number[];
}

const axisTicks = (top: number): number[] => [1, 0.75, 0.5, 0.25, 0].map((f) => top * f);

const Axis: React.FC<{ top: number; height: number }> = ({ top, height }) => (
  <div
    className="flex shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-gray-400"
    style={{ height }}
  >
    {axisTicks(top).map((t, i) => (
      <span key={i} className="leading-none">
        {compact(Math.round(t * 10) / 10)}
      </span>
    ))}
  </div>
);

const GridLines: React.FC<{ top: number }> = ({ top }) => (
  <>
    {axisTicks(top).map((_, i, arr) => (
      <div
        key={i}
        className="absolute inset-x-0 h-px"
        style={{ top: `${(i / (arr.length - 1)) * 100}%`, backgroundColor: GRID }}
      />
    ))}
  </>
);

/** Une étiquette sur `step`, pour que l'axe horizontal reste lisible */
const XLabels: React.FC<{ labels: string[] }> = ({ labels }) => {
  const step = Math.max(1, Math.ceil(labels.length / 6));
  return (
    <div className="mt-2 flex">
      {labels.map((l, i) => (
        <span
          key={i}
          className="flex-1 whitespace-nowrap text-center text-[11px] font-semibold text-gray-500"
          style={{ minWidth: 0 }}
        >
          <span className="inline-block">{i % step === 0 ? l : ""}</span>
        </span>
      ))}
    </div>
  );
};

interface TipRow {
  name: string;
  color: string;
  value: string;
}

const Tip: React.FC<{ title: string; rows: TipRow[]; centerPct: number }> = ({ title, rows, centerPct }) => (
  <div
    className="pointer-events-none absolute top-0 z-10 w-max max-w-[14rem] rounded-xl bg-gray-950 px-3 py-2 text-xs text-white shadow-lg"
    style={{ left: `${Math.min(80, Math.max(20, centerPct))}%`, transform: "translateX(-50%)" }}
  >
    <p className="font-bold">{title}</p>
    {rows.map((r) => (
      <p key={r.name} className="mt-1 flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
        <span className="text-gray-300">{r.name}</span>
        <b className="ml-auto pl-3 tabular-nums">{r.value}</b>
      </p>
    ))}
  </div>
);

export const ChartLegend: React.FC<{ items: { name: string; color: string }[] }> = ({ items }) => (
  <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
    {items.map((s) => (
      <li key={s.name} className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
        {s.name}
      </li>
    ))}
  </ul>
);

// ───────────────────────── Courbe, aire ou barres sur une série ─────────────────────────

export type TrendMode = "line" | "area" | "bar";

export const TrendChart: React.FC<{
  labels: string[];
  values: number[];
  mode?: TrendMode;
  name: string;
  format: (n: number) => string;
  color?: string;
  height?: number;
  /** Plafond imposé de l'axe (100 pour un pourcentage) */
  max?: number;
}> = ({ labels, values, mode = "area", name, format, color = LOGO_PINK, height = 260, max }) => {
  const [idx, setIdx] = useState<number | null>(null);
  const n = values.length;
  if (n === 0) return <NoData />;
  const top = max ?? niceMax(Math.max(...values, 0));
  const xs = values.map((_, i) => ((i + 0.5) / n) * 100);
  const ys = values.map((v) => 100 - (Math.max(0, v) / top) * 100);
  const line = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const hovered = idx !== null ? idx : null;

  return (
    <div className="flex gap-3">
      <Axis top={top} height={height} />
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }} onMouseLeave={() => setIdx(null)}>
          <GridLines top={top} />
          {mode === "bar" ? (
            <div className="absolute inset-0 flex items-end">
              {values.map((v, i) => (
                <div key={i} className="flex h-full flex-1 items-end justify-center">
                  <div
                    className="w-[70%] max-w-[1.75rem] rounded-t-lg transition-opacity"
                    style={{
                      height: `${(Math.max(0, v) / top) * 100}%`,
                      backgroundColor: color,
                      minHeight: v > 0 ? 3 : 0,
                      opacity: hovered !== null && hovered !== i ? 0.45 : 1,
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              {mode === "area" && n > 1 && (
                <polygon points={`${xs[0]},100 ${line} ${xs[n - 1]},100`} fill={color} fillOpacity={0.14} />
              )}
              <polyline
                points={line}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          <div className="absolute inset-0 flex">
            {values.map((_, i) => (
              <div
                key={i}
                className="h-full flex-1"
                onMouseEnter={() => setIdx(i)}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
          {hovered !== null && (
            <>
              {mode !== "bar" && (
                <>
                  <div className="pointer-events-none absolute inset-y-0 w-px bg-gray-300" style={{ left: `${xs[hovered]}%` }} />
                  <div
                    className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                    style={{ left: `${xs[hovered]}%`, top: `${ys[hovered]}%`, backgroundColor: color }}
                  />
                </>
              )}
              <Tip
                title={labels[hovered] ?? ""}
                rows={[{ name, color, value: format(values[hovered]) }]}
                centerPct={xs[hovered]}
              />
            </>
          )}
        </div>
        <XLabels labels={labels} />
      </div>
    </div>
  );
};

// ───────────────────────── Colonnes groupées ou empilées ─────────────────────────

export const SeriesColumns: React.FC<{
  labels: string[];
  series: Series[];
  stacked?: boolean;
  format: (n: number) => string;
  height?: number;
}> = ({ labels, series, stacked = false, format, height = 260 }) => {
  const [idx, setIdx] = useState<number | null>(null);
  const n = labels.length;
  if (n === 0 || series.every((s) => s.values.every((v) => v === 0))) return <NoData />;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + Math.max(0, s.values[i] ?? 0), 0));
  const peak = stacked ? Math.max(...totals) : Math.max(...series.flatMap((s) => s.values), 0);
  const top = niceMax(peak);
  const dense = n > 12;

  return (
    <div>
      <div className="flex gap-3">
        <Axis top={top} height={height} />
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }} onMouseLeave={() => setIdx(null)}>
            <GridLines top={top} />
            <div className="absolute inset-0 flex">
              {labels.map((_, i) => {
                const dim = idx !== null && idx !== i;
                return (
                  <div
                    key={i}
                    className="flex h-full flex-1 items-end justify-center"
                    onMouseEnter={() => setIdx(i)}
                    onClick={() => setIdx(i)}
                  >
                    {stacked ? (
                      <div
                        className="flex w-[70%] max-w-[2rem] flex-col-reverse overflow-hidden rounded-t-md transition-opacity"
                        style={{ height: `${(totals[i] / top) * 100}%`, opacity: dim ? 0.45 : 1 }}
                      >
                        {series.map((s) => (
                          <div
                            key={s.key}
                            style={{
                              height: `${totals[i] > 0 ? (Math.max(0, s.values[i] ?? 0) / totals[i]) * 100 : 0}%`,
                              backgroundColor: s.color,
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`flex h-full w-[84%] items-end justify-center transition-opacity ${dense ? "gap-px" : "gap-[3px]"}`}
                        style={{ opacity: dim ? 0.45 : 1 }}
                      >
                        {series.map((s) => (
                          <div
                            key={s.key}
                            className="max-w-[1.25rem] flex-1 rounded-t-md"
                            style={{
                              height: `${(Math.max(0, s.values[i] ?? 0) / top) * 100}%`,
                              backgroundColor: s.color,
                              minHeight: (s.values[i] ?? 0) > 0 ? 3 : 0,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {idx !== null && (
              <Tip
                title={labels[idx]}
                centerPct={((idx + 0.5) / n) * 100}
                rows={[
                  ...series.map((s) => ({ name: s.name, color: s.color, value: format(s.values[idx] ?? 0) })),
                  ...(stacked && series.length > 1 ? [{ name: "Total", color: "#ffffff", value: format(totals[idx]) }] : []),
                ]}
              />
            )}
          </div>
          <XLabels labels={labels} />
        </div>
      </div>
      {series.length > 1 && <ChartLegend items={series.map((s) => ({ name: s.name, color: s.color }))} />}
    </div>
  );
};

// ───────────────────────── Classement ─────────────────────────

export interface RankItem {
  key: string;
  label: string;
  value: number;
  color?: string;
  sub?: string;
}

/** Barres horizontales classées, valeur formatée à droite (montants, minutes, pourcentages) */
export const RankBars: React.FC<{ items: RankItem[]; format: (n: number) => string; max?: number }> = ({
  items,
  format,
  max,
}) => {
  if (items.length === 0) return <NoData />;
  const top = max ?? Math.max(1, ...items.map((s) => s.value));
  return (
    <ul className="space-y-4">
      {items.map((s) => (
        <li key={s.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-gray-800">{s.label}</span>
            <b className="shrink-0 tabular-nums text-gray-950">{format(s.value)}</b>
          </div>
          {s.sub && <p className="mb-1.5 truncate text-xs text-gray-400">{s.sub}</p>}
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, (s.value / top) * 100)}%`, backgroundColor: s.color ?? LOGO_PINK }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

// ───────────────────────── Jauge ─────────────────────────

/** Demi-cercle pour un taux (0 à 100) */
export const Gauge: React.FC<{ value: number; color?: string; caption?: string }> = ({
  value,
  color = LOGO_PINK,
  caption,
}) => {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="relative mx-auto w-full max-w-[16rem]">
      <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`${v.toFixed(0)} %`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke={GRID} strokeWidth="18" strokeLinecap="round" />
        {v > 0 && (
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="18"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${v} 100`}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-3xl font-bold tracking-tight text-gray-950">{v.toFixed(1).replace(".", ",")} %</p>
        {caption && <p className="text-xs font-semibold text-gray-400">{caption}</p>}
      </div>
    </div>
  );
};

// ───────────────────────── Anneau avec valeurs formatées ─────────────────────────

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Anneau dont le centre et la légende utilisent un formateur (montants, minutes) */
export const ValueDonut: React.FC<{
  data: DonutSlice[];
  centerLabel: string;
  format: (n: number) => string;
  centerFormat?: (n: number) => string;
}> = ({ data, centerLabel, format, centerFormat }) => {
  const slices = data.filter((s) => s.value > 0);
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <NoData />;
  const R = 62;
  const C = 2 * Math.PI * R;
  const GAP = slices.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" role="img" aria-label={centerLabel}>
          <circle cx="80" cy="80" r={R} fill="none" stroke={GRID} strokeWidth="20" />
          {slices.map((s) => {
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
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-xl font-bold tracking-tight text-gray-950">{(centerFormat ?? format)(total)}</span>
          <span className="text-xs font-semibold text-gray-400">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate font-semibold text-gray-800">{s.label}</span>
            <span className="shrink-0 tabular-nums text-gray-500">
              <b className="font-bold text-gray-950">{format(s.value)}</b> · {Math.round((s.value / total) * 100)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
