import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { contractService } from "../../services/contract.service";
import type {
  TemplateResponse,
  CreateContractRequest,
} from "../../services/contract.service";
import { CustomerAutocomplete } from "./CustomerAutocomplete";
import { MemberAutocomplete } from "./MemberAutocomplete";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { ModalPortal } from "../ui/ModalPortal";
import { useAuth } from "../../contexts/AuthContext";

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateContractRequest) => void;
  initialData?: any;
  isEditing?: boolean;
}

const ownerTypes = [
  { value: "MEMBER", label: "Membre" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "BUSINESS", label: "Business" },
];

const renewalTypes = [
  { value: "FIXED_TERM", label: "Durée déterminée" },
  { value: "AUTO_RENEW", label: "Renouvellement automatique" },
  { value: "NONE", label: "Aucun renouvellement" },
];

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing,
}) => {
  const { admin } = useAuth();
  const [templates, setTemplates] = useState<TemplateResponse[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<
    CustomerSummaryResponse | MemberSummaryResponse | null
  >(null);
  const [selectedBusiness, setSelectedBusiness] =
    useState<CustomerSummaryResponse | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    templateCode: "",
    ownerType: "MEMBER",
    ownerCode: "",
    businessCode: "",
    renewalType: "FIXED_TERM",
    effectiveDate: new Date().toISOString().split("T")[0],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    createdBy: admin?.id ? parseInt(String(admin.id)) : 1,
    parties: [] as any[],
  });

  const [newParty, setNewParty] = useState({
    partyType: "MEMBER",
    partyCode: "",
    displayName: "",
    email: "",
    phone: "",
    role: "SIGNATORY",
    signOrder: 1,
    mustSign: true,
  });

  const [selectedPartyCustomer, setSelectedPartyCustomer] =
    useState<CustomerSummaryResponse | null>(null);
  const [selectedPartyMember, setSelectedPartyMember] =
    useState<MemberSummaryResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      contractService.getTemplates().then(setTemplates);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        effectiveDate: initialData.effectiveDate?.split("T")[0] || "",
        startDate: initialData.startDate?.split("T")[0] || "",
        endDate: initialData.endDate?.split("T")[0] || "",
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOwnerSelect = (
    item: CustomerSummaryResponse | MemberSummaryResponse | null,
    type: string,
  ) => {
    if (item) {
      setFormData({
        ...formData,
        ownerType: type as any,
        ownerCode:
          (item as any).customerId ||
          (item as any).memberId ||
          (item as any).code,
      });
      setSelectedOwner(item);
    } else {
      setFormData({ ...formData, ownerCode: "" });
      setSelectedOwner(null);
    }
  };

  const handleBusinessSelect = (customer: CustomerSummaryResponse | null) => {
    if (customer) {
      setFormData({ ...formData, businessCode: customer.customerId });
      setSelectedBusiness(customer);
    } else {
      setFormData({ ...formData, businessCode: "" });
      setSelectedBusiness(null);
    }
  };

  const addParty = () => {
    if (newParty.partyCode && newParty.displayName && newParty.email) {
      setFormData({
        ...formData,
        parties: [
          ...formData.parties,
          { ...newParty, signOrder: formData.parties.length + 1 },
        ],
      });
      setNewParty({
        partyType: "MEMBER",
        partyCode: "",
        displayName: "",
        email: "",
        phone: "",
        role: "SIGNATORY",
        signOrder: formData.parties.length + 2,
        mustSign: true,
      });
      setSelectedPartyCustomer(null);
      setSelectedPartyMember(null);
    }
  };

  const handlePartyTypeChange = (type: string) => {
    setNewParty({
      ...newParty,
      partyType: type,
      partyCode: "",
      displayName: "",
      email: "",
      phone: "",
    });
    setSelectedPartyCustomer(null);
    setSelectedPartyMember(null);
  };

  const handlePartySelect = (item: any, type: string) => {
    if (type === "CUSTOMER") {
      setNewParty({
        ...newParty,
        partyType: "CUSTOMER",
        partyCode: item.customerId,
        displayName: item.displayName,
        email: item.email,
      });
      setSelectedPartyCustomer(item);
      setSelectedPartyMember(null);
    } else if (type === "MEMBER") {
      setNewParty({
        ...newParty,
        partyType: "MEMBER",
        partyCode: item.memberId,
        displayName: item.fullName,
        email: item.email,
      });
      setSelectedPartyMember(item);
      setSelectedPartyCustomer(null);
    }
  };

  const removeParty = (index: number) => {
    setFormData({
      ...formData,
      parties: formData.parties.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateContractRequest = {
      title: formData.title,
      description: formData.description || undefined,
      templateCode: formData.templateCode,
      ownerType: formData.ownerType as any,
      ownerCode: formData.ownerCode,
      businessCode: formData.businessCode || undefined,
      renewalType: formData.renewalType as any,
      effectiveDate: formData.effectiveDate,
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      createdBy: admin?.id ? Number(admin.id) : 1,
      parties: formData.parties.map((party, idx) => ({
        partyType: party.partyType,
        partyCode: party.partyCode,
        displayName: party.displayName,
        email: party.email,
        phone: party.phone || undefined,
        role: party.role,
        signOrder: idx + 1,
        mustSign: party.mustSign ?? party.role === "SIGNATORY",
      })),
    };
    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose} size="2xl">
      <div className="max-h-[85vh] overflow-y-auto rounded-2xl bg-white">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 p-5 backdrop-blur ring-1 ring-gray-100">
          <h3 className="text-xl font-bold">
            {isEditing ? "Modifier le contrat" : "Nouveau contrat"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations générales */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Informations générales
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Titre *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl bg-gray-50/60 px-3 py-2.5 ring-1 ring-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full rounded-2xl bg-gray-50/60 px-3 py-2.5 ring-1 ring-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Template *
                  </label>
                  <select
                    name="templateCode"
                    value={formData.templateCode}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="">Sélectionner</option>
                    {templates.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Type de propriétaire *
                  </label>
                  <select
                    name="ownerType"
                    value={formData.ownerType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    {ownerTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Propriétaire *
                  </label>
                  {formData.ownerType === "MEMBER" ? (
                    <MemberAutocomplete
                      onSelect={(member) =>
                        handleOwnerSelect(member as any, "MEMBER")
                      }
                      selectedMember={selectedOwner as MemberSummaryResponse}
                      placeholder="Rechercher un membre..."
                    />
                  ) : (
                    <CustomerAutocomplete
                      onSelect={(customer) =>
                        handleOwnerSelect(customer, formData.ownerType)
                      }
                      selectedCustomer={
                        selectedOwner as CustomerSummaryResponse
                      }
                      placeholder="Rechercher un customer..."
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Business (optionnel)
                  </label>
                  <CustomerAutocomplete
                    onSelect={handleBusinessSelect}
                    selectedCustomer={selectedBusiness}
                    placeholder="Rechercher un business..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Dates
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date d'effet *
                </label>
                <input
                  type="date"
                  name="effectiveDate"
                  value={formData.effectiveDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date de début *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Type de renouvellement *
                </label>
                <select
                  name="renewalType"
                  value={formData.renewalType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  {renewalTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Parties prenantes
            </h4>
            <div className="space-y-3 mb-4">
              {formData.parties.map((party, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
                >
                  <div>
                    <p className="font-medium">{party.displayName}</p>
                    <div className="flex gap-2 mt-1 text-xs text-gray-500">
                      <span>{party.partyType}</span>
                      <span>{party.partyCode}</span>
                      <span>{party.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeParty(index)}
                    className="text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Ajouter une partie</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select
                  value={newParty.partyType}
                  onChange={(e) => handlePartyTypeChange(e.target.value)}
                  className="px-3 py-2 border rounded-xl"
                >
                  <option value="MEMBER">Membre</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="BUSINESS">Business</option>
                </select>
                <select
                  value={newParty.role}
                  onChange={(e) =>
                    setNewParty({ ...newParty, role: e.target.value })
                  }
                  className="px-3 py-2 border rounded-xl"
                >
                  <option value="SIGNATORY">Signataire</option>
                  <option value="BENEFICIARY">Bénéficiaire</option>
                  <option value="OPERATOR">Opérateur</option>
                </select>
              </div>

              {newParty.partyType === "MEMBER" ? (
                <MemberAutocomplete
                  onSelect={(member) => handlePartySelect(member, "MEMBER")}
                  selectedMember={selectedPartyMember}
                  placeholder="Rechercher un membre..."
                />
              ) : (
                <CustomerAutocomplete
                  onSelect={(customer) =>
                    handlePartySelect(customer, "CUSTOMER")
                  }
                  selectedCustomer={selectedPartyCustomer}
                  placeholder="Rechercher un customer..."
                />
              )}

              <input
                type="tel"
                placeholder="Téléphone (optionnel)"
                value={newParty.phone}
                onChange={(e) =>
                  setNewParty({ ...newParty, phone: e.target.value })
                }
                className="w-full mt-3 px-3 py-2 border rounded-xl"
              />

              <button
                type="button"
                onClick={addParty}
                disabled={
                  !newParty.partyCode ||
                  !newParty.displayName ||
                  !newParty.email
                }
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-xl hover:bg-primary-50 disabled:opacity-50"
              >
                <Plus size={16} />
                Ajouter
              </button>
            </div>

            {formData.parties.length === 0 && (
              <p className="text-sm text-red-500 mt-2">
                Au moins une partie signataire est requise
              </p>
            )}
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-xl text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                formData.parties.length === 0 ||
                !formData.templateCode ||
                !formData.ownerCode
              }
              className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
            >
              {isEditing ? "Mettre à jour" : "Créer le contrat"}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
