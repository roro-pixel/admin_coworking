import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, CreditCard } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import type { RecoveryOverview } from "../../services/payment.service";

const formatAmount = (amount?: number, currency = "XAF") =>
  `${(amount ?? 0).toLocaleString("fr-FR")} ${currency}`;

export const PaymentRecoveryPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [customerType, setCustomerType] = useState("MEMBER");
  const [customerCode, setCustomerCode] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<MemberSummaryResponse | null>(null);
  const [currency, setCurrency] = useState("XAF");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["payment-recovery", customerType, customerCode, currency],
    queryFn: () =>
      paymentService.getRecovery(customerType, customerCode, { currency }),
    enabled: !!customerCode,
  });
  const recovery = data as RecoveryOverview | undefined;

  const createMutation = useMutation({
    mutationFn: () =>
      paymentService.createRecoveryIntent({
        customerType,
        customerCode,
        currency,
        idempotencyKey: `recovery-${customerType}-${customerCode}-${Date.now()}`,
      } as any),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      refetch();
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          "Erreur lors de la création de l’intention de recouvrement.",
      ),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Recouvrement client
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Analyse les documents impayés et les éléments facturables, puis crée
          une intention de recouvrement.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <select
          value={customerType}
          onChange={(e) => {
            setCustomerType(e.target.value);
            setCustomerCode("");
            setSelectedCustomer(null);
            setSelectedMember(null);
          }}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="MEMBER">Membre</option>
          <option value="CUSTOMER">Client</option>
          <option value="BUSINESS_ENTITY">Business entity</option>
        </select>
        <div className="md:col-span-2">
          {customerType === "MEMBER" ? (
            <MemberAutocomplete
              selectedMember={selectedMember}
              onSelect={(member) => {
                setSelectedMember(member);
                setSelectedCustomer(null);
                setCustomerCode(member?.memberId || "");
              }}
              placeholder="Rechercher un membre..."
            />
          ) : (
            <CustomerAutocomplete
              selectedCustomer={selectedCustomer}
              typeFilter={
                customerType === "BUSINESS_ENTITY" ? "COMPANY" : undefined
              }
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                setSelectedMember(null);
                setCustomerCode(customer?.customerId || "");
              }}
              placeholder={
                customerType === "BUSINESS_ENTITY"
                  ? "Rechercher une entreprise..."
                  : "Rechercher un client..."
              }
            />
          )}
        </div>
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="XAF"
          className="px-3 py-2 border rounded-lg"
        />
        <button
          onClick={() => refetch()}
          disabled={!customerCode || isFetching}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isFetching ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}{" "}
          Rechercher
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto" />
        </div>
      )}

      {recovery && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Metric
              label="Documents ouverts"
              value={formatAmount(
                recovery.openDocumentAmount,
                recovery.currency,
              )}
            />
            <Metric
              label="Éléments à facturer"
              value={formatAmount(
                recovery.pendingBillableAmount,
                recovery.currency,
              )}
            />
            <Metric
              label="Total à recouvrer"
              value={formatAmount(
                recovery.totalPayableAmount,
                recovery.currency,
              )}
              strong
            />
            <Metric
              label="Intention existante"
              value={recovery.paymentIntent?.intentNumber || "Aucune"}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Documents impayés</h3>
              <button
                onClick={() => createMutation.mutate()}
                disabled={
                  createMutation.isPending || recovery.totalPayableAmount <= 0
                }
                className="px-4 py-2 bg-orange-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                {createMutation.isPending ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CreditCard size={15} />
                )}{" "}
                Créer intention de recouvrement
              </button>
            </div>
            <div className="divide-y">
              {recovery.documents?.map((doc) => (
                <div
                  key={doc.documentNumber}
                  className="py-3 flex justify-between gap-4"
                >
                  <div>
                    <p className="font-mono text-sm">{doc.documentNumber}</p>
                    <p className="text-xs text-gray-500">
                      {doc.documentType} · {doc.status}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatAmount(
                      doc.balanceDue,
                      doc.currency || recovery.currency,
                    )}
                  </p>
                </div>
              ))}
              {(!recovery.documents || recovery.documents.length === 0) && (
                <p className="text-sm text-gray-500 py-6 text-center">
                  Aucun document impayé.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold mb-4">
              Éléments facturables en attente
            </h3>
            <div className="divide-y">
              {recovery.pendingBillableItems?.map((item) => (
                <div
                  key={item.billableNumber}
                  className="py-3 flex justify-between gap-4"
                >
                  <div>
                    <p className="font-mono text-sm">{item.billableNumber}</p>
                    <p className="text-xs text-gray-500">
                      {item.sourceType} · {item.sourceCode || "—"} ·{" "}
                      {item.status}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatAmount(item.amount, item.currency)}
                  </p>
                </div>
              ))}
              {(!recovery.pendingBillableItems ||
                recovery.pendingBillableItems.length === 0) && (
                <p className="text-sm text-gray-500 py-6 text-center">
                  Aucun élément facturable en attente.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; strong?: boolean }> = ({
  label,
  value,
  strong,
}) => (
  <div
    className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 ${strong ? "border border-orange-200" : ""}`}
  >
    <p className="text-xs text-gray-500">{label}</p>
    <p
      className={`mt-1 ${strong ? "text-xl" : "text-lg"} font-semibold text-gray-900`}
    >
      {value}
    </p>
  </div>
);
