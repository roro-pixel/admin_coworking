import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Download, FileUp, Upload, X } from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";
import { ActionButton, ErrorBanner, Field, IconButton, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD, FOCUS, apiMessage } from "../../../components/subscription/kitUtils";
import { saveBlob } from "../../../components/payment/paymentUtils";
import { RatioBar } from "../../../components/operations/OpsCharts";
import { qty } from "../../../components/inventory/invKit";

const importTypes = [
  { value: "ITEMS", label: "Articles" },
  { value: "ASSETS", label: "Actifs" },
  { value: "INITIAL_STOCK", label: "Stocks initiaux" },
  { value: "SUPPLIERS", label: "Fournisseurs" },
];

const templateHeaders: Record<string, string[]> = {
  ITEMS: [
    "itemCode",
    "name",
    "description",
    "categoryCode",
    "unitCode",
    "itemType",
    "trackingType",
    "defaultCost",
    "salePrice",
    "taxable",
    "allowNegativeStock",
    "requiresExpiryDate",
    "requiresLotNumber",
    "requiresSerialNumber",
    "active",
  ],
  ASSETS: [
    "assetCode",
    "itemCode",
    "serialNumber",
    "assetTag",
    "status",
    "condition",
    "locationCode",
    "purchaseDate",
    "purchaseCost",
    "warrantyEndDate",
    "usefulLifeMonths",
    "residualValue",
    "notes",
  ],
  INITIAL_STOCK: [
    "itemCode",
    "locationCode",
    "quantity",
    "unitCost",
    "lotNumber",
    "expiryDate",
  ],
  SUPPLIERS: ["code", "name", "email", "phone", "taxId", "address", "status"],
};

const templateSampleRow: Record<string, string[]> = {
  ITEMS: [
    "ART-001",
    "Chaise de bureau",
    "Chaise ergonomique reglable",
    "MOBILIER",
    "PIECE",
    "ASSET",
    "SERIAL",
    "45000",
    "65000",
    "true",
    "false",
    "false",
    "false",
    "true",
    "true",
  ],
  ASSETS: [
    "AST-001",
    "ART-001",
    "SN-20260410-001",
    "TAG-001",
    "AVAILABLE",
    "NEW",
    "ENTREPOT-A",
    "2026-04-10",
    "45000",
    "2028-04-10",
    "60",
    "5000",
    "",
  ],
  INITIAL_STOCK: ["ART-001", "ENTREPOT-A", "100", "12000", "", ""],
  SUPPLIERS: [
    "FOURNISSEUR-001",
    "Bureau Plus SARL",
    "contact@bureauplus.cm",
    "+237691000000",
    "M12345678A",
    "Rue de la Joie, Douala",
    "ACTIVE",
  ],
};

const buildTemplateCsv = (type: string): string => {
  const headers = templateHeaders[type] || [];
  const sample = templateSampleRow[type] || [];
  return [headers.join(","), sample.join(",")].join("\n");
};

export const ImportPage: React.FC = () => {
  const [importType, setImportType] = useState("ITEMS");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const pick = (f?: File | null) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
  };

  const run = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Veuillez sélectionner un fichier");
      return inventoryService.importInventory(importType, file);
    },
    onSuccess: (d) => { setResult(d); setError(null); },
    onError: (e) => { setError(apiMessage(e, "Erreur lors de l'import")); setResult(null); },
  });

  const downloadTemplate = () => saveBlob(new Blob([buildTemplateCsv(importType)], { type: "text/csv;charset=utf-8;" }), `template_${importType.toLowerCase()}.csv`);
  const errors: any[] = result?.rows ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">Import massif</h2>
        <p className="mt-1 text-sm text-gray-500">Chargez un fichier CSV ou Excel pour créer des articles, actifs, stocks ou fournisseurs en une fois.</p>
      </div>

      <Section title="Fichier à importer">
        <div className="space-y-5">
          <Field label="Type d'import" required>
            <select value={importType} onChange={(e) => setImportType(e.target.value)} className={FIELD}>
              {importTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            className={`rounded-3xl p-8 text-center transition ${drag ? "bg-pink-50 ring-2 ring-[color:var(--logo-pink)]" : file ? "bg-emerald-50" : "bg-gray-50"}`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 size={28} className="text-emerald-600" />
                <div className="min-w-0 text-left"><p className="truncate text-sm font-semibold text-gray-900">{file.name}</p><p className="text-xs text-gray-500">{Math.max(1, Math.round(file.size / 1024))} Ko</p></div>
                <IconButton icon={X} label="Retirer le fichier" tone="neutral" onClick={() => setFile(null)} />
              </div>
            ) : (
              <>
                <FileUp size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="mb-3 text-sm text-gray-500">Glissez le fichier ici ou</p>
                <label className={`inline-flex cursor-pointer items-center rounded-full bg-[color:var(--logo-pink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--logo-pink-dark)] ${FOCUS}`}>
                  Parcourir
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => pick(e.target.files?.[0])} className="hidden" />
                </label>
                <p className="mt-3 text-xs text-gray-400">CSV ou Excel, 10 Mo maximum</p>
              </>
            )}
          </div>

          <ErrorBanner message={error} />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" icon={Download} onClick={downloadTemplate}>Télécharger le modèle</ActionButton>
            <ActionButton icon={Upload} pending={run.isPending} disabled={!file} onClick={() => run.mutate()}>Importer</ActionButton>
          </div>
        </div>
      </Section>

      {result && (
        <Section title="Résultat de l'import">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-gray-50 p-4"><p className="text-2xl font-bold text-gray-950">{qty(result.totalRows ?? 0)}</p><p className="text-xs text-gray-500">Lignes lues</p></div>
              <div className="rounded-2xl bg-gray-50 p-4"><p className="text-2xl font-bold text-emerald-600">{qty(result.successCount ?? 0)}</p><p className="text-xs text-gray-500">Importées</p></div>
              <div className="rounded-2xl bg-gray-50 p-4"><p className={`text-2xl font-bold ${(result.errorCount ?? 0) > 0 ? "text-red-600" : "text-gray-950"}`}>{qty(result.errorCount ?? 0)}</p><p className="text-xs text-gray-500">En erreur</p></div>
            </div>
            {(result.totalRows ?? 0) > 0 && <RatioBar value={result.successCount ?? 0} total={result.totalRows} color="#7FB08A" />}
            {errors.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-gray-400">Détail des erreurs</p>
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {errors.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-2xl bg-red-50 p-3 text-sm"><StatusChip tone="danger">Ligne {r.rowNumber}</StatusChip><p className="text-red-700">{r.message}</p></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
};
