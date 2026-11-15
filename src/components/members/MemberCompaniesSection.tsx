import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, Download, FileSpreadsheet, Link2 } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { CompanyMemberRole, CompanyResponse, InvoiceLinkMode } from "../../services/company.service";
import { ActionButton, CheckField, ErrorBlock, Field, ItemRow, PanelForm, Section, StatusChip, Tag } from "../subscription/kit";
import { FIELD, apiMessage, formatDate } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { CompanyPicker } from "../companies/CompanyPicker";
import { COMPANIES_KEY, LINK_MODE_LABEL, ROLE_LABEL } from "../companies/companyLabels";
import { downloadFile } from "../companies/companyTabKit";

const AttachForm: React.FC<{ memberId: string; onDone: () => void }> = ({ memberId, onDone }) => {
  const queryClient = useQueryClient();
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [role, setRole] = useState<CompanyMemberRole>("EMPLOYEE");
  const [mode, setMode] = useState<"" | InvoiceLinkMode>("");
  const [canSign, setCanSign] = useState(false);
  const [canCollectMail, setCanCollectMail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      companyService.addMember(company?.customerId ?? "", {
        memberId,
        role,
        invoiceLinkMode: mode || undefined,
        canSign,
        canCollectMail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Membre rattaché à l'organisation");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Rattachement impossible.")),
  });

  return (
    <PanelForm
      title="Rattacher à une organisation"
      pending={mutation.isPending}
      submitLabel="Rattacher"
      submitDisabled={!company}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Organisation" required>
        <CompanyPicker selected={company} onSelect={setCompany} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Rôle" required>
          <select value={role} onChange={(e) => setRole(e.target.value as CompanyMemberRole)} className={FIELD}>
            <option value="EMPLOYEE">{ROLE_LABEL.EMPLOYEE}</option>
            <option value="OWNER">{ROLE_LABEL.OWNER}</option>
          </select>
        </Field>
        <Field label="Factures" hint="Un membre n'a qu'une organisation en mode automatique">
          <select value={mode} onChange={(e) => setMode(e.target.value as "" | InvoiceLinkMode)} className={FIELD}>
            <option value="">Mode de l'organisation</option>
            <option value="AUTOMATIC">{LINK_MODE_LABEL.AUTOMATIC}</option>
            <option value="ON_CHOICE">{LINK_MODE_LABEL.ON_CHOICE}</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckField checked={canSign} onChange={setCanSign} label="Peut signer pour l'organisation" />
        <CheckField checked={canCollectMail} onChange={setCanCollectMail} label="Peut retirer le courrier" />
      </div>
    </PanelForm>
  );
};

/** Organisations d'un membre, rattachement et état de compte. */
export const MemberCompaniesSection: React.FC<{ memberId: string }> = ({ memberId }) => {
  const [attaching, setAttaching] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [COMPANIES_KEY, "member", memberId],
    queryFn: () => companyService.getMemberCompanies(memberId),
  });
  const rows = data ?? [];

  return (
    <Section
      title="Organisations"
      description="Les organisations auxquelles ce membre est rattaché"
      icon={Building}
      action={
        <div className="flex flex-wrap justify-end gap-2">
          <ActionButton variant="ghost" icon={Download} onClick={() => downloadFile(() => companyService.getMemberStatementPdf(memberId), `etat-de-compte-${memberId}.pdf`, "Export PDF impossible.")}>
            État de compte
          </ActionButton>
          <ActionButton variant="ghost" icon={FileSpreadsheet} onClick={() => downloadFile(() => companyService.getMemberStatementCsv(memberId), `etat-de-compte-${memberId}.csv`, "Export CSV impossible.")}>
            CSV
          </ActionButton>
          <ActionButton icon={Link2} disabled={attaching} onClick={() => setAttaching(true)}>
            Rattacher
          </ActionButton>
        </div>
      }
    >
      {attaching && <AttachForm memberId={memberId} onDone={() => setAttaching(false)} />}
      {isLoading ? (
        <ListSkeleton rows={2} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les organisations." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">Ce membre n'est rattaché à aucune organisation.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((l) => {
            const ended = l.status === "ENDED";
            const mode = l.effectiveInvoiceLinkMode ?? l.invoiceLinkMode;
            return (
              <ItemRow key={l.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {l.customerId ? (
                      <Link to={`/companies/${encodeURIComponent(l.customerId)}`} className="truncate text-sm font-bold text-gray-950 hover:underline">
                        {l.companyName ?? l.customerId}
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-gray-950">{l.companyName}</span>
                    )}
                    <StatusChip tone={l.role === "OWNER" ? "pink" : "neutral"}>{ROLE_LABEL[l.role] ?? l.role}</StatusChip>
                    {ended && <StatusChip tone="neutral">Terminé</StatusChip>}
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-400">
                    {l.startedAt ? `depuis le ${formatDate(l.startedAt)}` : ""}
                    {ended && l.endedAt ? ` · fin le ${formatDate(l.endedAt)}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {mode && <Tag>Factures : {LINK_MODE_LABEL[mode] ?? mode}</Tag>}
                    {l.canSign && <Tag tone="pink">Signe</Tag>}
                    {l.canCollectMail && <Tag tone="pink">Courrier</Tag>}
                  </div>
                </div>
              </ItemRow>
            );
          })}
        </div>
      )}
    </Section>
  );
};
