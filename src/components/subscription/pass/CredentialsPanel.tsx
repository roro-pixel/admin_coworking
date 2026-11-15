import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QrCode, RefreshCcw, ShieldOff } from "lucide-react";
import { passAccessService } from "../../../services/passAccess.service";
import type { PassCredentialType } from "../../../services/passAccess.service";
import { ActionButton, EmptyState, Field, Section, StatusChip, Switch } from "../kit";
import { FIELD, formatDateTime } from "../kitUtils";
import { Skeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { CREDENTIAL_TYPE_LABEL, CREDENTIAL_TYPE_OPTIONS } from "./passAccessLabels";

/** Identifiant d'accès d'un pass (QR, code-barres, badge NFC, code) : lecture, émission et révocation. */
export const CredentialsPanel: React.FC<{ passNumber: string }> = ({ passNumber }) => {
  const qc = useQueryClient();
  const [type, setType] = useState<PassCredentialType>("QR_CODE");
  const [rotating, setRotating] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");

  // Jamais mis en cache : un identifiant rotatif change à chaque émission et expire.
  const key = ["pass-credential", passNumber, type];
  const current = useQuery({
    queryKey: key,
    queryFn: () => passAccessService.getCredential(passNumber, type),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
  const credential = current.data;
  const expired = !!credential?.validUntil && new Date(credential.validUntil) < new Date();

  const issue = useMutation({
    mutationFn: () => passAccessService.issueCredential(passNumber, { type, rotating }),
    onSuccess: (c) => qc.setQueryData(key, c),
  });
  const revoke = useMutation({
    mutationFn: () => passAccessService.revokeCredentials(passNumber, revokeReason.trim() || undefined),
    onSuccess: () => {
      setRevokeReason("");
      qc.removeQueries({ queryKey: ["pass-credential", passNumber] });
      current.refetch();
    },
  });

  const askIssue = () =>
    toast.confirm({
      message: credential ? `Émettre un nouveau ${CREDENTIAL_TYPE_LABEL[type].toLowerCase()} ?` : `Émettre un ${CREDENTIAL_TYPE_LABEL[type].toLowerCase()} ?`,
      detail: credential ? "L'identifiant actuel de ce type sera révoqué." : "Il sera utilisable immédiatement pour entrer avec ce pass.",
      confirmLabel: "Émettre",
      pendingLabel: "Émission",
      successMessage: "Identifiant émis",
      errorMessage: "Émission impossible",
      onConfirm: () => issue.mutateAsync(),
    });
  const askRevoke = () =>
    toast.confirm({
      message: "Révoquer les identifiants de ce pass ?",
      detail: "Tous les identifiants émis pour ce pass cessent de fonctionner.",
      confirmLabel: "Révoquer",
      pendingLabel: "Révocation",
      successMessage: "Identifiants révoqués",
      errorMessage: "Révocation impossible",
      tone: "danger",
      onConfirm: () => revoke.mutateAsync(),
    });

  return (
    <div className="space-y-4">
      <Section title="Identifiant d'accès" description="Ce que le titulaire présente pour entrer" icon={QrCode}>
        <div className="mb-4 w-full sm:w-64">
          <Field label="Type d'identifiant">
            <select className={FIELD} value={type} onChange={(e) => setType(e.target.value as PassCredentialType)}>
              {CREDENTIAL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {current.isLoading ? (
          <Skeleton className="h-56 w-full rounded-2xl" />
        ) : !credential ? (
          <EmptyState icon={QrCode} title="Aucun identifiant" hint={`Ce pass n'a pas de ${CREDENTIAL_TYPE_LABEL[type].toLowerCase()} en cours.`} />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-5 text-center shadow-sm sm:flex-row sm:text-left">
            {credential.imageDataUri && (
              <img src={credential.imageDataUri} alt={`${CREDENTIAL_TYPE_LABEL[type]} du pass ${passNumber}`} className={`h-44 w-44 shrink-0 rounded-2xl bg-white object-contain ${expired ? "opacity-40" : ""}`} />
            )}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <StatusChip tone={expired ? "danger" : "success"}>{expired ? "Expiré" : "Valide"}</StatusChip>
                {credential.rotating && <StatusChip tone="info">Rotatif</StatusChip>}
              </div>
              <p className="break-all font-mono text-sm font-semibold text-gray-900">{credential.value}</p>
              {credential.validUntil && <p className="text-xs text-gray-500">Valable jusqu'au {formatDateTime(credential.validUntil)}</p>}
              {expired && <p className="text-xs font-semibold text-red-600">Cet identifiant rotatif a expiré : émettez-en un nouveau.</p>}
            </div>
          </div>
        )}
      </Section>

      <Section title="Émettre un identifiant" description="Remplace l'identifiant en cours du même type" icon={RefreshCcw}>
        <div className="space-y-4">
          <Switch checked={rotating} onChange={setRotating} label="Identifiant rotatif" hint="Il change à chaque émission et expire à une heure fixée par le backend." />
          <ActionButton icon={RefreshCcw} pending={issue.isPending} onClick={askIssue}>
            {credential ? "Émettre un nouvel identifiant" : "Émettre un identifiant"}
          </ActionButton>
        </div>
      </Section>

      <Section title="Révocation" description="Coupe tous les identifiants de ce pass" icon={ShieldOff}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Motif">
            <input className={FIELD} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} placeholder="Badge perdu" />
          </Field>
          <ActionButton variant="danger" icon={ShieldOff} onClick={askRevoke}>
            Révoquer
          </ActionButton>
        </div>
      </Section>
    </div>
  );
};
