import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { vatService } from "../../../services/vat.service";
import { useAuth } from "../../../contexts/AuthContext";
import { money } from "../../../components/accounting/accountingLabels";
import { ActionButton, Detail, EmptyState, ErrorBlock, Section, StatusChip } from "../../../components/subscription/kit";
import { apiMessage, formatDate, formatDateTime } from "../../../components/subscription/kitUtils";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { VAT_KEY, vatTone } from "./VatPage";

export const VatReturnPage: React.FC = () => {
  const id = Number(useParams().id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canPrepare = hasPermission("VAT_RETURN:PREPARE");
  const canValidate = hasPermission("VAT_RETURN:VALIDATE");
  const key = ["vat-return", id];
  const q = useQuery({ queryKey: key, queryFn: () => vatService.get(id) });
  const det = useQuery({ queryKey: ["vat-detail", id], queryFn: () => vatService.detail(id) });
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: [VAT_KEY] }); qc.invalidateQueries({ queryKey: ["vat-detail", id] }); };

  const validate = () => toast.confirm({
    message: "Valider cette déclaration ?", detail: "Les chiffres sont figés après validation.", confirmLabel: "Valider",
    successMessage: "Déclaration validée", errorMessage: "Validation impossible",
    onConfirm: async () => { await vatService.validate(id); refresh(); },
  });
  const liquidate = () => toast.confirm({
    message: "Liquider la TVA de cette période ?", detail: "Génère l'écriture de liquidation.", confirmLabel: "Liquider",
    successMessage: "TVA liquidée", errorMessage: "Liquidation impossible",
    onConfirm: async () => { await vatService.liquidate(id); refresh(); qc.invalidateQueries({ queryKey: ["accounting-entries"] }); },
  });
  const del = () => toast.confirm({
    tone: "danger", message: "Supprimer cette déclaration ?", confirmLabel: "Supprimer", successMessage: "Déclaration supprimée", errorMessage: "Suppression impossible",
    onConfirm: async () => { await vatService.remove(id); qc.invalidateQueries({ queryKey: [VAT_KEY] }); nav("/accounting/vat"); },
  });
  const file = async (kind: "pdf" | "export") => {
    try {
      const b = await (kind === "pdf" ? vatService.pdf(id) : vatService.exportFile(id));
      saveBlob(b, `tva-${q.data?.periodCode ?? id}.${kind === "pdf" ? "pdf" : "csv"}`);
    } catch (e) { toast.error(apiMessage(e, "Fichier indisponible.")); }
  };

  const r = q.data;
  const d = det.data;
  const validated = !!r?.validatedAt;
  const liquidated = !!r?.liquidatedAt || !!r?.liquidationEntryNumber;
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/vat" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Déclarations de TVA</Link>
        {q.isLoading ? <ListSkeleton /> : q.isError || !r ? <ErrorBlock message="Déclaration introuvable." onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">TVA {r.periodCode} {r.status && <StatusChip tone={vatTone(r.status)}>{r.status}</StatusChip>}</h2>
              <div className="flex flex-wrap gap-2">
                <ActionButton variant="ghost" onClick={() => file("pdf")}>PDF</ActionButton>
                <ActionButton variant="ghost" onClick={() => file("export")}>Exporter</ActionButton>
                {canValidate && !validated && <ActionButton onClick={validate}>Valider</ActionButton>}
                {canValidate && validated && !liquidated && <ActionButton onClick={liquidate}>Liquider</ActionButton>}
                {canPrepare && !validated && <ActionButton variant="ghost" onClick={del}>Supprimer</ActionButton>}
              </div>
            </div>

            <Section title="Calcul">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Période">{`${formatDate(r.startDate)} → ${formatDate(r.endDate)}`}</Detail>
                <Detail label="Régime">{r.regime}</Detail>
                <Detail label="Chiffre d'affaires" mono>{money(r.revenue)}</Detail>
                <Detail label="TVA collectée" mono>{money(r.collected)}</Detail>
                <Detail label="TVA déductible brute" mono>{money(r.deductibleGross)}</Detail>
                <Detail label="Prorata de déduction" mono>{r.deductionProrata != null ? String(r.deductionProrata) : undefined}</Detail>
                <Detail label="TVA déductible" mono>{money(r.deductible)}</Detail>
                <Detail label="TVA non déductible" mono>{money(r.nonDeductible)}</Detail>
                <Detail label="Crédit reporté de la période précédente" mono>{money(r.creditBroughtForward)}</Detail>
                <Detail label="TVA à payer" mono>{money(r.dueAmount)}</Detail>
                <Detail label="Crédit à reporter" mono>{money(r.creditCarriedForward)}</Detail>
              </div>
            </Section>

            <Section title="Contrôles">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="TVA des factures" mono>{money(r.invoiceTaxTotal)}</Detail>
                <Detail label="Écart de contrôle" mono>{money(r.controlDifference)}</Detail>
                <Detail label="Écritures en attente d'équilibre" mono>{money(r.pendingBalance)}</Detail>
              </div>
              {(r.controlDifference ?? 0) !== 0 && <p className="mt-2 text-xs text-amber-600">La TVA comptabilisée diffère de celle des factures : voir le détail par document ci-dessous.</p>}
              {(r.pendingBalance ?? 0) !== 0 && <p className="mt-1 text-xs text-amber-600">Des écritures en attente d'équilibre touchent la période : le calcul peut changer une fois régularisées.</p>}
            </Section>

            <Section title="Suivi">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Préparée">{r.preparedAt ? `${formatDateTime(r.preparedAt)}${r.preparedBy ? ` par ${r.preparedBy}` : ""}` : undefined}</Detail>
                <Detail label="Validée">{r.validatedAt ? `${formatDateTime(r.validatedAt)}${r.validatedBy ? ` par ${r.validatedBy}` : ""}` : undefined}</Detail>
                <Detail label="Liquidée">{r.liquidatedAt ? `${formatDateTime(r.liquidatedAt)}${r.liquidatedBy ? ` par ${r.liquidatedBy}` : ""}` : undefined}</Detail>
                <Detail label="N° de bordereau">{r.voucherNumber}</Detail>
                <Detail label="Écriture de liquidation">{r.liquidationEntryNumber && <Link className="underline" to={`/accounting/entries/${encodeURIComponent(r.liquidationEntryNumber)}`}>{r.liquidationEntryNumber}</Link>}</Detail>
              </div>
            </Section>

            {det.isLoading ? <ListSkeleton /> : det.isError || !d ? <ErrorBlock message="Détail indisponible." onRetry={() => det.refetch()} /> : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  {([["Collectée par compte", d.collected], ["Déductible par compte", d.deductible]] as const).map(([t, rows]) => (
                    <Section key={t} title={t}>
                      {rows.length === 0 ? <p className="text-sm text-gray-400">Aucun mouvement.</p> : rows.map((a, i) => (
                        <p key={i} className="flex justify-between gap-2 text-sm text-gray-700"><span className="truncate">{a.account} {a.label}</span><span className="font-mono">{money(a.amount)}</span></p>
                      ))}
                    </Section>
                  ))}
                </div>
                <Section title="Par code de taxe">
                  {d.byCode.length === 0 ? <p className="text-sm text-gray-400">Aucun code.</p> : d.byCode.map((c, i) => (
                    <p key={i} className="flex justify-between gap-2 text-sm text-gray-700"><span>{c.taxCode}</span><span className="font-mono text-xs">base {money(c.base)} · taxe {money(c.tax)}</span></p>
                  ))}
                </Section>
                <Section title={`Documents (${d.documents.length})`}>
                  {d.sealedTaxTotal != null && <p className="mb-2 text-xs text-gray-500">Taxe des documents scellés : <b className="font-mono">{money(d.sealedTaxTotal)}</b></p>}
                  {d.documents.length === 0 ? <EmptyState icon={FileText} title="Aucun document" /> : (
                    <div className="space-y-1.5">
                      {d.documents.map((x, i) => (
                        <div key={i} className="rounded-xl bg-white p-2.5 text-sm shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-gray-900">{x.documentNumber} <span className="font-normal text-gray-400">· {x.documentType} · {formatDate(x.date)}{x.customerName ? ` · ${x.customerName}` : ""}</span></span>
                            <span className="flex items-center gap-2">{x.sealed && <StatusChip tone="info">Scellé</StatusChip>}{(x.difference ?? 0) !== 0 && <StatusChip tone="danger">Écart {money(x.difference)}</StatusChip>}</span>
                          </div>
                          <p className="text-xs text-gray-400">{[`base ${money(x.taxable)}`, `TVA ${money(x.vat)}`, x.extraTax ? `autre taxe ${money(x.extraTax)}` : null, x.currency && x.currency !== "XAF" ? `devise ${x.currency}, taxe XAF ${money(x.taxXaf)}` : null, `comptabilisée ${money(x.accountingTax)}`, x.event && `événement ${x.event}`, x.fiscalNumber && `n° fiscal ${x.fiscalNumber}`].filter(Boolean).join(" · ")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}
          </>
        )}
      </div>
    </AccountingShell>
  );
};
