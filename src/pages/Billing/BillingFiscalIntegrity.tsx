import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { billingService } from "../../services/billing.service";
import type { FiscalIntegrityReport } from "../../services/billing.service";
import { ActionButton, EmptyState, ListHeader, StatusChip } from "../../components/subscription/kit";
import { formatDateTime } from "../../components/subscription/kitUtils";
import { KpiRow } from "../../components/operations/OpsCharts";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { billingError } from "../../components/billing/billingErrors";
import { QueryState } from "../../components/billing/pageKit";

const Report: React.FC<{ r: FiscalIntegrityReport; by?: string }> = ({ r, by }) => (
  <div className="space-y-4">
    <div className={`flex items-center gap-3 rounded-[1.75rem] p-5 ${r.valid ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
      {r.valid ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
      <div>
        <p className="text-lg font-bold">{r.valid ? "Chaîne d'intégrité conforme" : "Anomalies détectées"}</p>
        <p className="text-sm opacity-80">Contrôle du {formatDateTime(r.checkedAt)}{by ? ` par ${by}` : ""}</p>
      </div>
    </div>
    <KpiRow columns={4} items={[
      { label: "Factures contrôlées", value: r.checkedInvoices ?? 0 },
      { label: "Chaînes rompues", value: r.brokenChains ?? 0, tone: (r.brokenChains ?? 0) > 0 ? "danger" : "success" },
      { label: "Signatures manquantes", value: r.missingSignatures ?? 0, tone: (r.missingSignatures ?? 0) > 0 ? "danger" : "success" },
      { label: "Trous de numérotation", value: r.numberingGaps ?? 0, tone: (r.numberingGaps ?? 0) > 0 ? "danger" : "success" },
    ]} />
  </div>
);

/** Intégrité fiscale : contrôle de la chaîne de scellement des factures certifiées (SYSTEM:SETTINGS). */
export const BillingFiscalIntegrity: React.FC = () => {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const allowed = hasPermission("SYSTEM:SETTINGS");
  const last = useQuery({ queryKey: ["billing-fiscal-integrity-last"], queryFn: () => billingService.getFiscalIntegrityLastReport(), enabled: allowed, retry: false });
  const run = useMutation({
    mutationFn: () => billingService.runFiscalIntegrityCheck(),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["billing-fiscal-integrity-last"] }); toast.success(r.valid ? "Contrôle terminé : conforme." : "Contrôle terminé : anomalies détectées."); },
    onError: (e: unknown) => toast.error(billingError(e, "Contrôle impossible.")),
  });

  if (!allowed) return <EmptyState icon={ShieldAlert} title="Accès réservé" hint="Le contrôle d'intégrité fiscale exige la permission SYSTEM:SETTINGS." />;

  return (
    <div className="space-y-5">
      <ListHeader title="Intégrité fiscale" subtitle="Vérifie que la chaîne de scellement des factures certifiées n'a pas été rompue" action={<ActionButton icon={ShieldCheck} pending={run.isPending} onClick={() => run.mutate()}>Lancer le contrôle</ActionButton>} />
      {run.data && <Report r={run.data} />}
      {!run.data && (
        <QueryState isLoading={last.isLoading} isError={last.isError} onRetry={() => last.refetch()} isEmpty={!last.data} icon={ShieldCheck} title="Aucun contrôle enregistré" hint="Lancez un premier contrôle pour établir un rapport.">
          {last.data && <Report r={last.data} by={last.data.triggeredBy} />}
        </QueryState>
      )}
      {run.data && <p className="text-xs text-gray-400"><StatusChip tone="info">Dernier résultat affiché</StatusChip> Le contrôle est lancé à la demande ; il peut durer quelques instants selon le volume de factures.</p>}
    </div>
  );
};
