import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FOCUS, PINK_SOFT } from "./kitUtils";
import { CHART } from "./chartColors";

/*
 * Graphiques SVG sans dépendance : colonnes avec axes et grille, anneau.
 * Chaque graphique a une infobulle au survol et une vue Tableau.
 */

// ───────────────────────── Utilitaires ─────────────────────────

export const compact = (n: number): string => {
  const abs = Math.abs(n);
  const fmt = (v: number, s: string) => `${(Math.round(v * 10) / 10).toString().replace(".", ",")}${s}`;
  if (abs >= 1_000_000_000) return fmt(n / 1_000_000_000, " Md");
  if (abs >= 1_000_000) return fmt(n / 1_000_000, " M");
  if (abs >= 10_000) return fmt(n / 1_000, " k");
  return n.toLocaleString("fr-FR");
};

/** Plafond d'axe « rond » et pas de graduation */
const niceScale = (max: number, ticks = 4): { top: number; step: number } => {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  return { top: step * Math.ceil(max / step), step };
};

const useWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (ref.current) setW(ref.current.getBoundingClientRect().width);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
};

interface Tip {
  x: number;
  y: number;
  title: string;
  value: string;
  color: string;
}

const TipBox: React.FC<{ tip: Tip | null }> = ({ tip }) =>
  tip ? (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="flex items-center gap-1.5 text-gray-300">
        <span className="h-2 w-2 rounded-full" style={{ background: tip.color }} />
        {tip.title}
      </p>
      <p className="mt-0.5 text-sm font-bold">{tip.value}</p>
    </div>
  ) : null;

// ───────────────────────── Panneau ─────────────────────────

export interface TableView {
  head: string[];
  rows: string[][];
}

/** Panneau blanc : titre, bouton Tableau, graphique posé directement dessus */
export const Panel: React.FC<{
  title: string;
  subtitle?: string;
  table?: TableView;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, table, children, className = "" }) => {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`flex min-w-0 flex-col rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-950">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setAsTable(!asTable)}
            aria-pressed={asTable}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${FOCUS} ${
              asTable
                ? `${PINK_SOFT} text-[color:var(--logo-pink-dark)]`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tableau
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-center">
        {asTable && table ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold text-gray-400">
                {table.head.map((h, i) => (
                  <th key={h} className={`pb-2 ${i > 0 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r[0]}>
                  {r.map((c, i) => (
                    <td key={i} className={`py-1.5 ${i > 0 ? "text-right font-bold text-gray-900" : "text-gray-600"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          children
        )}
      </div>
    </section>
  );
};

// ───────────────────────── Chiffres clés ─────────────────────────

export interface Kpi {
  label: string;
  value: string;
  hint?: string;
}

/** Bandeau de chiffres : pas de cartes, juste de la typographie */
export const KpiStrip: React.FC<{ items: Kpi[] }> = ({ items }) => (
  <div className="grid grid-cols-2 gap-x-6 gap-y-6 rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6 xl:grid-cols-4">
    {items.map((k, i) => (
      <div key={k.label} className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{k.label}</p>
        <p
          className={`mt-1 break-words font-black leading-tight tracking-tight ${
            i === 0
              ? "text-2xl text-[color:var(--logo-pink-dark)] sm:text-3xl"
              : "text-2xl text-gray-950 sm:text-3xl"
          }`}
        >
          {k.value}
        </p>
        {k.hint && <p className="mt-1 text-xs text-gray-500">{k.hint}</p>}
      </div>
    ))}
  </div>
);

// ───────────────────────── Colonnes ─────────────────────────

export interface Column {
  label: string;
  value: number;
  color?: string;
  display?: string;
}

const H = 260;
const PAD = { t: 28, r: 8, b: 34, l: 44 };
const PAD_ROT_B = 64;

export const ColumnChart: React.FC<{ data: Column[]; unit?: string }> = ({ data, unit = "" }) => {
  const { ref, w } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const max = Math.max(0, ...data.map((d) => d.value));
  const { top, step } = niceScale(max);
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);

  const iw = Math.max(0, w - PAD.l - PAD.r);
  const rotate = data.length > 0 && iw / data.length < 76;
  const padB = rotate ? PAD_ROT_B : PAD.b;
  const ih = H - PAD.t - padB;
  const slot = data.length ? iw / data.length : 0;
  const bw = Math.min(56, slot * 0.56);
  const y = (v: number) => PAD.t + ih - (v / top) * ih;
  const radius = 6;

  const bar = (x: number, v: number) => {
    const h = Math.max(0, PAD.t + ih - y(v));
    if (h === 0) return "";
    const r = Math.min(radius, h, bw / 2);
    const yt = y(v);
    return `M${x},${yt + h} V${yt + r} Q${x},${yt} ${x + r},${yt} H${x + bw - r} Q${x + bw},${yt} ${x + bw},${yt + r} V${yt + h} Z`;
  };

  return (
    <div ref={ref} className="relative w-full">
      {w > 0 && (
        <svg width={w} height={H - PAD.b + padB} role="img" aria-label="Graphique en colonnes" className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} stroke="#EEF0F3" strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={PAD.l - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">
                {compact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD.l + slot * i + (slot - bw) / 2;
            const color = d.color ?? CHART.primary;
            const dim = hover !== null && hover !== i;
            return (
              <g
                key={d.label}
                tabIndex={0}
                onMouseEnter={() => {
                  setHover(i);
                  setTip({ x: x + bw / 2, y: y(d.value), title: d.label, value: `${d.display ?? d.value.toLocaleString("fr-FR")}${unit}`, color });
                }}
                onMouseLeave={() => {
                  setHover(null);
                  setTip(null);
                }}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                opacity={dim ? 0.35 : 1}
                style={{ transition: "opacity .15s", outline: "none" }}
              >
                <rect x={PAD.l + slot * i} y={PAD.t} width={slot} height={ih} fill="transparent" />
                <path d={bar(x, d.value)} fill={color} />
                {d.value > 0 && (
                  <text x={x + bw / 2} y={y(d.value) - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill="#0F172A">
                    {compact(d.value)}
                  </text>
                )}
                <text
                  x={x + bw / 2}
                  y={PAD.t + ih + 18}
                  textAnchor={rotate ? "end" : "middle"}
                  transform={rotate ? `rotate(-35 ${x + bw / 2} ${PAD.t + ih + 18})` : undefined}
                  fontSize="12"
                  fill="#475569"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <TipBox tip={tip} />
    </div>
  );
};

// ───────────────────────── Anneau ─────────────────────────

export interface Slice {
  label: string;
  value: number;
  color: string;
}

const polar = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`;
};

const SIZE = 196;
const STROKE = 26;

export const DonutChart: React.FC<{
  slices: Slice[];
  centerValue?: string;
  centerLabel?: string;
  noun?: string;
  legend?: boolean;
}> = ({ slices, centerValue, centerLabel = "Total", noun = "", legend = true }) => {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((s, p) => s + p.value, 0);
  const c = SIZE / 2;
  const r = (SIZE - STROKE) / 2 - 4;
  const GAP = 0.04;
  const visible = slices.filter((s) => s.value > 0);

  let angle = -Math.PI / 2;
  const arcs = slices.map((s, i) => {
    const sweep = total ? (s.value / total) * Math.PI * 2 : 0;
    const a0 = angle;
    angle += sweep;
    const gap = visible.length > 1 ? Math.min(GAP, sweep / 3) : 0;
    return { s, i, d: sweep > 0 ? arc(c, c, r, a0 + gap / 2, a0 + sweep - gap / 2 - (visible.length === 1 ? 0.0001 : 0)) : "" };
  });

  const active = hover !== null ? slices[hover] : null;
  const shown = active ? active.value.toLocaleString("fr-FR") : centerValue ?? total.toLocaleString("fr-FR");
  const shownLabel = active ? active.label : centerLabel;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center xl:flex-col 2xl:flex-row">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} role="img" aria-label="Graphique en anneau">
          <circle cx={c} cy={c} r={r} fill="none" stroke={CHART.track} strokeWidth={STROKE} opacity={total ? 0 : 1} />
          {arcs.map(({ s, i, d }) =>
            d ? (
              <path
                key={s.label}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={hover === i ? STROKE + 5 : STROKE}
                strokeLinecap="butt"
                opacity={hover !== null && hover !== i ? 0.35 : 1}
                style={{ transition: "all .15s" }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ) : null,
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          <span className="text-3xl font-black leading-none tracking-tight text-gray-950">{shown}</span>
          <span className="mt-1.5 text-xs text-gray-500">{shownLabel}</span>
        </div>
      </div>
      {legend && (
        <ul className="w-full min-w-0 max-w-xs space-y-2.5 text-sm">
          {slices.map((s, i) => (
            <li
              key={s.label}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="flex items-center gap-2.5"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-gray-600">{s.label}</span>
              <span className="font-bold text-gray-950">{s.value.toLocaleString("fr-FR")}</span>
              <span className="w-10 text-right text-xs text-gray-400">
                {total ? `${Math.round((s.value / total) * 100)} %` : "0 %"}
              </span>
            </li>
          ))}
          {noun && <li className="sr-only">{noun}</li>}
        </ul>
      )}
    </div>
  );
};

/** Anneau à une valeur : part contre un total, pourcentage au centre */
export const RingGauge: React.FC<{ label: string; value: number; total: number; color?: string }> = ({
  label,
  value,
  total,
  color = CHART.primary,
}) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <DonutChart
      legend={false}
      centerValue={`${pct} %`}
      centerLabel={label}
      slices={[
        { label, value, color },
        { label: "Reste", value: Math.max(0, total - value), color: CHART.track },
      ]}
    />
  );
};
