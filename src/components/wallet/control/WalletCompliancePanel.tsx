import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Flag, FolderOpen, PlayCircle, Snowflake } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import type { RuleEvaluationResult } from "../../../services/walletControl.service";
import { ActionButton, EmptyState, ErrorBlock, ItemRow, Section, StatusChip } from "../../subscription/kit";
import { Skeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { apiMessage } from "../../subscription/kitUtils";
import { RULE_ACTION_LABEL } from "../walletLabels";
import { CaseRow } from "./CaseRow";
import { FlagRow } from "./FlagRow";
import { FreezeForm, FreezeRow } from "./FreezeParts";

/** Surveillance d'un portefeuille : alertes, dossiers, gels sur instruction et évaluation des règles. */
export const WalletCompliancePanel: React.FC<{ walletNumber: string; onOpenCase: (caseNumber: string) => void }> = ({ walletNumber, onOpenCase }) => {
  const [freezing, setFreezing] = useState(false);
  const [evaluation, setEvaluation] = useState<RuleEvaluationResult[] | null>(null);

  const flags = useQuery({ queryKey: ["wallet-flags", "wallet", walletNumber], queryFn: () => walletControlService.getWalletFlags(walletNumber) });
  const cases = useQuery({ queryKey: ["wallet-cases", "wallet", walletNumber], queryFn: () => walletControlService.getWalletCases(walletNumber) });
  const freezes = useQuery({ queryKey: ["wallet-freezes", "wallet", walletNumber], queryFn: () => walletControlService.getWalletFreezes(walletNumber) });

  const evaluate = useMutation({
    mutationFn: () => walletControlService.evaluateWallet(walletNumber),
    onSuccess: (r) => {
      setEvaluation(r);
      flags.refetch();
    },
    onError: (e) => toast.error(apiMessage(e, "Évaluation impossible.")),
  });

  const block = <T,>(q: { isLoading: boolean; isError: boolean; refetch: () => unknown; data?: T[] }, empty: React.ReactNode, render: (rows: T[]) => React.ReactNode) =>
    q.isLoading ? <Skeleton className="h-16 w-full rounded-2xl" /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? empty : render(q.data ?? []);

  return (
    <div className="space-y-5">
      <Section
        title="Évaluation des règles"
        description="Applique les règles de surveillance à ce portefeuille maintenant"
        icon={PlayCircle}
      >
        <div className="mb-4">
          <ActionButton variant="ghost" icon={PlayCircle} pending={evaluate.isPending} className="!px-4 !py-2" onClick={() => evaluate.mutate()}>
            Évaluer maintenant
          </ActionButton>
        </div>
        {evaluation === null ? (
          <p className="text-sm text-gray-500">Lancez l'évaluation pour voir quelles règles se déclenchent.</p>
        ) : evaluation.length === 0 ? (
          <p className="text-sm text-emerald-700">Aucune règle ne se déclenche sur ce portefeuille.</p>
        ) : (
          <div className="space-y-2">
            {evaluation.map((r) => (
              <ItemRow key={r.ruleCode} className="!shadow-none bg-gray-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm font-bold text-gray-950">{r.ruleCode}</p>
                  <div className="flex items-center gap-2">
                    <StatusChip tone="warn">{RULE_ACTION_LABEL[r.action] ?? r.action}</StatusChip>
                    {r.newFlag && <StatusChip tone="danger">Nouvelle alerte</StatusChip>}
                  </div>
                </div>
                {r.details && <p className="mt-1 text-sm text-gray-600">{r.details}</p>}
              </ItemRow>
            ))}
          </div>
        )}
      </Section>

      <Section title="Alertes" description="Détectées sur ce portefeuille" icon={Flag}>
        {block(flags, <EmptyState icon={Flag} title="Aucune alerte" hint="Rien n'a été signalé sur ce portefeuille." />, (rows) => (
          <div className="space-y-3">
            {rows.map((f) => (
              <FlagRow key={f.flagNumber} flag={f} showWallet={false} />
            ))}
          </div>
        ))}
      </Section>

      <Section title="Dossiers de conformité" description="Dossiers ouverts sur ce portefeuille" icon={FolderOpen}>
        {block(cases, <EmptyState icon={FolderOpen} title="Aucun dossier" hint="Aucun dossier n'a été ouvert sur ce portefeuille." />, (rows) => (
          <div className="space-y-2">
            {rows.map((c) => (
              <CaseRow key={c.caseNumber} item={c} onOpen={onOpenCase} />
            ))}
          </div>
        ))}
      </Section>

      <Section
        title="Gels sur instruction"
        description="Décidés à la demande d'une autorité"
        icon={Snowflake}
      >
        {!freezing && (
          <div className="mb-4">
            <ActionButton variant="ghost" icon={Snowflake} className="!px-4 !py-2" onClick={() => setFreezing(true)}>
              Geler sur instruction
            </ActionButton>
          </div>
        )}
        {freezing && (
          <div className="mb-4">
            <FreezeForm walletNumber={walletNumber} onClose={() => setFreezing(false)} />
          </div>
        )}
        {block(freezes, !freezing ? <EmptyState icon={Snowflake} title="Aucun gel" hint="Ce portefeuille n'a fait l'objet d'aucun gel sur instruction." /> : null, (rows) => (
          <div className="space-y-3">
            {rows.map((f) => (
              <FreezeRow key={f.freezeNumber} freeze={f} showWallet={false} />
            ))}
          </div>
        ))}
      </Section>
    </div>
  );
};
