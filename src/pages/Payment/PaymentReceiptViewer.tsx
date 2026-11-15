import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Receipt, Search } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { PaymentReceipt } from "../../services/payment.service";
import { ActionButton, EmptyState, ErrorBlock, ListHeader, Section } from "../../components/subscription/kit";
import { FIELD_SOFT } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { PillChoice } from "../../components/operations/opsKit";
import { ReceiptView } from "../../components/payment/ReceiptModal";
import { saveBlob } from "../../components/payment/paymentUtils";

type Mode = "transaction" | "receipt";

export const PaymentReceiptViewer: React.FC = () => {
  const [mode, setMode] = useState<Mode>("transaction");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payment-receipt-viewer", mode, submitted],
    queryFn: () =>
      mode === "transaction" ? paymentService.getReceipt(submitted) : paymentService.getReceiptByNumber(submitted),
    enabled: !!submitted,
  });
  const receipt = data as PaymentReceipt | undefined;

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSubmitted(query.trim());
  };

  const downloadPdf = async () => {
    if (!submitted) return;
    setDownloading(true);
    try {
      const blob =
        mode === "transaction"
          ? await paymentService.getReceiptPdf(submitted)
          : await paymentService.getReceiptPdfByNumber(submitted);
      saveBlob(blob, `${mode === "transaction" ? "recu_transaction" : "recu"}_${submitted}.pdf`);
    } catch {
      toast.error("Téléchargement impossible");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <ListHeader title="Reçus" subtitle="Retrouvez un reçu par numéro de transaction ou par numéro de reçu." />

      <form onSubmit={search} className="space-y-3">
        <PillChoice
          label="Rechercher par"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setSubmitted("");
          }}
          options={[
            { value: "transaction", label: "N° de transaction" },
            { value: "receipt", label: "N° de reçu" },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "transaction" ? "TXN-2026-00001" : "RCP-00001"}
              className={`${FIELD_SOFT} bg-white pl-10 font-mono shadow-sm`}
            />
          </div>
          <ActionButton type="submit" icon={Search} disabled={!query.trim()}>
            Rechercher
          </ActionButton>
        </div>
      </form>

      {!submitted ? (
        <EmptyState icon={Receipt} title="Aucun reçu affiché" hint="Saisissez un numéro pour afficher le reçu." />
      ) : isLoading ? (
        <DetailsSkeleton />
      ) : isError || !receipt ? (
        <ErrorBlock message="Reçu introuvable ou erreur de chargement." onRetry={() => refetch()} />
      ) : (
        <Section
          title={`Reçu ${receipt.receiptNumber}`}
          description={`Transaction ${receipt.transactionNumber}`}
          icon={Receipt}
          action={
            <ActionButton variant="ghost" icon={Download} pending={downloading} onClick={downloadPdf}>
              PDF
            </ActionButton>
          }
        >
          <ReceiptView receipt={receipt} />
        </Section>
      )}
    </div>
  );
};
