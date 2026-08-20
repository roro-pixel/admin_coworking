import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { inventoryService } from "../../../services/inventory.service";

const importTypes = [
  { value: "ITEMS", label: "Articles" },
  { value: "ASSETS", label: "Actifs" },
  { value: "INITIAL_STOCK", label: "Stocks initiaux" },
  { value: "SUPPLIERS", label: "Fournisseurs" },
];

// La doc backend precise qu'aucun endpoint de template n'est expose par le
// controleur d'import ("garder les templates CSV cote frontend si
// necessaire") — on genere donc les templates directement dans le
// navigateur, a partir des champs documentes pour chaque creation.
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
  const [error, setError] = useState("");

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Veuillez sélectionner un fichier");

      return inventoryService.importInventory(importType, file);
    },
    onSuccess: (data) => {
      setResult(data);
      setError("");
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Erreur lors de l'import");
      setResult(null);
    },
  });

  const downloadTemplate = () => {
    const csv = buildTemplateCsv(importType);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template_${importType.toLowerCase()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError("");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
      setError("");
    }
  };

  return (
    <div className="p-3 sm:p-4">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-8">
        Import massif
      </h2>

      <div className="bg-white rounded-3xl p-5 sm:p-5 sm:p-8 shadow-sm ring-1 ring-gray-100 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Formulaire d'import - AGRANDI */}
          <div className="space-y-8">
            <div className="mb-8">
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3">
                Type d'import *
              </label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value)}
                className="w-full px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-sm sm:text-base"
              >
                {importTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-8">
              <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3">
                Fichier CSV/Excel
              </label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                  file
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-primary-400"
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-4">
                    <CheckCircle size={40} className="text-green-600" />
                    <div>
                      <p className="font-medium text-sm sm:text-base">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircle size={24} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={64} className="mx-auto text-gray-400 mb-6" />
                    <p className="text-gray-600 mb-3 text-sm sm:text-base">
                      Glissez-déposez votre fichier ici ou
                    </p>
                    <label className="inline-block px-4 py-3 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 cursor-pointer text-sm sm:text-base">
                      Parcourir
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-6">
                      CSV, Excel (max 10MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={downloadTemplate}
                className="flex-1 px-4 py-3 ring-1 ring-gray-100 rounded-2xl text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Download size={20} />
                Télécharger le template
              </button>
              <button
                onClick={() => importMutation.mutate()}
                disabled={!file || importMutation.isPending}
                className="flex-1 justify-center bg-primary-600 text-white px-4 py-3 rounded-2xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {importMutation.isPending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Upload size={20} />
                )}
                Importer
              </button>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700 text-sm sm:text-base">
                <AlertTriangle size={20} />
                {error}
              </div>
            )}
          </div>

          {/* Résultat - AGRANDI */}
          {result && (
            <div className="border-l ring-gray-100 pl-12">
              <h3 className="font-semibold text-gray-900 mb-6 text-xl">
                Résultat de l'import
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between p-4 bg-gray-50 rounded-2xl text-sm sm:text-base">
                  <span>Total lignes</span>
                  <span className="font-medium">{result.totalRows}</span>
                </div>
                <div className="flex justify-between p-4 bg-green-50 rounded-2xl text-sm sm:text-base">
                  <span>Importées avec succès</span>
                  <span className="font-medium text-green-700">
                    {result.successCount}
                  </span>
                </div>
                <div className="flex justify-between p-4 bg-red-50 rounded-2xl text-sm sm:text-base">
                  <span>En erreur</span>
                  <span className="font-medium text-red-700">
                    {result.errorCount}
                  </span>
                </div>

                {result.rows && result.rows.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">
                      Détail des erreurs
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {result.rows.map((row: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-red-50 rounded-2xl text-sm"
                        >
                          <p className="font-mono text-xs">
                            Ligne {row.rowNumber}
                          </p>
                          <p className="text-red-700 text-sm">{row.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
