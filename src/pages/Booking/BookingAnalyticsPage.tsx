import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, DollarSign, History, Plus, Trash2 } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { MarginRow, OccupancyRow, ResourceCostRequest } from "../../services/booking.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, HeadRow, IconButton, ItemRow, ListHeader, PanelForm, Section, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatDate, formatNumber } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { ResourceAutocomplete } from "../../components/resources/ResourceAutocomplete";
import { Cell, formatDuration } from "../../components/resources/resKit";
import { useAuth } from "../../contexts/AuthContext";
import { addDays, money, todayIso } from "../../components/bookings/bookingKit";

type Tab = "margins" | "occupancy" | "costs" | "prices";

const KIND_LABEL: Record<string, string> = { RENT: "Loyer", CLEANING: "Ménage", ENERGY: "Énergie", DEPRECIATION: "Amortissement", SERVICES: "Services", OTHER: "Autre" };
const BASIS_LABEL: Record<string, string> = { MONTHLY: "Par mois", PER_BOOKING: "Par réservation", PER_HOUR: "Par heure réservée" };
const GROUP_LABEL: Record<string, string> = { RESOURCE: "Ressource", TYPE: "Type", GROUP: "Groupe", SITE: "Site" };

const pct = (r?: number) => (r == null ? "" : `${(r * 100).toFixed(1)} %`);
const monthStart = () => `${todayIso().slice(0, 8)}01`;

const Range: React.FC<{ from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }> = ({ from, to, onFrom, onTo }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <Field label="Du"><input type="date" value={from} max={to} onChange={(e) => onFrom(e.target.value)} className={FIELD} /></Field>
    <Field label="Au"><input type="date" value={to} min={from} onChange={(e) => onTo(e.target.value)} className={FIELD} /></Field>
  </div>
);

const MARGIN_COLS = "lg:grid-cols-[minmax(0,1.4fr)_5rem_6rem_8rem_8rem_8rem_5rem]";

const Margins: React.FC = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [resourceCode, setResourceCode] = useState("");
  const [number, setNumber] = useState("");
  const [asked, setAsked] = useState("");
  const report = useQuery({ queryKey: ["booking-margins", from, to, resourceCode], queryFn: () => bookingService.getMargins({ from, to, resourceCode }) });
  const one = useQuery({ queryKey: ["booking-margin", asked], queryFn: () => bookingService.getBookingMargin(asked), enabled: !!asked, retry: false });
  const r = report.data;
  return (
    <div className="space-y-5">
      <Range from={from} to={to} onFrom={setFrom} onTo={setTo} />
      <Field label="Ressource"><ResourceAutocomplete selectedCode={resourceCode} onSelect={(x) => setResourceCode(x?.code ?? "")} placeholder="Toutes les ressources" /></Field>
      {report.isLoading ? <ListSkeleton /> : report.isError || !r ? <ErrorBlock message="Impossible de charger les marges." onRetry={() => report.refetch()} /> : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[["Chiffre d'affaires", r.revenue], ["Coûts", r.costs], ["Marge", r.margin]].map(([t, v]) => (
              <div key={t as string} className="rounded-[1.5rem] bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-400">{t}</p>
                <p className={`mt-1 text-xl font-black ${t === "Marge" && (v as number) < 0 ? "text-red-600" : "text-gray-950"}`}>{money(v as number, "XAF")}</p>
              </div>
            ))}
          </div>
          {r.rows.length === 0 ? <EmptyState icon={BarChart3} title="Aucune réservation sur la période" /> : (
            <DataCard>
              <HeadRow cols={MARGIN_COLS}><span>Ressource</span><span>Résa.</span><span>Durée</span><span>Chiffre d'affaires</span><span>Coûts</span><span>Marge</span><span>Taux</span></HeadRow>
              <div className="space-y-1">
                {r.rows.map((x: MarginRow) => (
                  <div key={x.resourceCode} className={`grid grid-cols-1 items-center gap-2 rounded-2xl px-4 py-3 lg:gap-4 ${MARGIN_COLS}`}>
                    <Cell title="Ressource"><span className="block truncate text-sm font-semibold text-gray-900">{x.resourceName || x.resourceCode}</span>
                      {x.costsByKind && Object.keys(x.costsByKind).length > 0 && <span className="block truncate text-xs text-gray-500">{Object.entries(x.costsByKind).map(([k, v]) => `${KIND_LABEL[k] ?? k} ${formatNumber(v)}`).join(" · ")}</span>}
                    </Cell>
                    <Cell title="Réservations"><span className="text-sm">{x.bookings}</span></Cell>
                    <Cell title="Durée"><span className="text-sm">{formatDuration(Number(x.bookedMinutes))}</span></Cell>
                    <Cell title="Chiffre d'affaires"><span className="text-sm">{money(x.revenue, "XAF")}</span></Cell>
                    <Cell title="Coûts"><span className="text-sm">{money(x.costs, "XAF")}</span></Cell>
                    <Cell title="Marge"><span className={`text-sm font-bold ${x.margin < 0 ? "text-red-600" : "text-gray-900"}`}>{money(x.margin, "XAF")}</span></Cell>
                    <Cell title="Taux"><span className="text-sm">{pct(x.marginRate)}</span></Cell>
                  </div>
                ))}
              </div>
            </DataCard>
          )}
        </>
      )}
      <Section title="Marge d'une réservation" description="Les coûts mensuels comptent au prorata de ses minutes sur les minutes ouvertes du mois.">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Numéro de réservation" className={FIELD} aria-label="Numéro de réservation" />
          <ActionButton variant="ghost" disabled={!number.trim()} onClick={() => setAsked(number.trim())}>Calculer</ActionButton>
        </div>
        {one.isError && <p className="mt-3 text-sm text-red-600">{apiMessage(one.error, "Réservation introuvable")}</p>}
        {one.data && (
          <p className="mt-3 text-sm text-gray-700">
            {one.data.bookingNumber} · {one.data.resourceCode} : chiffre d'affaires {money(one.data.revenue, "XAF")}, coûts {money(one.data.costs, "XAF")}, <span className="font-bold">marge {money(one.data.margin, "XAF")}</span>
          </p>
        )}
      </Section>
    </div>
  );
};

const Occupancy: React.FC = () => {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [groupBy, setGroupBy] = useState("RESOURCE");
  const [siteCode, setSiteCode] = useState("");
  const report = useQuery({ queryKey: ["booking-occupancy", from, to, groupBy, siteCode], queryFn: () => bookingService.getOccupancy({ from, to, groupBy, siteCode }) });
  const rows = report.data?.rows ?? [];
  return (
    <div className="space-y-5">
      <Range from={from} to={to} onFrom={setFrom} onTo={setTo} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Regrouper par">
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className={FIELD}>
            {Object.entries(GROUP_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Code du site (facultatif)"><input value={siteCode} onChange={(e) => setSiteCode(e.target.value)} className={FIELD} /></Field>
      </div>
      {report.data?.peakHours && <p className="text-xs text-gray-500">Heures pleines, du lundi au vendredi : {report.data.peakHours}</p>}
      {report.isLoading ? <ListSkeleton /> : report.isError ? <ErrorBlock message="Impossible de charger l'occupation." onRetry={() => report.refetch()} /> : rows.length === 0 ? <EmptyState icon={BarChart3} title="Aucune donnée sur la période" /> : (
        <div className="space-y-2">
          {rows.map((x: OccupancyRow) => (
            <ItemRow key={x.key}>
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-bold text-gray-900">{x.label || x.key}</p>
                <p className="shrink-0 text-lg font-black text-gray-950">{pct(x.occupancyRate)}</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-[color:var(--logo-pink-dark)]" style={{ width: `${Math.min(100, x.occupancyRate * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Réservé {formatDuration(Number(x.bookedMinutes))} sur {formatDuration(Number(x.openMinutes))} · pleines {pct(x.peakOccupancyRate)} · creuses {pct(x.offPeakOccupancyRate)} · {x.bookings} réservation(s) · {money(x.revenue, "XAF")}
              </p>
            </ItemRow>
          ))}
        </div>
      )}
    </div>
  );
};

const Costs: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("RESOURCE:UPDATE");
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ kind: "RENT", basis: "MONTHLY", amount: "", label: "", validFrom: "", validUntil: "" });
  const [error, setError] = useState<string | null>(null);
  const costs = useQuery({ queryKey: ["booking-costs", code], queryFn: () => bookingService.getResourceCosts(code), enabled: !!code });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["booking-costs", code] });
  const add = useMutation({
    mutationFn: () => {
      const body: ResourceCostRequest = {
        kind: form.kind,
        basis: form.basis,
        amount: Number(form.amount),
        label: form.label.trim() || undefined,
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
      };
      return bookingService.addResourceCost(code, body);
    },
    onSuccess: () => {
      toast.success("Coût ajouté");
      setAdding(false);
      setForm({ kind: "RENT", basis: "MONTHLY", amount: "", label: "", validFrom: "", validUntil: "" });
      refresh();
    },
    onError: (e) => setError(apiMessage(e, "Ajout impossible")),
  });
  const remove = (id: number | string, name: string) =>
    toast.confirm({
      tone: "danger",
      message: `Supprimer le coût « ${name} » ?`,
      confirmLabel: "Supprimer",
      successMessage: "Coût supprimé",
      errorMessage: "Suppression impossible",
      onConfirm: async () => {
        await bookingService.deleteResourceCost(id);
        refresh();
      },
    });
  return (
    <div className="space-y-5">
      <Field label="Ressource"><ResourceAutocomplete selectedCode={code} onSelect={(r) => { setCode(r?.code ?? ""); setAdding(false); }} /></Field>
      {code && (
        <>
          {canEdit && !adding && <div><ActionButton icon={Plus} onClick={() => setAdding(true)}>Ajouter un coût</ActionButton></div>}
          {adding && (
            <PanelForm title="Nouveau coût" pending={add.isPending} submitLabel="Ajouter" submitDisabled={!(Number(form.amount) >= 0) || !form.amount} error={error} onCancel={() => setAdding(false)} onSubmit={(e) => { e.preventDefault(); setError(null); add.mutate(); }}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Nature"><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={FIELD}>{Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                <Field label="Base"><select value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })} className={FIELD}>{Object.entries(BASIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
                <Field label="Montant" required><input type="number" min={0} step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={FIELD} /></Field>
                <Field label="Libellé"><input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className={FIELD} /></Field>
                <Field label="Valable à partir du"><input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className={FIELD} /></Field>
                <Field label="Valable jusqu'au"><input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className={FIELD} /></Field>
              </div>
            </PanelForm>
          )}
          {costs.isLoading ? <ListSkeleton /> : costs.isError ? <ErrorBlock message="Impossible de charger les coûts." onRetry={() => costs.refetch()} /> : (costs.data ?? []).length === 0 ? <EmptyState icon={DollarSign} title="Aucun coût saisi" hint="Sans coût, la marge égale le chiffre d'affaires." /> : (
            <div className="space-y-2">
              {costs.data!.map((c) => (
                <ItemRow key={String(c.id)} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{c.label || KIND_LABEL[c.kind ?? ""] || c.kind}</p>
                    <p className="text-xs text-gray-500">{KIND_LABEL[c.kind ?? ""] ?? c.kind} · {BASIS_LABEL[c.basis ?? ""] ?? c.basis}{c.validFrom ? ` · dès le ${formatDate(c.validFrom)}` : ""}{c.validUntil ? ` jusqu'au ${formatDate(c.validUntil)}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{money(c.amount, "XAF")}</span>
                    {canEdit && <IconButton icon={Trash2} label="Supprimer" tone="danger" onClick={() => remove(c.id, c.label || KIND_LABEL[c.kind ?? ""] || "coût")} />}
                  </div>
                </ItemRow>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Prices: React.FC = () => {
  const [code, setCode] = useState("");
  const [from, setFrom] = useState(addDays(todayIso(), -90));
  const [to, setTo] = useState(addDays(todayIso(), 90));
  const history = useQuery({ queryKey: ["booking-price-history", code, from, to], queryFn: () => bookingService.getPriceHistory(code, { from, to }), enabled: !!code });
  return (
    <div className="space-y-5">
      <Field label="Ressource"><ResourceAutocomplete selectedCode={code} onSelect={(r) => setCode(r?.code ?? "")} /></Field>
      <Range from={from} to={to} onFrom={setFrom} onTo={setTo} />
      {code && (history.isLoading ? <ListSkeleton /> : history.isError ? <ErrorBlock message="Impossible de charger l'historique des prix." onRetry={() => history.refetch()} /> : (history.data ?? []).length === 0 ? <EmptyState icon={History} title="Aucune réservation sur la période" /> : (
        <div className="space-y-2">
          {history.data!.map((p) => (
            <ItemRow key={p.bookingNumber}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900"><span className="font-mono">{p.bookingNumber}</span> · {String(p.startedAt).slice(0, 16).replace("T", " ")}</p>
                <p className="shrink-0 text-sm font-bold text-gray-900">{money(p.total, p.currency || "XAF")}</p>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {p.unit ? `${p.unit} · ` : ""}prix unitaire {money(p.unitPrice, p.currency || "XAF")} · sous-total {money(p.subtotal, p.currency || "XAF")}
                {(p.rules ?? []).length > 0 ? ` · règles : ${p.rules!.join(", ")}` : ""}
              </p>
            </ItemRow>
          ))}
        </div>
      ))}
    </div>
  );
};

export const BookingAnalyticsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canReport = hasPermission("REPORT:VIEW");
  const canPrice = hasPermission("RESOURCE:PRICE");
  const tabs: TabItem<Tab>[] = [
    ...(canReport ? ([{ id: "margins", label: "Marges", icon: BarChart3 }, { id: "occupancy", label: "Occupation", icon: BarChart3 }, { id: "costs", label: "Coûts", icon: DollarSign }] as TabItem<Tab>[]) : []),
    ...(canPrice ? ([{ id: "prices", label: "Historique des prix", icon: History }] as TabItem<Tab>[]) : []),
  ];
  const [tab, setTab] = useState<Tab>(canReport ? "margins" : "prices");
  if (tabs.length === 0) return <EmptyState icon={BarChart3} title="Accès restreint" hint="Ces indicateurs demandent le droit de consulter les rapports." />;
  return (
    <div className="space-y-5">
      <ListHeader title="Pilotage" subtitle="Marges, occupation, coûts des ressources et prix appliqués." />
      <Tabs items={tabs} active={tab} onChange={setTab} variant="soft" />
      {tab === "margins" && canReport && <Margins />}
      {tab === "occupancy" && canReport && <Occupancy />}
      {tab === "costs" && canReport && <Costs />}
      {tab === "prices" && canPrice && <Prices />}
    </div>
  );
};

export default BookingAnalyticsPage;
