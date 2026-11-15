import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Ticket, UserPlus } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { CompanyPassSummary, CompanyResponse, PassBeneficiary, PassBeneficiaries } from "../../services/company.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ItemRow, PanelForm, Section, StatusChip, Tag } from "../subscription/kit";
import { FIELD, apiMessage, formatDate } from "../subscription/kitUtils";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { MemberAutocomplete } from "../members/MemberAutocomplete";
import { COMPANIES_KEY } from "./companyLabels";
import { amountOf, toNumber } from "./companyTabKit";

type Panel = { kind: "open" } | { kind: "revoke"; b: PassBeneficiary } | null;

const OpenForm: React.FC<{ customerId: string; passNumber: string; onDone: () => void }> = ({ customerId, passNumber, onDone }) => {
  const queryClient = useQueryClient();
  const [member, setMember] = useState<MemberSummaryResponse | null>(null);
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      companyService.openPassAccess(customerId, passNumber, {
        memberId: member?.memberId ?? "",
        maxUses: toNumber(maxUses),
        validFrom: validFrom || undefined,
        validUntil: validUntil || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Accès ouvert");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Ouverture impossible.")),
  });
  return (
    <PanelForm
      title="Ouvrir un accès"
      pending={mutation.isPending}
      submitLabel="Ouvrir"
      submitDisabled={!member}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Collaborateur" required hint="Il doit être rattaché à l'organisation">
        <MemberAutocomplete selectedMember={member} onSelect={setMember} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Utilisations max." hint="Vide : sans limite">
          <input inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Valable dès le">
          <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={FIELD} />
        </Field>
        <Field label="Jusqu'au">
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={FIELD} />
        </Field>
      </div>
    </PanelForm>
  );
};

const RevokeForm: React.FC<{ customerId: string; passNumber: string; b: PassBeneficiary; onDone: () => void }> = ({ customerId, passNumber, b, onDone }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => companyService.revokePassAccess(customerId, passNumber, b.id, reason.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Accès retiré");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Retrait impossible.")),
  });
  return (
    <PanelForm
      title={`Retirer l'accès de ${b.memberName ?? b.memberId}`}
      pending={mutation.isPending}
      submitLabel="Retirer"
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Motif">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={`${FIELD} resize-none bg-gray-50 shadow-none`} />
      </Field>
    </PanelForm>
  );
};

const Beneficiaries: React.FC<{ customerId: string; passNumber: string }> = ({ customerId, passNumber }) => {
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);
  const { data, isLoading, isError, refetch } = useQuery<PassBeneficiaries>({
    queryKey: [COMPANIES_KEY, "pass", customerId, passNumber],
    queryFn: () => companyService.getPassBeneficiaries(customerId, passNumber),
  });
  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError || !data) return <ErrorBlock message="Impossible de charger les accès." onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      {panel?.kind === "open" && <OpenForm customerId={customerId} passNumber={passNumber} onDone={close} />}
      {panel?.kind === "revoke" && <RevokeForm customerId={customerId} passNumber={passNumber} b={panel.b} onDone={close} />}

      {data.entitlements.length > 0 && (
        <Section title="Droits du passe" description="Partagés entre tous les accès ouverts">
          <div className="flex flex-wrap gap-2">
            {data.entitlements.map((e) => (
              <Tag key={e.entitlementCode} tone="pink">
                {e.entitlementCode} : {e.unlimited ? "illimité" : `reste ${amountOf(e.remaining, e.unit)} sur ${amountOf(e.granted, e.unit)}`}
              </Tag>
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Accès ouverts"
        action={
          <ActionButton icon={UserPlus} disabled={panel !== null} onClick={() => setPanel({ kind: "open" })}>
            Ouvrir un accès
          </ActionButton>
        }
      >
        {data.beneficiaries.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun accès ouvert.</p>
        ) : (
          <div className="space-y-2">
            {data.beneficiaries.map((b) => (
              <ItemRow key={b.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/members/${encodeURIComponent(b.memberId)}`} className="truncate text-sm font-bold text-gray-950 hover:underline">
                        {b.memberName ?? b.memberId}
                      </Link>
                      {!b.open && <StatusChip tone="neutral">Retiré</StatusChip>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {b.usedCount} utilisation(s){b.maxUses != null ? ` sur ${b.maxUses}` : ""}
                      {b.validFrom ? ` · dès le ${formatDate(b.validFrom)}` : ""}
                      {b.validUntil ? ` · jusqu'au ${formatDate(b.validUntil)}` : ""}
                    </p>
                    {b.consumption.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {b.consumption.map((c) => (
                          <Tag key={c.entitlementCode}>
                            {c.entitlementCode} : {amountOf(c.consumed)}
                          </Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  {b.open && (
                    <div className="flex shrink-0 justify-end">
                      <IconButton icon={Ban} label="Retirer l'accès" tone="danger" disabled={panel !== null} onClick={() => setPanel({ kind: "revoke", b })} />
                    </div>
                  )}
                </div>
              </ItemRow>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

/** Onglet Passes  */
export const CompanyPassesTab: React.FC<{ company: CompanyResponse }> = ({ company }) => {
  const id = company.customerId;
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery<CompanyPassSummary[]>({
    queryKey: [COMPANIES_KEY, "passes", id],
    queryFn: () => companyService.getPasses(id),
  });
  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError) return <ErrorBlock message="Impossible de charger les passes." onRetry={() => refetch()} />;
  const rows = data ?? [];
  if (rows.length === 0) return <EmptyState icon={Ticket} title="Aucun passe" hint="Les passes achetés par l'organisation apparaissent ici." />;
  const current = selected ?? rows[0].passNumber;

  return (
    <div className="space-y-5">
      <DataCard>
        <div className="space-y-2">
          {rows.map((p) => {
            const on = p.passNumber === current;
            return (
              <button
                key={p.passNumber}
                type="button"
                onClick={() => setSelected(p.passNumber)}
                className={`flex w-full flex-col gap-1 rounded-2xl p-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${on ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] ring-2 ring-[color:var(--logo-pink)]" : "bg-gray-50 hover:bg-gray-100"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-gray-950">{p.name}</span>
                  <span className="block truncate text-xs text-gray-500">
                    <span className="font-mono">{p.passNumber}</span>
                    {p.validUntil ? ` · jusqu'au ${formatDate(p.validUntil)}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{p.beneficiaries} accès</span>
                  <StatusChip tone={p.status === "ACTIVE" ? "success" : "neutral"}>{p.status === "ACTIVE" ? "Actif" : p.status}</StatusChip>
                </span>
              </button>
            );
          })}
        </div>
      </DataCard>
      <Beneficiaries key={current} customerId={id} passNumber={current} />
    </div>
  );
};
