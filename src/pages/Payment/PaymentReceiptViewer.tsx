import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Receipt, Search } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { PaymentReceipt } from "../../services/payment.service";

const formatAmount = (amount?: number) =>
  `${(amount ?? 0).toLocaleString("fr-FR")} FCFA`;
const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString("fr-FR") : "—";

export const PaymentReceiptViewer: React.FC = () => {
  const [mode, setMode] = useState<"transaction" | "receipt">("transaction");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-receipt-viewer", mode, submitted],
    queryFn: () =>
      mode === "transaction"
        ? paymentService.getReceipt(submitted)
        : paymentService.getReceiptByNumber(submitted),
    enabled: !!submitted,
  });
  const receipt = data as PaymentReceipt | undefined;

  const search = () => {
    if (query.trim()) setSubmitted(query.trim());
  };

  const downloadPdf = async () => {
    if (!submitted) return;
    const blob =
      mode === "transaction"
        ? await paymentService.getReceiptPdf(submitted)
        : await paymentService.getReceiptPdfByNumber(submitted);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mode === "transaction" ? "recu_transaction" : "recu"}_${submitted}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Visualisation de reçu
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Recherchez un reçu par numéro de transaction ou par numéro de reçu.
        </p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-4 flex flex-col md:flex-row gap-3">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
        >
          <option value="transaction">Transaction</option>
          <option value="receipt">Reçu</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
          placeholder={mode === "transaction" ? "N° transaction" : "N° reçu"}
          className="flex-1 px-3 py-2 border rounded-lg font-mono"
        />
        <button
          onClick={search}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2 justify-center"
        >
          <Search size={16} /> Rechercher
        </button>
      </div>
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto" />
        </div>
      )}
      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          Reçu introuvable ou erreur de chargement.
        </div>
      )}
      {receipt && (
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
          <div className="p-5 border-b flex justify-between items-start">
            <div className="flex gap-3 items-center">
              <Receipt className="text-primary-600" />
              <div>
                <h3 className="font-bold text-lg">
                  Reçu {receipt.receiptNumber}
                </h3>
                <p className="text-sm text-gray-500">
                  Transaction {receipt.transactionNumber}
                </p>
              </div>
            </div>
            <button
              onClick={downloadPdf}
              className="px-3 py-2 border border-gray-200 rounded-xl flex items-center gap-2 text-sm"
            >
              <Download size={15} /> PDF
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Info label="Client" value={receipt.customerName || "—"} />
            <Info label="Méthode" value={receipt.paymentMethod} />
            <Info label="Payé le" value={formatDate(receipt.paidAt)} />
            <Info
              label="Montant payé"
              value={formatAmount(receipt.paidAmount)}
              strong
            />
            <Info
              label="Montant alloué"
              value={formatAmount(receipt.allocatedAmount)}
            />
            <Info label="Avance" value={formatAmount(receipt.advanceAmount)} />
            <Info label="Reçu par" value={receipt.receivedBy || "—"} />
            <Info label="Provider" value={receipt.provider || "—"} />
            <Info
              label="Référence provider"
              value={receipt.providerReference || "—"}
            />
          </div>
          {receipt.allocations && receipt.allocations.length > 0 && (
            <div className="p-5 border-t">
              <h4 className="font-semibold mb-3">Allocations</h4>
              <div className="divide-y border rounded-lg">
                {receipt.allocations.map((a: any, idx: number) => (
                  <div key={idx} className="p-3 flex justify-between text-sm">
                    <span>
                      {a.documentNumber ||
                        a.sourceCode ||
                        `Allocation ${idx + 1}`}
                    </span>
                    <span className="font-semibold">
                      {formatAmount(a.amount || a.allocatedAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Info: React.FC<{ label: string; value: string; strong?: boolean }> = ({
  label,
  value,
  strong,
}) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`${strong ? "text-lg" : "text-sm"} font-semibold mt-1`}>
      {value}
    </p>
  </div>
);
