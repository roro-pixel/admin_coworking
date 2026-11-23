import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { ActionButton, ErrorBlock, Field, Section } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { toast } from "../../../components/ui/toastStore";
import { fundService } from "../../../services/fund.service";
import type { NeedInput } from "../../../services/fund.service";
import { LinesEditor, fromPayload, toPayload } from "./LinesEditor";
import type { Col, Row } from "./LinesEditor";

const COLS: Col[] = [
  { key: "designation", label: "Désignation", wide: true }, { key: "quantity", label: "Quantité", number: true }, { key: "unit", label: "Unité" }, { key: "unitPrice", label: "Prix estimé", number: true },
  { key: "natureCode", label: "Nature" }, { key: "supplier", label: "Fournisseur" }, { key: "supplierCode", label: "Code fournisseur" },
];

export const NeedFormPage: React.FC = () => {
  const { number } = useParams();
  const nav = useNavigate();
  const editing = !!number;
  const q = useQuery({ queryKey: ["fund-need", number], queryFn: () => fundService.need(number!), enabled: editing });
  if (editing && q.isError) return <AccountingShell><ErrorBlock message="État de besoin introuvable." onRetry={() => q.refetch()} /></AccountingShell>;
  if (editing && !q.data) return <AccountingShell><p className="text-sm text-gray-500">Chargement…</p></AccountingShell>;
  return <Form key={number ?? "new"} init={q.data} number={number} onDone={() => nav("/accounting/fund")} />;
};

const Form: React.FC<{ init?: import("../../../services/fund.service").Need; number?: string; onDone: () => void }> = ({ init, number, onDone }) => {
  const [h, setH] = useState({ subject: init?.subject ?? "", department: init?.department ?? "", locationCode: init?.locationCode ?? "", costCenter: init?.costCenter ?? "", urgency: init?.urgency ?? "NORMAL", wantedDate: init?.wantedDate ?? "", attachments: init?.attachments ?? "" });
  const [rows, setRows] = useState<Row[]>(fromPayload(COLS, init?.lines as Record<string, unknown>[] | undefined));
  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      const body: NeedInput = { ...h, lines: toPayload<NeedInput["lines"][number]>(COLS, rows) };
      const n = number ? await fundService.updateNeed(number, body) : await fundService.createNeed(body);
      if (submit) await fundService.submitNeed(n.number);
      return n;
    },
    onSuccess: (n, submit) => { toast.success(submit ? `État de besoin ${n.number} soumis` : `État de besoin ${n.number} enregistré`); onDone(); },
    onError: (e) => toast.error(apiMessage(e, "Enregistrement impossible.")),
  });
  const valid = h.subject.trim() && toPayload(COLS, rows).length > 0;
  return (
    <AccountingShell>
      <div className="space-y-5">
        <Link to="/accounting/fund" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-900"><ArrowLeft size={14} /> Demandes de fonds</Link>
        <h2 className="text-lg font-bold text-gray-900">{number ? `Modifier ${number}` : "Nouvel état de besoin"}</h2>
        <Section title="Informations">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Objet" required className="sm:col-span-3"><input className={FIELD} value={h.subject} onChange={(e) => setH({ ...h, subject: e.target.value })} /></Field>
            <Field label="Service"><input className={FIELD} value={h.department} onChange={(e) => setH({ ...h, department: e.target.value })} /></Field>
            <Field label="Site"><input className={FIELD} value={h.locationCode} onChange={(e) => setH({ ...h, locationCode: e.target.value })} /></Field>
            <Field label="Centre de coût"><input className={FIELD} value={h.costCenter} onChange={(e) => setH({ ...h, costCenter: e.target.value })} /></Field>
            <Field label="Urgence"><select className={FIELD} value={h.urgency} onChange={(e) => setH({ ...h, urgency: e.target.value })}><option value="NORMAL">Normale</option><option value="URGENT">Urgente</option><option value="CRITICAL">Critique</option></select></Field>
            <Field label="Date souhaitée"><input type="date" className={FIELD} value={h.wantedDate} onChange={(e) => setH({ ...h, wantedDate: e.target.value })} /></Field>
            <Field label="Pièces jointes" hint="Références de la GED"><input className={FIELD} value={h.attachments} onChange={(e) => setH({ ...h, attachments: e.target.value })} /></Field>
          </div>
        </Section>
        <Section title="Besoins" description="La nature est suggérée par le serveur d'après la désignation si elle est laissée vide.">
          <LinesEditor cols={COLS} rows={rows} onChange={setRows} />
        </Section>
        <div className="flex gap-2">
          <ActionButton variant="ghost" pending={save.isPending} disabled={!valid} onClick={() => save.mutate(false)}>Enregistrer</ActionButton>
          <ActionButton pending={save.isPending} disabled={!valid} onClick={() => save.mutate(true)}>Enregistrer et soumettre</ActionButton>
        </div>
      </div>
    </AccountingShell>
  );
};
