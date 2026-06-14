import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Plus, Trash2, User } from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  EntitlementDefinition,
  PassEntitlement,
} from "../../../services/subscription.service";
import type { MemberSummaryResponse } from "../../../services/member.service";
import type { CustomerSummaryResponse } from "../../../services/customer.service";
import { MemberAutocomplete } from "../../../components/members/MemberAutocomplete";
import { CustomerAutocomplete } from "../../../components/customers/CustomerAutocomplete";
import { ModalPortal } from "../../../components/ui/ModalPortal";

interface CreatePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const passTypes = [
  { value: "DAY_PASS", label: "Pass journée" },
  { value: "TIME_PACK", label: "Pack heures" },
  { value: "VISITOR_PASS", label: "Pass visiteur" },
  { value: "MEETING_ROOM_PACK", label: "Pack salle de réunion" },
  { value: "PROMOTIONAL_PASS", label: "Pass promotionnel" },
  { value: "SUBSCRIPTION_PASS", label: "Pass souscription" },
  { value: "COMPANY_SHARED_PASS", label: "Pass entreprise partagé" },
  { value: "CUSTOM", label: "Personnalisé" },
];

const ownerTypeOptions = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Customer" },
];

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

export const CreatePassModal: React.FC<CreatePassModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(buildDefaultForm);
  const [entitlements, setEntitlements] = useState<PassEntitlement[]>([
    createEmptyEntitlement(),
  ]);
  const [selectedMember, setSelectedMember] =
    useState<MemberSummaryResponse | null>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(buildDefaultForm());
      setEntitlements([createEmptyEntitlement()]);
      setSelectedMember(null);
      setSelectedCustomer(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

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

  const handleOwnerTypeChange = (type: string) => {
    setFormData((p) => ({ ...p, ownerType: type, ownerCode: "" }));
    setSelectedMember(null);
    setSelectedCustomer(null);
  };

  // Entitlements
  const addEntitlement = () =>
    setEntitlements((p) => [...p, createEmptyEntitlement()]);
  const removeEntitlement = (i: number) =>
    setEntitlements((p) => p.filter((_, idx) => idx !== i));
  const updateEntitlement = (
    i: number,
    field: keyof PassEntitlement,
    value: any,
  ) =>
    setEntitlements((p) =>
      p.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)),
    );

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
        entitlements: entitlements.filter(
          (e) => e.entitlementCode.trim() !== "",
        ),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passes"] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ?? "Erreur lors de la création du pass.",
      );
    },
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

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="xl">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-2xl">
        <div>
          <h3 className="text-xl font-bold">Nouveau pass</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Créer un pass d'accès ou de crédits
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-gray-50/30">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {/* ── Infos générales ── */}
        <section>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
            Informations générales
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de pass *
              </label>
              <select
                value={formData.passType}
                onChange={(e) =>
                  setFormData({ ...formData, passType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              >
                {passTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="ex: Pack 10 heures"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>
          </div>
        </section>

        {/* ── Propriétaire ── */}
        <section>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <User size={13} /> Propriétaire
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                value={formData.ownerType}
                onChange={(e) => handleOwnerTypeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
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
                {formData.ownerType === "MEMBER" ? "Membre *" : "Customer *"}
              </label>
              {formData.ownerType === "MEMBER" ? (
                <MemberAutocomplete
                  selectedMember={selectedMember}
                  onSelect={(m) => {
                    setSelectedMember(m);
                    setFormData((p) => ({
                      ...p,
                      ownerCode: m?.memberId ?? "",
                    }));
                  }}
                  placeholder="Rechercher un membre..."
                />
              ) : (
                <CustomerAutocomplete
                  selectedCustomer={selectedCustomer}
                  onSelect={(c) => {
                    setSelectedCustomer(c);
                    setFormData((p) => ({
                      ...p,
                      ownerCode: c?.customerId ?? "",
                    }));
                  }}
                  placeholder="Rechercher un customer..."
                />
              )}
              {formData.ownerCode && (
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  Code : {formData.ownerCode}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Validité ── */}
        <section>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b border-gray-100">
            Validité
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Début *
              </label>
              <input
                type="datetime-local"
                value={formData.validFrom}
                onChange={(e) =>
                  setFormData({ ...formData, validFrom: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fin
              </label>
              <input
                type="datetime-local"
                value={formData.validUntil}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
                min={formData.validFrom}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Utilisations max
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxUses}
                onChange={(e) =>
                  setFormData({ ...formData, maxUses: e.target.value })
                }
                placeholder="Illimité"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-6 mt-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={formData.transferable}
                onChange={(e) =>
                  setFormData({ ...formData, transferable: e.target.checked })
                }
                className="rounded"
              />
              Transférable
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={formData.shareable}
                onChange={(e) =>
                  setFormData({ ...formData, shareable: e.target.checked })
                }
                className="rounded"
              />
              Partageable
            </label>
          </div>
        </section>

        {/* ── Droits inclus ── */}
        <section>
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Droits inclus
            </h4>
            <button
              type="button"
              onClick={addEntitlement}
              className="text-primary-600 text-sm flex items-center gap-1 hover:text-primary-700"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {entitlements.map((ent, i) => (
              <div
                key={i}
                className="flex gap-2 items-end p-4 bg-gray-50/70 border border-gray-100 rounded-xl flex-wrap"
              >
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-gray-500 mb-1">
                    Droit
                  </label>
                  <select
                    value={ent.entitlementCode}
                    onChange={(e) =>
                      updateEntitlement(i, "entitlementCode", e.target.value)
                    }
                    className="w-full px-2 py-1.5 border rounded-lg text-sm"
                  >
                    <option value="">Sélectionner</option>
                    {entDefs.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs text-gray-500 mb-1">
                    Quantité
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={ent.quantity}
                    onChange={(e) =>
                      updateEntitlement(
                        i,
                        "quantity",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    disabled={ent.unlimited}
                    className="w-full px-2 py-1.5 border rounded-lg text-sm text-center"
                  />
                </div>
                <label className="flex items-center gap-1 text-xs text-gray-500 pb-1">
                  <input
                    type="checkbox"
                    checked={ent.unlimited}
                    onChange={(e) =>
                      updateEntitlement(i, "unlimited", e.target.checked)
                    }
                    className="rounded"
                  />
                  Illimité
                </label>
                <div className="w-36">
                  <label className="block text-xs text-gray-500 mb-1">
                    Valide du
                  </label>
                  <input
                    type="datetime-local"
                    value={ent.validFrom ?? ""}
                    onChange={(e) =>
                      updateEntitlement(i, "validFrom", e.target.value)
                    }
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div className="w-36">
                  <label className="block text-xs text-gray-500 mb-1">au</label>
                  <input
                    type="datetime-local"
                    value={ent.validUntil ?? ""}
                    onChange={(e) =>
                      updateEntitlement(i, "validUntil", e.target.value)
                    }
                    className="w-full px-2 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeEntitlement(i)}
                  disabled={entitlements.length === 1}
                  className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30 mb-0.5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Boutons ── */}
        <div className="flex gap-3 pt-2 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 px-4 py-2.5 border rounded-xl text-gray-700 hover:bg-primary-50/40 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={
              createMutation.isPending || !formData.ownerCode || !formData.name
            }
            className="flex-1 bg-primary-600 text-white py-2.5 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Création...
              </>
            ) : (
              "Créer le pass"
            )}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
