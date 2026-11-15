import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PenLine, UserMinus, UserPlus, Users } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { CompanyMemberLink, CompanyMemberRole, CompanyMemberStatus, CompanyResponse, InvoiceLinkMode } from "../../services/company.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, IconButton, PanelForm, Section, StatusChip, Switch, Tag } from "../subscription/kit";
import { FIELD, FOCUS, apiMessage, formatDate } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { MemberAutocomplete } from "../members/MemberAutocomplete";
import { COMPANIES_KEY, LINK_MODE_HINT, LINK_MODE_LABEL, ROLE_LABEL } from "./companyLabels";

const MODES: InvoiceLinkMode[] = ["AUTOMATIC", "ON_CHOICE"];
const STATUS_FILTERS: { value: CompanyMemberStatus; label: string }[] = [
  { value: "ACTIVE", label: "Actifs" },
  { value: "ENDED", label: "Terminés" },
  { value: "ALL", label: "Tous" },
];

type Panel = { kind: "add" } | { kind: "edit"; link: CompanyMemberLink } | { kind: "end"; link: CompanyMemberLink } | null;

/** Mode de rattachement des factures par défaut de l'organisation. */
const DefaultMode: React.FC<{ company: CompanyResponse }> = ({ company }) => {
  const queryClient = useQueryClient();
  const current = company.invoiceLinkMode ?? undefined;
  const mutation = useMutation({
    mutationFn: (mode: InvoiceLinkMode) => companyService.setInvoiceLinkMode(company.customerId, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Mode par défaut enregistré");
    },
    onError: (e) => toast.error(apiMessage(e, "Changement impossible.")),
  });
  return (
    <Section title="Factures des membres" description="Mode par défaut, remplaçable pour chaque rattachement">
      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => {
          const on = current === m;
          return (
            <button
              key={m}
              type="button"
              disabled={mutation.isPending}
              onClick={() => !on && mutation.mutate(m)}
              className={`rounded-2xl p-4 text-left shadow-sm transition disabled:opacity-60 ${FOCUS} ${
                on ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span className="block text-sm font-bold">{LINK_MODE_LABEL[m]}</span>
              <span className={`mt-1 block text-xs ${on ? "text-white/80" : "text-gray-500"}`}>{LINK_MODE_HINT[m]}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
};

const AddForm: React.FC<{ customerId: string; onDone: () => void }> = ({ customerId, onDone }) => {
  const queryClient = useQueryClient();
  const [member, setMember] = useState<MemberSummaryResponse | null>(null);
  const [role, setRole] = useState<CompanyMemberRole>("EMPLOYEE");
  const [mode, setMode] = useState<"" | InvoiceLinkMode>("");
  const [canSign, setCanSign] = useState(false);
  const [canCollectMail, setCanCollectMail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      companyService.addMember(customerId, {
        memberId: member?.memberId ?? "",
        role,
        invoiceLinkMode: mode || undefined,
        canSign,
        canCollectMail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Membre rattaché");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Rattachement impossible.")),
  });

  return (
    <PanelForm
      title="Rattacher un membre"
      pending={mutation.isPending}
      submitLabel="Rattacher"
      submitDisabled={!member}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Membre" required>
        <MemberAutocomplete selectedMember={member} onSelect={setMember} />
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
            {MODES.map((m) => (
              <option key={m} value={m}>
                {LINK_MODE_LABEL[m]}
              </option>
            ))}
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

const EditForm: React.FC<{ customerId: string; link: CompanyMemberLink; onDone: () => void }> = ({ customerId, link, onDone }) => {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<CompanyMemberRole>(link.role);
  const [inherit, setInherit] = useState(link.useCompanyDefaultMode ?? !link.invoiceLinkMode);
  const [mode, setMode] = useState<InvoiceLinkMode>(link.invoiceLinkMode ?? link.effectiveInvoiceLinkMode ?? "ON_CHOICE");
  const [canSign, setCanSign] = useState(link.canSign);
  const [canCollectMail, setCanCollectMail] = useState(link.canCollectMail);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      companyService.updateMember(customerId, link.id, {
        role,
        ...(inherit ? { useCompanyDefaultMode: true } : { invoiceLinkMode: mode }),
        canSign,
        canCollectMail,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Rattachement modifié");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Modification impossible.")),
  });

  return (
    <PanelForm
      title={`Modifier le rattachement de ${link.memberName ?? link.memberId}`}
      pending={mutation.isPending}
      submitLabel="Enregistrer"
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Rôle">
        <select value={role} onChange={(e) => setRole(e.target.value as CompanyMemberRole)} className={FIELD}>
          <option value="EMPLOYEE">{ROLE_LABEL.EMPLOYEE}</option>
          <option value="OWNER">{ROLE_LABEL.OWNER}</option>
        </select>
      </Field>
      <Switch checked={inherit} onChange={setInherit} label="Suivre le mode de l'organisation" hint="Sinon, ce rattachement a son propre mode" />
      {!inherit && (
        <Field label="Mode des factures" hint="Un membre n'a qu'une organisation en mode automatique">
          <select value={mode} onChange={(e) => setMode(e.target.value as InvoiceLinkMode)} className={FIELD}>
            {MODES.map((m) => (
              <option key={m} value={m}>
                {LINK_MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckField checked={canSign} onChange={setCanSign} label="Peut signer pour l'organisation" />
        <CheckField checked={canCollectMail} onChange={setCanCollectMail} label="Peut retirer le courrier" />
      </div>
    </PanelForm>
  );
};

const EndForm: React.FC<{ customerId: string; link: CompanyMemberLink; onDone: () => void }> = ({ customerId, link, onDone }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => companyService.endMember(customerId, link.id, reason.trim()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success(result.payerChanged ? "Rattachement terminé : le membre repasse sur sa fiche personnelle" : "Rattachement terminé");
      if (result.warning) toast.error(result.warning);
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Fin de rattachement impossible.")),
  });

  return (
    <PanelForm
      title={`Mettre fin au rattachement de ${link.memberName ?? link.memberId}`}
      pending={mutation.isPending}
      submitLabel="Mettre fin"
      submitDisabled={reason.trim() === ""}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <p className="-mt-2 text-sm text-gray-500">Ses places d'abonnement et ses accès aux passes de l'organisation sont fermés, ses autorisations de dépense suspendues. Le lien reste en historique.</p>
      <Field label="Motif" required>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${FIELD} resize-none bg-gray-50 shadow-none`} />
      </Field>
    </PanelForm>
  );
};

/** Onglet Membres */
export const CompanyMembersTab: React.FC<{ company: CompanyResponse }> = ({ company }) => {
  const id = company.customerId;
  const [status, setStatus] = useState<CompanyMemberStatus>("ACTIVE");
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [COMPANIES_KEY, "members", id, status],
    queryFn: () => companyService.getMembers(id, status),
  });
  const rows = data ?? [];

  return (
    <div className="space-y-5">
      <DefaultMode company={company} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const on = status === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS} ${on ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <ActionButton icon={UserPlus} disabled={panel !== null} onClick={() => setPanel({ kind: "add" })}>
          Rattacher un membre
        </ActionButton>
      </div>

      {panel?.kind === "add" && <AddForm customerId={id} onDone={close} />}
      {panel?.kind === "edit" && <EditForm customerId={id} link={panel.link} onDone={close} />}
      {panel?.kind === "end" && <EndForm customerId={id} link={panel.link} onDone={close} />}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les membres." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title={status === "ENDED" ? "Aucun rattachement terminé" : "Aucun membre rattaché"} hint="Un membre peut être rattaché à plusieurs organisations, une fois chacune." />
      ) : (
        <DataCard>
          <div className="space-y-2">
            {rows.map((l) => {
              const ended = l.status === "ENDED";
              const mode = l.effectiveInvoiceLinkMode ?? l.invoiceLinkMode;
              return (
                <div key={l.id} className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/members/${encodeURIComponent(l.memberId)}`} className={`truncate text-sm font-bold text-gray-950 hover:underline ${FOCUS}`}>
                        {l.memberName ?? l.memberId}
                      </Link>
                      <StatusChip tone={l.role === "OWNER" ? "pink" : "neutral"}>{ROLE_LABEL[l.role] ?? l.role}</StatusChip>
                      {ended && <StatusChip tone="neutral">Terminé</StatusChip>}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-400">
                      <span className="font-mono">{l.memberId}</span> · depuis le {formatDate(l.startedAt)}
                      {ended && l.endedAt ? ` · fin le ${formatDate(l.endedAt)}` : ""}
                      {ended && l.endReason ? ` · ${l.endReason}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mode && <Tag>Factures : {LINK_MODE_LABEL[mode] ?? mode}{l.useCompanyDefaultMode ? " (héritée)" : ""}</Tag>}
                      {l.canSign && <Tag tone="pink">Signe</Tag>}
                      {l.canCollectMail && <Tag tone="pink">Courrier</Tag>}
                    </div>
                  </div>
                  {!ended && (
                    <div className="flex shrink-0 items-center justify-end gap-1">
                      <IconButton icon={PenLine} label="Modifier le rattachement" tone="pink" disabled={panel !== null} onClick={() => setPanel({ kind: "edit", link: l })} />
                      <IconButton icon={UserMinus} label="Mettre fin au rattachement" tone="danger" disabled={panel !== null} onClick={() => setPanel({ kind: "end", link: l })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
};
