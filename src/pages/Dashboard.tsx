import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  AlertCircle,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  CreditCard,
  FileText,
  Package,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { reportingService, paymentMethodLabels } from "../services/reporting.service";
import type { PaymentDailySeries } from "../services/reporting.service";
import { bookingService } from "../services/booking.service";
import { subscriptionService } from "../services/subscription.service";
import { inventoryService } from "../services/inventory.service";
import { Skeleton } from "../components/ui/Skeleton";
import { brandVars, LOGO_PINK } from "../components/layout/adminTheme";

/* ───────────── Style commun ───────────── */

const PINK_SOFT = "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)]";
const PINK_ACTIVE = "bg-[color:color-mix(in_srgb,var(--logo-pink)_24%,white)] text-[color:var(--logo-pink-dark)]";
const PINK_TEXT = "text-[color:var(--logo-pink-dark)]";
const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]";

const CHART_COLORS = [LOGO_PINK, "#E4C7D6", "#E8A33D", "#7FB08A", "#9B8FD1", "#B9B4B0"];

/* ───────────── Formats ───────────── */

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const periodRange = (days: number) => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from: iso(from), to: iso(to) };
};

const safeNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const compactMoney = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M FCFA`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k FCFA`;
  return `${value.toLocaleString("fr-FR")} FCFA`;
};

const formatMoney = (value: number) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;

const axisMoney = (value: number) => {
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${+(value / 1_000).toFixed(0)}k`;
  return `${Math.round(value)}`;
};

/* Échelle lisible : 4 graduations régulières (ex. 60k, 120k, 180k, 240k) */
const niceStep = (maxValue: number) => {
  if (maxValue <= 0) return 1;
  const raw = maxValue / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  const pick = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((c) => c >= n) ?? 10;
  return pick * p;
};

/* « 12,4M FCFA » devient ["12,4M", "FCFA"] pour afficher l'unité en plus petit */
const splitMoney = (text: string): [string, string] => {
  const i = text.lastIndexOf(" ");
  return i === -1 ? [text, ""] : [text.slice(0, i), text.slice(i + 1)];
};

const shortDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const shortMonth = (value: string) => {
  const d = /^\d{4}-\d{2}/.test(value) ? new Date(`${value.slice(0, 7)}-01`) : new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
};

/* ───────────── Briques ───────────── */

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) => (
  <section className={`rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
    {children}
  </section>
);

const CardHead: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({ title, sub, right }) => (
  <div className="mb-5 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h2 className="text-base font-bold tracking-tight text-gray-950 sm:text-lg">{title}</h2>
      {sub && <p className="mt-0.5 text-sm text-gray-400">{sub}</p>}
    </div>
    {right}
  </div>
);

const PillLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link
    to={to}
    className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3.5 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 ${FOCUS}`}
  >
    {children}
    <ChevronRight size={15} />
  </Link>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="flex min-h-[8rem] items-center justify-center rounded-2xl bg-gray-50 px-4 text-center text-sm text-gray-500">
    {text}
  </p>
);

const TrendChip: React.FC<{ value?: number | null }> = ({ value }) => {
  if (value === undefined || value === null || !Number.isFinite(value)) return null;
  const up = value > 0;
  const down = value < 0;
  const Icon = down ? TrendingDown : TrendingUp;
  const tone = up ? "bg-emerald-50 text-emerald-700" : down ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${tone}`}>
      <Icon size={13} />
      {up ? "+" : ""}
      {value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
    </span>
  );
};

/* Carte KPI : titre en haut, chiffre dans un encart clair, tendance par rapport à la période précédente */
const KpiCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value?: string;
  unit?: string;
  trend?: number | null;
  sub?: string;
  to: string;
  loading?: boolean;
  className?: string;
}> = ({ icon: Icon, label, value, unit, trend, sub, to, loading, className = "" }) => (
  <Link
    to={to}
    className={`group flex min-w-0 flex-col gap-3 rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${FOCUS} ${className}`}
  >
    <div className="flex items-center justify-between gap-2 px-2 pt-1.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:flex border-gray-100 bg-white text-gray-600 shadow-sm">
          <Icon size={17} />
        </span>
        <span className="truncate text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <ArrowUpRight size={16} className="hidden shrink-0 text-gray-300 transition-colors sm:block group-hover:text-[color:var(--logo-pink-dark)]" />
    </div>

    {loading ? (
      <Skeleton className="min-h-[6.5rem] flex-1 rounded-2xl" />
    ) : (
      <div className="flex flex-1 flex-col justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-4">
        <p className="truncate text-3xl font-bold leading-none tracking-tight tabular-nums text-gray-950 sm:text-4xl">
          {value ?? "0"}
          {unit && <span className="ml-1.5 text-sm font-semibold tracking-normal text-gray-400">{unit}</span>}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <p className="truncate text-xs text-gray-500">{sub}</p>
          <TrendChip value={trend} />
        </div>
      </div>
    )}
  </Link>
);

/* ───────────── Graphiques (SVG maison, aucune dépendance) ───────────── */

const LINES = [
  { key: "total", label: "Total", color: LOGO_PINK, width: 2.75 },
  { key: "cash", label: "Espèces", color: "#B9B4B0", width: 2 },
  { key: "mobileMoney", label: "Mobile Money", color: "#E8A33D", width: 2 },
] as const;

const smoothPath = (pts: [number, number][]) => {
  if (pts.length < 2) return "";
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${clamp(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${clamp(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${p2[0]},${p2[1]}`;
  }
  return d;
};

const LineChart: React.FC<{ data: PaymentDailySeries[] }> = ({ data }) => {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const n = data.length;

  if (n < 2) return <Empty text="Pas assez de données sur la période" />;

  const step = niceStep(Math.max(...data.flatMap((d) => LINES.map((l) => safeNumber(d[l.key])))));
  const max = step * 4;
  const x = (i: number) => (i / (n - 1)) * 100;
  const y = (v: number) => 94 - (v / max) * 88;
  const ticks = [max, step * 3, step * 2, step, 0];
  const labelIdx = Array.from({ length: 6 }, (_, k) => Math.round((k * (n - 1)) / 5));

  const linePoints = (key: (typeof LINES)[number]["key"]) =>
    data.map((d, i) => [x(i), y(safeNumber(d[key]))] as [number, number]);
  const totalPts = linePoints("total");
  const areaPath = `${smoothPath(totalPts)} L100,94 L0,94 Z`;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - r.left) / r.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  };

  return (
    <div>
      <div className="relative h-56 pl-11 sm:h-64 lg:h-72">
        <div className="absolute left-0 top-0 h-full w-10">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-1 -translate-y-1/2 text-xs tabular-nums text-gray-400"
              style={{ top: `${y(t)}%` }}
            >
              {axisMoney(t)}
            </span>
          ))}
        </div>

        <div
          ref={ref}
          className="relative h-full cursor-crosshair"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none">
            {ticks.map((t) => (
              <line
                key={t}
                x1="0"
                x2="100"
                y1={y(t)}
                y2={y(t)}
                stroke="#EFEBE9"
                strokeDasharray="3 4"
                style={{ vectorEffect: "non-scaling-stroke" }}
                strokeWidth={1}
              />
            ))}
            <path d={areaPath} fill={LOGO_PINK} fillOpacity={0.1} />
            {[...LINES].reverse().map((l) => (
              <path
                key={l.key}
                d={smoothPath(linePoints(l.key))}
                stroke={l.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={l.width}
                style={{ vectorEffect: "non-scaling-stroke" }}
              />
            ))}
          </svg>

          {hover !== null && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 border-l border-dashed border-gray-300"
                style={{ left: `${x(hover)}%` }}
              />
              {LINES.map((l) => (
                <span
                  key={l.key}
                  className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                  style={{ left: `${x(hover)}%`, top: `${y(safeNumber(data[hover][l.key]))}%`, backgroundColor: l.color }}
                />
              ))}
              <div
                className="pointer-events-none absolute top-1 z-10 min-w-[9.5rem] rounded-2xl border border-gray-100 bg-white p-3 text-xs shadow-lg"
                style={{
                  left: `${x(hover)}%`,
                  transform: hover > n * 0.6 ? "translateX(calc(-100% - 0.75rem))" : "translateX(0.75rem)",
                }}
              >
                <p className="mb-1.5 font-semibold text-gray-900">{shortDate(data[hover].date)}</p>
                {LINES.map((l) => (
                  <p key={l.key} className="flex items-center justify-between gap-4 py-0.5 text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </span>
                    <span className="font-semibold tabular-nums text-gray-900">{axisMoney(safeNumber(data[hover][l.key]))}</span>
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-between pl-11 text-xs text-gray-400">
        {labelIdx.map((i, k) => (
          <span key={`${i}-${k}`}>{shortDate(data[i].date)}</span>
        ))}
      </div>
    </div>
  );
};

const Donut: React.FC<{ parts: { label: string; value: number }[] }> = ({ parts }) => {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const sorted = [...parts].filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  if (total <= 0) return <Empty text="Aucun paiement sur la période" />;

  let cursor = 0;
  const arcs = sorted.map((p, i) => {
    const len = (p.value / total) * 100;
    const arc = { ...p, len, offset: -cursor, color: CHART_COLORS[i % CHART_COLORS.length], share: Math.round(len) };
    cursor += len;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-44 w-44 shrink-0 sm:h-48 sm:w-48">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" fill="none" strokeWidth={15} aria-hidden="true">
          <circle cx="50" cy="50" r="40" stroke="#F4F1EF" />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx="50"
              cy="50"
              r="40"
              pathLength={100}
              stroke={a.color}
              strokeDasharray={`${Math.max(0, a.len - 0.8)} ${100 - Math.max(0, a.len - 0.8)}`}
              strokeDashoffset={a.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-3xl font-bold tracking-tight tabular-nums text-gray-950">{arcs[0].share}%</p>
          <p className="max-w-[6rem] truncate text-xs text-gray-500">{arcs[0].label}</p>
        </div>
      </div>
      <ul className="w-full space-y-2.5 text-sm">
        {arcs.map((a) => (
          <li key={a.label} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
            <span className="truncate text-gray-700">{a.label}</span>
            <span className="ml-auto font-bold tabular-nums text-gray-950">{a.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const BarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <Empty text="Aucun abonnement à afficher" />;
  const max = Math.max(1, ...data.map((d) => d.value));
  const active = hover ?? data.length - 1;

  return (
    <div className="flex min-h-[14rem] flex-1 items-stretch gap-2.5 pt-8 sm:gap-3">
      {data.map((d, i) => {
        const isActive = i === active;
        return (
          <button
            key={`${d.label}-${i}`}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="flex min-w-0 flex-1 flex-col items-stretch gap-2 focus:outline-none"
            aria-label={`${d.label} : ${formatMoney(d.value)}`}
          >
            <div className="flex flex-1 items-end">
              <div
                className={`relative w-full rounded-2xl transition-colors ${isActive ? "" : "bg-[#EFE6EB] hover:bg-[#E6D6DF]"}`}
                style={{
                  height: `${Math.max(6, (d.value / max) * 100)}%`,
                  backgroundColor: isActive ? LOGO_PINK : undefined,
                }}
              >
                {isActive && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-xs font-bold tabular-nums text-gray-900 shadow-md ring-1 ring-gray-100">
                    {axisMoney(d.value)}
                  </span>
                )}
              </div>
            </div>
            <span className={`text-xs font-medium capitalize ${isActive ? "text-gray-900" : "text-gray-400"}`}>{d.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/* Ligne « classement » : nom, pourcentage, barre, deux petits chiffres */
const RankRow: React.FC<{
  name: string;
  percent: number;
  left: string;
  right: string;
}> = ({ name, percent, left, right }) => {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="truncate text-sm font-medium text-gray-600">{name}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-gray-950">
        {p.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full" style={{ width: `${Math.max(3, p)}%`, backgroundColor: LOGO_PINK }} />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-gray-500">
        <span className="truncate">{left}</span>
        <span className="truncate font-semibold tabular-nums text-gray-700">{right}</span>
      </div>
    </div>
  );
};

/* Ligne « à surveiller » */
const InsightRow: React.FC<{
  icon: React.ElementType;
  title: string;
  text: string;
  tone?: "warn" | "danger" | "quiet";
  to?: string;
}> = ({ icon: Icon, title, text, tone = "quiet", to }) => {
  const iconTone =
    tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-gray-400";
  const body = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100 ${iconTone}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${tone === "quiet" ? "text-gray-500" : "text-gray-900"}`}>{title}</span>
        <span className="mt-0.5 block truncate text-xs text-gray-500">{text}</span>
      </span>
      {to && <ChevronRight size={16} className="shrink-0 text-gray-300" />}
    </>
  );
  const cls = "flex items-center gap-3 rounded-2xl bg-gray-50 p-3 transition-colors";
  return to ? (
    <Link to={to} className={`${cls} hover:bg-gray-100 ${FOCUS}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
};

const bookingStatus: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "Confirmée", cls: `${PINK_SOFT} ${PINK_TEXT}` },
  PENDING_APPROVAL: { label: "À valider", cls: "bg-amber-50 text-amber-700" },
  IN_PROGRESS: { label: "En cours", cls: "bg-emerald-50 text-emerald-700" },
  COMPLETED: { label: "Terminée", cls: "bg-gray-100 text-gray-600" },
  CANCELLED: { label: "Annulée", cls: "bg-red-50 text-red-700" },
  REJECTED: { label: "Refusée", cls: "bg-red-50 text-red-700" },
  NO_SHOW: { label: "Absent", cls: "bg-red-50 text-red-700" },
  EXPIRED: { label: "Expirée", cls: "bg-gray-100 text-gray-600" },
  DRAFT: { label: "Brouillon", cls: "bg-gray-100 text-gray-600" },
};

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const s = bookingStatus[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
};

const PERIODS = [7, 30, 90] as const;

/* ───────────── Page ───────────── */

export const AdminDashboard: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const { from, to } = periodRange(days);

  const activity = useQuery({
    queryKey: ["dash-activity", from, to],
    queryFn: () => reportingService.getActivityReport({ from, to, compareWithPrevious: true }),
  });
  const payments = useQuery({
    queryKey: ["dash-payments", from, to],
    queryFn: () => reportingService.getPaymentsReport({ fromDate: from, toDate: to }),
  });
  const finance = useQuery({
    queryKey: ["dash-finance", from, to],
    queryFn: () => reportingService.getFinanceDashboard({ fromDate: from, toDate: to }),
  });
  const summary = useQuery({
    queryKey: ["dash-summary", from, to],
    queryFn: () => reportingService.getDashboardSummary({ fromDate: from, toDate: to }),
  });
  const live = useQuery({
    queryKey: ["dash-live"],
    queryFn: () => reportingService.getLiveKpis(),
  });
  const subscriptionsAnalytics = useQuery({
    queryKey: ["dash-subscription-analytics"],
    queryFn: () => reportingService.getSubscriptionAnalytics({ months: 6, renewalDays: 30 }),
  });
  const utilization = useQuery({
    queryKey: ["dash-utilization", from, to],
    queryFn: () => reportingService.getResourceUtilizationReport({ from, to }),
  });
  const bookingMetrics = useQuery({
    queryKey: ["dash-booking-metrics"],
    queryFn: () => bookingService.getMetrics(),
  });
  const subscriptionMetrics = useQuery({
    queryKey: ["dash-subscription-metrics"],
    queryFn: () => subscriptionService.getSubscriptionMetrics(),
  });
  const inventoryMetrics = useQuery({
    queryKey: ["dash-inventory"],
    queryFn: () => inventoryService.getDashboardMetrics(),
  });

  const a = activity.data;
  const todayLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const paymentParts = (payments.data?.byMethod ?? []).map((m) => ({
    label: paymentMethodLabels[m.method] ?? m.method,
    value: safeNumber(m.amount),
  }));

  const mrrBars = (subscriptionsAnalytics.data?.mrrTrend ?? []).map((m) => ({
    label: shortMonth(m.month),
    value: safeNumber(m.mrr),
  }));

  const plans = (() => {
    const list = subscriptionsAnalytics.data?.activeByPlan ?? [];
    const total = list.reduce((s, p) => s + safeNumber(p.subscriptionCount), 0);
    return [...list]
      .sort((x, y) => safeNumber(y.subscriptionCount) - safeNumber(x.subscriptionCount))
      .slice(0, 3)
      .map((p) => ({ ...p, share: total > 0 ? (safeNumber(p.subscriptionCount) / total) * 100 : 0 }));
  })();

  const topResources = [...(utilization.data?.resources ?? [])]
    .sort((x, y) => safeNumber(y.occupancyRate) - safeNumber(x.occupancyRate))
    .slice(0, 3);

  const pendingBookings = safeNumber(bookingMetrics.data?.pendingApprovalBookings);
  const pendingSubscriptions = safeNumber(subscriptionMetrics.data?.pendingSubscriptions);
  const overdueCount = safeNumber(finance.data?.overdueCount);
  const overdueAmount = safeNumber(finance.data?.overdueAmount);
  const stockAlerts = safeNumber((inventoryMetrics.data as any)?.openAlerts);
  const lowStock = safeNumber((inventoryMetrics.data as any)?.lowStockAlerts);
  const pendingKyc = safeNumber(summary.data?.summary?.pendingKyc);
  const backendAlerts = (summary.data?.alerts ?? []).slice(0, 2);
  const recentBookings = (summary.data?.recentBookings ?? []).slice(0, 5);

  const todayItems = live.data
    ? [
        { label: "réservations", value: safeNumber(live.data.todayBookings).toLocaleString("fr-FR") },
        { label: "encaissés", value: compactMoney(safeNumber(live.data.todayRevenue)) },
        { label: "d'occupation", value: `${Math.round(safeNumber(live.data.occupancyRate))}%` },
        { label: "check-ins à venir", value: safeNumber(live.data.pendingCheckins).toLocaleString("fr-FR") },
      ]
    : [];

  return (
    <AdminLayout>
      <div style={brandVars} className="space-y-5 sm:space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 px-1">
          <div>
            <p className="text-sm font-medium text-gray-400 first-letter:uppercase">{todayLabel}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl 2xl:text-4xl">
              Tableau de bord
            </h1>
          </div>

          <div role="group" aria-label="Période" className="inline-flex rounded-full border border-gray-200 bg-white p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                aria-pressed={days === p}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${FOCUS} ${
                  days === p ? PINK_ACTIVE : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p} j
              </button>
            ))}
          </div>
        </header>

        {todayItems.length > 0 && (
          <div className="flex items-center gap-x-6 gap-y-2 overflow-x-auto rounded-full border border-gray-100 bg-white px-5 py-3 text-sm shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${PINK_SOFT} ${PINK_TEXT}`}>
              Aujourd'hui
            </span>
            {todayItems.map((item) => (
              <span key={item.label} className="shrink-0 text-gray-500">
                <span className="font-bold tabular-nums text-gray-950">{item.value}</span> {item.label}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-12 lg:gap-4">
          {/* KPI */}
          <KpiCard
            className="order-2 lg:order-1 lg:col-span-3"
            icon={Wallet}
            label="Encaissements"
            to="/payments"
            loading={activity.isLoading}
            value={a ? splitMoney(compactMoney(safeNumber(a.payments.totalReceived)))[0] : undefined}
            unit="FCFA"
            trend={a?.payments.variation?.changePercent}
            sub={a ? `${safeNumber(a.payments.transactionCount)} transactions` : undefined}
          />
          <KpiCard
            className="order-2 lg:order-2 lg:col-span-3"
            icon={Calendar}
            label="Réservations"
            to="/bookings"
            loading={activity.isLoading}
            value={a ? safeNumber(a.bookings.totalCount).toLocaleString("fr-FR") : undefined}
            trend={a?.bookings.variation?.changePercent}
            sub={a ? `${safeNumber(a.bookings.confirmedCount)} confirmées` : undefined}
          />
          <KpiCard
            className="order-2 lg:order-3 lg:col-span-3"
            icon={Users}
            label="Membres actifs"
            to="/members"
            loading={activity.isLoading}
            value={a ? safeNumber(a.members.totalActive).toLocaleString("fr-FR") : undefined}
            trend={a?.members.variation?.changePercent}
            sub={a ? `${safeNumber(a.members.newCount)} nouveaux` : undefined}
          />
          <KpiCard
            className="order-2 lg:order-4 lg:col-span-3"
            icon={CreditCard}
            label="Abonnements actifs"
            to="/subscriptions"
            loading={activity.isLoading}
            value={a ? safeNumber(a.subscriptions.activeCount).toLocaleString("fr-FR") : undefined}
            trend={a?.subscriptions.variation?.changePercent}
            sub={a ? `${safeNumber(a.subscriptions.newCount)} nouveaux` : undefined}
          />

          {/* Encaissements dans le temps */}
          <Card className="order-3 col-span-2 lg:order-5 lg:col-span-8">
            <CardHead
              title="Encaissements"
              sub={`${days} derniers jours`}
              right={
                <div className="hidden flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-gray-500 sm:flex">
                  {LINES.map((l) => (
                    <span key={l.key} className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              }
            />
            {payments.isLoading ? (
              <Skeleton className="h-72 rounded-2xl" />
            ) : payments.isError ? (
              <Empty text="Données indisponibles" />
            ) : (
              <>
                <div className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <p className="text-3xl font-bold leading-none tracking-tight tabular-nums text-gray-950 sm:text-4xl">
                    {splitMoney(compactMoney(safeNumber(payments.data?.totalReceived)))[0]}
                    <span className="ml-2 text-base font-semibold tracking-normal text-gray-400 sm:text-lg">FCFA</span>
                  </p>
                  {finance.data && (
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${PINK_SOFT} ${PINK_TEXT}`}>
                      {Math.round(safeNumber(finance.data.collectionRate))}% recouvré
                    </span>
                  )}
                </div>
                <LineChart data={payments.data?.dailySeries ?? []} />
              </>
            )}
          </Card>

          {/* Modes de paiement */}
          <Card className="order-4 col-span-2 lg:order-6 lg:col-span-4">
            <CardHead title="Modes de paiement" sub="Répartition des montants" />
            {payments.isLoading ? (
              <Skeleton className="h-72 rounded-2xl" />
            ) : payments.isError ? (
              <Empty text="Données indisponibles" />
            ) : (
              <Donut parts={paymentParts} />
            )}
          </Card>

          {/* Revenus récurrents */}
          <Card className="order-5 col-span-2 flex flex-col lg:order-7 lg:col-span-5">
            <CardHead
              title="Revenus récurrents"
              sub="MRR sur 6 mois"
              right={
                subscriptionsAnalytics.data && (
                  <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${PINK_SOFT} ${PINK_TEXT}`}>
                    {compactMoney(safeNumber(subscriptionsAnalytics.data.currentMrr))}
                  </span>
                )
              }
            />
            {subscriptionsAnalytics.isLoading ? (
              <Skeleton className="h-56 rounded-2xl" />
            ) : subscriptionsAnalytics.isError ? (
              <Empty text="Données indisponibles" />
            ) : (
              <BarChart data={mrrBars} />
            )}
          </Card>

          {/* Dernières réservations */}
          <Card className="order-6 col-span-2 lg:order-8 lg:col-span-7">
            <CardHead title="Dernières réservations" sub={`${recentBookings.length} récentes`} right={<PillLink to="/bookings">Voir plus</PillLink>} />
            {summary.isLoading ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : summary.isError ? (
              <Empty text="Données indisponibles" />
            ) : recentBookings.length === 0 ? (
              <Empty text="Aucune réservation récente" />
            ) : (
              <>
                <div className="hidden md:block">
                  <div className="grid grid-cols-[1.6fr_1.2fr_0.9fr_0.9fr] gap-3 rounded-xl bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500">
                    <span>Ressource</span>
                    <span>Client</span>
                    <span>Statut</span>
                    <span className="text-right">Montant</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {recentBookings.map((b) => (
                      <div
                        key={b.bookingNumber}
                        className="grid grid-cols-[1.6fr_1.2fr_0.9fr_0.9fr] items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors hover:bg-gray-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-gray-900">{b.resourceName}</span>
                          <span className="block truncate text-xs text-gray-400">
                            {new Date(b.startedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </span>
                        <span className="truncate text-gray-600">{b.ownerName}</span>
                        <span>
                          <StatusChip status={b.status} />
                        </span>
                        <span className="text-right font-bold tabular-nums text-gray-950">{compactMoney(safeNumber(b.amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-0.5 md:hidden">
                  {recentBookings.map((b) => (
                    <div key={b.bookingNumber} className="flex items-center gap-3 rounded-2xl px-2 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{b.resourceName}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-400">{b.ownerName}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="text-sm font-bold tabular-nums text-gray-950">{compactMoney(safeNumber(b.amount))}</p>
                        <StatusChip status={b.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* À surveiller : passe en premier sur mobile */}
          <Card className="order-1 col-span-2 lg:order-9 lg:col-span-4">
            <CardHead title="À surveiller" sub="Ce qui demande une action" />
            <div className="space-y-2">
              <InsightRow
                icon={Calendar}
                title="Réservations à valider"
                text={pendingBookings > 0 ? `${pendingBookings} en attente de validation` : "Rien en attente"}
                tone={pendingBookings > 0 ? "warn" : "quiet"}
                to="/bookings"
              />
              <InsightRow
                icon={FileText}
                title="Factures en retard"
                text={overdueCount > 0 ? `${overdueCount} factures, ${compactMoney(overdueAmount)} à recouvrer` : "Aucune facture en retard"}
                tone={overdueCount > 0 ? "danger" : "quiet"}
                to="/billing"
              />
              <InsightRow
                icon={CreditCard}
                title="Abonnements en attente"
                text={pendingSubscriptions > 0 ? `${pendingSubscriptions} à activer` : "Rien en attente"}
                tone={pendingSubscriptions > 0 ? "warn" : "quiet"}
                to="/subscriptions"
              />
              <InsightRow
                icon={Package}
                title="Alertes de stock"
                text={stockAlerts > 0 ? `${stockAlerts} ouvertes, ${lowStock} en stock bas` : "Stock en ordre"}
                tone={stockAlerts > 0 ? "danger" : "quiet"}
                to="/inventory"
              />
              {pendingKyc > 0 && (
                <InsightRow icon={ShieldCheck} title="Vérifications KYC" text={`${pendingKyc} en attente`} tone="warn" />
              )}
              {backendAlerts.map((alert) => (
                <InsightRow
                  key={alert.alertCode}
                  icon={AlertCircle}
                  title={alert.alertType}
                  text={alert.message}
                  tone="warn"
                />
              ))}
            </div>
            <div className="mt-4">
              <PillLink to="/reports">Voir les rapports</PillLink>
            </div>
          </Card>

          {/* Plans les plus souscrits */}
          <Card className="order-7 col-span-2 md:col-span-1 lg:order-10 lg:col-span-4">
            <CardHead title="Plans populaires" sub="Abonnements actifs" />
            {subscriptionsAnalytics.isLoading ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : plans.length === 0 ? (
              <Empty text="Aucun abonnement actif" />
            ) : (
              <div className="space-y-3">
                {plans.map((p) => (
                  <RankRow
                    key={p.planName}
                    name={p.planName}
                    percent={p.share}
                    left={`${safeNumber(p.subscriptionCount)} abonnements`}
                    right={compactMoney(safeNumber(p.totalAmount))}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Ressources les plus occupées */}
          <Card className="order-8 col-span-2 md:col-span-1 lg:order-11 lg:col-span-4">
            <CardHead title="Ressources" sub="Taux d'occupation" />
            {utilization.isLoading ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : topResources.length === 0 ? (
              <Empty text="Aucune réservation sur la période" />
            ) : (
              <div className="space-y-3">
                {topResources.map((r) => (
                  <RankRow
                    key={r.resourceCode}
                    name={r.resourceName}
                    percent={safeNumber(r.occupancyRate)}
                    left={`${safeNumber(r.totalBookings)} réservations`}
                    right={compactMoney(safeNumber(r.totalRevenue))}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};