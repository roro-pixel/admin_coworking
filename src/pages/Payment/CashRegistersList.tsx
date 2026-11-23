import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashRegisterListItem, CashRegisterType } from "../../services/cashRegister.service";
import { paymentService } from "../../services/payment.service";
import type { PaymentMethod } from "../../services/payment.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, HeadRow, ListHeader, PanelForm, Pagination, SearchField, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, ROW_HOVER, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { toast } from "../../components/ui/toastStore";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";
import { PillChoice } from "../../components/operations/opsKit";
import { useAuth } from "../../contexts/AuthContext";
import { METHOD_LABEL } from "../../components/payment/paymentLabels";
import { REGISTER_STATUS, REGISTER_TYPE, REGISTER_TYPE_OPTIONS } from "../../components/cash/cashLabels";
import { parseDigits } from "../../components/payment/paymentUtils";

const PAGE_SIZE = 20;
const COLS = "lg:grid-cols-[8rem_minmax(0,1.5fr)_minmax(0,1fr)_7rem_9rem_9rem]";

const EMPTY = {
  name: "",
  registerType: "COUNTER" as CashRegisterType,
  locationCode: "",
  businessEntityCode: "",
  deviceCode: "",
  parentRegisterCode: "",
  maxCashAmount: 0,
  standardFloat: 0,
  holderEmail: "",
  backupEmails: "",
  managerEmail: "",
  acceptedMethods: ["CASH"] as PaymentMethod[],
};

const ACTIVE_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "true", label: "Actives" },
  { value: "false", label: "Inactives" },
];

export const CashRegistersList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("CASH_REGISTER:MANAGE");

  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cash-registers", search, active, page],
    queryFn: () =>
      cashRegisterService.listRegisters({
        searchText: search.trim() || undefined,
        active: active === "" ? undefined : active === "true",
        page,
        size: PAGE_SIZE,
      }),
  });
  const registers: CashRegisterListItem[] = data?.content ?? [];

  const metrics = useQuery({ queryKey: ["cash-metrics-overview-registers-screen"], queryFn: () => paymentService.getCashMetricsOverview() });

  const create = useMutation({
    mutationFn: () =>
      cashRegisterService.createRegister({
        name: form.name.trim(),
        registerType: form.registerType,
        locationCode: form.locationCode.trim() || undefined,
        businessEntityCode: form.businessEntityCode.trim() || undefined,
        deviceCode: form.deviceCode.trim() || undefined,
        parentRegisterCode: form.parentRegisterCode.trim() || undefined,
        maxCashAmount: form.maxCashAmount > 0 ? form.maxCashAmount : undefined,
        standardFloat: form.standardFloat > 0 ? form.standardFloat : undefined,
        managerEmail: form.managerEmail.trim() || undefined,
        holderEmail: form.holderEmail.trim() || undefined,
        backupEmails: form.backupEmails.split(/[,\s;]+/).filter(Boolean),
        acceptedMethods: form.acceptedMethods,
        acceptedCurrencies: ["XAF"],
      }),
    onSuccess: (r) => {
      toast.success(`Caisse ${r.registerCode} créée.`);
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      setOpen(false);
      setForm(EMPTY);
      navigate(`/payments/registers/${r.registerCode}`);
    },
    onError: (e: unknown) => setFormError(apiMessage(e, "Création impossible.")),
  });

  const toggleMethod = (m: PaymentMethod) =>
    setForm((f) => ({ ...f, acceptedMethods: f.acceptedMethods.includes(m) ? f.acceptedMethods.filter((x) => x !== m) : [...f.acceptedMethods, m] }));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Caisses"
        subtitle={isLoading ? undefined : `${data?.totalElements ?? 0} caisse${(data?.totalElements ?? 0) > 1 ? "s" : ""}`}
        action={
          canManage &&
          !open && (
            <ActionButton icon={Plus} onClick={() => setOpen(true)}>
              Nouvelle caisse
            </ActionButton>
          )
        }
      />

      {metrics.isLoading ? (
        <KpiRowSkeleton count={3} columns={3} />
      ) : metrics.data ? (
        <KpiRow
          columns={3}
          items={[
            { label: "Caisses actives", value: `${metrics.data.activeRegisterCount} / ${metrics.data.registerCount}` },
            { label: "Sessions ouvertes", value: String(metrics.data.openSessionCount), tone: "success" },
            { label: "Position nette", value: formatMoney(metrics.data.netCashPosition, "FCFA"), tone: "pink" },
          ]}
        />
      ) : null}

      {open && (
        <PanelForm
          title="Nouvelle caisse"
          pending={create.isPending}
          submitLabel="Créer la caisse"
          submitDisabled={!form.name.trim() || form.acceptedMethods.length === 0}
          error={formError}
          onCancel={() => setOpen(false)}
          onSubmit={(e) => {
            e.preventDefault();
            setFormError(null);
            create.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nom" required>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Type">
              <select value={form.registerType} onChange={(e) => setForm({ ...form, registerType: e.target.value as CashRegisterType })} className={FIELD_SOFT}>
                {REGISTER_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Site" hint="Code du lieu">
              <input value={form.locationCode} onChange={(e) => setForm({ ...form, locationCode: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Entité" hint="Générée si vide">
              <input value={form.businessEntityCode} onChange={(e) => setForm({ ...form, businessEntityCode: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Poste (appareil)" hint="Généré si vide">
              <input value={form.deviceCode} onChange={(e) => setForm({ ...form, deviceCode: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Caisse mère" hint="Pour une petite caisse ou un guichet rattaché">
              <input value={form.parentRegisterCode} onChange={(e) => setForm({ ...form, parentRegisterCode: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Plafond de détention (FCFA)" hint="Alerte, ou blocage selon le comportement choisi sur la fiche">
              <input inputMode="numeric" value={form.maxCashAmount || ""} onChange={(e) => setForm({ ...form, maxCashAmount: parseDigits(e.target.value) })} className={`${FIELD_SOFT} tabular-nums`} />
            </Field>
            <Field label="Fonds de caisse standard (FCFA)">
              <input inputMode="numeric" value={form.standardFloat || ""} onChange={(e) => setForm({ ...form, standardFloat: parseDigits(e.target.value) })} className={`${FIELD_SOFT} tabular-nums`} />
            </Field>
            <Field label="Titulaire (e-mail)">
              <input type="email" value={form.holderEmail} onChange={(e) => setForm({ ...form, holderEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Suppléants (e-mails)" hint="Séparés par une virgule, du premier au dernier rang">
              <input value={form.backupEmails} onChange={(e) => setForm({ ...form, backupEmails: e.target.value })} className={FIELD_SOFT} />
            </Field>
            <Field label="Responsable (e-mail)" hint="Reçoit les rapports et alertes">
              <input type="email" value={form.managerEmail} onChange={(e) => setForm({ ...form, managerEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-600">Moyens de paiement acceptés</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMethod(m)}
                  aria-pressed={form.acceptedMethods.includes(m)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${form.acceptedMethods.includes(m) ? "bg-[color:var(--logo-pink)] text-white" : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"}`}
                >
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
        </PanelForm>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchField
          className="flex-1"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(0);
          }}
          placeholder="Nom ou code de caisse"
        />
        <PillChoice<string>
          label="État"
          value={active}
          onChange={(v) => {
            setActive(v);
            setPage(0);
          }}
          options={ACTIVE_FILTERS}
        />
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les caisses." onRetry={() => refetch()} />
      ) : registers.length === 0 ? (
        <EmptyState icon={Wallet} title="Aucune caisse" hint="Créez la première caisse pour ouvrir des sessions." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Code</span>
            <span>Nom</span>
            <span>Site</span>
            <span>Type</span>
            <span className="text-right">Dernier comptage</span>
            <span>État</span>
          </HeadRow>
          <DataCard>
            {registers.map((r) => {
              const st = statusOf(REGISTER_STATUS, r.status ?? (r.active ? "ACTIVE" : "CLOSED"));
              return (
                <div
                  key={r.registerCode}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/payments/registers/${r.registerCode}`)}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/payments/registers/${r.registerCode}`)}
                  className={`grid cursor-pointer grid-cols-1 items-center gap-x-4 gap-y-1 rounded-2xl p-4 transition max-lg:mb-2 max-lg:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${COLS} ${ROW_HOVER}`}
                >
                  <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{r.registerCode}</p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{r.name}</p>
                    {r.systemManaged && <p className="text-xs text-gray-400">Tenue par le système</p>}
                    {r.restrictedToMethod && <p className="text-xs text-gray-400">{METHOD_LABEL[r.restrictedToMethod] ?? r.restrictedToMethod} seulement</p>}
                  </div>
                  <p className="truncate text-sm text-gray-600">{r.locationCode || "—"}</p>
                  <p className="text-sm text-gray-600">{r.registerType ? REGISTER_TYPE[r.registerType] : "—"}</p>
                  <p className="text-sm tabular-nums text-gray-600 lg:text-right">
                    {r.lastCountAmount != null ? formatMoney(r.lastCountAmount, "FCFA") : "Jamais compté"}
                    {r.lastCountAt && <span className="block text-xs text-gray-400">{formatDateTime(r.lastCountAt)}</span>}
                  </p>
                  <div>
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  </div>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="caisse" onChange={setPage} />
        </>
      )}
    </div>
  );
};
