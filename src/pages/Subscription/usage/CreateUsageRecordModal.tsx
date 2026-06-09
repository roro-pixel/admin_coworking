import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type { EntitlementDefinition } from "../../../services/subscription.service";
import type { MemberSummaryResponse } from "../../../services/member.service";
import { MemberAutocomplete } from "../../../components/members/MemberAutocomplete";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface CreateUsageRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Pré-remplit ownerType/ownerCode si ouvert depuis le détail subscription */
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

export const CreateUsageRecordModal: React.FC<CreateUsageRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultOwnerType = "MEMBER",
  defaultOwnerCode = "",
}) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(() =>
    buildDefault(defaultOwnerType, defaultOwnerCode),
  );
  const [selectedMember, setSelectedMember] =
    useState<MemberSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(buildDefault(defaultOwnerType, defaultOwnerCode));
      setSelectedMember(null);
      setErrorMessage(null);
    }
  }, [isOpen, defaultOwnerType, defaultOwnerCode]);

  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () =>
      subscriptionService.getEntitlementDefinitions({
        active: true,
        size: 100,
      }),
    enabled: isOpen,
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];

  // Unité auto depuis la définition sélectionnée
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
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ?? "Erreur lors de l'enregistrement.",
      );
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

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
        <h3 className="text-xl font-bold">Enregistrer un usage</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {/* Propriétaire */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type propriétaire *
            </label>
            <select
              value={formData.ownerType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ownerType: e.target.value,
                  ownerCode: "",
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {ownerTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.ownerType === "MEMBER"
                ? "Membre *"
                : "Code propriétaire *"}
            </label>
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
              <input
                type="text"
                value={formData.ownerCode}
                onChange={(e) =>
                  setFormData({ ...formData, ownerCode: e.target.value })
                }
                placeholder="ex: CUS-000001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            )}
          </div>
        </div>

        {/* Droit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Droit consommé *
          </label>
          <select
            value={formData.entitlementCode}
            onChange={(e) =>
              setFormData({ ...formData, entitlementCode: e.target.value })
            }
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">Sélectionner un droit</option>
            {entDefs.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name} ({d.unit})
              </option>
            ))}
          </select>
        </div>

        {/* Quantité + unité */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantité *
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: parseFloat(e.target.value) || 0,
                })
              }
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unité{selectedDef ? ` (${selectedDef.unit})` : ""}
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
              readOnly={!!selectedDef}
            />
          </div>
        </div>

        {/* Référence */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type référence
            </label>
            <select
              value={formData.referenceType}
              onChange={(e) =>
                setFormData({ ...formData, referenceType: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {referenceTypes.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID référence
            </label>
            <input
              type="text"
              value={formData.referenceId}
              onChange={(e) =>
                setFormData({ ...formData, referenceId: e.target.value })
              }
              placeholder="ex: BKG-202604-000001"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date d'occurrence *
          </label>
          <input
            type="datetime-local"
            value={formData.occurredAt}
            onChange={(e) =>
              setFormData({ ...formData, occurredAt: e.target.value })
            }
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        {/* Options */}
        <div className="flex items-center gap-6 p-3 bg-gray-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={formData.consumeEntitlement}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  consumeEntitlement: e.target.checked,
                })
              }
              className="rounded"
            />
            Consommer le droit
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={formData.billable}
              onChange={(e) =>
                setFormData({ ...formData, billable: e.target.checked })
              }
              className="rounded"
            />
            Facturable
          </label>
        </div>

        {/* Montant facturable (conditionnel) */}
        {formData.billable && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant facturable
              </label>
              <input
                type="number"
                min="0"
                value={formData.billableAmount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billableAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Devise
              </label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="XAF">XAF (FCFA)</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
