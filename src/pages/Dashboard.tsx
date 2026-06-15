import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Building,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Package,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { customerService } from "../services/customer.service";
import type { CustomerResponse } from "../services/customer.service";
import { memberService } from "../services/member.service";
import { subscriptionService } from "../services/subscription.service";
import { bookingService } from "../services/booking.service";
import { inventoryService } from "../services/inventory.service";
import { walletService } from "../services/wallet.service";
import { billingService } from "../services/billing.service";

type Tone = "blue" | "green" | "purple" | "orange" | "teal" | "red" | "indigo" | "rose" | "slate";

type StatCard = {
  title: string;
  value: string;
  detail: string;
  trend: "up" | "down";
  icon: React.ElementType;
  tone: Tone;
  progress?: number;
};

const toneClass: Record<Tone, { soft: string; text: string; ring: string; solid: string }> = {
  blue: { soft: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-100", solid: "bg-blue-500" },
  green: { soft: "bg-green-50", text: "text-green-700", ring: "ring-green-100", solid: "bg-green-500" },
  purple: { soft: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-100", solid: "bg-purple-500" },
  orange: { soft: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-100", solid: "bg-orange-500" },
  teal: { soft: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-100", solid: "bg-teal-500" },
  red: { soft: "bg-red-50", text: "text-red-700", ring: "ring-red-100", solid: "bg-red-500" },
  indigo: { soft: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-100", solid: "bg-indigo-500" },
  rose: { soft: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-100", solid: "bg-rose-500" },
  slate: { soft: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-100", solid: "bg-slate-500" },
};

const formatMoney = (value: number) =>
  `${value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} FCFA`;

const compactMoney = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M FCFA`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k FCFA`;
  return `${value.toLocaleString("fr-FR")} FCFA`;
};

const safeNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const percent = (value: number, total: number) => {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
};

const DonutChart: React.FC<{
  title: string;
  subtitle: string;
  data: { label: string; value: number; className: string; textClass: string }[];
}> = ({ title, subtitle, data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 25;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-primary-50 p-2 text-primary-600">
          <BarChart3 size={20} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative h-52 w-52 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="14" className="text-gray-100" />
            {data.map((item) => {
              const dash = (item.value / total) * circumference;
              const gap = circumference - dash;
              const currentOffset = offset;
              offset -= dash;
              return (
                <circle
                  key={item.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={currentOffset}
                  className={item.className}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-gray-950">{total}</span>
            <span className="text-xs font-medium text-gray-400">éléments</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          {data.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${item.className.replace("text-", "bg-")}`} />
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              <span className={`text-sm font-bold ${item.textClass}`}>{percent(item.value, total)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const HorizontalBars: React.FC<{
  title: string;
  subtitle: string;
  data: { label: string; value: number; compare?: number; tone: Tone }[];
}> = ({ title, subtitle, data }) => {
  const maxValue = Math.max(...data.flatMap((d) => [d.value, d.compare ?? 0]), 1);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-950">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-indigo-50 p-2 text-indigo-600">
          <Activity size={20} />
        </div>
      </div>

      <div className="space-y-5">
        {data.map((item) => {
          const tone = toneClass[item.tone];
          return (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                <span className="text-sm font-bold text-gray-950">{compactMoney(item.value)}</span>
              </div>
              <div className="space-y-2">
                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${tone.solid}`} style={{ width: `${Math.max(4, (item.value / maxValue) * 100)}%` }} />
                </div>
                {item.compare !== undefined && (
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(4, (item.compare / maxValue) * 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MiniTrend: React.FC<{ values: number[]; tone: Tone }> = ({ values, tone }) => {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 120;
      const y = 42 - ((value - min) / range) * 34;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 120 48" className="h-12 w-full overflow-visible">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={toneClass[tone].text} />
    </svg>
  );
};

const StatCardView: React.FC<{ stat: StatCard }> = ({ stat }) => {
  const Icon = stat.icon;
  const tone = toneClass[stat.tone];
  const TrendIcon = stat.trend === "up" ? ArrowUp : ArrowDown;

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full ${tone.soft}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-500">{stat.title}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-gray-950">{stat.value}</p>
          <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone.soft} ${tone.text}`}>
            <TrendIcon size={13} />
            {stat.detail}
          </div>
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${tone.soft} ${tone.text} ${tone.ring}`}>
          <Icon size={22} />
        </div>
      </div>
      {typeof stat.progress === "number" && (
        <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${tone.solid}`} style={{ width: `${Math.max(4, Math.min(100, stat.progress))}%` }} />
        </div>
      )}
    </div>
  );
};

const CleanTable: React.FC<{
  title: string;
  countLabel: string;
  children: React.ReactNode;
}> = ({ title, countLabel, children }) => (
  <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100">
    <div className="flex items-center justify-between gap-4 px-6 py-5">
      <h2 className="text-lg font-bold text-gray-950">{title}</h2>
      <span className="rounded-full bg-gray-50 px-3 py-1 text-sm font-medium text-gray-500">{countLabel}</span>
    </div>
    <div className="overflow-x-auto px-3 pb-3">{children}</div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["dashboard-customers"],
    queryFn: () => customerService.getAllCustomers(false) as Promise<CustomerResponse[]>,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["dashboard-members"],
    queryFn: () => memberService.getAllMembers(),
  });

  const { data: subscriptionsData } = useQuery({
    queryKey: ["dashboard-subscriptions"],
    queryFn: () => subscriptionService.getSubscriptions({ size: 100 }),
  });

  const { data: bookingsData } = useQuery({
    queryKey: ["dashboard-bookings"],
    queryFn: () => bookingService.getBookings({ size: 100 }),
  });

  const { data: inventoryMetrics } = useQuery({
    queryKey: ["dashboard-inventory"],
    queryFn: () => inventoryService.getDashboardMetrics(),
  });

  const { data: walletsData } = useQuery({
    queryKey: ["dashboard-wallets"],
    queryFn: () => walletService.getWallets({ size: 100 }),
  });

  const { data: billingData } = useQuery({
    queryKey: ["dashboard-billing"],
    queryFn: () => billingService.getDocuments({ size: 100 }),
  });

  const dashboard = useMemo(() => {
    const customerList = customers || [];
    const memberList = members || [];
    const subscriptionList = subscriptionsData?.content || [];
    const bookingList = bookingsData?.data || [];
    const walletList = walletsData?.content || [];
    const billingList = billingData?.content || [];

    const totalCustomers = customerList.length;
    const totalMembers = memberList.length;
    const activeCustomers = customerList.filter((c) => c.status === "ACTIVE").length;
    const activeMembers = memberList.filter((m: any) => m.status === "ACTIVE").length;
    const activeSubscriptions = subscriptionList.filter((s: any) => s.status === "ACTIVE").length;
    const pendingSubscriptions = subscriptionList.filter((s: any) => s.status === "PENDING_ACTIVATION").length;
    const confirmedBookings = bookingList.filter((b: any) => b.status === "CONFIRMED").length;
    const pendingBookings = bookingList.filter((b: any) => b.status === "PENDING_APPROVAL").length;
    const openAlerts = safeNumber((inventoryMetrics as any)?.openAlerts);
    const lowStockAlerts = safeNumber((inventoryMetrics as any)?.lowStockAlerts);
    const totalStockValue = safeNumber((inventoryMetrics as any)?.totalStockValue);
    const totalWallets = walletList.length;
    const totalWalletBalance = walletList.reduce((sum: number, w: any) => sum + safeNumber(w.availableBalance), 0);
    const totalHeldBalance = walletList.reduce((sum: number, w: any) => sum + safeNumber(w.heldBalance), 0);
    const invoices = billingList.filter((d: any) => d.documentType === "INVOICE");
    const unpaidInvoices = invoices.filter((d: any) => d.status === "ISSUED" || d.status === "PARTIALLY_PAID" || d.status === "OVERDUE").length;
    const paidInvoices = invoices.filter((d: any) => d.status === "PAID").length;
    const totalOutstanding = invoices.reduce((sum: number, d: any) => sum + safeNumber(d.balanceDue), 0);
    const totalBilled = invoices.reduce((sum: number, d: any) => sum + safeNumber(d.totalAmount), 0);
    const totalCollected = Math.max(0, totalBilled - totalOutstanding);
    const recoveryRate = percent(totalCollected, totalBilled);

    return {
      customerList,
      memberList,
      subscriptionList,
      bookingList,
      walletList,
      billingList,
      totalCustomers,
      totalMembers,
      activeCustomers,
      activeMembers,
      activeSubscriptions,
      pendingSubscriptions,
      confirmedBookings,
      pendingBookings,
      openAlerts,
      lowStockAlerts,
      totalStockValue,
      totalWallets,
      totalWalletBalance,
      totalHeldBalance,
      unpaidInvoices,
      paidInvoices,
      totalOutstanding,
      totalBilled,
      totalCollected,
      recoveryRate,
    };
  }, [customers, members, subscriptionsData, bookingsData, inventoryMetrics, walletsData, billingData]);

  const recentCustomers = useMemo(
    () =>
      [...dashboard.customerList]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [dashboard.customerList],
  );

  const recentMembers = useMemo(
    () =>
      [...dashboard.memberList]
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [dashboard.memberList],
  );

  const stats: StatCard[] = [
    {
      title: "Customers actifs",
      value: dashboard.totalCustomers.toString(),
      detail: `${dashboard.activeCustomers} actifs`,
      trend: "up",
      icon: Building2,
      tone: "blue",
      progress: percent(dashboard.activeCustomers, dashboard.totalCustomers),
    },
    {
      title: "Membres actifs",
      value: dashboard.totalMembers.toString(),
      detail: `${dashboard.activeMembers} actifs`,
      trend: "up",
      icon: Users,
      tone: "green",
      progress: percent(dashboard.activeMembers, dashboard.totalMembers),
    },
    {
      title: "Abonnements",
      value: dashboard.activeSubscriptions.toString(),
      detail: `${dashboard.pendingSubscriptions} en attente`,
      trend: "up",
      icon: CreditCard,
      tone: "purple",
      progress: percent(dashboard.activeSubscriptions, dashboard.activeSubscriptions + dashboard.pendingSubscriptions),
    },
    {
      title: "Réservations",
      value: dashboard.confirmedBookings.toString(),
      detail: `${dashboard.pendingBookings} à valider`,
      trend: dashboard.pendingBookings > dashboard.confirmedBookings ? "down" : "up",
      icon: Calendar,
      tone: "orange",
      progress: percent(dashboard.confirmedBookings, dashboard.confirmedBookings + dashboard.pendingBookings),
    },
    {
      title: "Stock valorisé",
      value: compactMoney(dashboard.totalStockValue),
      detail: `${dashboard.lowStockAlerts} alertes stock`,
      trend: dashboard.lowStockAlerts > 0 ? "down" : "up",
      icon: Package,
      tone: "teal",
      progress: dashboard.lowStockAlerts > 0 ? 35 : 90,
    },
    {
      title: "Alertes ouvertes",
      value: dashboard.openAlerts.toString(),
      detail: `${dashboard.lowStockAlerts} stock bas`,
      trend: dashboard.openAlerts > 0 ? "down" : "up",
      icon: AlertCircle,
      tone: "red",
      progress: dashboard.openAlerts > 0 ? 70 : 8,
    },
    {
      title: "Portefeuilles",
      value: dashboard.totalWallets.toString(),
      detail: compactMoney(dashboard.totalWalletBalance),
      trend: "up",
      icon: Wallet,
      tone: "indigo",
      progress: percent(dashboard.totalWalletBalance, dashboard.totalWalletBalance + dashboard.totalHeldBalance),
    },
    {
      title: "Factures impayées",
      value: dashboard.unpaidInvoices.toString(),
      detail: compactMoney(dashboard.totalOutstanding),
      trend: dashboard.unpaidInvoices > 0 ? "down" : "up",
      icon: FileText,
      tone: "rose",
      progress: 100 - dashboard.recoveryRate,
    },
  ];

  if (customersLoading || membersLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-900 px-6 py-5 text-white shadow-sm">
  <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />

  <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
    <div>
      <h1 className="text-2xl font-black tracking-tight md:text-3xl">
        Tableau de bord
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-300">
        Suivi consolidé de l’activité.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4 xl:min-w-[620px]">
      <HeroMetric label="CA facturé" value={compactMoney(dashboard.totalBilled)} />
      <HeroMetric label="Encaissements" value={compactMoney(dashboard.totalCollected)} />
      <HeroMetric label="Recouvrement" value={`${dashboard.recoveryRate}%`} />
      <HeroMetric label="Créances" value={compactMoney(dashboard.totalOutstanding)} danger />
    </div>
  </div>
</div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCardView key={stat.title} stat={stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <DonutChart
            title="Répartition commerciale"
            subtitle="Poids des clients, membres, souscriptions et réservations."
            data={[
              { label: "Customers", value: dashboard.totalCustomers, className: "text-blue-500", textClass: "text-blue-600" },
              { label: "Members", value: dashboard.totalMembers, className: "text-emerald-500", textClass: "text-emerald-600" },
              { label: "Abonnements", value: dashboard.activeSubscriptions, className: "text-purple-500", textClass: "text-purple-600" },
              { label: "Réservations", value: dashboard.confirmedBookings, className: "text-orange-500", textClass: "text-orange-600" },
            ]}
          />

          <HorizontalBars
            title="Revenus et positions financières"
            subtitle="Comparaison des principaux montants visibles dans les modules financiers."
            data={[
              { label: "Facturé", value: dashboard.totalBilled, compare: dashboard.totalCollected, tone: "blue" },
              { label: "Portefeuilles", value: dashboard.totalWalletBalance, compare: dashboard.totalHeldBalance, tone: "indigo" },
              { label: "Stock", value: dashboard.totalStockValue, tone: "teal" },
              { label: "Créances", value: dashboard.totalOutstanding, tone: "rose" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 xl:col-span-1">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-950">Tendance synthétique</h2>
                <p className="mt-1 text-sm text-gray-500">Lecture rapide de l’activité.</p>
              </div>
              <div className="rounded-2xl bg-primary-50 p-2 text-primary-600">
                <TrendingUpIcon />
              </div>
            </div>
            <MiniTrend
              tone="purple"
              values={[
                dashboard.activeCustomers,
                dashboard.activeMembers,
                dashboard.activeSubscriptions,
                dashboard.confirmedBookings,
                dashboard.totalWallets,
                dashboard.recoveryRate,
              ]}
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <SmallMetric label="Clients + membres" value={(dashboard.totalCustomers + dashboard.totalMembers).toString()} />
              <SmallMetric label="Alertes" value={dashboard.openAlerts.toString()} danger={dashboard.openAlerts > 0} />
            </div>
          </div>

          <CleanTable title="Derniers customers" countLabel={`${dashboard.totalCustomers} au total`}>
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomers.map((customer) => (
                  <tr key={customer.customerId} className="rounded-2xl bg-gray-50 transition-colors hover:bg-primary-50/40">
                    <td className="rounded-l-2xl px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-gray-500 ring-1 ring-gray-100">
                          {customer.type === "PERSON" ? <User size={15} /> : <Building size={15} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {customer.type === "PERSON" ? `${customer.firstname} ${customer.lastname}` : customer.companyName}
                          </p>
                          <p className="text-xs text-gray-400">{customer.customerId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-600">{customer.email}</td>
                    <td className="px-3 py-3"><Badge label={customer.type === "PERSON" ? "Personne" : "Compagnie"} tone={customer.type === "PERSON" ? "blue" : "purple"} /></td>
                    <td className="rounded-r-2xl px-3 py-3"><StatusBadge status={customer.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CleanTable>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <CleanTable title="Derniers members" countLabel={`${dashboard.totalMembers} au total`}>
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2">Membre</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Portail</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((member: any) => (
                  <tr key={member.memberId} className="bg-gray-50 transition-colors hover:bg-primary-50/40">
                    <td className="rounded-l-2xl px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                          <User size={15} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{member.fullname}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-gray-500">{member.customerId}</td>
                    <td className="px-3 py-3"><StatusBadge status={member.status} /></td>
                    <td className="rounded-r-2xl px-3 py-3"><Badge label={member.portalAccess ? "Activé" : "Désactivé"} tone={member.portalAccess ? "blue" : "slate"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CleanTable>

          <CleanTable title="Dernières factures" countLabel={`${dashboard.unpaidInvoices} impayées`}>
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2">Facture</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2 text-right">Montant</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.billingList.slice(0, 5).map((doc: any) => (
                  <tr key={doc.documentNumber} className="bg-gray-50 transition-colors hover:bg-primary-50/40">
                    <td className="rounded-l-2xl px-3 py-3 font-mono text-xs font-semibold text-gray-700">{doc.documentNumber}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{doc.customerName || doc.customerCode || "—"}</td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-gray-950">{formatMoney(safeNumber(doc.totalAmount))}</td>
                    <td className="rounded-r-2xl px-3 py-3"><InvoiceStatusBadge status={doc.status} /></td>
                  </tr>
                ))}
                {dashboard.billingList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="rounded-2xl bg-gray-50 py-8 text-center text-sm text-gray-500">Aucune facture trouvée</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CleanTable>
        </div>
      </div>
    </AdminLayout>
  );
};

const HeroMetric: React.FC<{
  label: string;
  value: string;
  danger?: boolean;
}> = ({ label, value, danger }) => (
  <div className="min-w-0">
    <p className="text-xs font-medium text-slate-400">{label}</p>
    <p
      className={`mt-1 truncate text-base font-black md:text-lg ${
        danger ? "text-red-200" : "text-white"
      }`}
    >
      {value}
    </p>
  </div>
);

const SmallMetric: React.FC<{ label: string; value: string; danger?: boolean }> = ({ label, value, danger }) => (
  <div className="rounded-2xl bg-gray-50 p-4">
    <p className="text-xs font-semibold text-gray-400">{label}</p>
    <p className={`mt-2 text-xl font-black ${danger ? "text-red-600" : "text-gray-950"}`}>{value}</p>
  </div>
);

const Badge: React.FC<{ label: string; tone: Tone }> = ({ label, tone }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass[tone].soft} ${toneClass[tone].text}`}>{label}</span>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const tone: Tone = status === "ACTIVE" ? "green" : status === "PENDING" ? "orange" : status === "INACTIVE" ? "slate" : "red";
  return <Badge label={status} tone={tone} />;
};

const InvoiceStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === "PAID") return <Badge label="Payée" tone="green" />;
  if (status === "PARTIALLY_PAID") return <Badge label="Partielle" tone="orange" />;
  if (status === "OVERDUE") return <Badge label="Retard" tone="red" />;
  return <Badge label="Émise" tone="slate" />;
};

const TrendingUpIcon: React.FC = () => <ArrowUp size={20} />;
