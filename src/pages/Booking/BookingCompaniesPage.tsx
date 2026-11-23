import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, FileText } from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { CompanyStatement, LookupItem } from "../../services/booking.service";
import { ActionButton, Detail, ErrorBlock, Field, ItemRow, ListHeader, Section, Switch } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatNumber } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { OwnerPicker, monthIso, money } from "../../components/bookings/bookingKit";
import { formatDuration } from "../../components/resources/resKit";

const numOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));

const Terms: React.FC<{ code: string; canUpdate: boolean }> = ({ code, canUpdate }) => {
  const queryClient = useQueryClient();
  const terms = useQuery({ queryKey: ["booking-company-terms", code], queryFn: () => bookingService.getCompanyTerms(code) });
  const [statement, setStatement] = useState(false);
  const [budget, setBudget] = useState("");
  const [hours, setHours] = useState("");
  useEffect(() => {
    if (!terms.data) return;
    setStatement(!!terms.data.monthlyStatement);
    setBudget(terms.data.monthlyBudget != null ? String(terms.data.monthlyBudget) : "");
    setHours(terms.data.monthlyHours != null ? String(terms.data.monthlyHours) : "");
  }, [terms.data]);
  const save = useMutation({
    mutationFn: () => bookingService.saveCompanyTerms(code, { monthlyStatement: statement, monthlyBudget: numOrNull(budget), monthlyHours: numOrNull(hours) }),
    onSuccess: () => {
      toast.success("Conditions enregistrées");
      queryClient.invalidateQueries({ queryKey: ["booking-company-terms", code] });
      queryClient.invalidateQueries({ queryKey: ["booking-company-usage", code] });
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible")),
  });
  if (terms.isError) return <ErrorBlock message="Impossible de charger les conditions." onRetry={() => terms.refetch()} />;
  return (
    <Section title="Conditions de l'entreprise" description="Vide : pas de plafond.">
      <div className="space-y-4">
        <Switch checked={statement} onChange={setStatement} label="Relevé mensuel" hint="Les réservations sont regroupées dans une facture mensuelle au lieu d'une facture chacune." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Budget mensuel"><input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} disabled={!canUpdate} className={FIELD} /></Field>
          <Field label="Heures incluses par mois"><input type="number" min={0} value={hours} onChange={(e) => setHours(e.target.value)} disabled={!canUpdate} className={FIELD} /></Field>
        </div>
        {terms.data?.updatedBy && <p className="text-xs text-gray-500">Dernière modification par {terms.data.updatedBy}</p>}
        {canUpdate && <div className="flex justify-end"><ActionButton pending={save.isPending} onClick={() => save.mutate()}>Enregistrer</ActionButton></div>}
      </div>
    </Section>
  );
};

const Budgets: React.FC<{ code: string; canUpdate: boolean }> = ({ code, canUpdate }) => {
  const queryClient = useQueryClient();
  const budgets = useQuery({ queryKey: ["booking-company-budgets", code], queryFn: () => bookingService.getCompanyBudgets(code) });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newMember, setNewMember] = useState<LookupItem | null>(null);
  const [newBudget, setNewBudget] = useState("");
  const save = useMutation({
    mutationFn: (v: { memberId: string; value: string }) => bookingService.setMemberBudget(code, v.memberId, numOrNull(v.value)),
    onSuccess: (_d, v) => {
      toast.success("Budget enregistré");
      setDrafts((d) => {
        const { [v.memberId]: _removed, ...rest } = d;
        void _removed;
        return rest;
      });
      setNewMember(null);
      setNewBudget("");
      queryClient.invalidateQueries({ queryKey: ["booking-company-budgets", code] });
      queryClient.invalidateQueries({ queryKey: ["booking-company-usage", code] });
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible")),
  });
  const list = budgets.data ?? [];
  return (
    <Section title="Budgets par membre" description="Un budget vide retire le plafond du membre.">
      {budgets.isError && <ErrorBlock message="Impossible de charger les budgets." onRetry={() => budgets.refetch()} />}
      <div className="space-y-2">
        {list.map((m) => {
          const draft = drafts[m.memberId];
          const value = draft ?? (m.monthlyBudget != null ? String(m.monthlyBudget) : "");
          return (
            <ItemRow key={m.memberId} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-sm font-semibold text-gray-900">{m.memberId}</p>
              <div className="flex items-center gap-2">
                <input type="number" min={0} value={value} disabled={!canUpdate} onChange={(e) => setDrafts({ ...drafts, [m.memberId]: e.target.value })} className={`${FIELD} w-40`} aria-label={`Budget de ${m.memberId}`} />
                {canUpdate && <ActionButton variant="ghost" disabled={draft === undefined} pending={save.isPending && save.variables?.memberId === m.memberId} onClick={() => save.mutate({ memberId: m.memberId, value })}>Enregistrer</ActionButton>}
              </div>
            </ItemRow>
          );
        })}
        {list.length === 0 && !budgets.isLoading && <p className="text-sm text-gray-500">Aucun budget par membre.</p>}
      </div>
      {canUpdate && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
          <OwnerPicker value={newMember} onChange={setNewMember} types="MEMBER" placeholder="Ajouter un membre" />
          <input type="number" min={0} value={newBudget} onChange={(e) => setNewBudget(e.target.value)} placeholder="Budget" className={FIELD} aria-label="Budget" />
          <ActionButton variant="ghost" disabled={!newMember || !newBudget} pending={save.isPending && save.variables?.memberId === newMember?.code} onClick={() => save.mutate({ memberId: newMember!.code, value: newBudget })}>Ajouter</ActionButton>
        </div>
      )}
    </Section>
  );
};

const Usage: React.FC<{ code: string }> = ({ code }) => {
  const [month, setMonth] = useState(monthIso());
  const usage = useQuery({ queryKey: ["booking-company-usage", code, month], queryFn: () => bookingService.getCompanyUsage(code, month) });
  const u = usage.data;
  const covered = Number(u?.coveredMinutes ?? 0);
  const remaining = u?.remainingMinutes != null ? Number(u.remainingMinutes) : null;
  return (
    <Section title="Consommation" action={<input type="month" value={month} onChange={(e) => setMonth(e.target.value || monthIso())} className={`${FIELD} w-44`} aria-label="Mois" />}>
      {usage.isError ? (
        <ErrorBlock message="Impossible de charger la consommation." onRetry={() => usage.refetch()} />
      ) : !u ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Dépensé">{money(u.spent ?? 0, "XAF")}{u.monthlyBudget != null ? ` sur ${money(u.monthlyBudget, "XAF")}` : ""}</Detail>
            <Detail label="Heures prises en charge">{formatDuration(covered)}{u.monthlyHours != null ? ` sur ${u.monthlyHours} h` : ""}</Detail>
            {remaining != null && <Detail label="Reste">{formatDuration(remaining)}</Detail>}
          </div>
          {(u.members ?? []).length > 0 && (
            <div className="space-y-2">
              {u.members!.map((m) => (
                <ItemRow key={m.memberId} className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm text-gray-900">{m.memberId}</p>
                  <p className="text-sm text-gray-700">{formatNumber(m.spent ?? 0)}{m.monthlyBudget != null ? ` / ${formatNumber(m.monthlyBudget)}` : ""}</p>
                </ItemRow>
              ))}
            </div>
          )}
        </div>
      )}
    </Section>
  );
};

export const BookingCompaniesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("BOOKING:UPDATE");
  const canCreate = hasPermission("BOOKING:CREATE");
  const [company, setCompany] = useState<LookupItem | null>(null);
  const [month, setMonth] = useState(monthIso());
  const [result, setResult] = useState<CompanyStatement[] | null>(null);
  const run = useMutation({
    mutationFn: () => bookingService.runStatements(month),
    onSuccess: (r) => {
      setResult(r);
      toast.success(`${r.length} relevé(s) traité(s)`);
    },
    onError: (e) => toast.error(apiMessage(e, "Génération impossible")),
  });

  return (
    <div className="space-y-5">
      <ListHeader title="Entreprises" subtitle="Conditions de réservation, budgets des membres et relevés mensuels." />
      <Section title="Entreprise" icon={Building2}>
        <OwnerPicker value={company} onChange={setCompany} types="BUSINESS_ENTITY" placeholder="Nom ou code de l'entreprise" />
      </Section>
      {company && (
        <>
          <Terms code={company.code} canUpdate={canUpdate} />
          <Budgets code={company.code} canUpdate={canUpdate} />
          <Usage code={company.code} />
        </>
      )}

      {canCreate && (
        <Section title="Relevés mensuels" icon={FileText} description="Génère le relevé de chaque entreprise qui a choisi la facturation mensuelle. Ce traitement tourne aussi automatiquement.">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value || monthIso())} className={`${FIELD} sm:w-48`} aria-label="Mois" />
            <ActionButton pending={run.isPending} onClick={() => run.mutate()}>Générer les relevés</ActionButton>
          </div>
          {result && (
            <div className="mt-4 space-y-2">
              {result.length === 0 && <p className="text-sm text-gray-500">Aucun relevé à générer.</p>}
              {result.map((s, i) => (
                <ItemRow key={`${s.businessCode}-${i}`} className="flex items-center justify-between gap-3">
                  <p className="font-mono text-sm text-gray-900">{s.businessCode}</p>
                  <p className="text-sm text-gray-700">{s.items} ligne(s){s.documentNumber ? ` · ${s.documentNumber}` : ""}</p>
                </ItemRow>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
};

export default BookingCompaniesPage;
