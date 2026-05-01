import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, Download, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { inventoryService } from '../../../services/inventory.service';

const importTypes = [
  { value: 'items', label: 'Articles', endpoint: 'items', template: 'items' },
  { value: 'assets', label: 'Actifs', endpoint: 'assets', template: 'assets' },
  { value: 'stock', label: 'Stocks initiaux', endpoint: 'stock', template: 'stock' },
];

export const ImportPage: React.FC = () => {
  const [importType, setImportType] = useState('items');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Veuillez sélectionner un fichier');
      
      const formData = new FormData();
      formData.append('file', file);
      
      let response;
      switch (importType) {
        case 'items':
          response = await inventoryService.importItems(formData);
          break;
        case 'assets':
          response = await inventoryService.importAssets(formData);
          break;
        case 'stock':
          response = await inventoryService.importStock(formData);
          break;
        default:
          throw new Error('Type d\'import invalide');
      }
      return response;
    },
    onSuccess: (data) => {
      setResult(data);
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Erreur lors de l\'import');
      setResult(null);
    },
  });

  const downloadTemplate = async () => {
    try {
      const blob = await inventoryService.downloadTemplate(importType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${importType}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors du téléchargement du template.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setError('');
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
      setError('');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Import massif</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Formulaire d'import */}
          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Type d'import *</label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                {importTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Fichier CSV/Excel</label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-primary-400'
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle size={32} className="text-green-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600 mb-2">Glissez-déposez votre fichier ici ou</p>
                    <label className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer">
                      Parcourir
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-4">CSV, Excel (max 10MB)</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={downloadTemplate}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Télécharger le template
              </button>
              <button
                onClick={() => importMutation.mutate()}
                disabled={!file || importMutation.isPending}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Importer
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
          </div>

          {/* Résultat */}
          {result && (
            <div className="border-l border-gray-200 pl-8">
              <h3 className="font-semibold text-gray-900 mb-4">Résultat de l'import</h3>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Total lignes</span>
                  <span className="font-medium">{result.totalRows}</span>
                </div>
                <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                  <span>Importées avec succès</span>
                  <span className="font-medium text-green-700">{result.successCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                  <span>En erreur</span>
                  <span className="font-medium text-red-700">{result.errorCount}</span>
                </div>
                
                {result.rows && result.rows.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Détail des erreurs</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {result.rows.map((row: any, idx: number) => (
                        <div key={idx} className="p-2 bg-red-50 rounded-lg text-sm">
                          <p className="font-mono text-xs">Ligne {row.rowNumber}</p>
                          <p className="text-red-700">{row.message}</p>
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