import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CheckCircle2, XCircle } from "lucide-react";
import { paymentService } from "../../services/payment.service";
import type { CashPaymentDeclaration } from "../../services/payment.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, ListHeader, Pagination, StatusChip } from "../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { PillChoice } from "../../components/operations/opsKit";
import { toast } from "../../components/ui/toastStore";
import { useAuth } from "../../contexts/AuthContext";
import { CashSessionSelect } from "../../components/payment/CashSessionSelect";
import { DECLARATION_STATUS } from "../../components/payment/paymentLabels";
import { currencyLabel, parseDigits } from "../../components/payment/paymentUtils";

const PAGE_SIZE = 20;

const FILTERS: { value: string; label: string }[] = [
  { value: "AWAITING_CONFIRMATION", label: "À confirmer" },
  { value: "CONFIRMED", label: "Confirmées" },
  { value: "CANCELLED", label: "Annulées" },
  { value: "EXPIRED", label: "Expirées" },
  { value: "", label: "Toutes" },
];

type Mode = "confirm" | "cancel";

const DeclarationActions: React.FC<{
  decl: CashPaymentDeclaration;
  mode: Mode;
  onClose: () => void;
}> = ({ decl, mode, onClose }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState("");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      mode === "confirm"
        ? paymentService.confirmCashDeclaration(decl.declarationNumber, {
            cashSessionNumber: session,
            amount: amount > 0 ? amount : undefined,
            note: note.trim() || undefined,
          })
        : paymentService.cancelCashDeclaration(decl.declarationNumber, note),
    onSuccess: () => {
      toast.success(mode === "confirm" ? "Déclaration confirmée : l'espèce est encaissée." : "Déclaration annulée.");
      queryClient.invalidateQueries({ queryKey: ["cash-declarations"] });
      queryClient.invalidateQueries({ queryKey: ["payment-intents"] });
      onClose();
    },
    onError: (e: unknown) => setError(apiMessage(e, "Opération refusée.")),
  });

  const money = (n: number) => formatMoney(n, currencyLabel(decl.currency));

  return (
    <div className="mt-3 rounded-2xl bg-gray-50 p-4">
      {error && (
        <p role="alert" className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {mode === "confirm" && (
          <>
            <div className="sm:col-span-2">
              <CashSessionSelect value={session} onChange={setSession} required hint="Les espèces sont ajoutées à cette session." />
            </div>
            <Field label="Montant reçu" hint={`Facultatif : laissez vide pour ${money(decl.amount)}`}>
              <input
                type="text"
                inputMode="numeric"
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(parseDigits(e.target.value))}
                placeholder={String(decl.amount)}
                className={`${FIELD_SOFT} tabular-nums`}
              />
            </Field>
          </>
        )}
        <Field label={mode === "confirm" ? "Note" : "Motif"} className={mode === "confirm" ? "" : "sm:col-span-2"}>
          <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={FIELD_SOFT} />
        </Field>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <ActionButton variant="ghost" disabled={mutation.isPending} onClick={onClose}>
          Retour
        </ActionButton>
        <ActionButton
          variant={mode === "confirm" ? "primary" : "danger"}
          pending={mutation.isPending}
          disabled={mode === "confirm" && !session}
          onClick={() => mutation.mutate()}
        >
          {mode === "confirm" ? "Confirmer l'encaissement" : "Annuler la déclaration"}
        </ActionButton>
      </div>
    </div>
  );
};

/** Déclarations d'espèces faites par le client : la caisse confirme (session obligatoire) ou annule. */
export const CashDeclarationsPanel: React.FC = () => {
  const { hasPermission } = useAuth();
  const canAct = hasPermission("PAYMENT:PROCESS");
  const [status, setStatus] = useState("AWAITING_CONFIRMATION");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<{ number: string; mode: Mode } | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["cash-declarations", status, page],
    queryFn: () => paymentService.getCashDeclarations({ status: status || undefined, page, size: PAGE_SIZE, sort: "declaredAt,desc" }),
  });
  const items = data?.content ?? [];

  return (
    <div className="space-y-5">
      <ListHeader title="Déclarations d'espèces" subtitle="Paiements en espèces annoncés par les clients, en attente de la caisse." />
      <PillChoice<string>
        label="Statut"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(0);
          setOpen(null);
        }}
        options={FILTERS}
      />

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message={apiMessage(error, "Impossible de charger les déclarations.")} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Banknote} title="Aucune déclaration" hint="Rien ne correspond à ce statut." />
      ) : (
        <div className="space-y-3">
          {items.map((d) => {
            const st = statusOf(DECLARATION_STATUS, d.status);
            const pending = d.status === "AWAITING_CONFIRMATION";
            const current = open?.number === d.declarationNumber ? open.mode : null;
            return (
              <ItemRow key={d.declarationNumber}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      <span className="font-mono text-xs text-gray-400">{d.declarationNumber}</span>
                    </div>
                    <p className="mt-2 truncate text-base font-bold text-gray-950">{d.customerName || d.customerCode || "Client"}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {d.documentNumber ? `Document ${d.documentNumber} · ` : ""}
                      {d.bookingNumber ? `Réservation ${d.bookingNumber} · ` : ""}
                      déclarée {formatDateTime(d.declaredAt)}
                      {pending && d.expiresAt ? ` · expire ${formatDateTime(d.expiresAt)}` : ""}
                    </p>
                    {d.note && <p className="mt-1 text-sm text-gray-600">{d.note}</p>}
                    {d.status === "CONFIRMED" && (
                      <p className="mt-1 text-xs text-gray-500">
                        Encaissée {formatMoney(d.confirmedAmount ?? d.amount, currencyLabel(d.currency))}
                        {d.cashSessionNumber ? ` · session ${d.cashSessionNumber}` : ""}
                        {d.transactionNumber ? ` · ${d.transactionNumber}` : ""}
                      </p>
                    )}
                    {d.closeReason && <p className="mt-1 text-xs text-gray-500">Motif : {d.closeReason}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <p className="text-lg font-bold tabular-nums text-gray-950">{formatMoney(d.amount, currencyLabel(d.currency))}</p>
                    {pending && canAct && !current && (
                      <div className="flex gap-2">
                        <ActionButton icon={CheckCircle2} onClick={() => setOpen({ number: d.declarationNumber, mode: "confirm" })}>
                          Confirmer
                        </ActionButton>
                        <ActionButton variant="ghost" icon={XCircle} onClick={() => setOpen({ number: d.declarationNumber, mode: "cancel" })}>
                          Annuler
                        </ActionButton>
                      </div>
                    )}
                  </div>
                </div>
                {current && <DeclarationActions decl={d} mode={current} onClose={() => setOpen(null)} />}
              </ItemRow>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="déclaration" onChange={setPage} />
    </div>
  );
};
