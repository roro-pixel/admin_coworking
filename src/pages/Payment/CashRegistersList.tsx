import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Power, Wallet } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashRegister } from "../../services/payment.service";
import {
  ActionButton,
  DataCard,
  EmptyState,
  ErrorBlock,
  Field,
  HeadRow,
  IconButton,
  ListHeader,
  PanelForm,
  SearchField,
  StatusChip,
  Switch,
} from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatMoney } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";

const COLS = "lg:grid-cols-[8rem_minmax(0,1.5fr)_minmax(0,1fr)_7rem_9rem_3rem]";

const EMPTY_FORM = {
  name: "",
  locationCode: "",
  businessEntityCode: "",
  deviceCode: "",
  cashControlEnabled: true,
  maxCashAmount: 500000,
  managerEmail: "",
};

export const CashRegistersList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  const { data: registersData, isLoading, isError, refetch } = useQuery({
    queryKey: ["cash-registers"],
    queryFn: () => paymentService.getCashRegisters({ size: 100 }),
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["cash-metrics-overview-registers-screen"],
    queryFn: () => paymentService.getCashMetricsOverview(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      paymentService.createCashRegister({
        name: formData.name,
        locationCode: formData.locationCode,
        businessEntityCode: formData.businessEntityCode,
        deviceCode: formData.deviceCode || undefined,
        cashControlEnabled: formData.cashControlEnabled,
        maxCashAmount: formData.maxCashAmount,
        managerEmail: formData.managerEmail || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      setIsFormOpen(false);
      setFormError(null);
      toast.success("Caisse créée");
    },
    onError: (e: unknown) => setFormError(apiMessage(e, "Création impossible.")),
  });

  const activateMutation = useMutation({
    mutationFn: (code: string) => paymentService.activateCashRegister(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cash-registers"] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (code: string) => paymentService.deactivateCashRegister(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cash-registers"] }),
  });

  const registers: CashRegister[] = registersData?.content || [];
  const q = search.trim().toLowerCase();
  const filtered = registers.filter((r) => r.name.toLowerCase().includes(q) || r.registerCode.toLowerCase().includes(q));

  const openForm = () => {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const toggle = (register: CashRegister) => {
    if (register.active) {
      toast.confirm({
        message: `Désactiver « ${register.name} » ?`,
        detail: "Plus aucune session ne pourra s'ouvrir sur cette caisse.",
        confirmLabel: "Désactiver",
        successMessage: "Caisse désactivée",
        errorMessage: "Désactivation impossible",
        onConfirm: () => deactivateMutation.mutateAsync(register.registerCode),
      });
      return;
    }
    setTogglingCode(register.registerCode);
    activateMutation
      .mutateAsync(register.registerCode)
      .then(() => toast.success("Caisse activée"))
      .catch(() => toast.error("Activation impossible"))
      .finally(() => setTogglingCode(null));
  };

  return (
    <div className="space-y-5">
      <ListHeader
        title="Caisses"
        subtitle="Les points d'encaissement et leurs règles de contrôle."
        action={
          <ActionButton icon={Plus} onClick={openForm} className="w-full sm:w-auto">
            Nouvelle caisse
          </ActionButton>
        }
      />

      {metricsLoading ? (
        <KpiRowSkeleton />
      ) : (
        metrics && (
          <KpiRow
            items={[
              { label: "Encaissements", value: formatMoney(metrics.totalPayments) },
              { label: "Entrées d'espèces", value: formatMoney(metrics.totalCashIn), tone: "success" },
              { label: "Sorties d'espèces", value: formatMoney(metrics.totalCashOut), tone: "danger" },
              { label: "Sessions ouvertes", value: metrics.openSessionCount ?? 0 },
            ]}
          />
        )
      )}

      {isFormOpen && (
        <PanelForm
          title="Nouvelle caisse"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          onCancel={() => setIsFormOpen(false)}
          pending={createMutation.isPending}
          submitLabel="Créer la caisse"
          submitDisabled={!formData.name.trim() || !formData.locationCode.trim() || !formData.businessEntityCode.trim()}
          error={formError}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Nom" required>
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={FIELD_SOFT} autoFocus />
            </Field>
            <Field label="Emplacement" required>
              <input value={formData.locationCode} onChange={(e) => setFormData({ ...formData, locationCode: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Entité" required>
              <input value={formData.businessEntityCode} onChange={(e) => setFormData({ ...formData, businessEntityCode: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Appareil">
              <input value={formData.deviceCode} onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value })} className={`${FIELD_SOFT} font-mono`} />
            </Field>
            <Field label="Montant maximum en caisse (FCFA)">
              <input
                type="number"
                min={0}
                value={formData.maxCashAmount}
                onChange={(e) => setFormData({ ...formData, maxCashAmount: Number(e.target.value) || 0 })}
                className={FIELD_SOFT}
              />
            </Field>
            <Field label="E-mail du responsable" hint="Défini à la création uniquement">
              <input type="email" value={formData.managerEmail} onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })} className={FIELD_SOFT} />
            </Field>
          </div>
          <Switch
            checked={formData.cashControlEnabled}
            onChange={(v) => setFormData({ ...formData, cashControlEnabled: v })}
            label="Contrôle de caisse"
            hint="Comptage et validation des écarts à la clôture"
          />
        </PanelForm>
      )}

      <SearchField value={search} onChange={setSearch} placeholder="Nom ou code de la caisse" />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les caisses." onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wallet} title="Aucune caisse" hint="Ajustez la recherche ou créez une caisse." />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Code</span>
            <span>Nom</span>
            <span>Emplacement</span>
            <span>Contrôle</span>
            <span className="text-right">Plafond</span>
            <span />
          </HeadRow>
          <DataCard>
            {filtered.map((r) => (
              <div
                key={r.registerCode}
                className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${r.active ? "" : "opacity-60"}`}
              >
                <p className="font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{r.registerCode}</p>
                <div className="lg:order-last">
                  <IconButton
                    icon={Power}
                    label={r.active ? "Désactiver la caisse" : "Activer la caisse"}
                    tone={r.active ? "success" : "neutral"}
                    pending={togglingCode === r.registerCode}
                    onClick={() => toggle(r)}
                  />
                </div>
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <p className="truncate font-semibold text-gray-950">{r.name}</p>
                  {r.managerEmail && <p className="truncate text-xs text-gray-400">{r.managerEmail}</p>}
                </div>
                <p className="truncate font-mono text-xs text-gray-500">{r.locationCode}</p>
                <div>
                  <StatusChip tone={r.cashControlEnabled ? "success" : "neutral"}>
                    {r.cashControlEnabled ? "Activé" : "Désactivé"}
                  </StatusChip>
                </div>
                <p className="text-sm font-bold tabular-nums text-gray-950 lg:text-right">
                  {r.maxCashAmount ? formatMoney(r.maxCashAmount) : ""}
                </p>
              </div>
            ))}
          </DataCard>
        </>
      )}
    </div>
  );
};
