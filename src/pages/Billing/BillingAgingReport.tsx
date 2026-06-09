import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Loader2 } from "lucide-react";
import { billingService } from "../../services/billing.service";

const bucketLabels: Record<string, string> = {
  CURRENT: "Non échue",
  DAYS_1_TO_30: "1 à 30 jours",
  DAYS_31_TO_60: "31 à 60 jours",
  DAYS_61_TO_90: "61 à 90 jours",
  DAYS_OVER_90: "Plus de 90 jours",
};

export const BillingAgingReport: React.FC = () => {
  const [customerType, setCustomerType] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [currency, setCurrency] = useState("XAF");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["billing-aging-report", customerType, customerCode, currency],
    queryFn: () =>
      billingService.getAgingReport({
        customerType: customerType || undefined,
        customerCode: customerCode || undefined,
        currency: currency || undefined,
      }),
  });

  const formatAmount = (amount: number) =>
    `${amount.toLocaleString("fr-FR")} ${data?.currency ?? currency}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Ancienneté des créances
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Suivi des soldes dus par tranche de retard.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-4 gap-3">
        <select
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Tous les types</option>
          <option value="MEMBER">Membre</option>
          <option value="CUSTOMER">Customer</option>
          <option value="BUSINESS_ENTITY">Business entity</option>
        </select>
        <input
          value={customerCode}
          onChange={(e) => setCustomerCode(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          placeholder="Code client"
        />
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          placeholder="XAF"
        />
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 flex items-center justify-center gap-2"
        >
          <BarChart3 size={15} /> Actualiser
        </button>
      </div>

      {isLoading && (
        <div className="py-12 flex justify-center">
          <Loader2 className="animate-spin text-primary-600" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard
              label="Non échue"
              count={data.summary.current.count}
              total={formatAmount(data.summary.current.totalDue)}
            />
            <SummaryCard
              label="1 à 30 jours"
              count={data.summary.days1To30.count}
              total={formatAmount(data.summary.days1To30.totalDue)}
            />
            <SummaryCard
              label="31 à 60 jours"
              count={data.summary.days31To60.count}
              total={formatAmount(data.summary.days31To60.totalDue)}
            />
            <SummaryCard
              label="61 à 90 jours"
              count={data.summary.days61To90.count}
              total={formatAmount(data.summary.days61To90.totalDue)}
            />
            <SummaryCard
              label="Plus de 90 jours"
              count={data.summary.daysOver90.count}
              total={formatAmount(data.summary.daysOver90.totalDue)}
            />
            <SummaryCard
              label="Total général"
              count={data.summary.grandTotal.count}
              total={formatAmount(data.summary.grandTotal.totalDue)}
              strong
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-semibold">
                    Document
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">
                    Client
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">
                    Échéance
                  </th>
                  <th className="px-5 py-3 text-right text-sm font-semibold">
                    Solde dû
                  </th>
                  <th className="px-5 py-3 text-left text-sm font-semibold">
                    Tranche
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.documents.map((doc) => (
                  <tr key={doc.documentNumber} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-sm font-mono">
                      {doc.documentNumber}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <p className="font-medium">{doc.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {doc.customerType} · {doc.customerCode}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {doc.dueDate
                        ? new Date(doc.dueDate).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-red-600">
                      {formatAmount(doc.balanceDue)}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      {bucketLabels[doc.agingBucket] ?? doc.agingBucket}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  count: number;
  total: string;
  strong?: boolean;
}> = ({ label, count, total, strong }) => (
  <div
    className={`bg-white border rounded-xl p-4 ${strong ? "border-primary-200 bg-primary-50" : "border-gray-200"}`}
  >
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
    <p className="text-xs text-gray-500 mt-1">
      {count} document{count > 1 ? "s" : ""}
    </p>
  </div>
);
