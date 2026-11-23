import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { ActionButton, CheckField, ErrorBlock, Field, Section } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { FUND_TYPES, fundService } from "../../../services/fund.service";
import type { FundRequest, FundType, RequestInput, RequestLine } from "../../../services/fund.service";
import { LinesEditor, fromPayload, toPayload } from "./LinesEditor";
import type { Col, Row } from "./LinesEditor";

const COLS: Col[] = [
  { key: "designation", label: "Désignation", wide: true }, { key: "amount", label: "Montant", number: true }, { key: "natureCode", label: "Nature" },
  { key: "supplier", label: "Fournisseur" }, { key: "supplierCode", label: "Code fournisseur" }, { key: "section", label: "Section" },
];

export const RequestFormPage: React.FC = () => {
  const { number } = useParams();
  const q = useQuery({ queryKey: ["fund-request", number], queryFn: () => fundService.get(number!), enabled: !!number });
  if (number && q.isError) return <AccountingShell><ErrorBlock message="Demande introuvable." onRetry={() => q.refetch()} /></AccountingShell>;
  if (number && !q.data) return <AccountingShell><p className="text-sm text-gray-500">Chargement…</p></AccountingShell>;
  return <Form key={number ?? "new"} init={q.data} number={number} />;
};

const Form: React.FC<{ init?: FundRequest; number?: string }> = ({ init, number }) => {
  const nav = useNavigate();
  const [type, setType] = useState<FundType | "">(init?.type ?? "");
  const [h, setH] = useState({
    subject: init?.subject ?? "", requesterDepartment: init?.requesterDepartment ?? "", requesterPhone: init?.requesterPhone ?? "", beneficiaryType: init?.beneficiaryType ?? "SELF",
    beneficiaryCode: init?.beneficiaryCode ?? "", beneficiaryName: init?.beneficiaryName ?? "", beneficiaryIdNumber: init?.beneficiaryIdNumber ?? "", beneficiaryPhone: init?.beneficiaryPhone ?? "",
    registerCode: init?.registerCode ?? "", deliveryMode: init?.deliveryMode ?? "CASH", wantedDate: init?.wantedDate ?? "", missionDestination: init?.missionDestination ?? "",
    missionStart: init?.missionStart ?? "", missionEnd: init?.missionEnd ?? "", unplannedReason: init?.unplannedReason ?? "", unplannedCode: "", forecastNumber: "", attachments: init?.attachments ?? "",
  });
  const [unplanned, setUnplanned] = useState(!!init?.unplanned);
  const [rows, setRows] = useState<Row[]>(fromPayload(COLS, init?.lines as Record<string, unknown>[] | undefined));
  const set = (k: keyof typeof h) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setH({ ...h, [k]: e.target.value });
  const lines = toPayload<RequestLine>(COLS, rows);
  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const valid = !!type && h.subject.trim() && lines.length > 0 && lines.every((l) => l.amount > 0);
  const mission = type === "ADVANCE";

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      const body: RequestInput = { ...h, type: type as FundType, unplanned, lines, submit };
      return number ? fundService.update(number, body).then(async (r) => (submit ? fundService.submit(r.number) : r)) : fundService.create(body);
    },
    onSuccess: (r, submit) => { toast.success(submit ? `Demande ${r.number} envoyée` : `Demande ${r.number} enregistrée`); nav(`/accounting/fund/${encodeURIComponent(r.number)}`); },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });

  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/fund" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Demandes de fonds</Link>
        <h2 className="text-lg font-bold text-gray-900">{number ? `Modifier ${number}` : "Nouvelle demande de fonds"}</h2>
        <Section title="Type de demande">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FUND_TYPES.map((t) => (
              <button key={t.code} type="button" onClick={() => setType(t.code)} className={`rounded-2xl p-3 text-left shadow-sm transition ${type === t.code ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-white hover:bg-gray-50"}`}>
                <span className="block text-sm font-semibold">{t.label}</span><span className={`block text-xs ${type === t.code ? "text-white/80" : "text-gray-500"}`}>{t.hint}</span>
              </button>
            ))}
          </div>
        </Section>
        {type && (
          <>
            <Section title="Demande">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Objet" required className="sm:col-span-3"><input className={FIELD} value={h.subject} onChange={set("subject")} /></Field>
                <Field label="Service"><input className={FIELD} value={h.requesterDepartment} onChange={set("requesterDepartment")} /></Field>
                <Field label="Téléphone"><input className={FIELD} value={h.requesterPhone} onChange={set("requesterPhone")} /></Field>
                <Field label="Date souhaitée"><input type="date" className={FIELD} value={h.wantedDate} onChange={set("wantedDate")} /></Field>
                <Field label="Bénéficiaire"><select className={FIELD} value={h.beneficiaryType} onChange={set("beneficiaryType")}><option value="SELF">Moi</option><option value="EMPLOYEE">Un employé</option><option value="THIRD_PARTY">Un tiers</option></select></Field>
                {h.beneficiaryType !== "SELF" && <>
                  <Field label="Code (employé / tiers)"><input className={FIELD} value={h.beneficiaryCode} onChange={set("beneficiaryCode")} /></Field>
                  <Field label="Nom"><input className={FIELD} value={h.beneficiaryName} onChange={set("beneficiaryName")} /></Field>
                  <Field label="N° de pièce d'identité"><input className={FIELD} value={h.beneficiaryIdNumber} onChange={set("beneficiaryIdNumber")} /></Field>
                  <Field label="Téléphone du bénéficiaire"><input className={FIELD} value={h.beneficiaryPhone} onChange={set("beneficiaryPhone")} /></Field>
                </>}
                <Field label="Mode de remise"><select className={FIELD} value={h.deliveryMode} onChange={set("deliveryMode")}><option value="CASH">Espèces</option><option value="MOBILE_MONEY">Mobile money</option><option value="TRANSFER">Virement</option></select></Field>
                <Field label="Caisse" hint="Code du registre (facultatif)"><input className={FIELD} value={h.registerCode} onChange={set("registerCode")} /></Field>
                <Field label="Pièces jointes" hint="Références de la GED"><input className={FIELD} value={h.attachments} onChange={set("attachments")} /></Field>
              </div>
            </Section>
            {mission && (
              <Section title="Mission">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Destination"><input className={FIELD} value={h.missionDestination} onChange={set("missionDestination")} /></Field>
                  <Field label="Début"><input type="date" className={FIELD} value={h.missionStart} onChange={set("missionStart")} /></Field>
                  <Field label="Fin" hint="L'échéance de justification part de cette date"><input type="date" className={FIELD} value={h.missionEnd} onChange={set("missionEnd")} /></Field>
                </div>
              </Section>
            )}
            <Section title="Budget" description="Avec un budget actif, citez la prévision couverte ou déclarez la dépense non prévue avec son motif.">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Prévision couverte" hint="N° de prévision"><input className={FIELD} value={h.forecastNumber} onChange={set("forecastNumber")} /></Field>
                <div className="sm:col-span-2"><CheckField checked={unplanned} onChange={setUnplanned} label="Dépense non prévue" /></div>
                {unplanned && <>
                  <Field label="Motif (liste)" hint="Code du motif de dépense non prévue"><input className={FIELD} value={h.unplannedCode} onChange={set("unplannedCode")} /></Field>
                  <Field label="Précision" className="sm:col-span-2"><input className={FIELD} value={h.unplannedReason} onChange={set("unplannedReason")} /></Field>
                </>}
              </div>
            </Section>
            <Section title={`Lignes · total ${total.toLocaleString("fr-FR")}`} description="La nature, le fournisseur et la section orientent la validation et la comptabilité.">
              <LinesEditor cols={COLS} rows={rows} onChange={setRows} />
            </Section>
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="ghost" pending={save.isPending} disabled={!valid} onClick={() => save.mutate(false)}>Enregistrer</ActionButton>
              <ActionButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate(true)}>Envoyer</ActionButton>
            </div>
          </>
        )}
      </div>
    </AccountingShell>
  );
};
