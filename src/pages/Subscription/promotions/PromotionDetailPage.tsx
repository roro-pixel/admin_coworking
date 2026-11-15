import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Gift, Pencil, Percent, Play } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { MemberSummaryResponse } from "../../../services/member.service";
import type { CustomerSummaryResponse } from "../../../services/customer.service";
import { MemberAutocomplete } from "../../../components/members/MemberAutocomplete";
import { CustomerAutocomplete } from "../../../components/customers/CustomerAutocomplete";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  Detail,
  ErrorBlock,
  Field,
  PageHeader,
  PanelForm,
  Section,
  StatusChip,
} from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage, formatDate } from "../../../components/subscription/kitUtils";
import { DISCOUNT_TYPE_LABELS, PROMOTION_STATUS, statusOf } from "../../../components/subscription/labels";
import { BeneficiariesPanel } from "../../../components/subscription/promotions/BeneficiariesPanel";
import { discountValueText } from "./promotionUtils";

const formatMetadata = (json: string) => {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
};

/** Page détail d'une promotion, avec activation et utilisation (redeem). */
export const PromotionDetailPage: React.FC = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showRedeem, setShowRedeem] = useState(false);
  const [subscriberType, setSubscriberType] = useState("MEMBER");
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [subscriberCode, setSubscriberCode] = useState("");
  const [subscriptionNumber, setSubscriptionNumber] = useState("");

  const {
    data: promotion,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["promotion", code],
    queryFn: async () => {
      const res = await subscriptionService.getPromotions({ code, size: 1 });
      return res.content.find((p) => p.code === code) ?? null;
    },
    enabled: !!code,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["promotions"] });
    queryClient.invalidateQueries({ queryKey: ["promotion", code] });
  };

  // Toast de confirmation : l'erreur de l'API y est affichée
  const activateMutation = useMutation({
    mutationFn: () => subscriptionService.activatePromotion(code),
    onSuccess: refresh,
  });

  const redeemMutation = useMutation({
    mutationFn: () =>
      subscriptionService.redeemPromotion(code, {
        subscriberType,
        subscriberCode,
        subscriptionNumber: subscriptionNumber.trim() || undefined,
      }),
    onSuccess: () => {
      refresh();
      toast.success("Promotion appliquée");
      setShowRedeem(false);
      setSubscriberCode("");
      setSubscriptionNumber("");
      setSelectedMember(null);
      setSelectedCustomer(null);
    },
    onError: (e: unknown) => toast.error(apiMessage(e, "Erreur lors de l'application de la promotion.")),
  });

  const askActivate = () =>
    toast.confirm({
      message: "Activer cette promotion ?",
      detail: "Elle deviendra disponible pour les utilisateurs.",
      confirmLabel: "Activer",
      pendingLabel: "Activation en cours",
      successMessage: "Promotion activée",
      errorMessage: "L'activation a échoué",
      tone: "primary",
      onConfirm: () => activateMutation.mutateAsync(),
    });

  const changeSubscriberType = (type: string) => {
    setSubscriberType(type);
    setSubscriberCode("");
    setSelectedMember(null);
    setSelectedCustomer(null);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <DetailsSkeleton />
        </div>
      </AdminLayout>
    );
  }

  if (error || !promotion) {
    return (
      <AdminLayout>
        <div style={brandVars} className="mx-auto w-full max-w-4xl">
          <PageHeader title="Promotion introuvable" onBack={() => navigate("/subscriptions/promotions")} backLabel="Promotions" />
          <ErrorBlock message="Cette promotion n'existe pas ou n'est plus accessible." />
        </div>
      </AdminLayout>
    );
  }

  const st = statusOf(PROMOTION_STATUS, promotion.status);
  const isDraft = promotion.status === "DRAFT";
  const isActive = promotion.status === "ACTIVE";
  const value = discountValueText(promotion);
  const ratio =
    promotion.maxRedemptions && promotion.maxRedemptions > 0
      ? Math.min(100, (promotion.redeemedCount / promotion.maxRedemptions) * 100)
      : null;

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title={promotion.name}
          subtitle={<span className="font-mono">{promotion.code}</span>}
          badge={<StatusChip tone={st.tone}>{st.label}</StatusChip>}
          actions={
            <>
              {isDraft && (
                <>
                  <ActionButton icon={Play} onClick={askActivate}>
                    Activer
                  </ActionButton>
                  <ActionButton variant="ghost" icon={Pencil} onClick={() => navigate(`/subscriptions/promotions/${promotion.code}/edit`)}>
                    Modifier
                  </ActionButton>
                </>
              )}
              {isActive && (
                <ActionButton icon={Gift} onClick={() => setShowRedeem((s) => !s)}>
                  Appliquer
                </ActionButton>
              )}
            </>
          }
          onBack={() => navigate("/subscriptions/promotions")}
          backLabel="Promotions"
        />

        {showRedeem && (
          <PanelForm
            title="Appliquer la promotion"
            onSubmit={(e) => {
              e.preventDefault();
              redeemMutation.mutate();
            }}
            onCancel={() => setShowRedeem(false)}
            submitLabel="Appliquer"
            pending={redeemMutation.isPending}
            submitDisabled={!subscriberCode}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Type d'abonné" required>
                <select value={subscriberType} onChange={(e) => changeSubscriberType(e.target.value)} className={FIELD_SOFT}>
                  <option value="MEMBER">Membre</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </Field>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                  {subscriberType === "MEMBER" ? "Membre" : "Customer"}
                  <span className="text-[color:var(--logo-pink-dark)]"> *</span>
                </span>
                {subscriberType === "MEMBER" ? (
                  <MemberAutocomplete
                    selectedMember={selectedMember}
                    onSelect={(m) => {
                      setSelectedMember(m);
                      setSubscriberCode(m?.memberId ?? "");
                    }}
                    placeholder="Rechercher un membre..."
                  />
                ) : (
                  <CustomerAutocomplete
                    selectedCustomer={selectedCustomer}
                    onSelect={(c) => {
                      setSelectedCustomer(c);
                      setSubscriberCode(c?.customerId ?? "");
                    }}
                    placeholder="Rechercher un customer..."
                  />
                )}
              </div>
              <Field label="N° de souscription" className="md:col-span-2" hint="Optionnel">
                <input
                  type="text"
                  value={subscriptionNumber}
                  onChange={(e) => setSubscriptionNumber(e.target.value)}
                  className={FIELD_SOFT}
                />
              </Field>
            </div>
          </PanelForm>
        )}

        <div className="space-y-4">
          <Section title="Réduction" icon={Percent}>
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail label="Type">{DISCOUNT_TYPE_LABELS[promotion.discountType] ?? promotion.discountType}</Detail>
              <Detail label="Valeur">{value}</Detail>
              <Detail label="Début">{formatDate(promotion.startsAt)}</Detail>
              <Detail label="Fin">{promotion.endsAt ? formatDate(promotion.endsAt) : "Illimitée"}</Detail>
              <Detail label="Description" wide>
                {promotion.description}
              </Detail>
            </div>
          </Section>

          <Section title="Utilisations">
            <p className="text-sm font-semibold text-gray-900">
              {promotion.redeemedCount} / {promotion.maxRedemptions ?? "illimité"}
            </p>
            {ratio !== null && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[color:var(--logo-pink)]" style={{ width: `${ratio}%` }} />
              </div>
            )}
          </Section>

          <BeneficiariesPanel promotionCode={promotion.code} />

          {promotion.metadataJson && (
            <Section title="Métadonnées">
              <pre className="overflow-auto font-mono text-xs leading-5 text-gray-700">{formatMetadata(promotion.metadataJson)}</pre>
            </Section>
          )}
        </div>
      </div>
      <Toaster />
    </AdminLayout>
  );
};
