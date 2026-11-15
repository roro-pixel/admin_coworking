import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Layers, Lock, Ticket, Unlock } from "lucide-react";
import { pricingService } from "../../../services/pricing.service";
import type { CouponBatchResult, CouponResponse, CreateCouponBatchRequest } from "../../../services/pricing.service";
import { subscriptionService } from "../../../services/subscription.service";
import {
  ActionButton,
  EmptyState,
  ErrorBlock,
  Field,
  IconButton,
  ItemRow,
  ListHeader,
  Pagination,
  PanelForm,
  Section,
  StatusChip,
  Tag,
} from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { SubscriberPicker } from "../../../components/subscription/promotions/SubscriberPicker";
import type { SubscriberRef } from "../../../components/subscription/promotions/SubscriberPicker";
import { OpenReport } from "../../../components/subscription/promotions/OpenReport";
import { COUPON_KIND_LABEL, COUPON_KIND_OPTIONS, COUPON_STATUS } from "../../../components/subscription/promotions/promoLabels";

const PAGE_SIZE = 10;

type Panel = null | "batch" | "reserve" | "release";

const emptyBatch = () => ({
  promotionCode: "",
  name: "",
  quantity: "100",
  couponKind: "SINGLE_USE",
  codePrefix: "",
  codeLength: "10",
  maxRedemptionsPerCoupon: "",
  validFrom: "",
  validUntil: "",
  channel: "",
});

/** Coupons : consultation par abonné, révocation, génération de lots et retenues manuelles sur un panier. */
export const CouponsPanel: React.FC = () => {
  const qc = useQueryClient();
  const [subscriber, setSubscriber] = useState<SubscriberRef>({ type: "MEMBER", code: "" });
  const [panel, setPanel] = useState<Panel>(null);
  const [page, setPage] = useState(0);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [batch, setBatch] = useState(emptyBatch);
  const [batchResult, setBatchResult] = useState<CouponBatchResult | null>(null);
  const [reserveForm, setReserveForm] = useState({ code: "", cartReference: "" });
  const [releaseForm, setReleaseForm] = useState({ cartReference: "", reason: "" });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["coupons-available", subscriber.type, subscriber.code],
    queryFn: () => pricingService.getAvailableCoupons({ subscriberType: subscriber.type, subscriberCode: subscriber.code }),
    enabled: !!subscriber.code,
  });
  const coupons: CouponResponse[] = data ?? [];
  const totalPages = Math.max(1, Math.ceil(coupons.length / PAGE_SIZE));
  const visible = coupons.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const { data: promotions } = useQuery({
    queryKey: ["promotions", "for-batch"],
    queryFn: () => subscriptionService.getPromotions({ size: 100 }),
    enabled: panel === "batch",
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["coupons-available"] });

  const batchMutation = useMutation({
    mutationFn: () => {
      const payload: CreateCouponBatchRequest = {
        promotionCode: batch.promotionCode,
        name: batch.name.trim(),
        quantity: Number(batch.quantity),
        couponKind: batch.couponKind as CreateCouponBatchRequest["couponKind"],
        codePrefix: batch.codePrefix.trim() || undefined,
        codeLength: batch.codeLength ? Number(batch.codeLength) : undefined,
        maxRedemptionsPerCoupon: batch.maxRedemptionsPerCoupon ? Number(batch.maxRedemptionsPerCoupon) : undefined,
        validFrom: batch.validFrom ? `${batch.validFrom}T00:00:00Z` : undefined,
        validUntil: batch.validUntil ? `${batch.validUntil}T23:59:59Z` : undefined,
        channel: batch.channel.trim() || undefined,
      };
      return pricingService.createCouponBatch(payload);
    },
    onSuccess: (r) => {
      toast.success("Lot de coupons généré");
      setBatchResult(r);
      setBatch(emptyBatch());
      setPanel(null);
    },
    onError: (e) => toast.error(apiMessage(e, "Génération impossible.")),
  });

  const revokeMutation = useMutation({
    mutationFn: (code: string) => pricingService.revokeCoupon(code, revokeReason.trim()),
    onSuccess: () => {
      setRevoking(null);
      setRevokeReason("");
      refresh();
    },
  });

  const reserveMutation = useMutation({
    mutationFn: () =>
      pricingService.reserveCoupon(reserveForm.code.trim(), {
        cartReference: reserveForm.cartReference.trim(),
        subscriberType: subscriber.type,
        subscriberCode: subscriber.code,
      }),
    onSuccess: () => {
      toast.success("Coupon retenu pour ce panier");
      setReserveForm({ code: "", cartReference: "" });
      setPanel(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Retenue impossible.")),
  });

  const releaseMutation = useMutation({
    mutationFn: () => pricingService.releaseCartReservations(releaseForm.cartReference.trim(), releaseForm.reason.trim() || undefined),
    onSuccess: () => {
      toast.success("Retenues du panier libérées");
      setReleaseForm({ cartReference: "", reason: "" });
      setPanel(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Libération impossible.")),
  });

  const askRevoke = (c: CouponResponse) =>
    toast.confirm({
      message: `Révoquer le coupon ${c.code} ?`,
      detail: `Il ne pourra plus être utilisé. Motif : ${revokeReason.trim()}`,
      confirmLabel: "Révoquer",
      pendingLabel: "Révocation",
      successMessage: "Coupon révoqué",
      errorMessage: "Révocation refusée ou impossible",
      onConfirm: () => revokeMutation.mutateAsync(c.code),
    });

  const qty = Number(batch.quantity);
  const len = Number(batch.codeLength);
  const batchValid =
    !!batch.promotionCode &&
    !!batch.name.trim() &&
    Number.isInteger(qty) &&
    qty >= 1 &&
    qty <= 50000 &&
    (!batch.codeLength || (Number.isInteger(len) && len >= 6 && len <= 32));

  return (
    <div className="space-y-5">
      <ListHeader
        title="Coupons"
        subtitle="Coupons d'un abonné, lots à générer et retenues sur un panier."
        action={
          panel === null && (
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="ghost" icon={Lock} onClick={() => setPanel("reserve")} disabled={!subscriber.code}>
                Retenir un coupon
              </ActionButton>
              <ActionButton variant="ghost" icon={Unlock} onClick={() => setPanel("release")}>
                Libérer un panier
              </ActionButton>
              <ActionButton icon={Layers} onClick={() => setPanel("batch")}>
                Générer un lot
              </ActionButton>
            </div>
          )
        }
      />

      {batchResult && <OpenReport title="Lot généré" data={batchResult} onClose={() => setBatchResult(null)} />}

      {panel === "batch" && (
        <PanelForm
          title="Générer un lot de coupons"
          pending={batchMutation.isPending}
          submitLabel="Générer le lot"
          submitDisabled={!batchValid}
          onCancel={() => setPanel(null)}
          onSubmit={(e) => {
            e.preventDefault();
            batchMutation.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Promotion" required>
              <select className={FIELD_SOFT} value={batch.promotionCode} onChange={(e) => setBatch({ ...batch, promotionCode: e.target.value })}>
                <option value="">Choisir une promotion</option>
                {(promotions?.content ?? []).map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nom du lot" required>
              <input className={FIELD_SOFT} value={batch.name} onChange={(e) => setBatch({ ...batch, name: e.target.value })} />
            </Field>
            <Field label="Type de coupon" required>
              <select className={FIELD_SOFT} value={batch.couponKind} onChange={(e) => setBatch({ ...batch, couponKind: e.target.value })}>
                {COUPON_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantité" required hint="De 1 à 50 000">
              <input type="number" min={1} max={50000} className={FIELD_SOFT} value={batch.quantity} onChange={(e) => setBatch({ ...batch, quantity: e.target.value })} />
            </Field>
            <Field label="Préfixe des codes">
              <input className={FIELD_SOFT} value={batch.codePrefix} onChange={(e) => setBatch({ ...batch, codePrefix: e.target.value })} placeholder="ETE26" />
            </Field>
            <Field label="Longueur des codes" hint="De 6 à 32, 10 par défaut">
              <input type="number" min={6} max={32} className={FIELD_SOFT} value={batch.codeLength} onChange={(e) => setBatch({ ...batch, codeLength: e.target.value })} />
            </Field>
            <Field label="Utilisations max par coupon">
              <input type="number" min={1} className={FIELD_SOFT} value={batch.maxRedemptionsPerCoupon} onChange={(e) => setBatch({ ...batch, maxRedemptionsPerCoupon: e.target.value })} placeholder="Selon le type" />
            </Field>
            <Field label="Canal">
              <input className={FIELD_SOFT} value={batch.channel} onChange={(e) => setBatch({ ...batch, channel: e.target.value })} />
            </Field>
            <Field label="Valide à partir du">
              <input type="date" className={FIELD_SOFT} value={batch.validFrom} onChange={(e) => setBatch({ ...batch, validFrom: e.target.value })} />
            </Field>
            <Field label="Valide jusqu'au">
              <input type="date" min={batch.validFrom} className={FIELD_SOFT} value={batch.validUntil} onChange={(e) => setBatch({ ...batch, validUntil: e.target.value })} />
            </Field>
          </div>
        </PanelForm>
      )}

      {panel === "reserve" && (
        <PanelForm
          title="Retenir un coupon pour un panier"
          pending={reserveMutation.isPending}
          submitLabel="Retenir"
          submitDisabled={!reserveForm.code.trim() || !reserveForm.cartReference.trim() || !subscriber.code}
          onCancel={() => setPanel(null)}
          onSubmit={(e) => {
            e.preventDefault();
            reserveMutation.mutate();
          }}
        >
          <p className="-mt-2 text-sm text-gray-500">La retenue est faite pour l'abonné sélectionné plus bas. Le coupon n'est consommé qu'à la création de l'abonnement.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Code du coupon" required>
              <input className={FIELD_SOFT} value={reserveForm.code} onChange={(e) => setReserveForm({ ...reserveForm, code: e.target.value })} />
            </Field>
            <Field label="Référence du panier" required>
              <input className={FIELD_SOFT} value={reserveForm.cartReference} onChange={(e) => setReserveForm({ ...reserveForm, cartReference: e.target.value })} />
            </Field>
          </div>
        </PanelForm>
      )}

      {panel === "release" && (
        <PanelForm
          title="Libérer les retenues d'un panier"
          pending={releaseMutation.isPending}
          submitLabel="Libérer"
          submitDisabled={!releaseForm.cartReference.trim()}
          onCancel={() => setPanel(null)}
          onSubmit={(e) => {
            e.preventDefault();
            releaseMutation.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Référence du panier" required>
              <input className={FIELD_SOFT} value={releaseForm.cartReference} onChange={(e) => setReleaseForm({ ...releaseForm, cartReference: e.target.value })} />
            </Field>
            <Field label="Motif">
              <input className={FIELD_SOFT} value={releaseForm.reason} onChange={(e) => setReleaseForm({ ...releaseForm, reason: e.target.value })} />
            </Field>
          </div>
        </PanelForm>
      )}

      <Section title="Coupons d'un abonné" description="Coupons que cet abonné peut utiliser" icon={Ticket}>
        <div className="mb-4">
          <SubscriberPicker
            value={subscriber}
            onChange={(v) => {
              setSubscriber(v);
              setPage(0);
              setRevoking(null);
            }}
          />
        </div>

        {!subscriber.code ? (
          <EmptyState icon={Ticket} title="Aucun abonné sélectionné" hint="Choisissez un abonné pour voir ses coupons." />
        ) : isLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl" />
        ) : isError ? (
          <ErrorBlock message="Impossible de charger les coupons." onRetry={() => refetch()} />
        ) : coupons.length === 0 ? (
          <EmptyState icon={Ticket} title="Aucun coupon disponible" hint="Cet abonné n'a aucun coupon utilisable." />
        ) : (
          <>
            <div className="space-y-2">
              {visible.map((c) => {
                const st = COUPON_STATUS[c.status] ?? { label: c.status, tone: "neutral" as const };
                const open = revoking === c.code;
                return (
                  <ItemRow key={c.code}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-gray-950">{c.code}</p>
                        <p className="mt-0.5 text-sm text-gray-600">{c.promotionName ?? c.promotionCode}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {c.validFrom ? `Du ${formatDate(c.validFrom)} ` : ""}
                          {c.validUntil ? `jusqu'au ${formatDate(c.validUntil)}` : "Sans date de fin"}
                          {c.batchCode ? ` · lot ${c.batchCode}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Tag>{COUPON_KIND_LABEL[c.couponKind] ?? c.couponKind}</Tag>
                        {typeof c.remainingUses === "number" && (
                          <Tag>
                            {c.remainingUses} utilisation{c.remainingUses > 1 ? "s" : ""} restante{c.remainingUses > 1 ? "s" : ""}
                          </Tag>
                        )}
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                        {c.status === "ACTIVE" && !open && (
                          <IconButton
                            icon={Ban}
                            tone="danger"
                            label="Révoquer"
                            onClick={() => {
                              setRevoking(c.code);
                              setRevokeReason("");
                            }}
                          />
                        )}
                      </div>
                    </div>
                    {open && (
                      <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:grid-cols-[1fr_auto]">
                        <Field label="Motif de la révocation" required>
                          <input className={FIELD_SOFT} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
                        </Field>
                        <div className="flex items-end gap-2">
                          <ActionButton variant="ghost" onClick={() => setRevoking(null)}>
                            Annuler
                          </ActionButton>
                          <ActionButton variant="danger" disabled={!revokeReason.trim()} onClick={() => askRevoke(c)}>
                            Révoquer
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </ItemRow>
                );
              })}
            </div>
            <Pagination page={page} totalPages={totalPages} total={coupons.length} noun="coupon" onChange={setPage} />
          </>
        )}
      </Section>
    </div>
  );
};
