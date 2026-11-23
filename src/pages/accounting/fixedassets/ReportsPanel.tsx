import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { fixedAssetService, REPORTS } from "../../../services/fixedAsset.service";
import { GenericResult } from "../../../components/accounting/GenericResult";
import { ActionButton, Field, ListHeader } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { toast } from "../../../components/ui/toastStore";

export const ReportsPanel: React.FC = () => {
  const [code, setCode] = useState(REPORTS[0].code);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [flt, setFlt] = useState({ category: "", site: "", resource: "", holder: "" });
  const def = REPORTS.find((r) => r.code === code)!;
  const params = () => ({ ...(def.needs === "year" ? { year: Number(year) } : {}), ...(def.needs === "date" ? { date } : {}) });
  const run = useMutation({ mutationFn: () => fixedAssetService.report(code, { ...params(), ...flt }), onError: (e) => toast.error(apiMessage(e, "État indisponible.")) });
  const file = async (format: "csv" | "pdf") => { try { saveBlob(await fixedAssetService.reportFile(code, format, params()), `${code}.${format}`); } catch (e) { toast.error(apiMessage(e, "Export impossible.")); } };
  return (
    <div className="space-y-4">
      <ListHeader title="États des immobilisations" subtitle="Consultation à l'écran, export CSV (ouvrable dans Excel) et PDF." />
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="État"><select className={FIELD} value={code} onChange={(e) => { setCode(e.target.value); run.reset(); }}>{REPORTS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}</select></Field>
        {def.needs === "date" && <Field label="À la date du"><input type="date" className={FIELD} value={date} onChange={(e) => setDate(e.target.value)} /></Field>}
        {def.needs === "year" && <Field label="Exercice"><input className={FIELD} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} /></Field>}
        {(["category", "site", "resource", "holder"] as const).map((k) => <Field key={k} label={{ category: "Catégorie", site: "Site", resource: "Espace", holder: "Détenteur" }[k]}><input className={FIELD} value={flt[k]} onChange={(e) => setFlt({ ...flt, [k]: e.target.value })} /></Field>)}
      </div>
      <div className="flex gap-2">
        <ActionButton pending={run.isPending} onClick={() => run.mutate()}>Afficher</ActionButton>
        <ActionButton variant="ghost" onClick={() => file("csv")}>CSV</ActionButton>
        <ActionButton variant="ghost" onClick={() => file("pdf")}>PDF</ActionButton>
      </div>
      {run.data !== undefined && <GenericResult data={run.data} />}
    </div>
  );
};
