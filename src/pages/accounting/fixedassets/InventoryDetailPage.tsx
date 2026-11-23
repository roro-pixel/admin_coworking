import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { ActionForm } from "../../../components/accounting/ActionForm";
import { fixedAssetService } from "../../../services/fixedAsset.service";
import type { CampaignView } from "../../../services/fixedAsset.service";
import { useAuth } from "../../../contexts/AuthContext";
import { ActionButton, Detail, ErrorBlock, Section, StatusChip } from "../../../components/subscription/kit";
import { apiMessage, formatDate, formatDateTime } from "../../../components/subscription/kitUtils";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { CAMPAIGNS_KEY } from "./InventoriesPanel";

const Codes: React.FC<{ title: string; codes: string[] }> = ({ title, codes }) => (
  <Section title={`${title} (${codes.length})`}>{codes.length === 0 ? <p className="text-sm text-gray-400">Aucun.</p> : <p className="break-words font-mono text-xs text-gray-700">{codes.join(", ")}</p>}</Section>
);

export const InventoryDetailPage: React.FC = () => {
  const { code = "" } = useParams();
  const qc = useQueryClient();
  const canManage = useAuth().hasPermission("ACCOUNTING_SETTINGS:MANAGE");
  const [form, setForm] = useState<"scan" | "close" | null>(null);
  const key = ["fa-campaign", code];
  const q = useQuery({ queryKey: key, queryFn: () => fixedAssetService.campaign(code) });
  const apply = (v: CampaignView) => { qc.setQueryData(key, v); qc.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] }); (v.warnings ?? []).forEach((w) => toast.error(w)); };
  const pdf = async () => { try { saveBlob(await fixedAssetService.campaignPdf(code), `inventaire-${code}.pdf`); } catch (e) { toast.error(apiMessage(e, "PV indisponible.")); } };
  const v = q.data;
  const c = v?.campaign;
  const closed = !!c?.closedAt;
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/fixed-assets" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Immobilisations</Link>
        {q.isLoading ? <ListSkeleton /> : q.isError || !v || !c ? <ErrorBlock message="Campagne introuvable." onRetry={() => q.refetch()} /> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">{c.code} · {c.label} {c.status && <StatusChip tone={closed ? "success" : "warn"}>{c.status}</StatusChip>}</h2>
              <div className="flex gap-2">
                <ActionButton variant="ghost" onClick={pdf}>PV PDF</ActionButton>
                {canManage && !closed && !form && <><ActionButton onClick={() => setForm("scan")}>Enregistrer un scan</ActionButton><ActionButton variant="ghost" onClick={() => setForm("close")}>Clôturer</ActionButton></>}
              </div>
            </div>
            {v.warnings.length > 0 && <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">{v.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>}

            {form === "scan" && (
              <ActionForm title="Enregistrer un scan" submitLabel="Enregistrer" onClose={() => setForm(null)}
                fields={[{ key: "assetCode", label: "Code du bien", hint: "Lu sur l'étiquette ou le QR" }, { key: "unregisteredLabel", label: "Bien non enregistré", hint: "Si le bien n'a pas de fiche" }, { key: "site", label: "Site" }, { key: "resourceCode", label: "Espace" }, { key: "locationLabel", label: "Emplacement" }, { key: "photoRef", label: "Photo (référence GED)" }]}
                onSubmit={async (f) => apply(await fixedAssetService.scan(code, f))} />
            )}
            {form === "close" && (
              <ActionForm title="Clôturer la campagne" submitLabel="Clôturer" onClose={() => setForm(null)}
                fields={[{ key: "decisions", label: "Décisions sur les écarts", type: "textarea" }, { key: "witness", label: "Témoin" }]}
                onSubmit={async (f) => { apply(await fixedAssetService.closeCampaign(code, f)); toast.success("Campagne clôturée"); }} />
            )}

            <Section title="Synthèse">
              <div className="grid gap-4 sm:grid-cols-3">
                <Detail label="Site">{c.site}</Detail>
                <Detail label="Début">{formatDate(c.startDate)}</Detail>
                <Detail label="Fin">{formatDate(c.endDate)}</Detail>
                <Detail label="Attendus">{c.expectedCount}</Detail>
                <Detail label="Vus">{c.seenCount}</Detail>
                <Detail label="Manquants">{c.missingCount}</Detail>
                <Detail label="Retrouvés">{c.foundCount}</Detail>
                <Detail label="Mal placés">{c.mislocatedCount}</Detail>
                <Detail label="N° de PV">{c.voucherNumber}</Detail>
                <Detail label="Espaces">{c.resourceCodes}</Detail>
                <Detail label="Catégories">{c.categoryCodes}</Detail>
                <Detail label="Équipe">{c.team}</Detail>
                <Detail label="Témoin">{c.witness}</Detail>
                <Detail label="Ouverte par">{c.openedBy}</Detail>
                <Detail label="Clôturée">{c.closedAt ? `${formatDateTime(c.closedAt)}${c.closedBy ? ` par ${c.closedBy}` : ""}` : undefined}</Detail>
                <Detail label="Décisions" wide>{c.decisions}</Detail>
              </div>
            </Section>
            <div className="grid gap-4 lg:grid-cols-2"><Codes title="Manquants" codes={v.missing} /><Codes title="Mal placés" codes={v.mislocated} /><Codes title="Vus" codes={v.seen} /><Codes title="Attendus" codes={v.expected} /></div>
            <Section title={`Scans (${v.scans.length})`}>
              <div className="space-y-1">
                {v.scans.map((s, i) => (
                  <div key={s.id ?? i} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>{s.assetCode ?? `Non enregistré : ${s.unregisteredLabel}`} <span className="text-gray-400">{[s.site, s.resourceCode, s.locationLabel].filter(Boolean).join(" · ")}</span></span>
                    <span className="flex items-center gap-2">{s.mislocated && <StatusChip tone="warn">Mal placé</StatusChip>}{s.holderAlert && <StatusChip tone="danger">Alerte détenteur</StatusChip>}<span className="text-gray-400">{formatDateTime(s.scannedAt)}</span></span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </AccountingShell>
  );
};
