import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, MinusCircle, RotateCcw, ShieldAlert, XCircle } from "lucide-react";
import { gedService } from "../../services/ged.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, Section, StatusChip } from "../subscription/kit";
import { FIELD, apiMessage } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";

const OUTCOME: Record<string, { label: string; tone: "success" | "danger" | "neutral"; icon: React.ElementType }> = {
  PASSED: { label: "Conforme", tone: "success", icon: CheckCircle2 },
  FAILED: { label: "Écart", tone: "danger", icon: XCircle },
  SKIPPED: { label: "Non applicable", tone: "neutral", icon: MinusCircle },
};

/**
 * Actions avancées d'un dossier KYC : validations croisées, niveau KYC, réouverture, rejet définitif.
 * Droits : KYC:READ pour les contrôles, KYC:MANAGE pour le niveau et la réouverture, KYC:REJECT pour le rejet définitif.
 */
export const KycCaseExtras: React.FC<{
  caseCode: string;
  status: string;
  kycLevel?: number;
  canManage: boolean;
  canReject: boolean;
  onChanged: () => Promise<unknown> | void;
}> = ({ caseCode, status, kycLevel, canManage, canReject, onChanged }) => {
  const [level, setLevel] = useState(String(kycLevel ?? 1));
  const [levelReason, setLevelReason] = useState("");
  const [reopenComment, setReopenComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const checks = useQuery({ queryKey: ["kyc-case-cross-checks", caseCode], queryFn: () => gedService.kycCrossChecks(caseCode) });
  const reasons = useQuery({ queryKey: ["kyc-reasons", "all"], queryFn: () => gedService.kycReasons(undefined, true), enabled: canReject });

  const fail = (fallback: string) => (e: unknown) => toast.error(apiMessage(e, fallback));
  const done = (msg: string, after?: () => void) => async () => {
    await onChanged();
    toast.success(msg);
    after?.();
  };

  const changeLevel = useMutation({
    mutationFn: () => gedService.kycChangeLevel(caseCode, Number(level), levelReason.trim() || undefined),
    onSuccess: done("Niveau KYC mis à jour", () => setLevelReason("")),
    onError: fail("Changement de niveau impossible"),
  });
  const reopen = useMutation({
    mutationFn: () => gedService.kycReopen(caseCode, reopenComment.trim() || undefined),
    onSuccess: done("Dossier rouvert", () => setReopenComment("")),
    onError: fail("Réouverture impossible (le dossier doit être approuvé ou rejeté)"),
  });
  const rejectFinal = useMutation({
    mutationFn: () => gedService.kycRejectFinal(caseCode, { comment: rejectComment.trim() || undefined, reasonCode: rejectReason || undefined }),
    onSuccess: done("Dossier rejeté définitivement", () => {
      setRejectComment("");
      setRejectReason("");
    }),
    onError: fail("Rejet définitif impossible"),
  });

  const list = checks.data ?? [];
  const failedBlocking = list.filter((c) => c.outcome === "FAILED" && c.blocking).length;
  const closed = status === "APPROVED" || status === "REJECTED";

  return (
    <div className="space-y-4">
      <Section title="Validations croisées" description="Cohérence entre les pièces du dossier, évaluée à chaque consultation.">
        {checks.isLoading ? (
          <ListSkeleton rows={3} />
        ) : checks.isError ? (
          <ErrorBlock message="Les contrôles n'ont pas pu être chargés." onRetry={() => checks.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="Aucune règle applicable" hint="Aucune règle de validation croisée ne concerne ce dossier." />
        ) : (
          <div className="space-y-2">
            {failedBlocking > 0 && <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-700">{failedBlocking} règle{failedBlocking > 1 ? "s" : ""} bloquante{failedBlocking > 1 ? "s" : ""} en écart : le dossier ne peut pas être approuvé tant que c'est le cas.</p>}
            {list.map((c, i) => {
              const o = OUTCOME[String(c.outcome)] ?? OUTCOME.SKIPPED;
              const Icon = o.icon;
              return (
                <ItemRow key={`${c.ruleCode}-${i}`} className="flex items-start gap-3">
                  <Icon size={18} className={`mt-0.5 shrink-0 ${o.tone === "success" ? "text-emerald-600" : o.tone === "danger" ? "text-red-600" : "text-gray-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">{c.ruleName || c.ruleCode}</p>
                    <p className="text-xs text-gray-500">
                      {c.ruleType}
                      {c.documentType ? ` · ${c.documentType}` : ""}
                    </p>
                    {c.detail && <p className="mt-1 text-sm text-gray-700">{c.detail}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusChip tone={o.tone}>{o.label}</StatusChip>
                    {c.blocking && <span className="text-[11px] font-semibold text-gray-500">Bloquante</span>}
                  </div>
                </ItemRow>
              );
            })}
          </div>
        )}
      </Section>

      {canManage && (
        <Section title="Niveau KYC" description="Le niveau détermine ce que le client peut faire. Un changement est tracé dans l'historique.">
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
            <Field label="Niveau">
              <input type="number" min={0} max={9} value={level} onChange={(e) => setLevel(e.target.value)} className={FIELD} />
            </Field>
            <Field label="Motif" hint="Facultatif.">
              <input value={levelReason} onChange={(e) => setLevelReason(e.target.value)} className={FIELD} />
            </Field>
            <ActionButton pending={changeLevel.isPending} disabled={level === "" || Number(level) === kycLevel} onClick={() => changeLevel.mutate()}>
              Changer le niveau
            </ActionButton>
          </div>
          {kycLevel !== undefined && <p className="text-xs text-gray-500">Niveau actuel : {kycLevel}</p>}
        </Section>
      )}

      {canManage && closed && (
        <Section title="Rouvrir le dossier" description="Remet un dossier approuvé ou rejeté en cours de revue.">
          <Field label="Commentaire" hint="Facultatif.">
            <input value={reopenComment} onChange={(e) => setReopenComment(e.target.value)} className={FIELD} />
          </Field>
          <ActionButton
            variant="ghost"
            icon={RotateCcw}
            pending={reopen.isPending}
            onClick={() => toast.confirm({ message: "Rouvrir ce dossier ?", detail: "Le statut actuel est remplacé et le client peut être notifié.", confirmLabel: "Rouvrir", pendingLabel: "Réouverture", onConfirm: () => reopen.mutateAsync() })}
          >
            Rouvrir
          </ActionButton>
        </Section>
      )}

      {canReject && (
        <Section title="Rejet définitif" description="Clôt le dossier sans possibilité de correction par le client. À réserver aux cas de fraude ou de refus ferme.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Motif">
              <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className={FIELD}>
                <option value="">Sans motif prédéfini</option>
                {(reasons.data ?? []).map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commentaire">
              <input value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} className={FIELD} />
            </Field>
          </div>
          <ActionButton
            variant="danger"
            icon={XCircle}
            pending={rejectFinal.isPending}
            onClick={() =>
              toast.confirm({
                message: "Rejeter définitivement ce dossier ?",
                detail: "Le client ne pourra plus corriger ses pièces. Cette décision est tracée.",
                confirmLabel: "Rejeter définitivement",
                pendingLabel: "Rejet",
                tone: "danger",
                onConfirm: () => rejectFinal.mutateAsync(),
              })
            }
          >
            Rejeter définitivement
          </ActionButton>
        </Section>
      )}
    </div>
  );
};
