import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Percent } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { Promotion } from "../../../services/subscription.service";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { DetailsSkeleton } from "../../../components/ui/Skeleton";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import { ActionButton, ErrorBanner, ErrorBlock, Field, PageHeader, Section } from "../../../components/subscription/kit";
import { FIELD, apiMessage } from "../../../components/subscription/kitUtils";
import { DISCOUNT_TYPE_LABELS } from "../../../components/subscription/labels";

// FREE_TRIAL_DAYS non exposé : le backend le rejette dans cette version
const DISCOUNT_OPTIONS = [
  { value: "PERCENTAGE", label: "Pourcentage (%)" },
  { value: "FIXED_AMOUNT", label: "Montant fixe (FCFA)" },
  { value: "FREE_ENTITLEMENT", label: DISCOUNT_TYPE_LABELS.FREE_ENTITLEMENT },
  { value: "WAIVE_SETUP_FEE", label: DISCOUNT_TYPE_LABELS.WAIVE_SETUP_FEE },
];

const buildDefaultFormData = (promo: Promotion | null | undefined) => ({
  name: promo?.name ?? "",
  description: promo?.description ?? "",
  discountType: (promo?.discountType ?? "PERCENTAGE") as Promotion["discountType"],
  discountValue: promo?.discountValue ?? 0,
  // startsAt/endsAt peuvent être des datetimes ISO : on garde la date
  startsAt: promo?.startsAt?.split("T")[0] ?? new Date().toISOString().split("T")[0],
  endsAt: promo?.endsAt?.split("T")[0] ?? "",
  maxRedemptions: promo?.maxRedemptions?.toString() ?? "",
  metadataJson: promo?.metadataJson ?? "",
});

type FormProps = { promotion: Promotion | null };

const PromotionForm: React.FC<FormProps> = ({ promotion }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => buildDefaultFormData(promotion));

  const isMetadataJsonValid =
    !formData.metadataJson.trim() ||
    (() => {
      try {
        JSON.parse(formData.metadataJson);
        return true;
      } catch {
        return false;
      }
    })();

  // Le backend génère le code : il n'est jamais envoyé
  const buildPayload = () => ({
    name: formData.name,
    description: formData.description || undefined,
    discountType: formData.discountType,
    discountValue: parseFloat(String(formData.discountValue)) || 0,
    startsAt: `${formData.startsAt}T00:00:00Z`,
    endsAt: formData.endsAt ? `${formData.endsAt}T23:59:59Z` : undefined,
    maxRedemptions: formData.maxRedemptions ? parseInt(formData.maxRedemptions) : undefined,
    metadataJson: formData.metadataJson.trim() && isMetadataJsonValid ? formData.metadataJson : undefined,
  });

  const done = (code: string, message: string) => {
    queryClient.invalidateQueries({ queryKey: ["promotions"] });
    queryClient.invalidateQueries({ queryKey: ["promotion", code] });
    toast.success(message);
    navigate(`/subscriptions/promotions/${code}`);
  };

  const createMutation = useMutation({
    mutationFn: () => subscriptionService.createPromotion(buildPayload()),
    onSuccess: (created) => done(created.code, "Promotion créée"),
    onError: (e: unknown) => setErrorMessage(apiMessage(e, "Erreur lors de la création de la promotion.")),
  });

  const updateMutation = useMutation({
    mutationFn: () => subscriptionService.updatePromotion(promotion!.code, buildPayload()),
    onSuccess: () => done(promotion!.code, "Promotion mise à jour"),
    onError: (e: unknown) => setErrorMessage(apiMessage(e, "Erreur lors de la mise à jour de la promotion.")),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const goBack = () => navigate(promotion ? `/subscriptions/promotions/${promotion.code}` : "/subscriptions/promotions");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMetadataJsonValid) {
      setErrorMessage("Le JSON des métadonnées est invalide.");
      return;
    }
    setErrorMessage(null);
    if (promotion) updateMutation.mutate();
    else createMutation.mutate();
  };

  const unit =
    formData.discountType === "PERCENTAGE" ? " (%)" : formData.discountType === "FIXED_AMOUNT" ? " (FCFA)" : "";

  return (
    <>
      <PageHeader
        title={promotion ? "Modifier la promotion" : "Nouvelle promotion"}
        subtitle={promotion ? <span className="font-mono">{promotion.code}</span> : "Le code est généré automatiquement."}
        onBack={goBack}
        backLabel={promotion ? "Promotion" : "Promotions"}
      />
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={errorMessage} />

        <Section title="Réduction" icon={Percent}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nom" required className="md:col-span-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={FIELD}
              />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className={`${FIELD} resize-none`}
              />
            </Field>
            <Field label="Type de réduction" required>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as Promotion["discountType"] })}
                className={FIELD}
              >
                {DISCOUNT_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Valeur${unit}`} required>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                required
                min="0"
                step={formData.discountType === "PERCENTAGE" ? "0.1" : "100"}
                max={formData.discountType === "PERCENTAGE" ? 100 : undefined}
                className={FIELD}
              />
            </Field>
          </div>
        </Section>

        <Section title="Période et limites" icon={CalendarDays}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Date de début" required>
              <input
                type="date"
                value={formData.startsAt}
                onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                required
                className={FIELD}
              />
            </Field>
            <Field label="Date de fin">
              <input
                type="date"
                value={formData.endsAt}
                min={formData.startsAt}
                onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                className={FIELD}
              />
            </Field>
            <Field label="Utilisations max">
              <input
                type="number"
                min="1"
                value={formData.maxRedemptions}
                onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value })}
                placeholder="Illimité"
                className={FIELD}
              />
            </Field>
            <Field
              label="Métadonnées (JSON)"
              className="md:col-span-3"
              error={formData.metadataJson && !isMetadataJsonValid ? "JSON invalide" : undefined}
            >
              <textarea
                value={formData.metadataJson}
                onChange={(e) => setFormData({ ...formData, metadataJson: e.target.value })}
                placeholder='{"campaign": "2026"}'
                rows={3}
                className={`${FIELD} resize-none font-mono`}
              />
            </Field>
          </div>
        </Section>

        <div className="flex flex-col-reverse gap-2 pb-4 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={goBack} disabled={isPending}>
            Annuler
          </ActionButton>
          <ActionButton type="submit" pending={isPending} disabled={!isMetadataJsonValid || !formData.name.trim()}>
            {promotion ? "Mettre à jour" : "Créer la promotion"}
          </ActionButton>
        </div>
      </form>
    </>
  );
};

/** Page de création (/promotions/create) et de modification (/promotions/:code/edit). */
export const PromotionFormPage: React.FC = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["promotion", code],
    queryFn: async () => {
      const res = await subscriptionService.getPromotions({ code, size: 1 });
      return res.content.find((p) => p.code === code) ?? null;
    },
    enabled: !!code,
  });

  let body: React.ReactNode;
  if (!code) body = <PromotionForm promotion={null} />;
  else if (isLoading) body = <DetailsSkeleton />;
  else if (error || !data)
    body = (
      <>
        <PageHeader title="Promotion introuvable" onBack={() => navigate("/subscriptions/promotions")} backLabel="Promotions" />
        <ErrorBlock message="Cette promotion n'existe pas ou n'est plus accessible." />
      </>
    );
  else if (data.status !== "DRAFT")
    body = (
      <>
        <PageHeader title={data.name} onBack={() => navigate(`/subscriptions/promotions/${data.code}`)} backLabel="Promotion" />
        <ErrorBlock message="Seule une promotion en brouillon peut être modifiée." />
      </>
    );
  else body = <PromotionForm promotion={data} />;

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        {body}
      </div>
      <Toaster />
    </AdminLayout>
  );
};
