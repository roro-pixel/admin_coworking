import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type {
  PayableDocument,
  RecoveryOverview,
} from "../../services/payment.service";

const customerTypeLabels: Record<string, string> = {
  MEMBER: "Membre",
  CUSTOMER: "Client",
  BUSINESS_ENTITY: "Entreprise",
};

const formatAmount = (amount?: number | null, currency = "XAF") =>
  `${(amount ?? 0).toLocaleString("fr-FR")} ${currency}`;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("fr-FR") : "-";

export const PaymentRecoveryPanel: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [customerType, setCustomerType] = useState("MEMBER");
  const [customerCode, setCustomerCode] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [error, setError] = useState<string | null>(null);

  const payableQuery = useQuery({
    queryKey: ["recovery-payable-documents", submittedSearch],
    queryFn: () =>
      paymentService.getPayableDocuments({
        searchText: submittedSearch || undefined,
      }),
    enabled: !!submittedSearch,
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["payment-recovery", customerType, customerCode, currency],
    queryFn: () =>
      paymentService.getRecovery(customerType, customerCode, { currency }),
    enabled: !!customerCode,
  });

  const recovery = data as RecoveryOverview | undefined;
  const payableDocuments = payableQuery.data ?? [];

  const groupedDocuments = useMemo(() => {
    const map = new Map<string, PayableDocument[]>();

    payableDocuments.forEach((doc) => {
      const type = doc.customerType || "CUSTOMER";
      const code = doc.customerCode || "";
      const docCurrency = doc.currency || currency;
      // La devise fait partie de la clé : un client avec des documents
      // ouverts dans plusieurs devises doit apparaître en groupes séparés,
      // sinon les montants seraient additionnés à tort entre devises.
      const key = `${type}::${code}::${docCurrency}`;
      map.set(key, [...(map.get(key) || []), doc]);
    });

    return Array.from(map.entries()).map(([key, docs]) => {
      const [type, code, docCurrency] = key.split("::");
      const first = docs[0];
      const total = docs.reduce((sum, doc) => sum + (doc.balanceDue || 0), 0);

      return {
        key,
        customerType: type,
        customerCode: code,
        customerName: first?.customerName || code || "Client non identifié",
        currency: docCurrency,
        documents: docs,
        total,
      };
    });
  }, [payableDocuments, currency]);

  const createMutation = useMutation({
    mutationFn: () =>
      paymentService.createRecoveryIntent({
        customerType,
        customerCode,
        currency,
        expiresAt: undefined,
        metadataJson: undefined,
      }),
    onSuccess: (intent) => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      refetch();

      navigate("/payments", {
        state: {
          intentNumber: intent.intentNumber,
          message: "Intention de recouvrement créée avec succès.",
        },
      });
    },
    onError: (e: any) =>
      setError(
        e?.response?.data?.message ||
          "Erreur lors de la création de l’intention de recouvrement.",
      ),
  });

  const submitSearch = () => {
    setSubmittedSearch(searchText.trim());
    setError(null);
  };

  const openRecovery = (type: string, code: string, docCurrency?: string) => {
    setCustomerType(type || "CUSTOMER");
    setCustomerCode(code || "");
    setCurrency(docCurrency || "XAF");
    setError(null);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Recouvrement client
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Recherchez des documents impayés, sélectionnez un client, puis créez
            une intention de recouvrement.
          </p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
          <span className="font-semibold text-gray-900">
            {payableDocuments.length}
          </span>{" "}
          document(s) trouvé(s)
        </div>
      </div>

      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitSearch();
              }}
              placeholder="Rechercher facture, client, membre, document, abonnement..."
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-50"
            />
          </div>

          <button
            type="button"
            onClick={submitSearch}
            disabled={!searchText.trim() || payableQuery.isFetching}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {payableQuery.isFetching ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Search size={17} />
            )}
            Rechercher
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {payableQuery.isLoading && (
        <div className="rounded-[1.5rem] bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
          <Loader2 className="mx-auto animate-spin text-primary-500" />
          <p className="mt-3 text-sm text-gray-500">Recherche en cours...</p>
        </div>
      )}

      {submittedSearch && !payableQuery.isLoading && (
        <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                Résultats de recherche
              </h3>
              <p className="text-sm text-gray-500">
                Documents payables retournés par la méthode de recherche.
              </p>
            </div>
          </div>

          {groupedDocuments.length === 0 ? (
            <EmptyState text="Aucun document payable trouvé pour cette recherche." />
          ) : (
            <div className="grid gap-3">
              {groupedDocuments.map((group) => (
                <article
                  key={group.key}
                  className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                          {customerTypeLabels[group.customerType] ||
                            group.customerType}
                        </span>
                        <span className="font-mono text-xs text-gray-400">
                          {group.customerCode || "-"}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          {group.currency}
                        </span>
                      </div>
                      <h4 className="mt-2 truncate text-base font-semibold text-gray-900">
                        {group.customerName}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {group.documents.length} document(s) · Total dû :{" "}
                        <span className="font-semibold text-gray-900">
                          {formatAmount(group.total, group.currency)}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openRecovery(
                          group.customerType,
                          group.customerCode,
                          group.currency,
                        )
                      }
                      disabled={!group.customerCode}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                    >
                      Analyser
                      <ArrowRight size={16} />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {group.documents.slice(0, 6).map((doc) => (
                      <div
                        key={doc.documentNumber}
                        className="rounded-2xl bg-white p-3 ring-1 ring-gray-100"
                      >
                        <p className="font-mono text-xs font-semibold text-gray-900">
                          {doc.documentNumber}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {doc.documentType} · {doc.status} · Échéance :{" "}
                          {formatDate(doc.dueDate)}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-orange-700">
                          {formatAmount(doc.balanceDue, doc.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              Analyse de recouvrement
            </h3>
            <p className="text-sm text-gray-500">
              Vous pouvez aussi saisir directement un type et un code client.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_100px_auto] lg:w-[720px]">
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              className="h-11 rounded-2xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
            >
              <option value="MEMBER">Membre</option>
              <option value="CUSTOMER">Client</option>
              <option value="BUSINESS_ENTITY">Entreprise</option>
            </select>
            <input
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              placeholder="Code client / membre"
              className="h-11 rounded-2xl border border-gray-200 px-3 text-sm font-mono outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
            />
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="XAF"
              className="h-11 rounded-2xl border border-gray-200 px-3 text-sm font-mono outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
            />
            <button
              type="button"
              onClick={() => refetch()}
              disabled={!customerCode || isFetching}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {isFetching ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Charger
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="py-8 text-center text-sm text-gray-500">
            <Loader2 className="mx-auto mb-2 animate-spin" />
            Chargement du recouvrement...
          </div>
        )}

        {recovery && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Metric
                icon={FileText}
                label="Documents ouverts"
                value={formatAmount(
                  recovery.openDocumentAmount,
                  recovery.currency,
                )}
              />
              <Metric
                icon={WalletCards}
                label="À facturer"
                value={formatAmount(
                  recovery.pendingBillableAmount,
                  recovery.currency,
                )}
              />
              <Metric
                icon={CreditCard}
                label="Total à recouvrer"
                value={formatAmount(
                  recovery.totalPayableAmount,
                  recovery.currency,
                )}
                strong
              />
              <Metric
                icon={RefreshCw}
                label="Intention"
                value={recovery.paymentIntent?.intentNumber || "Aucune"}
                mono
              />
            </div>

            <div className="flex justify-end gap-3">
              {recovery.paymentIntent && (
                <button
                  type="button"
                  onClick={() =>
                    navigate("/payments", {
                      state: {
                        intentNumber: recovery.paymentIntent!.intentNumber,
                      },
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <RefreshCw size={16} />
                  Ouvrir l’intention existante
                </button>
              )}
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={
                  createMutation.isPending ||
                  recovery.totalPayableAmount <= 0 ||
                  !!recovery.paymentIntent
                }
                title={
                  recovery.paymentIntent
                    ? "Une intention de recouvrement existe déjà pour ce client - ouvrez-la plutôt que d’en créer une nouvelle."
                    : undefined
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CreditCard size={16} />
                )}
                Créer l’intention de recouvrement
              </button>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <RecoveryList
                title="Documents impayés"
                empty="Aucun document impayé."
                items={(recovery.documents || []).map((doc) => ({
                  key: doc.documentNumber,
                  title: doc.documentNumber,
                  meta: `${doc.documentType} · ${doc.status} · ${formatDate(
                    doc.dueDate,
                  )}`,
                  amount: formatAmount(
                    doc.balanceDue,
                    doc.currency || recovery.currency,
                  ),
                }))}
              />
              <RecoveryList
                title="Éléments facturables en attente"
                empty="Aucun élément facturable en attente."
                items={(recovery.pendingBillableItems || []).map((item) => ({
                  key: item.billableNumber,
                  title: item.billableNumber,
                  meta: `${item.sourceType} · ${item.sourceCode || "-"} · ${
                    item.status
                  }`,
                  amount: formatAmount(item.amount, item.currency),
                }))}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

const Metric: React.FC<{
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
  icon: React.ElementType;
}> = ({ label, value, strong, mono, icon: Icon }) => (
  <div
    className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 ${
      strong ? "border border-orange-200" : ""
    }`}
  >
    <div className="mb-3 inline-flex rounded-2xl bg-gray-50 p-2 text-primary-600">
      <Icon size={18} />
    </div>
    <p className="text-xs font-medium text-gray-500">{label}</p>
    <p
      className={`mt-1 break-words font-semibold text-gray-900 ${
        strong ? "text-xl" : "text-base"
      } ${mono ? "font-mono text-sm" : ""}`}
    >
      {value}
    </p>
  </div>
);

const RecoveryList: React.FC<{
  title: string;
  empty: string;
  items: { key: string; title: string; meta: string; amount: string }[];
}> = ({ title, empty, items }) => (
  <div className="rounded-2xl bg-gray-50 p-4">
    <h4 className="font-semibold text-gray-900">{title}</h4>
    <div className="mt-3 space-y-2">
      {items.length === 0 ? (
        <p className="rounded-2xl bg-white py-8 text-center text-sm text-gray-500">
          {empty}
        </p>
      ) : (
        items.map((item) => (
          <div
            key={item.key}
            className="flex items-start justify-between gap-4 rounded-2xl bg-white p-3 ring-1 ring-gray-100"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-semibold text-gray-900">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-gray-500">{item.meta}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-gray-900">
              {item.amount}
            </p>
          </div>
        ))
      )}
    </div>
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-2xl bg-gray-50 py-10 text-center text-sm text-gray-500">
    {text}
  </div>
);
