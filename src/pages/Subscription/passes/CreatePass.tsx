import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, User, Ticket, CalendarDays, Tags } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { EntitlementDefinition, PassEntitlement } from "../../../services/subscription.service";
import type { MemberSummaryResponse } from "../../../services/member.service";
import type { CustomerSummaryResponse } from "../../../services/customer.service";
import { MemberAutocomplete } from "../../../components/members/MemberAutocomplete";
import { CustomerAutocomplete } from "../../../components/customers/CustomerAutocomplete";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { Toaster } from "../../../components/ui/Toaster";
import { toast } from "../../../components/ui/toastStore";
import {
  ActionButton,
  CheckField,
  ErrorBanner,
  Field,
  IconButton,
  ItemRow,
  PageHeader,
  Section,
} from "../../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { PASS_TYPE_LABELS } from "../../../components/subscription/labels";

const buildDefaultForm = () => ({
  passType: "TIME_PACK",
  ownerType: "MEMBER",
  ownerCode: "",
  name: "",
  description: "",
  validFrom: new Date().toISOString().slice(0, 16),
  validUntil: "",
  transferable: false,
  shareable: false,
  maxUses: "",
});

const createEmptyEntitlement = (): PassEntitlement => ({
  entitlementCode: "",
  quantity: 0,
  unlimited: false,
  validFrom: "",
  validUntil: "",
});

/** Page de création d'un pass (remplace CreatePassModal). */
export const CreatePass: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(buildDefaultForm);
  const [entitlements, setEntitlements] = useState<PassEntitlement[]>([createEmptyEntitlement()]);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () => subscriptionService.getEntitlementDefinitions({ active: true, size: 100 }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];

  const handleOwnerTypeChange = (type: string) => {
    setFormData((p) => ({ ...p, ownerType: type, ownerCode: "" }));
    setSelectedMember(null);
    setSelectedCustomer(null);
  };

  const addEntitlement = () => setEntitlements((p) => [...p, createEmptyEntitlement()]);
  const removeEntitlement = (i: number) => setEntitlements((p) => p.filter((_, idx) => idx !== i));
  const updateEntitlement = (i: number, field: keyof PassEntitlement, value: unknown) =>
    setEntitlements((p) => p.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));

  const createMutation = useMutation({
    mutationFn: () =>
      subscriptionService.createPass({
        passType: formData.passType,
        ownerType: formData.ownerType,
        ownerCode: formData.ownerCode,
        name: formData.name,
        description: formData.description || undefined,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil || undefined,
        transferable: formData.transferable,
        shareable: formData.shareable,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : undefined,
        entitlements: entitlements.filter((e) => e.entitlementCode.trim() !== ""),
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
      toast.success("Pass créé");
      navigate(created?.passNumber ? `/subscriptions/passes/${created.passNumber}` : "/subscriptions/passes");
    },
    onError: (error: unknown) => setErrorMessage(apiMessage(error, "Erreur lors de la création du pass.")),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerCode) {
      setErrorMessage("Veuillez sélectionner un propriétaire.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate();
  };

  const goBack = () => navigate("/subscriptions/passes");

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title="Nouveau pass"
          subtitle="Créer un pass d'accès ou de crédits"
          onBack={goBack}
          backLabel="Pass"
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorBanner message={errorMessage} />

          <Section title="Informations générales" icon={Ticket}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Type de pass" required>
                <select
                  value={formData.passType}
                  onChange={(e) => setFormData({ ...formData, passType: e.target.value })}
                  className={FIELD}
                >
                  {Object.entries(PASS_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nom" required>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="ex : Pack 10 heures"
                  className={FIELD}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description">
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className={`${FIELD} resize-none`}
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Propriétaire" icon={User}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Type" required>
                <select
                  value={formData.ownerType}
                  onChange={(e) => handleOwnerTypeChange(e.target.value)}
                  className={FIELD}
                >
                  <option value="MEMBER">Membre</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </Field>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-gray-600">
                  {formData.ownerType === "MEMBER" ? "Membre" : "Customer"}
                  <span className="text-[color:var(--logo-pink-dark)]"> *</span>
                </span>
                {formData.ownerType === "MEMBER" ? (
                  <MemberAutocomplete
                    selectedMember={selectedMember}
                    onSelect={(m) => {
                      setSelectedMember(m);
                      setFormData((p) => ({ ...p, ownerCode: m?.memberId ?? "" }));
                    }}
                    placeholder="Rechercher un membre..."
                  />
                ) : (
                  <CustomerAutocomplete
                    selectedCustomer={selectedCustomer}
                    onSelect={(c) => {
                      setSelectedCustomer(c);
                      setFormData((p) => ({ ...p, ownerCode: c?.customerId ?? "" }));
                    }}
                    placeholder="Rechercher un customer..."
                  />
                )}
                {formData.ownerCode && (
                  <p className="mt-1 font-mono text-xs text-gray-400">Code : {formData.ownerCode}</p>
                )}
              </div>
            </div>
          </Section>

          <Section title="Validité" icon={CalendarDays}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Début" required>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  required
                  className={FIELD}
                />
              </Field>
              <Field label="Fin">
                <input
                  type="datetime-local"
                  value={formData.validUntil}
                  min={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  className={FIELD}
                />
              </Field>
              <Field label="Utilisations max">
                <input
                  type="number"
                  min="1"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="Illimité"
                  className={FIELD}
                />
              </Field>
              <CheckField
                checked={formData.transferable}
                onChange={(v) => setFormData({ ...formData, transferable: v })}
                label="Transférable"
              />
              <CheckField
                checked={formData.shareable}
                onChange={(v) => setFormData({ ...formData, shareable: v })}
                label="Partageable"
              />
            </div>
          </Section>

          <Section
            title="Droits inclus"
            icon={Tags}
            action={
              <ActionButton variant="ghost" icon={Plus} className="!px-4 !py-2" onClick={addEntitlement}>
                Ajouter
              </ActionButton>
            }
          >
            <div className="space-y-3">
              {entitlements.map((ent, i) => (
                <ItemRow key={i}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Droit" className="sm:col-span-2">
                      <select
                        value={ent.entitlementCode}
                        onChange={(e) => updateEntitlement(i, "entitlementCode", e.target.value)}
                        className={FIELD_SOFT}
                      >
                        <option value="">Sélectionner</option>
                        {entDefs.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Quantité">
                      <input
                        type="number"
                        min="0"
                        value={ent.quantity}
                        onChange={(e) => updateEntitlement(i, "quantity", parseInt(e.target.value) || 0)}
                        disabled={ent.unlimited}
                        className={FIELD_SOFT}
                      />
                    </Field>
                    <label className="flex cursor-pointer items-center gap-2 self-end pb-2.5 text-sm font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={ent.unlimited}
                        onChange={(e) => updateEntitlement(i, "unlimited", e.target.checked)}
                        className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
                      />
                      Illimité
                    </label>
                    <Field label="Valide du" className="sm:col-span-1 lg:col-span-2">
                      <input
                        type="datetime-local"
                        value={ent.validFrom ?? ""}
                        onChange={(e) => updateEntitlement(i, "validFrom", e.target.value)}
                        className={FIELD_SOFT}
                      />
                    </Field>
                    <Field label="Au" className="sm:col-span-1 lg:col-span-2">
                      <input
                        type="datetime-local"
                        value={ent.validUntil ?? ""}
                        onChange={(e) => updateEntitlement(i, "validUntil", e.target.value)}
                        className={FIELD_SOFT}
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <IconButton
                      icon={Trash2}
                      label="Retirer ce droit"
                      tone="danger"
                      disabled={entitlements.length === 1}
                      onClick={() => removeEntitlement(i)}
                    />
                  </div>
                </ItemRow>
              ))}
            </div>
          </Section>

          <div className="flex flex-col-reverse gap-2 pb-4 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={goBack} disabled={createMutation.isPending}>
              Annuler
            </ActionButton>
            <ActionButton
              type="submit"
              pending={createMutation.isPending}
              disabled={!formData.ownerCode || !formData.name}
            >
              Créer le pass
            </ActionButton>
          </div>
        </form>
      </div>
      <Toaster />
    </AdminLayout>
  );
};
