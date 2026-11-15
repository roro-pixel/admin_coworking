import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, Coins, Link2, User } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { EntitlementDefinition } from "../../../services/subscription.service";
import type { MemberSummaryResponse } from "../../../services/member.service";
import { MemberAutocomplete } from "../../../components/members/MemberAutocomplete";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  CheckField,
  ErrorBanner,
  Field,
  PanelForm,
  Section,
} from "../../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";

interface Props {
  /** "page" : sections centrées (page de création) ; "panel" : formulaire déplié dans un onglet */
  layout: "page" | "panel";
  onDone: () => void;
  onCancel: () => void;
  /** Pré-remplit le propriétaire quand le formulaire est ouvert depuis le détail d'une souscription */
  defaultOwnerType?: string;
  defaultOwnerCode?: string;
}

const referenceTypes = [
  { value: "BOOKING", label: "Réservation" },
  { value: "MANUAL", label: "Manuel" },
  { value: "SUBSCRIPTION", label: "Souscription" },
];

const ownerTypeOptions = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Customer" },
];

const buildDefault = (ownerType = "MEMBER", ownerCode = "") => ({
  ownerType,
  ownerCode,
  entitlementCode: "",
  quantity: 1,
  unit: "HOUR",
  referenceType: "MANUAL",
  referenceId: "",
  consumeEntitlement: true,
  billable: false,
  billableAmount: 0,
  currency: "XAF",
  occurredAt: new Date().toISOString().slice(0, 16),
});

export const UsageRecordForm: React.FC<Props> = ({
  layout,
  onDone,
  onCancel,
  defaultOwnerType = "MEMBER",
  defaultOwnerCode = "",
}) => {
  const queryClient = useQueryClient();
  const F = layout === "page" ? FIELD : FIELD_SOFT;
  const [formData, setFormData] = useState(() => buildDefault(defaultOwnerType, defaultOwnerCode));
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];

  // Unité automatique depuis la définition sélectionnée
  const selectedDef = entDefs.find((d) => d.code === formData.entitlementCode);
  useEffect(() => {
    if (selectedDef) setFormData((p) => ({ ...p, unit: selectedDef.unit }));
  }, [selectedDef]);

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createUsageRecord({
        ownerType: formData.ownerType,
        ownerCode: formData.ownerCode,
        entitlementCode: formData.entitlementCode,
        quantity: formData.quantity,
        unit: formData.unit,
        referenceType: formData.referenceType || undefined,
        referenceId: formData.referenceId || undefined,
        consumeEntitlement: formData.consumeEntitlement,
        billable: formData.billable,
        billableAmount: formData.billable ? formData.billableAmount : undefined,
        currency: formData.billable ? formData.currency : undefined,
        occurredAt: `${formData.occurredAt}:00Z`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usage-records"] });
      toast.success("Usage enregistré");
      onDone();
    },
    onError: (error: unknown) => {
      const msg = apiMessage(error, "Erreur lors de l'enregistrement.");
      setErrorMessage(msg);
      if (layout === "page") toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerCode) {
      setErrorMessage("Propriétaire requis.");
      return;
    }
    if (!formData.entitlementCode) {
      setErrorMessage("Droit requis.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  const owner = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Type propriétaire" required>
        <select
          value={formData.ownerType}
          onChange={(e) => {
            setSelectedMember(null);
            setFormData({ ...formData, ownerType: e.target.value, ownerCode: "" });
          }}
          className={F}
        >
          {ownerTypeOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>
      {formData.ownerType === "MEMBER" ? (
        <div>
          <span className="mb-1.5 block text-xs font-semibold text-gray-600">
            Membre<span className="text-[color:var(--logo-pink-dark)]"> *</span>
          </span>
          <MemberAutocomplete
            selectedMember={selectedMember}
            onSelect={(m) => {
              setSelectedMember(m);
              setFormData((p) => ({ ...p, ownerCode: m?.memberId ?? "" }));
            }}
            placeholder={
              defaultOwnerCode && formData.ownerCode === defaultOwnerCode
                ? defaultOwnerCode
                : "Rechercher un membre..."
            }
          />
          {formData.ownerCode && (
            <p className="mt-1 font-mono text-xs text-gray-400">Code : {formData.ownerCode}</p>
          )}
        </div>
      ) : (
        <Field label="Code propriétaire" required>
          <input
            type="text"
            value={formData.ownerCode}
            onChange={(e) => setFormData({ ...formData, ownerCode: e.target.value })}
            placeholder="ex: CUS-000001"
            className={F}
          />
        </Field>
      )}
    </div>
  );

  const consumption = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Droit consommé" required className="md:col-span-2">
        <select
          value={formData.entitlementCode}
          onChange={(e) => setFormData({ ...formData, entitlementCode: e.target.value })}
          required
          className={F}
        >
          <option value="">Sélectionner un droit</option>
          {entDefs.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name} ({d.unit})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Quantité" required>
        <input
          type="number"
          min="0"
          step="0.5"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
          required
          className={F}
        />
      </Field>
      <Field label={selectedDef ? `Unité (${selectedDef.unit})` : "Unité"}>
        <input
          type="text"
          value={formData.unit}
          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          readOnly={!!selectedDef}
          className={`${F} ${selectedDef ? "!bg-gray-100" : ""}`}
        />
      </Field>
      <Field label="Date d'occurrence" required className="md:col-span-2">
        <input
          type="datetime-local"
          value={formData.occurredAt}
          onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
          required
          className={F}
        />
      </Field>
    </div>
  );

  const reference = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Type référence">
        <select
          value={formData.referenceType}
          onChange={(e) => setFormData({ ...formData, referenceType: e.target.value })}
          className={F}
        >
          {referenceTypes.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="ID référence">
        <input
          type="text"
          value={formData.referenceId}
          onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
          placeholder="ex: BKG-202604-000001"
          className={F}
        />
      </Field>
    </div>
  );

  const billing = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CheckField
          checked={formData.consumeEntitlement}
          onChange={(v) => setFormData({ ...formData, consumeEntitlement: v })}
          label="Consommer le droit"
        />
        <CheckField
          checked={formData.billable}
          onChange={(v) => setFormData({ ...formData, billable: v })}
          label="Facturable"
        />
      </div>
      {formData.billable && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Montant facturable">
            <input
              type="number"
              min="0"
              value={formData.billableAmount}
              onChange={(e) =>
                setFormData({ ...formData, billableAmount: parseFloat(e.target.value) || 0 })
              }
              className={F}
            />
          </Field>
          <Field label="Devise">
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className={F}
            >
              <option value="XAF">XAF (FCFA)</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
        </div>
      )}
    </div>
  );

  if (layout === "panel") {
    return (
      <PanelForm
        title="Enregistrer un usage"
        onSubmit={handleSubmit}
        onCancel={onCancel}
        pending={createMutation.isPending}
        submitLabel="Enregistrer"
        error={errorMessage}
      >
        {owner}
        {consumption}
        {reference}
        {billing}
      </PanelForm>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorBanner message={errorMessage} />
      <Section title="Propriétaire" icon={User}>
        {owner}
      </Section>
      <Section title="Consommation" icon={Activity}>
        {consumption}
      </Section>
      <Section title="Référence" description="Optionnel" icon={Link2}>
        {reference}
      </Section>
      <Section title="Options et facturation" icon={Coins}>
        {billing}
      </Section>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <ActionButton variant="ghost" onClick={onCancel} disabled={createMutation.isPending}>
          Annuler
        </ActionButton>
        <ActionButton type="submit" pending={createMutation.isPending}>
          Enregistrer
        </ActionButton>
      </div>
    </form>
  );
};
