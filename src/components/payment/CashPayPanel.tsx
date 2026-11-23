import React, { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { paymentService } from "../../services/payment.service";
import type { CashChangePreview, PayCashPayload, PaymentTransaction } from "../../services/payment.service";
import { Field, PanelForm } from "../subscription/kit";
import { FIELD_SOFT, apiMessage, formatMoney } from "../subscription/kitUtils";
import { CashSessionSelect } from "./CashSessionSelect";
import { computeChange, currencyLabel, parseDigits } from "./paymentUtils";

interface CashPayPanelProps {
  title?: string;
  /** Reste à payer affiché : payableAmount de l'intention ou balanceDue de la facture. */
  due: number;
  currency?: string;
  /** Aperçu serveur de la monnaie (sans effet) ; si absent, seul le calcul local est utilisé. */
  preview?: (tendered: number, amount?: number) => Promise<CashChangePreview>;
  /** Encaissement : reçoit le payload avec cashSessionNumber toujours renseigné. */
  pay: (payload: PayCashPayload) => Promise<PaymentTransaction>;
  onDone: (txn: PaymentTransaction) => void;
  onCancel: () => void;
}

/**
 * Encaissement en espèces au guichet : session ouverte obligatoire, montant remis par le client
 * et monnaie à rendre calculée à chaque frappe (règle identique au serveur).
 */
export const CashPayPanel: React.FC<CashPayPanelProps> = ({
  title = "Paiement en espèces",
  due,
  currency = "XAF",
  preview,
  pay,
  onDone,
  onCancel,
}) => {
  const cur = currencyLabel(currency);
  const money = (n: number) => formatMoney(n, cur);

  const [session, setSession] = useState("");
  const [tendered, setTendered] = useState(0);
  const [amount, setAmount] = useState(0);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [server, setServer] = useState<{ key: string; data: CashChangePreview } | null>(null);

  const amountArg = amount > 0 ? amount : undefined;
  const local = useMemo(
    () => (tendered > 0 ? computeChange(due, tendered, amountArg) : null),
    [due, tendered, amountArg],
  );

  // Confirmation par le serveur, espacée de 300 ms : le calcul local reste affiché en attendant.
  const key = `${tendered}|${amountArg ?? ""}`;
  useEffect(() => {
    if (!preview || tendered <= 0 || (local && local.invalid)) return;
    let cancelled = false;
    const t = setTimeout(() => {
      preview(tendered, amountArg)
        .then((data) => {
          if (!cancelled) setServer({ key, data });
        })
        .catch(() => {
          if (!cancelled) setServer(null);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, preview]);

  const srv = server && server.key === key ? server.data : null;
  const change = srv ? srv.changeAmount : local?.change ?? 0;
  const applied = srv ? srv.appliedAmount : local?.applied ?? due;
  const remainingAfter = srv ? srv.remainingAfter : local?.remainingAfter ?? 0;

  const payMutation = useMutation({
    mutationFn: () =>
      pay({
        cashSessionNumber: session,
        amount: amountArg,
        tenderedAmount: tendered > 0 ? tendered : undefined,
        providerReference: reference.trim() || undefined,
      }),
    onSuccess: (txn) => {
      setError(null);
      onDone(txn);
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors du paiement en espèces.")),
  });

  const invalid = !session || (local?.invalid ?? false) || (amountArg !== undefined && amountArg > due);

  return (
    <PanelForm
      title={title}
      onSubmit={(e) => {
        e.preventDefault();
        if (invalid) return;
        setError(null);
        payMutation.mutate();
      }}
      onCancel={onCancel}
      pending={payMutation.isPending}
      submitLabel={`Encaisser ${money(applied)}`}
      submitDisabled={invalid || due <= 0}
      error={error}
    >
      <p className="text-sm text-gray-500">
        Reste à payer : <b className="text-gray-950">{money(due)}</b>
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CashSessionSelect value={session} onChange={setSession} required />
        <Field label="Montant remis par le client" hint="Le serveur calcule la monnaie à rendre">
          <input
            type="text"
            inputMode="numeric"
            value={tendered === 0 ? "" : tendered}
            onChange={(e) => setTendered(parseDigits(e.target.value))}
            placeholder={String(due)}
            className={`${FIELD_SOFT} tabular-nums`}
            autoFocus
          />
        </Field>
        <Field
          label="Montant à encaisser"
          hint="Facultatif : laissez vide pour encaisser le dû (paiement partiel sinon)"
          error={amountArg !== undefined && amountArg > due ? `Au plus ${money(due)}` : undefined}
        >
          <input
            type="text"
            inputMode="numeric"
            value={amount === 0 ? "" : amount}
            onChange={(e) => setAmount(parseDigits(e.target.value))}
            placeholder={String(due)}
            className={`${FIELD_SOFT} tabular-nums`}
          />
        </Field>
        <Field label="Référence du reçu papier" hint="Facultatif">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="RECU-001"
            className={`${FIELD_SOFT} font-mono`}
          />
        </Field>
      </div>

      {local && (
        <div className="rounded-2xl bg-gray-50 p-4 text-center">
          {local.invalid ? (
            <p className="text-sm font-semibold text-red-700">
              Le montant remis ({money(tendered)}) est inférieur au montant à encaisser ({money(amountArg ?? 0)}).
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-400">À rendre</p>
              <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-gray-950">{money(change)}</p>
              {remainingAfter > 0 && (
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  Paiement partiel, reste dû : {money(remainingAfter)}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </PanelForm>
  );
};

/** Aperçu serveur pour une intention : à passer à CashPayPanel. */
export const intentChangePreview =
  (intentNumber: string) => (tendered: number, amount?: number) =>
    paymentService.previewIntentCashChange(intentNumber, tendered, amount);
