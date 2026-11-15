import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { History, ShieldCheck } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import type { AuditVerifyResult } from "../../../services/walletControl.service";
import { ActionButton, EmptyState, Field, ItemRow, ListHeader, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { SUBJECT_TYPE_OPTIONS } from "../../../components/wallet/walletLabels";
import { OpenFields } from "../../../components/wallet/control/OpenFields";

/** Piste d'audit chaînée : consultation par sujet et vérification de l'intégrité de la chaîne. */
export const AuditPanel: React.FC = () => {
  const [subjectType, setSubjectType] = useState("CUSTOMER");
  const [subjectCode, setSubjectCode] = useState("");
  const [verify, setVerify] = useState<AuditVerifyResult | null>(null);

  const trail = useMutation({
    mutationFn: () => walletControlService.getAuditTrail(subjectType, subjectCode.trim()),
    onError: (e) => toast.error(apiMessage(e, "Piste d'audit introuvable.")),
  });
  const verifyMutation = useMutation({
    mutationFn: () => walletControlService.verifyAuditChain(),
    onSuccess: setVerify,
    onError: (e) => toast.error(apiMessage(e, "Vérification impossible.")),
  });

  return (
    <div className="space-y-5">
      <ListHeader title="Audit" subtitle="Piste chaînée, en ajout seul" />

      <Section title="Intégrité de la chaîne" description="Contrôle de toutes les entrées d'audit" icon={ShieldCheck}>
        <div className="flex flex-wrap items-center gap-4">
          <ActionButton icon={ShieldCheck} pending={verifyMutation.isPending} onClick={() => verifyMutation.mutate()}>
            Vérifier la chaîne
          </ActionButton>
          {verify && (
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip tone={verify.brokenEntries === 0 ? "success" : "danger"}>{verify.brokenEntries === 0 ? "Chaîne intacte" : "Chaîne rompue"}</StatusChip>
              <span className="text-sm text-gray-600">
                {verify.entries.toLocaleString("fr-FR")} entrée{verify.entries > 1 ? "s" : ""} contrôlée{verify.entries > 1 ? "s" : ""}, {verify.brokenEntries.toLocaleString("fr-FR")} rompue{verify.brokenEntries > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </Section>

      <Section title="Piste d'un sujet" description="Toutes les entrées d'audit d'un client, d'un membre ou d'une entreprise" icon={History}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <Field label="Type">
            <select className={`${FIELD_SOFT} !bg-white`} value={subjectType} onChange={(e) => setSubjectType(e.target.value)}>
              {SUBJECT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Code">
            <input className={`${FIELD_SOFT} !bg-white font-mono`} value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="CUS-000001" />
          </Field>
          <ActionButton icon={History} pending={trail.isPending} disabled={!subjectCode.trim()} onClick={() => trail.mutate()}>
            Afficher
          </ActionButton>
        </div>
        <div className="mt-4 space-y-2">
          {trail.isPending ? (
            <ListSkeleton rows={3} />
          ) : trail.data ? (
            trail.data.length === 0 ? (
              <EmptyState icon={History} title="Aucune entrée" hint="Aucune entrée d'audit pour ce sujet." />
            ) : (
              trail.data.map((e, i) => (
                <ItemRow key={i}>
                  <OpenFields entries={Object.entries(e).filter(([, v]) => v !== null && v !== undefined && v !== "")} />
                </ItemRow>
              ))
            )
          ) : null}
        </div>
      </Section>
    </div>
  );
};
