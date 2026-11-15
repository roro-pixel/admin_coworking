import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Armchair, CreditCard, PenLine, UserMinus, UserPlus } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { CompanyResponse, SeatAllowance, SharedEntitlement, SharingMode, SubscriptionSeat, SubscriptionSharing } from "../../services/company.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, ItemRow, PanelForm, Section, StatusChip, Tag } from "../subscription/kit";
import { FIELD, apiMessage, formatDate } from "../subscription/kitUtils";
import { statusOf, SUBSCRIPTION_STATUS } from "../subscription/labels";
import { ListSkeleton } from "../ui/Skeleton";
import { toast } from "../ui/toastStore";
import { MemberAutocomplete } from "../members/MemberAutocomplete";
import { COMPANIES_KEY } from "./companyLabels";
import { amountOf, numText, toNumber } from "./companyTabKit";

const MODE_LABEL: Record<string, string> = { POOL: "Pot commun", QUOTA: "Part par place", QUOTA_AND_POOL: "Part puis pot commun" };
const MODE_HINT: Record<SharingMode, string> = {
  POOL: "Tous les collaborateurs puisent dans le même total.",
  QUOTA: "Chaque place a sa part fixe.",
  QUOTA_AND_POOL: "La part de la place d'abord, puis le pot commun.",
};
const MODES: SharingMode[] = ["POOL", "QUOTA", "QUOTA_AND_POOL"];

type Panel =
  | { kind: "seats" }
  | { kind: "rule"; ent: SharedEntitlement }
  | { kind: "assign" }
  | { kind: "seat"; seat: SubscriptionSeat }
  | { kind: "release"; seat: SubscriptionSeat }
  | null;

interface Ctx {
  customerId: string;
  number: string;
  sharing: SubscriptionSharing;
  onDone: () => void;
}

const useRefresh = (onDone: () => void) => {
  const queryClient = useQueryClient();
  return (message: string) => {
    queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
    toast.success(message);
    onDone();
  };
};

const SeatsForm: React.FC<Ctx> = ({ customerId, number, sharing, onDone }) => {
  const done = useRefresh(onDone);
  const [value, setValue] = useState(numText(sharing.subscription.maxSeats));
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => companyService.setMaxSeats(customerId, number, toNumber(value) ?? null),
    onSuccess: () => done("Nombre de places enregistré"),
    onError: (e) => setError(apiMessage(e, "Changement impossible.")),
  });
  return (
    <PanelForm
      title="Nombre de places"
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
      <Field label="Places" hint="Vide : aucune limite. Le plafond vendu ne peut pas être dépassé.">
        <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className={FIELD} />
      </Field>
    </PanelForm>
  );
};

const RuleForm: React.FC<Ctx & { ent: SharedEntitlement }> = ({ customerId, number, ent, onDone }) => {
  const done = useRefresh(onDone);
  const [mode, setMode] = useState<SharingMode>((ent.mode as SharingMode) ?? "POOL");
  const [quota, setQuota] = useState(numText(ent.defaultQuota));
  const [cap, setCap] = useState(numText(ent.seatCap));
  const [error, setError] = useState<string | null>(null);
  const needsQuota = mode !== "POOL";
  const mutation = useMutation({
    mutationFn: () =>
      companyService.setSharingRule(customerId, number, ent.entitlementCode, {
        mode,
        defaultQuota: needsQuota ? (toNumber(quota) ?? null) : null,
        seatCap: toNumber(cap) ?? null,
      }),
    onSuccess: () => done("Règle de partage enregistrée"),
    onError: (e) => setError(apiMessage(e, "Règle refusée.")),
  });
  return (
    <PanelForm
      title={`Partage de ${ent.entitlementCode}`}
      pending={mutation.isPending}
      submitLabel="Enregistrer"
      submitDisabled={needsQuota && toNumber(quota) === undefined}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Mode" hint={MODE_HINT[mode]}>
        <select value={mode} onChange={(e) => setMode(e.target.value as SharingMode)} className={FIELD}>
          {MODES.map((m) => (
            <option key={m} value={m}>
              {MODE_LABEL[m]}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {needsQuota && (
          <Field label={`Part de chaque place${ent.unit ? ` (${ent.unit})` : ""}`} required>
            <input inputMode="decimal" value={quota} onChange={(e) => setQuota(e.target.value)} className={FIELD} />
          </Field>
        )}
        <Field label="Plafond par place sur la période" hint="Vide : pas de plafond">
          <input inputMode="decimal" value={cap} onChange={(e) => setCap(e.target.value)} className={FIELD} />
        </Field>
      </div>
    </PanelForm>
  );
};

const AllowanceFields: React.FC<{
  sharing: SubscriptionSharing;
  quotas: Record<string, string>;
  caps: Record<string, string>;
  onQuota: (code: string, v: string) => void;
  onCap: (code: string, v: string) => void;
}> = ({ sharing, quotas, caps, onQuota, onCap }) => (
  <div className="space-y-3">
    {sharing.entitlements.map((e) => (
      <div key={e.entitlementCode} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem] sm:items-end">
        <p className="text-sm font-bold text-gray-800">
          {e.entitlementCode}
          {e.unit && <span className="ml-1 text-xs font-normal text-gray-400">{e.unit}</span>}
        </p>
        <Field label="Part">
          <input inputMode="decimal" value={quotas[e.entitlementCode] ?? ""} onChange={(ev) => onQuota(e.entitlementCode, ev.target.value)} className={FIELD} />
        </Field>
        <Field label="Plafond">
          <input inputMode="decimal" value={caps[e.entitlementCode] ?? ""} onChange={(ev) => onCap(e.entitlementCode, ev.target.value)} className={FIELD} />
        </Field>
      </div>
    ))}
  </div>
);

const allowancesOf = (sharing: SubscriptionSharing, quotas: Record<string, string>, caps: Record<string, string>): SeatAllowance[] =>
  sharing.entitlements
    .map((e) => ({ entitlementCode: e.entitlementCode, quota: toNumber(quotas[e.entitlementCode] ?? ""), cap: toNumber(caps[e.entitlementCode] ?? "") }))
    .filter((a) => a.quota !== undefined || a.cap !== undefined);

const AssignForm: React.FC<Ctx> = ({ customerId, number, sharing, onDone }) => {
  const done = useRefresh(onDone);
  const [member, setMember] = useState<MemberSummaryResponse | null>(null);
  const [quotas, setQuotas] = useState<Record<string, string>>({});
  const [caps, setCaps] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => companyService.assignSeat(customerId, number, { memberId: member?.memberId ?? "", allowances: allowancesOf(sharing, quotas, caps) }),
    onSuccess: () => done("Place attribuée"),
    onError: (e) => setError(apiMessage(e, "Attribution impossible.")),
  });
  return (
    <PanelForm
      title="Attribuer une place"
      pending={mutation.isPending}
      submitLabel="Attribuer"
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
      {sharing.entitlements.length > 0 && (
        <>
          <p className="text-xs text-gray-500">Part et plafond propres à cette place, laissés vides ils suivent la règle de l'abonnement.</p>
          <AllowanceFields sharing={sharing} quotas={quotas} caps={caps} onQuota={(c, v) => setQuotas((s) => ({ ...s, [c]: v }))} onCap={(c, v) => setCaps((s) => ({ ...s, [c]: v }))} />
        </>
      )}
    </PanelForm>
  );
};

const SeatForm: React.FC<Ctx & { seat: SubscriptionSeat }> = ({ customerId, number, sharing, seat, onDone }) => {
  const done = useRefresh(onDone);
  const [quotas, setQuotas] = useState<Record<string, string>>(() => Object.fromEntries(seat.entitlements.map((e) => [e.entitlementCode, numText(e.quota)])));
  const [caps, setCaps] = useState<Record<string, string>>(() => Object.fromEntries(seat.entitlements.map((e) => [e.entitlementCode, numText(e.cap)])));
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => companyService.updateSeat(customerId, number, seat.id, allowancesOf(sharing, quotas, caps)),
    onSuccess: () => done("Place modifiée"),
    onError: (e) => setError(apiMessage(e, "Modification impossible.")),
  });
  return (
    <PanelForm
      title={`Droits de ${seat.memberName ?? seat.memberId}`}
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
      <AllowanceFields sharing={sharing} quotas={quotas} caps={caps} onQuota={(c, v) => setQuotas((s) => ({ ...s, [c]: v }))} onCap={(c, v) => setCaps((s) => ({ ...s, [c]: v }))} />
    </PanelForm>
  );
};

const ReleaseForm: React.FC<Ctx & { seat: SubscriptionSeat }> = ({ customerId, number, seat, onDone }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => companyService.releaseSeat(customerId, number, seat.id, reason.trim() || undefined),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: [COMPANIES_KEY] });
      toast.success("Place libérée");
      if (r.warning) toast.error(r.warning);
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Libération impossible.")),
  });
  return (
    <PanelForm
      title={`Libérer la place de ${seat.memberName ?? seat.memberId}`}
      pending={mutation.isPending}
      submitLabel="Libérer"
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <p className="-mt-2 text-sm text-gray-500">Ses réservations à venir sont signalées, pas annulées.</p>
      <Field label="Motif">
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={`${FIELD} resize-none bg-gray-50 shadow-none`} />
      </Field>
    </PanelForm>
  );
};

const SharingPanel: React.FC<{ customerId: string; number: string }> = ({ customerId, number }) => {
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [COMPANIES_KEY, "sharing", customerId, number],
    queryFn: () => companyService.getSharing(customerId, number),
  });

  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError || !data) return <ErrorBlock message="Impossible de charger le partage." onRetry={() => refetch()} />;
  const ctx: Ctx = { customerId, number, sharing: data, onDone: close };
  const sub = data.subscription;

  return (
    <div className="space-y-4">
      {panel?.kind === "seats" && <SeatsForm {...ctx} />}
      {panel?.kind === "rule" && <RuleForm {...ctx} ent={panel.ent} />}
      {panel?.kind === "assign" && <AssignForm {...ctx} />}
      {panel?.kind === "seat" && <SeatForm {...ctx} seat={panel.seat} />}
      {panel?.kind === "release" && <ReleaseForm {...ctx} seat={panel.seat} />}

      <Section
        title="Droits partagés"
        description="Ce que l'organisation reçoit et la façon dont ses collaborateurs le consomment"
        action={
          <ActionButton variant="ghost" icon={Armchair} disabled={panel !== null} onClick={() => setPanel({ kind: "seats" })}>
            {sub.activeSeats} / {sub.maxSeats ?? "illimité"} places
          </ActionButton>
        }
      >
        {data.entitlements.length === 0 ? (
          <p className="text-sm text-gray-500">Cet abonnement n'a aucun droit à partager.</p>
        ) : (
          <div className="space-y-2">
            {data.entitlements.map((e) => (
              <ItemRow key={e.entitlementCode}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-950">{e.entitlementCode}</p>
                    <p className="text-xs text-gray-500">
                      {MODE_LABEL[e.mode] ?? e.mode} · reste {amountOf(e.remaining, e.unit)} sur {amountOf(e.granted, e.unit)}
                      {e.defaultQuota != null ? ` · part ${amountOf(e.defaultQuota, e.unit)}` : ""}
                      {e.seatCap != null ? ` · plafond ${amountOf(e.seatCap, e.unit)}` : ""}
                    </p>
                  </div>
                  <IconButton icon={PenLine} label="Modifier la règle de partage" tone="pink" disabled={panel !== null} onClick={() => setPanel({ kind: "rule", ent: e })} />
                </div>
              </ItemRow>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Places"
        description="Un collaborateur par place"
        action={
          <ActionButton icon={UserPlus} disabled={panel !== null} onClick={() => setPanel({ kind: "assign" })}>
            Attribuer
          </ActionButton>
        }
      >
        {data.seats.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune place attribuée.</p>
        ) : (
          <div className="space-y-2">
            {data.seats.map((s) => (
              <ItemRow key={s.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link to={`/members/${encodeURIComponent(s.memberId)}`} className="truncate text-sm font-bold text-gray-950 hover:underline">
                      {s.memberName ?? s.memberId}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.entitlements.map((e) => (
                        <Tag key={e.entitlementCode}>
                          {e.entitlementCode} : {amountOf(e.used)}
                          {e.quota != null ? ` / ${amountOf(e.quota)}` : ""}
                        </Tag>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-1">
                    <IconButton icon={PenLine} label="Modifier les droits de la place" tone="pink" disabled={panel !== null} onClick={() => setPanel({ kind: "seat", seat: s })} />
                    <IconButton icon={UserMinus} label="Libérer la place" tone="danger" disabled={panel !== null} onClick={() => setPanel({ kind: "release", seat: s })} />
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

/** Onglet Abonnements */
export const CompanySubscriptionsTab: React.FC<{ company: CompanyResponse }> = ({ company }) => {
  const id = company.customerId;
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [COMPANIES_KEY, "subscriptions", id],
    queryFn: () => companyService.getSubscriptions(id),
  });

  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError) return <ErrorBlock message="Impossible de charger les abonnements." onRetry={() => refetch()} />;
  const rows = data ?? [];
  if (rows.length === 0) return <EmptyState icon={CreditCard} title="Aucun abonnement" hint="Les abonnements de l'organisation apparaissent ici une fois souscrits." />;
  const current = selected ?? rows[0].subscriptionNumber;

  return (
    <div className="space-y-5">
      <DataCard>
        <div className="space-y-2">
          {rows.map((s) => {
            const on = s.subscriptionNumber === current;
            const st = statusOf(SUBSCRIPTION_STATUS, s.status);
            return (
              <button
                key={s.subscriptionNumber}
                type="button"
                onClick={() => setSelected(s.subscriptionNumber)}
                className={`flex w-full flex-col gap-1 rounded-2xl p-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${on ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] ring-2 ring-[color:var(--logo-pink)]" : "bg-gray-50 hover:bg-gray-100"}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-gray-950">{s.planName ?? s.subscriptionNumber}</span>
                  <span className="block truncate text-xs text-gray-500">
                    <span className="font-mono">{s.subscriptionNumber}</span>
                    {s.currentPeriodEnd ? ` · jusqu'au ${formatDate(s.currentPeriodEnd)}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {s.activeSeats ?? 0} / {s.maxSeats ?? "illimité"} places
                  </span>
                  <StatusChip tone={st.tone}>{st.label}</StatusChip>
                </span>
              </button>
            );
          })}
        </div>
      </DataCard>
      <SharingPanel key={current} customerId={id} number={current} />
    </div>
  );
};
