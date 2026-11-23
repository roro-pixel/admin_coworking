import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Hourglass, RefreshCw, XCircle } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { MobileMoneyDeposit, PaymentIntent } from "../../services/payment.service";
import { ActionButton, Detail, Field, PanelForm, StatusChip } from "../subscription/kit";
import { FIELD_SOFT, apiMessage, formatMoney } from "../subscription/kitUtils";
import { statusOf } from "../subscription/labels";
import { Skeleton } from "../ui/Skeleton";
import { MM_PHASE } from "./paymentLabels";
import { currencyLabel, parseDigits, payableOf } from "./paymentUtils";

interface MobileMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  intent: PaymentIntent;
  /** Appelé une fois le paiement confirmé (phase COMPLETED), avec la transaction pour afficher le reçu. */
  onPaymentSuccess?: (transactionNumber: string) => void;
}

const WAITING = ["WAITING_FOR_PAYER", "CONFIRMING"];
const FINAL = ["COMPLETED", "FAILED", "UNRESOLVED"];
const POLL_MS = 5000;

/**
 * Paiement mobile money de la plateforme (PawaPay). Même nom et mêmes props qu'avant ;
 * c'est un panneau dans la page de l'intention.
 *
 * Le serveur répond 200 dès que l'opérateur a été appelé, même en cas de refus : on lit `phase`
 * et on affiche `userMessage`. Jamais providerMessage ni failureReason.
 */
export const MobileMoneyModal: React.FC<MobileMoneyModalProps> = ({ isOpen, onClose, intent, onPaymentSuccess }) => {
  const queryClient = useQueryClient();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [correspondent, setCorrespondent] = useState("");
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<MobileMoneyDeposit | null>(null);
  const notified = useRef<string | null>(null);

  const payable = payableOf(intent);
  const money = (n: number) => formatMoney(n, currencyLabel(intent.currency));

  const refreshIntent = () => {
    queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
    queryClient.invalidateQueries({ queryKey: ["payment-intent", intent.intentNumber] });
    queryClient.invalidateQueries({ queryKey: ["payment-transactions", intent.intentNumber] });
  };

  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ["mobile-money-providers"],
    queryFn: () => paymentService.getMobileMoneyProviders(),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });
  // Le serveur refuse un opérateur d'une autre devise que celle de l'intention.
  const usable = providers.filter((p) => !p.currency || p.currency === intent.currency);
  const options = usable.length > 0 ? usable : providers;

  // Un dépôt peut déjà attendre l'opérateur : on reprend son attente au lieu d'en ouvrir un second.
  const resume = async (): Promise<MobileMoneyDeposit | null> => {
    const page = await paymentService.getMobileMoneyOperations({ reference: intent.intentNumber, size: 10 });
    return page.content.find((d) => WAITING.includes(d.phase ?? "")) ?? null;
  };

  useEffect(() => {
    if (!isOpen || deposit || !(intent.processingAmount && intent.processingAmount > 0)) return;
    let cancelled = false;
    resume()
      .then((d) => {
        if (!cancelled && d) setDeposit(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, intent.intentNumber, intent.processingAmount]);

  const depositMutation = useMutation({
    mutationFn: () =>
      paymentService.initiateMobileMoneyOnIntent(intent.intentNumber, {
        phoneNumber: phoneNumber.trim(),
        correspondent,
        amount: amount > 0 ? amount : undefined,
      }),
    onSuccess: (data) => {
      setDeposit(data);
      setError(null);
      refreshIntent();
    },
    onError: async (err: unknown) => {
      const message = apiMessage(err, "Erreur lors de l'initiation du paiement.");
      setError(message);
      if (/mobile money.*en cours|pending mobile money/i.test(message)) {
        try {
          const found = await resume();
          if (found) {
            setDeposit(found);
            setError(null);
          }
        } catch {
          /* le message d'origine reste affiché */
        }
      }
    },
  });

  // Attente du résultat : sondage du dépôt, seule voie (aucun temps réel côté serveur).
  const waiting = !!deposit && WAITING.includes(deposit.phase ?? "");
  const { data: polled } = useQuery({
    queryKey: ["mobile-money-deposit", deposit?.depositId],
    queryFn: () => paymentService.getMobileMoneyDeposit(deposit!.depositId),
    enabled: isOpen && waiting,
    refetchInterval: POLL_MS,
  });
  useEffect(() => {
    if (polled && deposit && polled.depositId === deposit.depositId && polled.phase !== deposit.phase) {
      setDeposit(polled);
      refreshIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polled]);

  const recheck = useMutation({
    mutationFn: () => paymentService.recheckMobileMoneyDeposit(deposit!.depositId),
    onSuccess: (d) => {
      setDeposit(d);
      setError(null);
      refreshIntent();
    },
    onError: (e: unknown) => setError(apiMessage(e, "Impossible de relire le statut pour le moment.")),
  });

  // Paiement confirmé : on ouvre le reçu une seule fois.
  useEffect(() => {
    if (deposit?.phase === "COMPLETED" && deposit.transactionNumber && notified.current !== deposit.depositId) {
      notified.current = deposit.depositId;
      onPaymentSuccess?.(deposit.transactionNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deposit?.phase, deposit?.depositId]);

  const reset = () => {
    setDeposit(null);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError("Le numéro de téléphone est obligatoire.");
      return;
    }
    if (!correspondent) {
      setError("Veuillez sélectionner un opérateur.");
      return;
    }
    if (amount > payable) {
      setError(`Le montant ne peut dépasser le reste payable (${money(payable)}).`);
      return;
    }
    setError(null);
    depositMutation.mutate();
  };

  if (!isOpen) return null;

  if (deposit) {
    const phase = deposit.phase ?? (deposit.status === "SUCCEEDED" ? "COMPLETED" : deposit.status);
    const st = statusOf(MM_PHASE, phase);
    const done = FINAL.includes(phase);
    const ok = phase === "COMPLETED";
    const failed = phase === "FAILED";
    const Icon = ok ? CheckCircle2 : failed ? XCircle : phase === "UNRESOLVED" ? AlertTriangle : Hourglass;
    const ring = ok ? "ring-emerald-200" : failed ? "ring-red-200" : "ring-amber-200";
    const bubble = ok ? "bg-emerald-50 text-emerald-600" : failed ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600";

    return (
      <div className={`mb-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-2 sm:p-5 ${ring}`}>
        <div className="mb-4 flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bubble}`}>
            <Icon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-bold text-gray-950">Paiement mobile money</h4>
              <StatusChip tone={st.tone}>{st.label}</StatusChip>
            </div>
            {(deposit.userMessage || deposit.customerMessage) && (
              <p className="mt-1 text-sm text-gray-600">{deposit.userMessage || deposit.customerMessage}</p>
            )}
            {phase === "CONFIRMING" && (
              <p className="mt-1 text-sm font-semibold text-amber-700">Ne proposez pas au client de payer une seconde fois.</p>
            )}
            {phase === "UNRESOLVED" && (
              <p className="mt-1 text-sm font-semibold text-red-700">
                Ne payez pas une seconde fois : le rapprochement mobile money permet de trancher ce dépôt.
              </p>
            )}
            {failed && deposit.retryable === false && (
              <p className="mt-1 text-sm text-gray-500">
                Ce refus n'est pas réessayable tel quel : corrigez le numéro ou l'opérateur, ou choisissez un autre moyen de paiement.
              </p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Opérateur">{deposit.provider}</Detail>
          <Detail label="Montant">{money(deposit.amount)}</Detail>
          <Detail label="Téléphone" mono>{deposit.payer?.accountDetails?.phoneNumber}</Detail>
          <Detail label="Transaction" mono>{deposit.transactionNumber}</Detail>
          <Detail label="Identifiant du dépôt" mono wide>{deposit.depositId}</Detail>
        </dl>

        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {waiting && (
            <ActionButton variant="ghost" icon={RefreshCw} pending={recheck.isPending} onClick={() => recheck.mutate()}>
              Relire le statut
            </ActionButton>
          )}
          {failed && (
            <ActionButton variant="ghost" onClick={reset}>
              {deposit.retryable === false ? "Corriger la saisie" : "Réessayer"}
            </ActionButton>
          )}
          <ActionButton onClick={onClose}>{done ? "Fermer" : "Fermer (l'attente continue en arrière-plan)"}</ActionButton>
        </div>
      </div>
    );
  }

  return (
    <PanelForm
      title="Paiement mobile money"
      onSubmit={submit}
      onCancel={onClose}
      pending={depositMutation.isPending}
      submitLabel="Envoyer la demande au payeur"
      submitDisabled={!phoneNumber.trim() || !correspondent || payable <= 0}
      error={error}
    >
      <p className="text-sm text-gray-500">
        Intention <span className="font-mono font-semibold text-gray-800">{intent.intentNumber}</span> · reste payable{" "}
        <b className="text-gray-950">{money(payable)}</b>
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field
          label="Opérateur"
          required
          hint={usable.length === 0 && providers.length > 0 ? `Aucun opérateur en ${currencyLabel(intent.currency)} : le serveur refusera.` : undefined}
        >
          {providersLoading ? (
            <Skeleton className="h-11 w-full rounded-2xl" />
          ) : (
            <select value={correspondent} onChange={(e) => setCorrespondent(e.target.value)} className={FIELD_SOFT}>
              <option value="">Choisir</option>
              {options.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.displayName} ({p.countryCode})
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Numéro de téléphone" required hint="Tel que le payeur le compose : le serveur ajoute l'indicatif">
          <input
            type="text"
            inputMode="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d+ ]/g, ""))}
            placeholder="06 123 45 67"
            className={`${FIELD_SOFT} font-mono`}
            autoFocus
          />
        </Field>
        <Field
          label="Montant"
          hint="Entier, sans centimes. Laissez vide pour tout le reste payable."
          error={amount > payable ? `Au plus ${money(payable)}` : undefined}
        >
          <input
            type="text"
            inputMode="numeric"
            value={amount === 0 ? "" : amount}
            onChange={(e) => setAmount(parseDigits(e.target.value))}
            placeholder={String(payable)}
            className={`${FIELD_SOFT} tabular-nums`}
          />
        </Field>
      </div>
    </PanelForm>
  );
};
