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
import { METHOD_LABEL } from "./paymentLabels";

/** Corps d'un reçu : le même rendu sert à la modale et à la page « Reçus ». */
export const ReceiptView: React.FC<{ receipt: PaymentReceipt }> = ({ receipt }) => (
  <div>
    <div className="rounded-2xl bg-gray-50 p-5 text-center">
      <p className="text-xs font-semibold text-gray-400">Montant payé</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-gray-950">{formatMoney(receipt.paidAmount)}</p>
      <p className="mt-1 text-sm text-gray-500">
        {METHOD_LABEL[receipt.paymentMethod] ?? receipt.paymentMethod}
        {receipt.paidAt ? ` · ${formatDateTime(receipt.paidAt)}` : ""}
      </p>
    </div>

    <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <Detail label="Client">{receipt.customerName}</Detail>
      <Detail label="Reçu par">{receipt.receivedBy}</Detail>
      <Detail label="Transaction" mono>{receipt.transactionNumber}</Detail>
      <Detail label="Intention" mono>{receipt.intentNumber}</Detail>
      <Detail label="Fournisseur">{receipt.provider}</Detail>
      <Detail label="Référence fournisseur" mono>{receipt.providerReference}</Detail>
    </dl>

    <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-400">Affecté aux factures</p>
        <p className="mt-1 text-base font-bold text-gray-950">{formatMoney(receipt.allocatedAmount)}</p>
      </div>
      <div className="rounded-2xl bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-400">Avance conservée</p>
        <p className="mt-1 text-base font-bold text-gray-950">{formatMoney(receipt.advanceAmount)}</p>
      </div>
    </div>

    {receipt.allocations && receipt.allocations.length > 0 && (
      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-gray-400">Affectations</p>
        <ul className="space-y-2">
          {(receipt.allocations as Array<Record<string, unknown>>).map((a, i) => (
            <li key={i} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm">
              <span className="min-w-0 truncate font-semibold text-gray-800">
                {String(a.documentNumber || a.sourceCode || `Affectation ${i + 1}`)}
              </span>
              <span className="shrink-0 font-bold tabular-nums text-gray-950">
                {formatMoney(Number(a.amount ?? a.allocatedAmount ?? 0))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

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
