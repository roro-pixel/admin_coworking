import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { cashRegisterService } from "../../services/cashRegister.service";
import type { CashDenominationRequest, CashFlowDirection, CashNatureFamily, CashNatureRequest, CashReferenceValueRequest } from "../../services/cashRegister.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, EmptyState, ErrorBlock, Field, IconButton, ListHeader, StatusChip, Tabs } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { RefreshButton } from "../../components/reporting/reportKit";
import { FLOW_DIRECTION, NATURE_FAMILY } from "../../components/cash/cashLabels";

type View = "natures" | "lists" | "denominations";
const cell = `${FIELD_SOFT} !px-3 !py-2 text-sm`;
const numOrUndef = (v: string) => (v.trim() === "" ? undefined : Number(v));

// ───────────────────────── Natures ─────────────────────────

interface NatureRow extends CashNatureRequest {
  _system?: boolean;
  _usage?: number | string;
}

const Natures: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<NatureRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["cash-natures", "settings"], queryFn: () => cashRegisterService.getNatures({ includeInactive: true }) });

  useEffect(() => {
    if (q.data) {
      setRows(
        q.data.map((n) => ({
          code: n.code, label: n.label, family: n.family, direction: n.direction, movementType: n.movementType,
          accountNumber: n.accountNumber ?? undefined, vatCode: n.vatCode ?? undefined, documentRequired: n.documentRequired,
          justificationDays: n.justificationDays ?? undefined, defaultSection: n.defaultSection ?? undefined, maxPerOperation: n.maxPerOperation ?? undefined,
          priorRequestRequired: n.priorRequestRequired, doubleVisaThreshold: n.doubleVisaThreshold ?? undefined, keywords: n.keywords ?? undefined,
          sortOrder: n.sortOrder, active: n.active, _system: n.systemValue, _usage: n.usageCount,
        })),
      );
      setDirty(false);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => cashRegisterService.replaceNatures(rows.map(({ _system, _usage, ...r }) => r)),
    onSuccess: () => {
      toast.success("Natures enregistrées");
      queryClient.invalidateQueries({ queryKey: ["cash-natures"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible")),
  });
  const upd = (i: number, p: Partial<NatureRow>) => {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
    setDirty(true);
  };
  const codes = rows.map((r) => r.code.trim().toLowerCase());
  const invalid = rows.some((r, i) => !r.code.trim() || !r.label.trim() || codes.indexOf(r.code.trim().toLowerCase()) !== i);

  return (
    <div className="space-y-4">
      <ListHeader
        title="Natures d'opération"
        subtitle="Chaque nature fixe le compte comptable, la TVA et les contrôles d'une sortie ou d'une entrée de caisse."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={q.isFetching} onClick={() => q.refetch()} />
            {canManage && (
              <>
                <ActionButton variant="ghost" icon={Plus} onClick={() => { setRows((r) => [...r, { code: "", label: "", family: "DIVERS", direction: "OUT", active: true }]); setDirty(true); }}>
                  Ajouter
                </ActionButton>
                <ActionButton icon={Save} pending={save.isPending} disabled={!dirty || invalid} onClick={() => toast.confirm({ message: "Enregistrer toutes les natures ?", detail: "La liste complète remplace l'actuelle.", confirmLabel: "Enregistrer", pendingLabel: "Enregistrement", onConfirm: () => save.mutateAsync() })}>
                  Enregistrer
                </ActionButton>
              </>
            )}
          </div>
        }
      />
      {invalid && <p className="text-xs text-red-600">Chaque nature a besoin d'un code unique et d'un libellé.</p>}
      {q.isLoading ? (
        <ListSkeleton rows={5} />
      ) : q.isError ? (
        <ErrorBlock message="Les natures n'ont pas pu être chargées." onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Plus} title="Aucune nature" />
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const open = openRow === `${i}`;
            return (
              <div key={i} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="grid gap-2 md:grid-cols-[9rem_1fr_10rem_8rem_auto] md:items-center">
                  <input aria-label="Code" placeholder="Code" disabled={!canManage || !!r._system} value={r.code} onChange={(e) => upd(i, { code: e.target.value.toUpperCase() })} className={`${cell} font-mono`} />
                  <input aria-label="Libellé" placeholder="Libellé" disabled={!canManage} value={r.label} onChange={(e) => upd(i, { label: e.target.value })} className={cell} />
                  <select aria-label="Famille" disabled={!canManage} value={r.family} onChange={(e) => upd(i, { family: e.target.value as CashNatureFamily })} className={cell}>
                    {Object.entries(NATURE_FAMILY).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <select aria-label="Sens" disabled={!canManage || !!r._system} value={r.direction} onChange={(e) => upd(i, { direction: e.target.value as CashFlowDirection })} className={cell}>
                    {Object.entries(FLOW_DIRECTION).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <div className="flex items-center justify-end gap-2">
                    {r._system && <StatusChip tone="neutral">Système</StatusChip>}
                    <label className="flex items-center gap-1.5 text-xs text-gray-600">
                      <input type="checkbox" disabled={!canManage} checked={r.active !== false} onChange={(e) => upd(i, { active: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
                      Active
                    </label>
                    <button type="button" onClick={() => setOpenRow(open ? null : `${i}`)} className="text-xs font-semibold text-gray-500 hover:text-gray-900">
                      {open ? "Réduire" : "Détails"}
                    </button>
                    {canManage && !r._system && Number(r._usage ?? 0) === 0 && <IconButton icon={Trash2} label="Retirer" tone="danger" onClick={() => { setRows((x) => x.filter((_, j) => j !== i)); setDirty(true); }} />}
                  </div>
                </div>
                {open && (
                  <div className="mt-3 grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-3">
                    <Field label="Compte comptable"><input disabled={!canManage} value={r.accountNumber ?? ""} onChange={(e) => upd(i, { accountNumber: e.target.value || undefined })} className={`${cell} font-mono`} /></Field>
                    <Field label="Code TVA"><input disabled={!canManage} value={r.vatCode ?? ""} onChange={(e) => upd(i, { vatCode: e.target.value || undefined })} className={cell} /></Field>
                    <Field label="Section par défaut"><input disabled={!canManage} value={r.defaultSection ?? ""} onChange={(e) => upd(i, { defaultSection: e.target.value || undefined })} className={cell} /></Field>
                    <Field label="Plafond par opération"><input type="number" min={0} disabled={!canManage} value={r.maxPerOperation ?? ""} onChange={(e) => upd(i, { maxPerOperation: numOrUndef(e.target.value) })} className={cell} /></Field>
                    <Field label="Double visa à partir de"><input type="number" min={0} disabled={!canManage} value={r.doubleVisaThreshold ?? ""} onChange={(e) => upd(i, { doubleVisaThreshold: numOrUndef(e.target.value) })} className={cell} /></Field>
                    <Field label="Jours pour justifier"><input type="number" min={0} disabled={!canManage} value={r.justificationDays ?? ""} onChange={(e) => upd(i, { justificationDays: numOrUndef(e.target.value) })} className={cell} /></Field>
                    <Field label="Mots-clés" hint="Aident la recherche et la proposition automatique."><input disabled={!canManage} value={r.keywords ?? ""} onChange={(e) => upd(i, { keywords: e.target.value || undefined })} className={cell} /></Field>
                    <Field label="Ordre"><input type="number" disabled={!canManage} value={r.sortOrder ?? ""} onChange={(e) => upd(i, { sortOrder: numOrUndef(e.target.value) })} className={cell} /></Field>
                    <div className="flex flex-col justify-end gap-2 text-sm text-gray-700">
                      <label className="flex items-center gap-2"><input type="checkbox" disabled={!canManage} checked={!!r.documentRequired} onChange={(e) => upd(i, { documentRequired: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />Pièce obligatoire</label>
                      <label className="flex items-center gap-2"><input type="checkbox" disabled={!canManage} checked={!!r.priorRequestRequired} onChange={(e) => upd(i, { priorRequestRequired: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />Demande préalable obligatoire</label>
                    </div>
                    {r._usage != null && <p className="text-xs text-gray-500 md:col-span-3">Utilisée {Number(r._usage).toLocaleString("fr-FR")} fois.</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ───────────────────────── Listes de référence ─────────────────────────

interface RefRow extends CashReferenceValueRequest {
  _system?: boolean;
  _usage?: number | string;
  requiresText?: boolean;
}

const Lists: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const queryClient = useQueryClient();
  const [listCode, setListCode] = useState("");
  const [rows, setRows] = useState<RefRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const all = useQuery({ queryKey: ["cash-reference-lists", "settings"], queryFn: () => cashRegisterService.getReferenceLists(true) });
  const codes = Object.keys(all.data ?? {}).sort();
  const current = listCode || codes[0] || "";

  useEffect(() => {
    const vals = all.data?.[current];
    if (vals) {
      setRows(vals.map((v) => ({ code: v.code, label: v.label, sortOrder: v.sortOrder, active: v.active, _system: v.systemValue, _usage: v.usageCount, requiresText: v.requiresText })));
      setDirty(false);
    }
  }, [all.data, current]);

  const save = useMutation({
    mutationFn: () => cashRegisterService.replaceReferenceList(current, rows.map(({ _system, _usage, requiresText, ...r }) => r)),
    onSuccess: () => {
      toast.success("Liste enregistrée");
      queryClient.invalidateQueries({ queryKey: ["cash-reference-lists"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible")),
  });
  const upd = (i: number, p: Partial<RefRow>) => {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
    setDirty(true);
  };
  const lower = rows.map((r) => r.code.trim().toLowerCase());
  const invalid = rows.some((r, i) => !r.code.trim() || !r.label.trim() || lower.indexOf(r.code.trim().toLowerCase()) !== i);

  return (
    <div className="space-y-4">
      <ListHeader
        title="Listes de référence"
        subtitle="Motifs, natures d'absence et autres choix proposés dans les écrans de caisse."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={all.isFetching} onClick={() => all.refetch()} />
            {canManage && (
              <>
                <ActionButton variant="ghost" icon={Plus} disabled={!current} onClick={() => { setRows((r) => [...r, { code: "", label: "", active: true }]); setDirty(true); }}>
                  Ajouter
                </ActionButton>
                <ActionButton icon={Save} pending={save.isPending} disabled={!dirty || invalid} onClick={() => toast.confirm({ message: `Enregistrer la liste « ${current} » ?`, detail: "La liste complète remplace l'actuelle.", confirmLabel: "Enregistrer", pendingLabel: "Enregistrement", onConfirm: () => save.mutateAsync() })}>
                  Enregistrer
                </ActionButton>
              </>
            )}
          </div>
        }
      />
      {all.isLoading ? (
        <ListSkeleton rows={4} />
      ) : all.isError ? (
        <ErrorBlock message="Les listes n'ont pas pu être chargées." onRetry={() => all.refetch()} />
      ) : codes.length === 0 ? (
        <EmptyState icon={Plus} title="Aucune liste" />
      ) : (
        <>
          <div className="max-w-sm">
            <Field label="Liste">
              <select value={current} onChange={(e) => setListCode(e.target.value)} className={FIELD_SOFT}>
                {codes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
          {invalid && <p className="text-xs text-red-600">Chaque valeur a besoin d'un code unique et d'un libellé.</p>}
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-2xl bg-white p-3 shadow-sm md:grid-cols-[10rem_1fr_6rem_auto] md:items-center">
                <input aria-label="Code" disabled={!canManage || !!r._system} value={r.code} onChange={(e) => upd(i, { code: e.target.value.toUpperCase() })} className={`${cell} font-mono`} />
                <input aria-label="Libellé" disabled={!canManage} value={r.label} onChange={(e) => upd(i, { label: e.target.value })} className={cell} />
                <input aria-label="Ordre" type="number" disabled={!canManage} value={r.sortOrder ?? ""} onChange={(e) => upd(i, { sortOrder: numOrUndef(e.target.value) })} className={cell} />
                <div className="flex items-center justify-end gap-2">
                  {r._system && <StatusChip tone="neutral">Système</StatusChip>}
                  {r.requiresText && <StatusChip tone="info">Texte obligatoire</StatusChip>}
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" disabled={!canManage} checked={r.active !== false} onChange={(e) => upd(i, { active: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
                    Actif
                  </label>
                  {canManage && !r._system && Number(r._usage ?? 0) === 0 && <IconButton icon={Trash2} label="Retirer" tone="danger" onClick={() => { setRows((x) => x.filter((_, j) => j !== i)); setDirty(true); }} />}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ───────────────────────── Coupures ─────────────────────────

interface DenomRow extends CashDenominationRequest {
  active?: boolean;
}

const Denominations: React.FC<{ canManage: boolean }> = ({ canManage }) => {
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState("XAF");
  const [rows, setRows] = useState<DenomRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const q = useQuery({ queryKey: ["cash-denominations", currency, "settings"], queryFn: () => cashRegisterService.getDenominations(currency, true) });

  useEffect(() => {
    if (q.data) {
      setRows(q.data.map((d) => ({ value: d.value, kind: d.kind, label: d.label, sortOrder: d.sortOrder, activeFrom: d.activeFrom ?? undefined, activeTo: d.activeTo ?? undefined, active: d.active })));
      setDirty(false);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => cashRegisterService.replaceDenominations(currency, rows.map(({ active, ...r }) => ({ ...r, activeFrom: r.activeFrom || undefined, activeTo: r.activeTo || undefined }))),
    onSuccess: () => {
      toast.success("Coupures enregistrées");
      queryClient.invalidateQueries({ queryKey: ["cash-denominations"] });
    },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible")),
  });
  const upd = (i: number, p: Partial<DenomRow>) => {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
    setDirty(true);
  };
  const invalid = rows.some((r) => !(r.value > 0) || !r.label.trim());

  return (
    <div className="space-y-4">
      <ListHeader
        title="Coupures"
        subtitle="Billets et pièces comptés à l'ouverture, à la clôture et à chaque transfert."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={q.isFetching} onClick={() => q.refetch()} />
            {canManage && (
              <>
                <ActionButton variant="ghost" icon={Plus} onClick={() => { setRows((r) => [...r, { value: 0, kind: "BILL", label: "" }]); setDirty(true); }}>
                  Ajouter
                </ActionButton>
                <ActionButton icon={Save} pending={save.isPending} disabled={!dirty || invalid} onClick={() => toast.confirm({ message: `Enregistrer les coupures ${currency} ?`, detail: "La liste complète remplace l'actuelle.", confirmLabel: "Enregistrer", pendingLabel: "Enregistrement", onConfirm: () => save.mutateAsync() })}>
                  Enregistrer
                </ActionButton>
              </>
            )}
          </div>
        }
      />
      <Field label="Devise">
        <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} className={`${FIELD_SOFT} w-28 font-mono`} />
      </Field>
      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorBlock message="Les coupures n'ont pas pu être chargées." onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Plus} title="Aucune coupure" hint="Sans coupures, les comptages se font par montant global." />
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 rounded-2xl bg-white p-3 shadow-sm md:grid-cols-[8rem_8rem_1fr_6rem_9rem_9rem_auto] md:items-center">
              <input aria-label="Valeur" type="number" min={0} disabled={!canManage} value={r.value || ""} onChange={(e) => upd(i, { value: Number(e.target.value) || 0 })} className={`${cell} text-right tabular-nums`} />
              <select aria-label="Nature" disabled={!canManage} value={r.kind} onChange={(e) => upd(i, { kind: e.target.value as "BILL" | "COIN" })} className={cell}>
                <option value="BILL">Billet</option>
                <option value="COIN">Pièce</option>
              </select>
              <input aria-label="Libellé" placeholder="Libellé" disabled={!canManage} value={r.label} onChange={(e) => upd(i, { label: e.target.value })} className={cell} />
              <input aria-label="Ordre" type="number" disabled={!canManage} value={r.sortOrder ?? ""} onChange={(e) => upd(i, { sortOrder: numOrUndef(e.target.value) })} className={cell} />
              <input aria-label="Valable du" type="date" disabled={!canManage} value={r.activeFrom?.slice(0, 10) ?? ""} onChange={(e) => upd(i, { activeFrom: e.target.value || undefined })} className={cell} />
              <input aria-label="Valable jusqu'au" type="date" disabled={!canManage} value={r.activeTo?.slice(0, 10) ?? ""} onChange={(e) => upd(i, { activeTo: e.target.value || undefined })} className={cell} />
              <div className="flex items-center justify-end gap-2">
                {r.active === false && <StatusChip tone="neutral">Retirée</StatusChip>}
                {canManage && <IconButton icon={Trash2} label="Retirer" tone="danger" onClick={() => { setRows((x) => x.filter((_, j) => j !== i)); setDirty(true); }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const CashSettingsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("CASH_REGISTER:MANAGE");
  const [view, setView] = useState<View>("natures");
  return (
    <div className="space-y-5">
      <Tabs variant="soft" items={[{ id: "natures" as View, label: "Natures" }, { id: "lists" as View, label: "Listes" }, { id: "denominations" as View, label: "Coupures" }]} active={view} onChange={setView} />
      {!canManage && <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">Lecture seule : la modification demande le droit CASH_REGISTER:MANAGE.</p>}
      {view === "natures" && <Natures canManage={canManage} />}
      {view === "lists" && <Lists canManage={canManage} />}
      {view === "denominations" && <Denominations canManage={canManage} />}
    </div>
  );
};
