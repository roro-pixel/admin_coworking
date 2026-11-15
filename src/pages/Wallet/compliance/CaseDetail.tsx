import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, Download, Gavel, MessageSquarePlus, UserCheck } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import type { CaseView, ComplianceDecision } from "../../../services/walletControl.service";
import { ActionButton, Detail, EmptyState, ErrorBlock, Field, ItemRow, PageHeader, PanelForm, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime } from "../../../components/subscription/kitUtils";
import { Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { CASE_STATUS, DECISION_LABEL, DECISION_OPTIONS, PRIORITY } from "../../../components/wallet/walletLabels";
import { saveBlob } from "../../../components/wallet/control/controlUtils";

type Panel = null | "assign" | "escalate" | "close";

/** Dossier de conformité : informations, notes et décisions (affectation, escalade, clôture, export). */
export const CaseDetail: React.FC<{ caseNumber: string; onBack: () => void }> = ({ caseNumber, onBack }) => {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [escalatedTo, setEscalatedTo] = useState("");
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<ComplianceDecision>("CLEARED");
  const [rationale, setRationale] = useState("");
  const [findings, setFindings] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: c, isLoading, isError, refetch } = useQuery({ queryKey: ["wallet-case", caseNumber], queryFn: () => walletControlService.getCase(caseNumber) });
  const notes = useQuery({ queryKey: ["wallet-case-notes", caseNumber], queryFn: () => walletControlService.getCaseNotes(caseNumber) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["wallet-case", caseNumber] });
    qc.invalidateQueries({ queryKey: ["wallet-cases"] });
    qc.invalidateQueries({ queryKey: ["wallet-compliance-dashboard"] });
  };
  const done = (msg: string) => () => {
    toast.success(msg);
    setPanel(null);
    setError(null);
    refresh();
  };
  const fail = (fallback: string) => (e: unknown) => setError(apiMessage(e, fallback));

  const noteMutation = useMutation({
    mutationFn: () => walletControlService.addCaseNote(caseNumber, note.trim()),
    onSuccess: () => {
      toast.success("Note ajoutée");
      setNote("");
      qc.invalidateQueries({ queryKey: ["wallet-case-notes", caseNumber] });
    },
    onError: (e) => toast.error(apiMessage(e, "Ajout impossible.")),
  });
  const assignMutation = useMutation({ mutationFn: () => walletControlService.assignCase(caseNumber, assignee.trim()), onSuccess: done("Dossier affecté"), onError: fail("Affectation impossible.") });
  const escalateMutation = useMutation({
    mutationFn: () => walletControlService.escalateCase(caseNumber, { escalatedTo: escalatedTo.trim(), reason: reason.trim() }),
    onSuccess: done("Dossier escaladé"),
    onError: fail("Escalade impossible."),
  });
  const closeMutation = useMutation({
    mutationFn: () => walletControlService.closeCase(caseNumber, { decision, rationale: rationale.trim(), findings: findings.trim() || undefined }),
    onSuccess: done("Dossier clos"),
    onError: fail("Clôture impossible."),
  });
  const exportMutation = useMutation({
    mutationFn: () => walletControlService.exportCase(caseNumber, 90),
    onSuccess: (json) => saveBlob(new Blob([JSON.stringify(json, null, 2)], { type: "application/json" }), `${caseNumber}.json`),
    onError: (e) => toast.error(apiMessage(e, "Export impossible.")),
  });

  const shell = (children: React.ReactNode) => <div className="mx-auto w-full max-w-4xl space-y-5">{children}</div>;
  if (isLoading) return shell(<Skeleton className="h-72 w-full rounded-2xl" />);
  if (isError || !c) return shell(<ErrorBlock message="Dossier introuvable." onRetry={() => refetch()} />);

  const cv: CaseView = c;
  const closed = cv.status.startsWith("CLOSED");
  const st = CASE_STATUS[cv.status] ?? { label: cv.status, tone: "neutral" as const };
  const pr = PRIORITY[cv.priority] ?? { label: cv.priority, tone: "neutral" as const };
  const flags = Array.isArray(cv.triggeredByFlags) ? cv.triggeredByFlags.join(", ") : cv.triggeredByFlags;

  return shell(
    <>
      <PageHeader
        title={cv.caseNumber}
        subtitle={cv.title}
        onBack={onBack}
        backLabel="Retour aux dossiers"
        badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
        actions={
          <ActionButton variant="ghost" icon={Download} pending={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
            Exporter le dossier
          </ActionButton>
        }
      />

      <Section title="Dossier" description="Sujet, échéance et décision">
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Detail label="Sujet" mono>{`${cv.subjectType} ${cv.subjectCode}`}</Detail>
          <Detail label="Portefeuille">
            {cv.walletNumber && (
              <Link to={`/wallets/${cv.walletNumber}`} className="font-mono font-semibold text-[color:var(--logo-pink-dark)] hover:underline">
                {cv.walletNumber}
              </Link>
            )}
          </Detail>
          <Detail label="Priorité">
            <StatusChip tone={pr.tone}>{pr.label}</StatusChip>
          </Detail>
          <Detail label="Échéance">{cv.dueAt ? `${formatDateTime(cv.dueAt)}${cv.overdue ? " (dépassée)" : ""}` : cv.overdue ? "Dépassée" : undefined}</Detail>
          <Detail label="Affecté à">{cv.assignedTo}</Detail>
          <Detail label="Ouvert par">{cv.openedBy}</Detail>
          <Detail label="Ouvert le">{formatDateTime(cv.createdAt)}</Detail>
          <Detail label="Alertes à l'origine" wide>{flags}</Detail>
          <Detail label="Escaladé à">{cv.escalatedTo}</Detail>
          <Detail label="Constats" wide>{cv.findings}</Detail>
          <Detail label="Décision">{cv.decision ? DECISION_LABEL[cv.decision] ?? cv.decision : undefined}</Detail>
          <Detail label="Décidé par">{cv.decidedBy ? `${cv.decidedBy}${cv.decidedAt ? `, ${formatDateTime(cv.decidedAt)}` : ""}` : undefined}</Detail>
          <Detail label="Justification de la décision" wide>{cv.decisionRationale}</Detail>
        </div>
        {!closed && panel === null && (
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton variant="ghost" icon={UserCheck} onClick={() => setPanel("assign")}>
              Affecter
            </ActionButton>
            <ActionButton variant="ghost" icon={ArrowUpRight} onClick={() => setPanel("escalate")}>
              Escalader
            </ActionButton>
            <ActionButton icon={Gavel} onClick={() => setPanel("close")}>
              Clore le dossier
            </ActionButton>
          </div>
        )}
      </Section>

      {panel === "assign" && (
        <PanelForm title="Affecter le dossier" pending={assignMutation.isPending} submitLabel="Affecter" submitDisabled={!assignee.trim()} error={error} onCancel={() => setPanel(null)} onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(); }}>
          <Field label="Responsable" required hint="Identifiant de la personne qui traite le dossier">
            <input className={FIELD_SOFT} value={assignee} onChange={(e) => setAssignee(e.target.value)} />
          </Field>
        </PanelForm>
      )}
      {panel === "escalate" && (
        <PanelForm title="Escalader le dossier" pending={escalateMutation.isPending} submitLabel="Escalader" submitDisabled={!escalatedTo.trim() || !reason.trim()} error={error} onCancel={() => setPanel(null)} onSubmit={(e) => { e.preventDefault(); escalateMutation.mutate(); }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Escaladé à" required>
              <input className={FIELD_SOFT} value={escalatedTo} onChange={(e) => setEscalatedTo(e.target.value)} />
            </Field>
            <Field label="Motif" required>
              <input className={FIELD_SOFT} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </div>
        </PanelForm>
      )}
      {panel === "close" && (
        <PanelForm title="Clore le dossier" pending={closeMutation.isPending} submitLabel="Clore" submitDisabled={!rationale.trim()} error={error} onCancel={() => setPanel(null)} onSubmit={(e) => { e.preventDefault(); closeMutation.mutate(); }}>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Décision" required>
              <select className={FIELD_SOFT} value={decision} onChange={(e) => setDecision(e.target.value as ComplianceDecision)}>
                {DECISION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Justification" required>
              <textarea className={`${FIELD_SOFT} resize-none`} rows={2} value={rationale} onChange={(e) => setRationale(e.target.value)} />
            </Field>
            <Field label="Constats">
              <textarea className={`${FIELD_SOFT} resize-none`} rows={2} value={findings} onChange={(e) => setFindings(e.target.value)} />
            </Field>
          </div>
        </PanelForm>
      )}

      <Section title="Notes" description="Journal de l'instruction" icon={MessageSquarePlus}>
        <div className="space-y-2">
          {notes.isLoading ? (
            <Skeleton className="h-16 w-full rounded-2xl" />
          ) : (notes.data ?? []).length === 0 ? (
            <EmptyState icon={MessageSquarePlus} title="Aucune note" hint="Ajoutez la première note du dossier." />
          ) : (
            (notes.data ?? []).map((n, i) => (
              <ItemRow key={i}>
                <p className="text-sm text-gray-800">{n.note}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {n.author ?? ""}
                  {n.author && n.createdAt ? " · " : ""}
                  {n.createdAt ? formatDateTime(n.createdAt) : ""}
                </p>
              </ItemRow>
            ))
          )}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Nouvelle note">
            <input className={`${FIELD_SOFT} !bg-white`} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <ActionButton icon={MessageSquarePlus} pending={noteMutation.isPending} disabled={!note.trim()} onClick={() => noteMutation.mutate()}>
            Ajouter
          </ActionButton>
        </div>
      </Section>
    </>,
  );
};
