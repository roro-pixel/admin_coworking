import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fixedAssetService } from "../../../services/fixedAsset.service";
import type { RunResult } from "../../../services/fixedAsset.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, Field, ListHeader, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { ASSETS_KEY } from "./AssetsPanel";

export const DepreciationPanel: React.FC = () => {
  const qc = useQueryClient();
  const canManage = useAuth().hasPermission("ACCOUNTING_SETTINGS:MANAGE");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [res, setRes] = useState<RunResult | null>(null);
  const preview = useMutation({ mutationFn: () => fixedAssetService.previewRun(period), onSuccess: setRes, onError: (e) => toast.error(apiMessage(e, "Simulation impossible.")) });
  const run = () => toast.confirm({
    message: `Passer les dotations de ${period} ?`, detail: "Génère les écritures de dotation, ventilées par section.", confirmLabel: "Passer les dotations", successMessage: "Dotations passées", errorMessage: "Passage impossible",
    onConfirm: async () => { setRes(await fixedAssetService.run(period)); qc.invalidateQueries({ queryKey: [ASSETS_KEY] }); qc.invalidateQueries({ queryKey: ["accounting-entries"] }); },
  });
  return (
    <div className="space-y-4">
      <ListHeader title="Dotations aux amortissements" subtitle="Simulez d'abord, puis passez les dotations de la période." />
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Période" hint="Code de période, ex. 2026-10"><input className={FIELD} value={period} onChange={(e) => setPeriod(e.target.value)} /></Field>
        <ActionButton variant="ghost" pending={preview.isPending} disabled={!period} onClick={() => preview.mutate()}>Simuler</ActionButton>
        {canManage && <ActionButton disabled={!period} onClick={run}>Passer les dotations</ActionButton>}
      </div>
      {res && (
        <>
          <Section title={`${res.simulated ? "Simulation" : "Résultat"} ${res.period ?? ""}`}>
            <div className="flex flex-wrap gap-4 text-sm">
              {res.simulated && <StatusChip tone="info">Simulation, rien n'est comptabilisé</StatusChip>}
              <span>{res.assets ?? 0} bien(s)</span><span>Total <b className="font-mono">{money(res.total)}</b></span>
              {res.derogatory ? <span>Dérogatoire <b className="font-mono">{money(res.derogatory)}</b></span> : null}
              {res.subsidyRelease ? <span>Reprise de subvention <b className="font-mono">{money(res.subsidyRelease)}</b></span> : null}
            </div>
            {res.warnings.map((w, i) => <p key={i} className="mt-1 text-xs text-amber-600">{w}</p>)}
            {res.entries.length > 0 && <p className="mt-1 text-xs text-gray-500">Écritures : {res.entries.join(", ")}</p>}
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            {([["Par catégorie", res.byCategory], ["Par section", res.bySection]] as const).map(([title, m]) => (
              <Section key={title} title={title}>{Object.entries(m ?? {}).map(([k, a]) => <p key={k} className="flex justify-between text-sm"><span>{k}</span><span className="font-mono">{money(a)}</span></p>)}</Section>
            ))}
          </div>
          <Section title={`Lignes (${res.lines.length})`}>
            <div className="space-y-1">
              {res.lines.map((l, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">{l.assetCode} · {l.designation} <span className="text-gray-400">{l.period}{l.sections ? ` · ${l.sections}` : ""}</span></span>
                  <span className="flex items-center gap-2">{l.catchUp && <StatusChip tone="warn">Rattrapage</StatusChip>}{l.estimated && <StatusChip tone="neutral">Estimé</StatusChip>}<span className="font-mono">{money(l.amount)}</span></span>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
};
