import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CreditCard, FileText, RefreshCw, Search } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { PayableDocument, RecoveryOverview } from "../../services/payment.service";
import {
  ActionButton,
  EmptyState,
  ErrorBanner,
  Field,
  ListHeader,
  Section,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage, formatDate, formatMoney } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { ChartCard, KpiRow, KpiRowSkeleton, StackBar } from "../../components/operations/OpsCharts";
import { CHART_COLORS } from "../../components/operations/opsChartData";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABEL } from "../../components/payment/paymentLabels";
import { currencyLabel } from "../../components/payment/paymentUtils";

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
    queryFn: () => paymentService.getPayableDocuments({ searchText: submittedSearch || undefined }),
    enabled: !!submittedSearch,
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["payment-recovery", customerType, customerCode, currency],
    queryFn: () => paymentService.getRecovery(customerType, customerCode, { currency }),
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
      // La devise fait partie de la clé : un client avec des documents ouverts en plusieurs devises
      // apparaît en groupes séparés, sinon les montants seraient additionnés à tort.
      const key = `${type}::${code}::${docCurrency}`;
      map.set(key, [...(map.get(key) || []), doc]);
    });
    return Array.from(map.entries()).map(([key, docs]) => {
      const [type, code, docCurrency] = key.split("::");
      const first = docs[0];
      return {
        key,
        customerType: type,
        customerCode: code,
        customerName: first?.customerName || code || "Client non identifié",
        currency: docCurrency,
        documents: docs,
        total: docs.reduce((sum, d) => sum + (d.balanceDue || 0), 0),
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
        state: { intentNumber: intent.intentNumber, message: "Intention de recouvrement créée avec succès." },
      });
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la création de l'intention de recouvrement.")),
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

  const cur = (c?: string) => currencyLabel(c ?? recovery?.currency);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Recouvrement"
        subtitle="Trouvez les documents impayés d'un client, analysez sa dette, puis créez une intention de recouvrement."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Facture, client, membre, document, abonnement"
            className={`${FIELD_SOFT} bg-white pl-10 shadow-sm`}
          />
        </div>
        <ActionButton type="submit" icon={Search} pending={payableQuery.isFetching} disabled={!searchText.trim()}>
          Rechercher
        </ActionButton>
      </form>

      <ErrorBanner message={error} />

      {submittedSearch &&
        (payableQuery.isLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <Section
            title="Résultats"
            description={`${payableDocuments.length} document${payableDocuments.length > 1 ? "s" : ""} payable${payableDocuments.length > 1 ? "s" : ""}`}
            icon={FileText}
          >
            {groupedDocuments.length === 0 ? (
              <EmptyState icon={FileText} title="Aucun document payable" hint="Essayez un autre terme de recherche." />
            ) : (
              <div className="space-y-3">
                {groupedDocuments.map((g) => (
                  <article key={g.key} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip tone="pink">{CUSTOMER_TYPE_LABEL[g.customerType] ?? g.customerType}</StatusChip>
                          <span className="font-mono text-xs text-gray-400">{g.customerCode}</span>
                          <span className="text-xs font-semibold text-gray-400">{currencyLabel(g.currency)}</span>
                        </div>
                        <h4 className="mt-2 truncate text-base font-bold text-gray-950">{g.customerName}</h4>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {g.documents.length} document{g.documents.length > 1 ? "s" : ""} · dû{" "}
                          <b className="text-gray-950">{formatMoney(g.total, currencyLabel(g.currency))}</b>
                        </p>
                      </div>
                      <ActionButton
                        variant="ghost"
                        disabled={!g.customerCode}
                        onClick={() => openRecovery(g.customerType, g.customerCode, g.currency)}
                      >
                        <span className="inline-flex items-center gap-2">
                          Analyser <ArrowRight size={15} />
                        </span>
                      </ActionButton>
                    </div>
                    <ul className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {g.documents.slice(0, 6).map((d) => (
                        <li key={d.documentNumber} className="rounded-2xl bg-gray-50 p-3">
                          <p className="font-mono text-xs font-semibold text-gray-900">{d.documentNumber}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {d.documentType} · {d.status}
                            {d.dueDate ? ` · échéance ${formatDate(d.dueDate)}` : ""}
                          </p>
                          <p className="mt-1.5 text-sm font-bold text-gray-950">{formatMoney(d.balanceDue, currencyLabel(d.currency))}</p>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </Section>
        ))}

      <Section title="Analyse de recouvrement" description="Saisissez directement un type et un code client." icon={RefreshCw}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            refetch();
          }}
          className="grid grid-cols-1 gap-3 md:grid-cols-[11rem_1fr_7rem_auto] md:items-end"
        >
          <Field label="Type">
            <select value={customerType} onChange={(e) => setCustomerType(e.target.value)} className={FIELD}>
              {CUSTOMER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Code client ou membre">
            <input value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} placeholder="MBR-0001" className={`${FIELD} font-mono`} />
          </Field>
          <Field label="Devise">
            <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="XAF" className={`${FIELD} font-mono`} />
          </Field>
          <ActionButton type="submit" icon={RefreshCw} pending={isFetching} disabled={!customerCode}>
            Charger
          </ActionButton>
        </form>
      </Section>

      {customerCode && isLoading && (
        <>
          <KpiRowSkeleton count={3} columns={3} />
          <ListSkeleton rows={3} />
        </>
      )}

      {recovery && (
        <div className="space-y-5">
          <KpiRow
            columns={3}
            items={[
              { label: "Documents ouverts", value: formatMoney(recovery.openDocumentAmount, cur()) },
              { label: "À facturer", value: formatMoney(recovery.pendingBillableAmount, cur()) },
              { label: "Total à recouvrer", value: formatMoney(recovery.totalPayableAmount, cur()), tone: "pink" },
            ]}
          />

          <ChartCard title="Composition de la dette" subtitle="Part des documents déjà émis et des éléments encore à facturer.">
            <StackBar
              data={[
                { key: "docs", label: "Documents ouverts", value: recovery.openDocumentAmount, color: CHART_COLORS[0] },
                { key: "bill", label: "À facturer", value: recovery.pendingBillableAmount, color: CHART_COLORS[1] },
              ]}
            />
          </ChartCard>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Intention existante :{" "}
              <span className="font-mono font-semibold text-gray-900">{recovery.paymentIntent?.intentNumber || "aucune"}</span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {recovery.paymentIntent && (
                <ActionButton
                  variant="ghost"
                  onClick={() => navigate("/payments", { state: { intentNumber: recovery.paymentIntent!.intentNumber } })}
                >
                  Ouvrir l'intention existante
                </ActionButton>
              )}
              <ActionButton
                icon={CreditCard}
                pending={createMutation.isPending}
                disabled={recovery.totalPayableAmount <= 0 || !!recovery.paymentIntent}
                title={
                  recovery.paymentIntent
                    ? "Une intention de recouvrement existe déjà pour ce client : ouvrez-la plutôt que d'en créer une nouvelle."
                    : undefined
                }
                onClick={() => createMutation.mutate()}
              >
                Créer l'intention de recouvrement
              </ActionButton>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Section title="Documents impayés">
              {(recovery.documents || []).length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Aucun document impayé.</p>
              ) : (
                <ul className="space-y-2">
                  {recovery.documents.map((d) => (
                    <li key={d.documentNumber} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-semibold text-gray-900">{d.documentNumber}</p>
                        <p className="truncate text-xs text-gray-500">
                          {d.documentType} · {d.status}
                          {d.dueDate ? ` · ${formatDate(d.dueDate)}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-gray-950">
                        {formatMoney(d.balanceDue, cur(d.currency || recovery.currency))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section title="Éléments en attente de facturation">
              {(recovery.pendingBillableItems || []).length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">Aucun élément en attente.</p>
              ) : (
                <ul className="space-y-2">
                  {recovery.pendingBillableItems.map((it) => (
                    <li key={it.billableNumber} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-semibold text-gray-900">{it.billableNumber}</p>
                        <p className="truncate text-xs text-gray-500">
                          {it.sourceType}
                          {it.sourceCode ? ` · ${it.sourceCode}` : ""} · {it.status}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-gray-950">{formatMoney(it.amount, cur(it.currency))}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
};
