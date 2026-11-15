import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, HandHelping, ShoppingCart, XCircle } from "lucide-react";
import { marketplaceService } from "../../services/marketplace.service";
import type { MarketplaceOrder } from "../../services/marketplace.service";
import { ActionButton, Detail, EmptyState, ErrorBlock, Field, ItemRow, PageHeader, PanelForm, Section, StatusChip, Switch } from "../../components/subscription/kit";
import { FIELD, apiMessage, formatDateTime, formatMoney } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { DetailsSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { MarketplaceShell } from "../../components/marketplace/MarketplaceShell";
import { KIND_LABEL, MARKETPLACE_KEY, ORDER_STATUS } from "../../components/marketplace/marketplaceLabels";

type Panel = "fulfil" | "cancel" | null;

const FulfilForm: React.FC<{ order: MarketplaceOrder; onDone: () => void }> = ({ order, onDone }) => {
  const queryClient = useQueryClient();
  const [collectedBy, setCollectedBy] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => marketplaceService.fulfilOrder(order.orderNumber, collectedBy.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MARKETPLACE_KEY] });
      toast.success("Commande remise");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Remise impossible.")),
  });
  return (
    <PanelForm
      title="Remettre la commande au comptoir"
      pending={mutation.isPending}
      submitLabel="Remettre"
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <Field label="Retiré par" hint={`Vide : ${order.memberName ?? "l'acheteur"}`}>
        <input value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} className={FIELD} />
      </Field>
    </PanelForm>
  );
};

const CancelForm: React.FC<{ order: MarketplaceOrder; onDone: () => void }> = ({ order, onDone }) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [returnToStock, setReturnToStock] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paid = order.status === "PAID";
  const fulfilled = order.status === "FULFILLED";
  const mutation = useMutation({
    mutationFn: () => marketplaceService.cancelOrder(order.orderNumber, { reason: reason.trim(), ...(fulfilled ? { returnToStock } : {}) }),
    onSuccess: (o) => {
      queryClient.invalidateQueries({ queryKey: [MARKETPLACE_KEY] });
      toast.success(o.creditNoteNumber ? `Commande annulée, avoir ${o.creditNoteNumber}` : "Commande annulée");
      if (o.lines.some((l) => l.stockError)) toast.error("Le retour en stock a échoué sur une ligne : le remboursement est fait.");
      onDone();
    },
    onError: (e) => setError(apiMessage(e, "Annulation impossible.")),
  });
  return (
    <PanelForm
      title="Annuler la commande"
      pending={mutation.isPending}
      submitLabel="Annuler la commande"
      submitDisabled={reason.trim() === ""}
      error={error}
      onCancel={onDone}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      {(paid || fulfilled) && (
        <p className="-mt-2 text-sm text-gray-500">Un avoir du montant payé est reversé au portefeuille du payeur.</p>
      )}
      <Field label="Motif" required>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${FIELD} resize-none bg-gray-50 shadow-none`} />
      </Field>
      {fulfilled && <Switch checked={returnToStock} onChange={setReturnToStock} label="Remettre les articles en stock" hint="Un retour impossible n'empêche pas le remboursement" />}
    </PanelForm>
  );
};

export const MarketplaceOrderDetailPage: React.FC = () => {
  const { orderNumber = "" } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>(null);
  const back = () => navigate("/marketplace");

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: [MARKETPLACE_KEY, "order", orderNumber],
    queryFn: () => marketplaceService.getOrder(orderNumber),
    enabled: orderNumber !== "",
  });

  if (isLoading) {
    return (
      <MarketplaceShell narrow>
        <DetailsSkeleton />
      </MarketplaceShell>
    );
  }
  if (isError) {
    return (
      <MarketplaceShell narrow>
        <ErrorBlock message="Impossible de charger la commande." onRetry={() => refetch()} />
      </MarketplaceShell>
    );
  }
  if (!order) {
    return (
      <MarketplaceShell narrow>
        <EmptyState icon={ShoppingCart} title="Commande introuvable" action={<ActionButton onClick={back}>Retour</ActionButton>} />
      </MarketplaceShell>
    );
  }

  const st = statusOf(ORDER_STATUS, order.status);
  const paid = order.status === "PAID";
  const canFulfil = paid && !order.stockPending;
  const canCancel = paid || order.status === "FULFILLED" || order.status === "PENDING_PAYMENT";
  const currency = order.currency === "XAF" || !order.currency ? "FCFA" : order.currency;

  return (
    <MarketplaceShell narrow>
      <PageHeader
        title={`Commande ${order.orderNumber}`}
        subtitle={order.memberName ?? order.memberId}
        onBack={back}
        backLabel="Marketplace"
        badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
        actions={
          <>
            {paid && (
              <ActionButton icon={HandHelping} disabled={!canFulfil || panel !== null} onClick={() => setPanel("fulfil")}>
                Remettre
              </ActionButton>
            )}
            {canCancel && (
              <ActionButton variant="ghost" icon={XCircle} disabled={panel !== null} onClick={() => setPanel("cancel")}>
                Annuler
              </ActionButton>
            )}
          </>
        }
      />

      {order.stockPending && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>Un article n'est pas encore sorti du stock : la remise est refusée tant que la sortie n'est pas corrigée. Regarde l'erreur sur les lignes ci-dessous.</p>
        </div>
      )}

      {panel === "fulfil" && <FulfilForm order={order} onDone={() => setPanel(null)} />}
      {panel === "cancel" && <CancelForm order={order} onDone={() => setPanel(null)} />}

      <div className="space-y-5">
        <Section title="Lignes">
          <div className="space-y-2">
            {order.lines.map((l, i) => (
              <ItemRow key={l.id ?? i}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-950">{l.title ?? `Offre ${l.offerId}`}</p>
                    <p className="truncate text-xs text-gray-500">
                      {l.quantity} × {formatMoney(l.unitPrice, currency)}
                      {l.kind ? ` · ${KIND_LABEL[l.kind] ?? l.kind}` : ""}
                    </p>
                    {l.stockError && <p className="mt-1 text-xs font-semibold text-red-600">{l.stockError}</p>}
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-gray-950">{formatMoney(l.lineTotal ?? l.quantity * l.unitPrice, currency)}</p>
                </div>
              </ItemRow>
            ))}
            <div className="flex items-center justify-between px-1 pt-2 text-sm font-bold text-gray-950">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(order.totalAmount, currency)}</span>
            </div>
          </div>
        </Section>

        <Section title="Détails">
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Acheteur">
              {order.memberId ? (
                <Link to={`/members/${encodeURIComponent(order.memberId)}`} className="hover:underline">
                  {order.memberName ?? order.memberId}
                </Link>
              ) : undefined}
            </Detail>
            <Detail label="Facturée à">{order.billingCompanyCode ?? undefined}</Detail>
            <Detail label="Facture">
              {order.invoiceNumber ? (
                <Link to={`/billing/documents/${encodeURIComponent(order.invoiceNumber)}`} className="font-mono hover:underline">
                  {order.invoiceNumber}
                </Link>
              ) : undefined}
            </Detail>
            <Detail label="Reste à payer">{order.invoiceBalanceDue != null ? formatMoney(order.invoiceBalanceDue, currency) : undefined}</Detail>
            <Detail label="Créée le">{formatDateTime(order.createdAt)}</Detail>
            <Detail label="Échéance de règlement">{order.status === "PENDING_PAYMENT" ? formatDateTime(order.expiresAt) : undefined}</Detail>
            <Detail label="Remise par">{order.fulfilledBy ?? undefined}</Detail>
            <Detail label="Retirée par">{order.collectedBy ?? undefined}</Detail>
            <Detail label="Annulée par">{order.cancelledBy ?? undefined}</Detail>
            <Detail label="Motif d'annulation">{order.cancellationReason ?? undefined}</Detail>
            <Detail label="Avoir">{order.creditNoteNumber ?? undefined}</Detail>
          </div>
        </Section>
      </div>
    </MarketplaceShell>
  );
};

export default MarketplaceOrderDetailPage;
