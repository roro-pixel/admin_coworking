import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Receipt, X } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { PaymentReceipt } from "../../services/payment.service";
import { ModalPortal } from "../ui/ModalPortal";
import { brandVars } from "../layout/adminTheme";
import { ActionButton, Detail, ErrorBlock, IconButton } from "../subscription/kit";
import { formatDateTime, formatMoney } from "../subscription/kitUtils";
import { Skeleton } from "../ui/Skeleton";
import { statusOf } from "../subscription/labels";
import { PURPOSE_LABEL, TXN_STATUS, humanize, methodText } from "./paymentLabels";
import { currencyLabel } from "./paymentUtils";

/** Corps d'un reçu : le même rendu sert à la modale et à la page « Reçus ». */
export const ReceiptView: React.FC<{ receipt: PaymentReceipt }> = ({ receipt }) => {
  const cur = currencyLabel(receipt.currency);
  const money = (n?: number | null) => formatMoney(n, cur);
  const method = methodText(receipt.paymentMethod, receipt.paymentMethodLabel);
  const cash = receipt.paymentMethod === "CASH";
  const refLabel =
    receipt.paymentMethod === "CHEQUE"
      ? "Chèque n°"
      : receipt.paymentMethod === "BANK_TRANSFER"
        ? "Réf. virement"
        : receipt.paymentMethod === "MOBILE_MONEY_OFFLINE"
          ? "Réf. opérateur"
          : "Référence";
  return (
    <div>
      <div className="rounded-2xl bg-gray-50 p-5 text-center">
        <p className="text-xs font-semibold text-gray-400">Montant payé</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-gray-950">{money(receipt.paidAmount)}</p>
        <p className="mt-1 text-sm text-gray-500">
          {method}
          {receipt.paidAt ? ` · ${formatDateTime(receipt.paidAt)}` : ""}
        </p>
        {receipt.transactionStatus && receipt.transactionStatus !== "SUCCEEDED" && (
          <p className="mt-2 text-xs font-semibold text-amber-700">
            Transaction {statusOf(TXN_STATUS, receipt.transactionStatus).label.toLowerCase()}
          </p>
        )}
      </div>

      {cash && receipt.tenderedAmount != null && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-400">Montant remis</p>
            <p className="mt-1 text-base font-bold tabular-nums text-gray-950">{money(receipt.tenderedAmount)}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-400">Monnaie rendue</p>
            <p className="mt-1 text-base font-bold tabular-nums text-gray-950">{money(receipt.changeAmount ?? 0)}</p>
          </div>
        </div>
      )}

      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Detail label="Client">{receipt.customerName}</Detail>
        <Detail label="Reçu par">{receipt.receivedBy}</Detail>
        <Detail label="Transaction" mono>{receipt.transactionNumber}</Detail>
        <Detail label="Intention" mono>{receipt.intentNumber}</Detail>
        <Detail label="Objet">{receipt.purpose ? PURPOSE_LABEL[receipt.purpose] ?? humanize(receipt.purpose) : undefined}</Detail>
        <Detail label="Fournisseur">{receipt.provider}</Detail>
        <Detail label={refLabel} mono>{receipt.providerReference}</Detail>
        <Detail label="Réf. opérateur" mono>{receipt.operatorReference}</Detail>
        <Detail label="Banque">{receipt.bankName}</Detail>
        <Detail label="Payeur">{receipt.payerName}</Detail>
        <Detail label="Téléphone du payeur" mono>{receipt.payerPhone}</Detail>
        <Detail label="Dépôt mobile money" mono>{receipt.depositId}</Detail>
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-400">Affecté aux factures</p>
          <p className="mt-1 text-base font-bold text-gray-950">{money(receipt.allocatedAmount)}</p>
        </div>
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-400">Avance conservée</p>
          <p className="mt-1 text-base font-bold text-gray-950">{money(receipt.advanceAmount)}</p>
        </div>
      </div>

      {receipt.allocations && receipt.allocations.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-gray-400">Affectations</p>
          <ul className="space-y-2">
            {receipt.allocations.map((a, i) => (
              <li key={`${a.documentNumber}-${i}`} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-gray-800">{a.documentNumber || `Affectation ${i + 1}`}</span>
                  {(a.title || a.remainingBalanceDue != null) && (
                    <span className="block truncate text-xs text-gray-400">
                      {a.title}
                      {a.title && a.remainingBalanceDue != null ? " · " : ""}
                      {a.remainingBalanceDue != null ? `reste dû ${money(a.remainingBalanceDue)}` : ""}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-gray-950">{money(a.allocatedAmount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * Reçu d'une transaction en modale (ouverture après un paiement, ou depuis une transaction).
 * Le chargement passe par useQuery : plus de état local à gérer côté appelant.
 */
export const ReceiptModal: React.FC<{
  transactionNumber: string | null;
  onClose: () => void;
  onDownload: (transactionNumber: string) => void;
  downloading?: boolean;
}> = ({ transactionNumber, onClose, onDownload, downloading = false }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payment-receipt", transactionNumber],
    queryFn: () => paymentService.getReceipt(transactionNumber!),
    enabled: !!transactionNumber,
  });

  if (!transactionNumber) return null;

  return (
    <ModalPortal onClose={onClose} size="lg">
      <div style={brandVars} className="rounded-[1.75rem] bg-white">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] text-[color:var(--logo-pink-dark)]">
              <Receipt size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-gray-950">{data ? `Reçu ${data.receiptNumber}` : "Reçu de paiement"}</h3>
              <p className="truncate font-mono text-xs text-gray-400">{transactionNumber}</p>
            </div>
          </div>
          <IconButton icon={X} label="Fermer" onClick={onClose} />
        </div>
        <div className="p-5 pt-2">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ) : isError || !data ? (
            <ErrorBlock message="Reçu introuvable." onRetry={() => refetch()} />
          ) : (
            <>
              <ReceiptView receipt={data} />
              <div className="mt-6 flex justify-end">
                <ActionButton icon={Download} pending={downloading} onClick={() => onDownload(transactionNumber)}>
                  Télécharger le PDF
                </ActionButton>
              </div>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
