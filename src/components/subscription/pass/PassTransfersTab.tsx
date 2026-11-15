import React, { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { PassTransferResult } from "../../../services/passAccess.service";
import { EmptyState, Section } from "../kit";
import { TransferCard, TransferOpenButton, TransferRequestForm } from "./TransferParts";

/**
 * Transferts d'un pass. Le backend n'expose pas la liste des transferts d'un pass :
 * seuls les transferts demandés depuis cet écran sont suivis ici, le temps de la visite.
 */
export const PassTransfersTab: React.FC<{ passNumber: string; transferable: boolean }> = ({ passNumber, transferable }) => {
  const [open, setOpen] = useState(false);
  const [transfers, setTransfers] = useState<PassTransferResult[]>([]);

  if (!transferable) {
    return <EmptyState icon={ArrowLeftRight} title="Pass non transférable" hint="Ce pass a été créé sans l'option de transfert." />;
  }

  const update = (t: PassTransferResult | null) => {
    if (!t) return;
    setTransfers((list) => list.map((x) => (x.transferNumber === t.transferNumber ? t : x)));
  };

  return (
    <div className="space-y-4">
      {open ? (
        <TransferRequestForm
          passNumber={passNumber}
          onCancel={() => setOpen(false)}
          onCreated={(t) => {
            setTransfers((list) => [t, ...list]);
            setOpen(false);
          }}
        />
      ) : (
        <div className="flex justify-end">
          <TransferOpenButton onClick={() => setOpen(true)} />
        </div>
      )}
      <Section title="Transferts demandés" description="Ceux demandés depuis cet écran pendant cette visite" icon={ArrowLeftRight}>
        {transfers.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">Aucun transfert demandé pour l'instant. Pour traiter un transfert existant, utilisez l'écran Contrôle d'accès.</p>
        ) : (
          <div className="space-y-2">
            {transfers.map((t) => (
              <TransferCard key={t.transferNumber} transfer={t} onChange={update} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};
