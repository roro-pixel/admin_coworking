import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Plus } from "lucide-react";
import { ActionButton, EmptyState, ErrorBlock, ListHeader, Section, Tabs } from "../../../components/subscription/kit";
import { formatDate } from "../../../components/subscription/kitUtils";
import { ActionForm } from "../../../components/accounting/ActionForm";
import { GenericResult } from "../../../components/accounting/GenericResult";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { toast } from "../../../components/ui/toastStore";
import { useAuth } from "../../../contexts/AuthContext";
import { apiMessage } from "../../../components/subscription/kitUtils";
import { FUND_TYPES, fundService } from "../../../services/fund.service";
import type { FundType, LineSuggestion, Need } from "../../../services/fund.service";
import { StatusBadge, money } from "./fundUtils";

type Mode = "mine" | "submitted";
type Act = null | "reject" | "transform" | "suggest";

const NeedCard: React.FC<{ n: Need; mode: Mode; canApprove: boolean }> = ({ n, mode, canApprove }) => {
  const qc = useQueryClient();
  const [act, setAct] = useState<Act>(null);
  const [sugg, setSugg] = useState<LineSuggestion[] | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["fund-needs"] });
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast.success(ok); refresh(); } catch (e) { toast.error(apiMessage(e, "Action impossible.")); } };
  const pdf = async () => { try { saveBlob(await fundService.needPdf(n.number), `etat-de-besoin-${n.number}.pdf`); } catch (e) { toast.error(apiMessage(e, "PDF indisponible.")); } };
  const draft = n.status === "DRAFT";
  const validated = n.status === "VALIDATED" || n.status === "PARTIALLY_TRANSFORMED";
  return (
    <Section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{n.number} <span className="font-normal text-gray-500">· {n.subject}</span></p>
          <p className="text-xs text-gray-500">{[n.requester, n.department, n.urgency, n.wantedDate && `souhaité le ${formatDate(n.wantedDate)}`].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="flex items-center gap-3"><span className="font-mono text-sm">{money(n.totalAmount)}</span><StatusBadge status={n.status} /></span>
      </div>
      {n.totalInWords && <p className="mt-1 text-xs italic text-gray-400">{n.totalInWords}</p>}
      {n.decisionNote && <p className="mt-1 text-xs text-gray-500">Décision{n.decidedBy ? ` (${n.decidedBy})` : ""} : {n.decisionNote}</p>}
      <div className="mt-2 space-y-1">
        {(n.lines ?? []).map((l, i) => (
          <p key={i} className="flex justify-between gap-2 text-xs text-gray-600"><span>{l.lineNo ?? i + 1}. {l.designation}{l.quantity != null ? ` · ${l.quantity} ${l.unit ?? ""} × ${money(l.unitPrice)}` : ""}{l.natureCode ? ` · ${l.natureCode}` : ""}{l.transformedRequestNumber ? ` → ${l.transformedRequestNumber}` : ""}</span><span className="font-mono">{money(l.totalAmount)}</span></p>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton variant="ghost" onClick={pdf}>PDF</ActionButton>
        {mode === "mine" && draft && <Link to={`/accounting/fund/needs/${encodeURIComponent(n.number)}/edit`}><ActionButton variant="ghost">Modifier</ActionButton></Link>}
        {mode === "mine" && draft && <ActionButton onClick={() => run(() => fundService.submitNeed(n.number), "État de besoin soumis")}>Soumettre</ActionButton>}
        {mode === "submitted" && canApprove && n.status === "SUBMITTED" && <ActionButton onClick={() => run(() => fundService.validateNeed(n.number), "État de besoin validé")}>Valider</ActionButton>}
        {mode === "submitted" && canApprove && n.status === "SUBMITTED" && <ActionButton variant="danger" onClick={() => setAct("reject")}>Rejeter</ActionButton>}
        {validated && <ActionButton onClick={() => setAct("transform")}>Transformer en demande</ActionButton>}
        {(draft || validated || n.status === "SUBMITTED") && <ActionButton variant="ghost" onClick={async () => { try { setSugg(await fundService.needSuggestions(n.number, 3)); } catch (e) { toast.error(apiMessage(e, "Suggestions indisponibles.")); } }}>Fournisseurs suggérés</ActionButton>}
      </div>
      {act === "reject" && <div className="mt-3"><ActionForm title="Rejeter l'état de besoin" submitLabel="Rejeter" onClose={() => setAct(null)} fields={[{ key: "comment", label: "Motif", required: true }]} onSubmit={async (v) => { await fundService.rejectNeed(n.number, v as { comment: string }); refresh(); }} /></div>}
      {act === "transform" && (
        <div className="mt-3">
          <ActionForm title="Transformer en demande de fonds" submitLabel="Transformer" onClose={() => setAct(null)}
            fields={[{ key: "type", label: `Type (${FUND_TYPES.map((t) => t.code).join(", ")})`, required: true, def: "DIRECT_EXPENSE" }, { key: "lineNos", label: "N° de lignes", type: "list", hint: "Vide = toutes" }, { key: "registerCode", label: "Caisse" }]}
            onSubmit={async (v) => { const r = await fundService.transformNeed(n.number, { type: v.type as FundType, lineNos: (v.lineNos as string[] | undefined)?.map(Number), registerCode: v.registerCode as string | undefined }); toast.success(`Demande ${r.number} créée en brouillon`); refresh(); }} />
        </div>
      )}
      {sugg && <div className="mt-3"><GenericResult data={sugg.flatMap((l) => (l.result?.suggestions ?? []).map((s) => ({ ligne: l.lineNo, désignation: l.designation, nature: l.result?.natureLabel ?? l.result?.natureCode, rang: s.rank, fournisseur: s.supplierName, code: s.supplierCode, score: s.score, raisons: (s.reasons ?? []).join(" ; ") })))} title="Fournisseurs suggérés par ligne" /></div>}
    </Section>
  );
};

export const NeedsPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canApprove = hasPermission("FUND_REQUEST:APPROVE_L1");
  const [mode, setMode] = useState<Mode>("mine");
  const q = useQuery({ queryKey: ["fund-needs", mode], queryFn: () => (mode === "mine" ? fundService.myNeeds() : fundService.submittedNeeds()) });
  return (
    <div className="space-y-4">
      <ListHeader title="États de besoin" subtitle="Saisie en grille, validation par le niveau 1, puis transformation en demande de fonds." action={<Link to="/accounting/fund/needs/new"><ActionButton icon={Plus}>Nouvel état de besoin</ActionButton></Link>} />
      <Tabs variant="soft" items={[{ id: "mine", label: "Mes états" }, { id: "submitted", label: "Soumis à validation" }]} active={mode} onChange={setMode} />
      {q.isLoading ? <ListSkeleton /> : q.isError ? <ErrorBlock message="Chargement impossible." onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? <EmptyState icon={Inbox} title="Aucun état de besoin" /> : q.data!.map((n) => <NeedCard key={n.number} n={n} mode={mode} canApprove={canApprove} />)}
    </div>
  );
};
