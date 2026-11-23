import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Landmark, Plus } from "lucide-react";
import { treasuryService } from "../../../services/treasury.service";
import type { BankAccount } from "../../../services/treasury.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, CheckField, DataCard, EmptyState, ErrorBlock, Field, HeadRow, ListHeader, PanelForm, StatusChip, Tag } from "../../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";

export const BANK_KEY = "treasury-banks";
const COLS = "lg:grid-cols-[1fr_9rem_9rem_9rem_7rem_8rem]";

const blank: BankAccount = { code: "", label: "", bankName: "", branch: "", rib: "", currency: "XAF", accountNumber: "", journalCode: "", importTemplateCode: "", openingBalance: undefined, openingDate: "", active: true };

export const BankAccountForm: React.FC<{ initial?: BankAccount; onClose: () => void }> = ({ initial, onClose }) => {
  const qc = useQueryClient();
  const [f, setF] = useState<BankAccount>(initial ?? blank);
  const [err, setErr] = useState<string | null>(null);
  const templates = useQuery({ queryKey: ["treasury-templates"], queryFn: treasuryService.templates });
  const set = <K extends keyof BankAccount>(k: K, v: BankAccount[K]) => setF((p) => ({ ...p, [k]: v }));
  const save = useMutation({
    mutationFn: () => treasuryService.saveBankAccount(f),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BANK_KEY] });
      toast.success(initial ? "Compte modifié" : "Compte créé");
      onClose();
    },
    onError: (e) => setErr(apiMessage(e, "Enregistrement impossible.")),
  });
  return (
    <PanelForm
      title={initial ? `Modifier ${initial.code}` : "Nouveau compte bancaire"}
      onSubmit={(e) => { e.preventDefault(); setErr(null); save.mutate(); }}
      onCancel={onClose}
      pending={save.isPending}
      submitLabel="Enregistrer"
      submitDisabled={!f.code.trim() || !f.accountNumber?.trim()}
      error={err}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code" required><input className={FIELD} value={f.code} disabled={!!initial} onChange={(e) => set("code", e.target.value)} /></Field>
        <Field label="Libellé"><input className={FIELD} value={f.label ?? ""} onChange={(e) => set("label", e.target.value)} /></Field>
        <Field label="Devise"><input className={FIELD} value={f.currency ?? ""} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></Field>
        <Field label="Banque"><input className={FIELD} value={f.bankName ?? ""} onChange={(e) => set("bankName", e.target.value)} /></Field>
        <Field label="Agence"><input className={FIELD} value={f.branch ?? ""} onChange={(e) => set("branch", e.target.value)} /></Field>
        <Field label="RIB / IBAN"><input className={FIELD} value={f.rib ?? ""} onChange={(e) => set("rib", e.target.value)} /></Field>
        <Field label="Compte comptable" required hint="Ex. 521100"><input className={FIELD} value={f.accountNumber ?? ""} onChange={(e) => set("accountNumber", e.target.value)} /></Field>
        <Field label="Journal"><input className={FIELD} value={f.journalCode ?? ""} onChange={(e) => set("journalCode", e.target.value)} /></Field>
        <Field label="Modèle d'import">
          <select className={FIELD} value={f.importTemplateCode ?? ""} onChange={(e) => set("importTemplateCode", e.target.value)}>
            <option value="">Aucun</option>
            {(templates.data ?? []).map((t) => <option key={t.code} value={t.code}>{t.label || t.code}</option>)}
          </select>
        </Field>
        <Field label="Solde d'ouverture"><input className={FIELD} inputMode="decimal" value={f.openingBalance ?? ""} onChange={(e) => set("openingBalance", e.target.value === "" ? undefined : Number(e.target.value.replace(",", ".")))} /></Field>
        <Field label="Date d'ouverture"><input type="date" className={FIELD} value={f.openingDate ?? ""} onChange={(e) => set("openingDate", e.target.value)} /></Field>
      </div>
      {initial && <CheckField checked={f.active !== false} onChange={(v) => set("active", v)} label="Compte actif" />}
    </PanelForm>
  );
};

export const BanksPanel: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [creating, setCreating] = useState(false);
  const accounts = useQuery({ queryKey: [BANK_KEY, "accounts"], queryFn: treasuryService.bankAccounts });
  const dash = useQuery({ queryKey: [BANK_KEY, "dashboard"], queryFn: treasuryService.dashboard });
  const byCode = new Map((dash.data ?? []).map((d) => [d.code, d]));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Comptes bancaires"
        subtitle="Soldes du relevé et de la comptabilité, éléments non pointés."
        action={hasPermission("BANK_ACCOUNT:MANAGE") && !creating ? <ActionButton icon={Plus} onClick={() => setCreating(true)}>Nouveau compte</ActionButton> : undefined}
      />
      {creating && <BankAccountForm onClose={() => setCreating(false)} />}
      {accounts.isLoading ? (
        <ListSkeleton rows={4} />
      ) : accounts.isError ? (
        <ErrorBlock message={apiMessage(accounts.error, "Comptes bancaires indisponibles.")} onRetry={() => accounts.refetch()} />
      ) : (accounts.data ?? []).length === 0 ? (
        <EmptyState icon={Landmark} title="Aucun compte bancaire" hint="Créez un compte pour importer ses relevés." />
      ) : (
        <DataCard>
          <HeadRow cols={COLS}>
            <span>Compte</span><span className="text-right">Solde relevé</span><span className="text-right">Solde comptable</span>
            <span className="text-right">Écart</span><span>Non pointés</span><span>Dernier relevé</span>
          </HeadRow>
          <div className="space-y-1">
            {accounts.data!.map((a) => {
              const d = byCode.get(a.code);
              const gap = d ? (d.statementBalance ?? 0) - (d.bookBalance ?? 0) : undefined;
              return (
                <button key={a.code} type="button" onClick={() => navigate(`/accounting/treasury/${encodeURIComponent(a.code)}`)} className={`grid w-full items-center gap-x-4 gap-y-1 rounded-xl px-4 py-3 text-left transition ${ROW_HOVER} ${COLS}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">{a.label || a.code}</span>
                    <span className="block truncate text-xs text-gray-400">{a.code} · {a.bankName} · {a.accountNumber}{a.currency ? ` · ${a.currency}` : ""}</span>
                  </span>
                  <span className="font-mono text-sm lg:text-right">{money(d?.statementBalance)}</span>
                  <span className="font-mono text-sm lg:text-right">{money(d?.bookBalance)}</span>
                  <span className={`font-mono text-sm lg:text-right ${gap ? "font-bold text-amber-700" : ""}`}>{gap === undefined ? "—" : money(gap)}</span>
                  <span className="flex flex-wrap gap-1">
                    {d ? <><Tag>{d.statementOutstanding ?? 0} relevé</Tag><Tag>{d.bookOutstanding ?? 0} compta</Tag></> : "—"}
                  </span>
                  <span className="text-sm text-gray-600">
                    {a.active === false ? <StatusChip tone="neutral">Inactif</StatusChip> : formatDate(d?.lastStatement)}
                  </span>
                </button>
              );
            })}
          </div>
        </DataCard>
      )}
    </div>
  );
};
