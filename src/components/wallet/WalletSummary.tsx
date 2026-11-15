import React from "react";
import { ArrowRight } from "lucide-react";
import type { Wallet } from "../../services/wallet.service";
import { ActionButton, StatusChip } from "../subscription/kit";
import { formatMoney } from "../subscription/kitUtils";
import { currencyLabel } from "../payment/paymentUtils";
import { OWNER_TYPE_LABEL, WALLET_STATUS_LABEL, WALLET_STATUS_TONE } from "./walletLabels";

/** Résumé d'un portefeuille (résultat de recherche, aperçu de top-up). */
export const WalletSummary: React.FC<{ wallet: Wallet; onOpen: () => void }> = ({ wallet, onOpen }) => {
  const cur = currencyLabel(wallet.currency);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-[color:var(--logo-pink-dark)]">{wallet.walletNumber}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {OWNER_TYPE_LABEL[wallet.ownerType] ?? wallet.ownerType} · {wallet.ownerCode}
          </p>
        </div>
        <StatusChip tone={WALLET_STATUS_TONE[wallet.status] ?? "neutral"}>{WALLET_STATUS_LABEL[wallet.status] ?? wallet.status}</StatusChip>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400">Disponible</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">{formatMoney(wallet.availableBalance, cur)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400">Bloqué</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[color:var(--logo-pink-dark)]">{formatMoney(wallet.heldBalance, cur)}</p>
        </div>
      </div>
      <div className="mt-4">
        <ActionButton variant="ghost" icon={ArrowRight} onClick={onOpen}>
          Voir le détail
        </ActionButton>
      </div>
    </div>
  );
};
