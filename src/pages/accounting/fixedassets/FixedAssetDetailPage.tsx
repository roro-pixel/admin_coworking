import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { ActionForm } from "../../../components/accounting/ActionForm";
import type { FieldDef, FormValues } from "../../../components/accounting/ActionForm";
import { fixedAssetService } from "../../../services/fixedAsset.service";
import type { AssetView, Disposal } from "../../../services/fixedAsset.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, Detail, ErrorBlock, Section, StatusChip, Tabs } from "../../../components/subscription/kit";
import type { TabItem } from "../../../components/subscription/kit";
import { apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { ACTIONS, ASSET_FIELDS, COLLECT_FIELDS, DISPOSAL_FIELDS, INDEMNITY_FIELDS } from "./assetFields";
import { ASSETS_KEY } from "./AssetsPanel";

type Tab = "values" | "plan" | "history" | "ops" | "exits";
const TABS: TabItem<Tab>[] = [
  { id: "values", label: "Valeurs" },
  { id: "plan", label: "Plan" },
  { id: "history", label: "Historique" },
  { id: "ops", label: "Dépréciations et entretien" },
  { id: "exits", label: "Sorties" },
];

type Form = { title: string; fields: FieldDef[]; run: (v: FormValues) => Promise<unknown> } | null;

const PlanTab: React.FC<{ code: string }> = ({ code }) => {
  const [kind, setKind] = useState("");
  const q = useQuery({ queryKey: ["fa-plan", code, kind], queryFn: () => fixedAssetService.plan(code, kind || undefined) });
  const p = q.data;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Nature du plan</span>
        <input className="w-40 rounded-xl border border-gray-200 px-3 py-1.5 text-sm" placeholder="comptable, fiscal…" value={kind} onChange={(e) => setKind(e.target.value)} />
      </div>
      {q.isLoading ? <ListSkeleton /> : q.isError || !p ? <ErrorBlock message="Plan indisponible." onRetry={() => q.refetch()} /> : (
        <>
          <Section title={`Versions (${p.versions.length})`}>
            {p.versions.map((v, i) => (
              <p key={v.id ?? i} className="text-sm text-gray-700">v{v.version} · {v.kind} · {v.method} · {v.durationMonths} mois{v.rate != null ? ` · ${v.rate} %` : ""}{v.coefficient != null ? ` · coef ${v.coefficient}` : ""} · base {money(v.base)} · depuis {formatDate(v.validFrom)}{v.reason ? ` · ${v.reason}` : ""}</p>
            ))}
          </Section>
          {p.byYear && Object.keys(p.byYear).length > 0 && (
            <Section title="Par exercice">{Object.entries(p.byYear).map(([y, a]) => <p key={y} className="flex justify-between text-sm"><span>{y}</span><span className="font-mono">{money(a)}</span></p>)}</Section>
          )}
          <Section title={`Échéancier courant (${p.current.length})`}>
            <div className="space-y-1">
              {p.current.map((s, i) => (
                <div key={s.id ?? i} className="grid grid-cols-[5rem_1fr_6rem_6rem_6rem] items-center gap-2 text-xs">
                  <span className="font-medium">{s.periodCode}</span>
                  <span className="truncate text-gray-400">{s.status}{s.entryNumber ? ` · ${s.entryNumber}` : ""}{s.note ? ` · ${s.note}` : ""}</span>
                  <span className="text-right font-mono">{money(s.planned)}</span>
                  <span className="text-right font-mono">{money(s.cumulative)}</span>
                  <span className="text-right font-mono font-semibold">{money(s.netValue)}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">Période, prévu, cumulé, valeur nette.</p>
          </Section>
          {p.history.length > 0 && <Section title={`Anciennes versions (${p.history.length} lignes)`}><p className="text-xs text-gray-400">Conservées pour la traçabilité.</p></Section>}
        </>
      )}
    </div>
  );
};

export const FixedAssetDetailPage: React.FC = () => {
  const { code = "" } = useParams();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("ACCOUNTING_SETTINGS:MANAGE");
  const [tab, setTab] = useState<Tab>("values");
  const [form, setForm] = useState<Form>(null);
  const [override, setOverride] = useState<AssetView | null>(null);
  const q = useQuery({ queryKey: ["fa-asset", code], queryFn: () => fixedAssetService.asset(code) });

  const apply = (v: AssetView) => { setOverride(v); qc.setQueryData(["fa-asset", code], v); qc.invalidateQueries({ queryKey: [ASSETS_KEY] }); qc.invalidateQueries({ queryKey: ["fa-plan", code] }); (v.warnings ?? []).forEach((w) => toast.error(w)); };
  const reload = () => { setOverride(null); qc.invalidateQueries({ queryKey: ["fa-asset", code] }); qc.invalidateQueries({ queryKey: [ASSETS_KEY] }); };
  const v = override ?? q.data;
  const a = v?.asset;

  const doc = async (fn: () => Promise<Blob>, name: string) => { try { saveBlob(await fn(), name); } catch (e) { toast.error(apiMessage(e, "Document indisponible.")); } };

  const openAction = (id: string) => {
    const def = ACTIONS.find((x) => x.id === id)!;
    if (def.array) {
      setForm({
        title: def.label,
        fields: [{ key: "lines", label: "Composants", type: "textarea", required: true, hint: def.hint }],
        run: async (f) => {
          const comps = String(f.lines ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
            const [designation, value, durationMonths, categoryCode, method] = l.split(";").map((x) => x.trim());
            return { designation, value: value ? Number(value.replace(",", ".")) : undefined, durationMonths: durationMonths ? Number(durationMonths) : undefined, categoryCode, method };
          });
          apply(await fixedAssetService.act(code, def.path, comps));
        },
      });
      return;
    }
    setForm({ title: def.label, fields: def.fields, run: async (f) => apply(await fixedAssetService.act(code, def.path, f)) });
  };
  const openEdit = () => setForm({
    title: "Compléter la fiche",
    fields: ASSET_FIELDS.map((f) => ({ ...f, required: false, def: f.type === "bool" ? !!(a as Record<string, unknown>)?.[f.key] : String((a as Record<string, unknown>)?.[f.key] ?? "") })),
    run: async (f) => apply(await fixedAssetService.update(code, f)),
  });
  const openDispose = () => setForm({ title: "Préparer une sortie ou une cession", fields: DISPOSAL_FIELDS, run: async (f) => { await fixedAssetService.dispose(code, f); reload(); toast.success("Sortie préparée : à valider par une autre personne"); } });
  const disposalStep = (d: Disposal, step: "validate" | "cancel") => toast.confirm({
    tone: step === "cancel" ? "danger" : "primary", message: step === "validate" ? `Valider la sortie ${d.voucherNumber ?? d.id} ?` : `Annuler la sortie ${d.voucherNumber ?? d.id} ?`,
    detail: step === "validate" ? "Génère les écritures de sortie et de cession." : undefined, confirmLabel: step === "validate" ? "Valider" : "Annuler la sortie",
    successMessage: step === "validate" ? "Sortie validée" : "Sortie annulée", errorMessage: "Action impossible",
    onConfirm: async () => { await fixedAssetService.disposalStep(d.id, step); reload(); },
  });
  const decide = (id: number, approve: boolean) => toast.confirm({
    tone: approve ? "primary" : "danger", message: approve ? "Approuver cette dépréciation ?" : "Rejeter cette dépréciation ?", confirmLabel: approve ? "Approuver" : "Rejeter",
    successMessage: "Décision enregistrée", errorMessage: "Action impossible", onConfirm: async () => { apply(await fixedAssetService.decideImpairment(id, approve)); },
  });

  const is = (s?: string | null, ...x: string[]) => !!s && x.includes(s);
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/fixed-assets" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Immobilisations</Link>
        {q.isLoading ? <ListSkeleton /> : q.isError || !v || !a ? <ErrorBlock message="Bien introuvable." onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">{a.code} · {a.designation} {a.accountingStatus && <StatusChip tone="neutral">{a.accountingStatus}</StatusChip>}</h2>
              <div className="flex flex-wrap gap-2">
                <ActionButton variant="ghost" onClick={() => doc(() => fixedAssetService.sheetPdf(code), `fiche-${code}.pdf`)}>Fiche PDF</ActionButton>
                <ActionButton variant="ghost" onClick={() => doc(() => fixedAssetService.labelPdf(code), `etiquette-${code}.pdf`)}>Étiquette</ActionButton>
                {a.inServiceDate && <ActionButton variant="ghost" onClick={() => doc(() => fixedAssetService.commissionPdf(code), `pms-${code}.pdf`)}>PV de mise en service</ActionButton>}
                {a.holder && <ActionButton variant="ghost" onClick={() => doc(() => fixedAssetService.handoverPdf(code), `remise-${code}.pdf`)}>Fiche de remise</ActionButton>}
              </div>
            </div>

            {v.warnings.length > 0 && <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">{v.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>}

            {canManage && !form && (
              <Section title="Actions">
                <div className="flex flex-wrap gap-2">
                  <ActionButton variant="ghost" onClick={openEdit}>Compléter la fiche</ActionButton>
                  {ACTIONS.map((x) => <ActionButton key={x.id} variant="ghost" onClick={() => openAction(x.id)}>{x.label}</ActionButton>)}
                  <ActionButton variant="ghost" onClick={openDispose}>Sortir ou céder</ActionButton>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">Le serveur refuse les actions non permises pour l'état du bien et renvoie le motif.</p>
              </Section>
            )}
            {form && <ActionForm title={form.title} fields={form.fields} onSubmit={form.run} onClose={() => setForm(null)} />}

            <Section title="Fiche">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Catégorie">{a.categoryCode}{v.category?.label ? ` · ${v.category.label}` : ""}</Detail>
                <Detail label="Marque et modèle">{[a.brand, a.model].filter(Boolean).join(" ") || undefined}</Detail>
                <Detail label="N° de série">{a.serialNumber}</Detail>
                <Detail label="Quantité">{a.quantity}</Detail>
                <Detail label="Mode d'entrée">{a.entryMode}</Detail>
                <Detail label="Fournisseur">{a.supplierName ?? a.supplierCode}</Detail>
                <Detail label="Facture">{a.supplierInvoiceNumber}</Detail>
                <Detail label="Commande">{a.orderNumber}</Detail>
                <Detail label="Écriture">{a.entryNumber && <Link className="underline" to={`/accounting/entries/${encodeURIComponent(a.entryNumber)}`}>{a.entryNumber}</Link>}</Detail>
                <Detail label="Acquisition">{formatDate(a.acquisitionDate)}</Detail>
                <Detail label="Réception">{formatDate(a.receivedDate)}</Detail>
                <Detail label="Mise en service">{formatDate(a.inServiceDate)}</Detail>
                <Detail label="État d'usage">{a.operationalStatus}{a.operationalSince ? ` depuis ${formatDate(a.operationalSince)}` : ""}</Detail>
                <Detail label="Site">{a.site}</Detail>
                <Detail label="Espace">{a.resourceCode}</Detail>
                <Detail label="Emplacement">{a.locationLabel}</Detail>
                <Detail label="Détenteur">{a.holder ? `${a.holder}${a.holderSince ? ` depuis ${formatDate(a.holderSince)}` : ""}` : undefined}</Detail>
                <Detail label="Organisation">{a.organisation}</Detail>
                <Detail label="Garantie jusqu'au">{formatDate(a.warrantyEnd)}</Detail>
                <Detail label="Maintenance">{a.maintenanceContract}{a.maintenanceEnd ? ` jusqu'au ${formatDate(a.maintenanceEnd)}` : ""}</Detail>
                <Detail label="Assurance">{[a.insurer, a.policyNumber, a.insuredValue ? money(a.insuredValue) : null].filter(Boolean).join(" · ") || undefined}</Detail>
                <Detail label="Emprunt (location-acquisition)">{a.loanCode}</Detail>
                <Detail label="Suivi hors bilan">{a.trackedOffBooks ? "Oui" : undefined}</Detail>
                <Detail label="Sections analytiques">{a.analyticSections}</Detail>
                <Detail label="Notes" wide>{a.notes}</Detail>
              </div>
            </Section>

            <Tabs items={TABS} active={tab} onChange={setTab} />

            {tab === "values" && (
              <>
                <Section title="Valeurs">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Detail label="Valeur d'entrée" mono>{money(a.entryValue)}</Detail>
                    <Detail label="Valeur résiduelle" mono>{money(a.residualValue)}</Detail>
                    <Detail label="TVA déduite" mono>{money(a.deductedVat)}</Detail>
                    <Detail label="Amortissements cumulés" mono>{money(a.accumulatedDepreciation)}</Detail>
                    <Detail label="Dépréciations cumulées" mono>{money(a.accumulatedImpairment)}</Detail>
                    <Detail label="Dérogatoire cumulé" mono>{money(a.accumulatedDerogatory)}</Detail>
                    <Detail label="Valeur nette" mono>{money(v.netValue)}</Detail>
                    <Detail label="Subvention" mono>{a.subsidyAmount ? `${money(a.subsidyAmount)} (reprise ${money(a.subsidyReleased)})` : undefined}</Detail>
                    <Detail label="Mode et durée">{[a.method, a.durationMonths && `${a.durationMonths} mois`, a.coefficient && `coef ${a.coefficient}`].filter(Boolean).join(" · ") || undefined}</Detail>
                    <Detail label="Plan fiscal">{[a.taxMethod, a.taxDurationMonths && `${a.taxDurationMonths} mois`].filter(Boolean).join(" · ") || undefined}</Detail>
                  </div>
                </Section>
                {v.components.length > 0 && <Section title={`Composants (${v.components.length})`}>{v.components.map((c) => <Link key={c.code} to={`/accounting/fixed-assets/${encodeURIComponent(c.code ?? "")}`} className="flex justify-between py-0.5 text-sm hover:underline"><span>{c.code} · {c.designation}</span><span className="font-mono">{money(c.entryValue)}</span></Link>)}</Section>}
                {v.suggestedComponents.length > 0 && <Section title="Composants suggérés"><p className="text-sm text-gray-600">{v.suggestedComponents.join(", ")}</p></Section>}
                {v.inventoryAssets.length > 0 && <Section title="Articles d'inventaire liés"><p className="text-sm text-gray-600">{v.inventoryAssets.join(", ")}</p></Section>}
                <Section title={`Lignes de valeur (${v.values.length})`}>
                  {v.values.map((l, i) => <p key={l.id ?? i} className="flex justify-between gap-2 text-sm text-gray-700"><span>{formatDate(l.valueDate)} · {l.lineType}{l.origin ? ` · ${l.origin}` : ""}{l.entryNumber ? ` · ${l.entryNumber}` : ""}</span><span className="font-mono">{money(l.amount)}</span></p>)}
                </Section>
              </>
            )}
            {tab === "plan" && <PlanTab code={code} />}
            {tab === "history" && (
              <Section title={`Événements (${v.events.length})`}>
                <div className="space-y-1.5">
                  {v.events.map((e, i) => (
                    <div key={e.id ?? i} className="rounded-xl bg-white p-2.5 text-sm shadow-sm">
                      <p className="font-medium text-gray-900">{formatDate(e.eventDate)} · {e.kind}{e.amount ? ` · ${money(e.amount)}` : ""}</p>
                      <p className="text-xs text-gray-400">{[e.reason, e.beforeValue && e.afterValue ? `${e.beforeValue} → ${e.afterValue}` : null, e.voucherNumber && `PV ${e.voucherNumber}`, e.entryNumber && `écriture ${e.entryNumber}`, e.createdBy].filter(Boolean).join(" · ")}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {tab === "ops" && (
              <>
                <Section title={`Dépréciations (${v.impairments.length})`}>
                  {v.impairments.map((m) => (
                    <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm">
                      <span>{formatDate(m.impairmentDate)} · {m.kind} · {money(m.amount)}{m.indicator ? ` · ${m.indicator}` : ""}{m.requestedBy ? ` · demandée par ${m.requestedBy}` : ""}</span>
                      <span className="flex items-center gap-2">
                        {m.status && <StatusChip tone={is(m.status, "APPROVED", "POSTED") ? "success" : "warn"}>{m.status}</StatusChip>}
                        {canManage && is(m.status, "PENDING", "PENDING_APPROVAL") && <><ActionButton variant="ghost" onClick={() => decide(m.id, true)}>Approuver</ActionButton><ActionButton variant="ghost" onClick={() => decide(m.id, false)}>Rejeter</ActionButton></>}
                      </span>
                    </div>
                  ))}
                </Section>
                <Section title={`Entretien (${v.maintenance.length})`}>
                  {v.maintenance.map((m, i) => <p key={m.id ?? i} className="flex justify-between gap-2 text-sm text-gray-700"><span>{formatDate(m.maintenanceDate)} · {m.kind} · {m.provider}{m.underWarranty ? " · sous garantie" : ""}{m.description ? ` · ${m.description}` : ""}</span><span className="font-mono">{money(m.cost)}</span></p>)}
                </Section>
              </>
            )}
            {tab === "exits" && (
              <Section title={`Sorties et cessions (${v.disposals.length})`}>
                <div className="space-y-2">
                  {v.disposals.map((d) => {
                    const validated = !!d.validatedAt;
                    return (
                      <div key={d.id} className="rounded-2xl bg-white p-3 text-sm shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-gray-900">{d.voucherNumber ?? `Sortie #${d.id}`} · {formatDate(d.disposalDate)}</span>
                          {d.status && <StatusChip tone={validated ? "success" : d.status === "CANCELLED" ? "danger" : "warn"}>{d.status}</StatusChip>}
                        </div>
                        <p className="text-xs text-gray-500">{[d.reason, d.buyerName && `acheteur ${d.buyerName}`, `brut ${money(d.grossValue)}`, `net ${money(d.netValue)}`, d.price ? `prix ${money(d.price)}` : null, `résultat ${money(d.gainLoss)}`, d.vatRegularization ? `régul. TVA ${money(d.vatRegularization)}` : null, d.collectedAmount ? `encaissé ${money(d.collectedAmount)}` : null, d.indemnityAmount ? `indemnité ${money(d.indemnityAmount)}` : null].filter(Boolean).join(" · ")}</p>
                        <p className="text-xs text-gray-400">{[d.preparedBy && `préparée par ${d.preparedBy}`, d.validatedBy && `validée par ${d.validatedBy}`, d.exitEntry && `sortie ${d.exitEntry}`, d.saleEntry && `cession ${d.saleEntry}`, d.complementEntry && `complément ${d.complementEntry}`, d.indemnityEntry && `indemnité ${d.indemnityEntry}`].filter(Boolean).join(" · ")}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <ActionButton variant="ghost" onClick={() => doc(() => fixedAssetService.disposalPdf(d.id), `sortie-${d.voucherNumber ?? d.id}.pdf`)}>PV PDF</ActionButton>
                          {canManage && !validated && d.status !== "CANCELLED" && <><ActionButton onClick={() => disposalStep(d, "validate")}>Valider</ActionButton><ActionButton variant="ghost" onClick={() => disposalStep(d, "cancel")}>Annuler</ActionButton></>}
                          {canManage && validated && !form && <>
                            <ActionButton variant="ghost" onClick={() => setForm({ title: "Encaisser le prix de cession", fields: COLLECT_FIELDS, run: async (f) => { await fixedAssetService.disposalStep(d.id, "collections", f); reload(); } })}>Encaisser</ActionButton>
                            <ActionButton variant="ghost" onClick={() => setForm({ title: "Enregistrer une indemnité d'assurance", fields: INDEMNITY_FIELDS, run: async (f) => { await fixedAssetService.disposalStep(d.id, "indemnities", f); reload(); } })}>Indemnité</ActionButton>
                          </>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </AccountingShell>
  );
};
