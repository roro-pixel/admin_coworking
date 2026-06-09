import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  Save,
  Plus,
  Trash2,
  FileText,
  Building2,
  User,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Users,
  CheckCircle,
} from "lucide-react";
import { contractService } from "../../services/contract.service";
import type {
  CreateContractRequest,
  ContractResponse,
} from "../../services/contract.service";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import { useAuth } from "../../contexts/AuthContext";
import { CustomerAutocomplete } from "../../components/contracts/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/contracts/MemberAutocomplete";

const ownerTypes = [
  {
    value: "MEMBER",
    label: "Membre",
    description: "Contrat avec un membre individuel",
  },
  {
    value: "CUSTOMER",
    label: "Customer",
    description: "Contrat avec un customer",
  },
  {
    value: "BUSINESS",
    label: "Business",
    description: "Contrat avec une entreprise",
  },
];

const renewalTypes = [
  {
    value: "FIXED_TERM",
    label: "Durée déterminée",
    description: "Se termine à une date précise",
  },
  {
    value: "AUTO_RENEW",
    label: "Renouvellement automatique",
    description: "Se renouvelle automatiquement",
  },
  {
    value: "INDEFINITE",
    label: "Durée indéterminée",
    description: "Pas de date de fin",
  },
];

const partyRoles = [
  {
    value: "SIGNATORY",
    label: "Signataire",
    description: "Doit signer le contrat",
    color: "bg-green-100 text-green-700",
  },
  {
    value: "BENEFICIARY",
    label: "Bénéficiaire",
    description: "Bénéficie des droits",
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "WITNESS",
    label: "Témoin",
    description: "Témoin de la signature",
    color: "bg-gray-100 text-gray-600",
  },
];

const partyTypes = [
  { value: "MEMBER", label: "Membre", icon: User },
  { value: "CUSTOMER", label: "Customer", icon: Building2 },
  { value: "BUSINESS", label: "Business", icon: Building2 },
];

export const ContractCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => contractService.getTemplates(),
  });

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    templateCode: "",
    ownerType: "MEMBER" as "MEMBER" | "CUSTOMER" | "BUSINESS",
    ownerCode: "",
    businessCode: "",
    renewalType: "FIXED_TERM" as "FIXED_TERM" | "AUTO_RENEW" | "INDEFINITE",
    effectiveDate: new Date().toISOString().split("T")[0],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });

  const [selectedOwner, setSelectedOwner] = useState<
    CustomerSummaryResponse | MemberSummaryResponse | null
  >(null);
  const [selectedBusiness, setSelectedBusiness] =
    useState<CustomerSummaryResponse | null>(null);
  const [parties, setParties] = useState<
    Array<{
      partyType: string;
      partyCode: string;
      displayName: string;
      email: string;
      phone?: string;
      role: string;
      signOrder: number;
      mustSign: boolean;
    }>
  >([]);

  const [newParty, setNewParty] = useState({
    partyType: "MEMBER",
    partyCode: "",
    displayName: "",
    email: "",
    phone: "",
    role: "SIGNATORY",
    mustSign: true,
  });

  const [selectedPartyCustomer, setSelectedPartyCustomer] =
    useState<CustomerSummaryResponse | null>(null);
  const [selectedPartyMember, setSelectedPartyMember] =
    useState<MemberSummaryResponse | null>(null);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Le titre est requis";
    if (!formData.templateCode)
      newErrors.templateCode = "Veuillez sélectionner un template";
    if (!formData.ownerCode)
      newErrors.ownerCode = "Veuillez sélectionner un propriétaire";
    if (!formData.effectiveDate)
      newErrors.effectiveDate = "Date d'effet requise";
    if (!formData.startDate) newErrors.startDate = "Date de début requise";
    if (parties.length === 0)
      newErrors.parties = "Au moins une partie est requise";
    if (!parties.some((p) => p.role === "SIGNATORY"))
      newErrors.parties = "Au moins un signataire est requis";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addParty = () => {
    if (!newParty.partyCode || !newParty.displayName || !newParty.email) {
      setErrors({
        ...errors,
        addParty: "Veuillez remplir tous les champs obligatoires",
      });
      return;
    }
    setParties([...parties, { ...newParty, signOrder: parties.length + 1 }]);
    setNewParty({
      partyType: "MEMBER",
      partyCode: "",
      displayName: "",
      email: "",
      phone: "",
      role: "SIGNATORY",
      mustSign: true,
    });
    setSelectedPartyCustomer(null);
    setSelectedPartyMember(null);
    setShowPartyForm(false);
    const newErrors = { ...errors };
    delete newErrors.addParty;
    setErrors(newErrors);
  };

  const removeParty = (index: number) => {
    setParties(parties.filter((_, i) => i !== index));
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

  const handleOwnerSelect = (item: any, type: string) => {
    if (item) {
      setFormData({
        ...formData,
        ownerType: type as any,
        ownerCode: item.customerId || item.memberId,
      });
      setSelectedOwner(item);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateContractRequest = {
        title: formData.title,
        description: formData.description || undefined,
        templateCode: formData.templateCode,
        ownerType: formData.ownerType,
        ownerCode: formData.ownerCode,
        businessCode: formData.businessCode || undefined,
        renewalType: formData.renewalType,
        effectiveDate: formData.effectiveDate,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        createdBy: admin?.id ? Number(admin.id) : 1,
        parties: parties.map((p, idx) => ({
          partyType: p.partyType as any,
          partyCode: p.partyCode,
          displayName: p.displayName,
          email: p.email,
          phone: p.phone || undefined,
          role: p.role as any,
          signOrder: idx + 1,
          mustSign: p.role === "SIGNATORY",
        })),
      };
      return contractService.createContract(payload);
    },
    onSuccess: (contract: ContractResponse) => {
      navigate(`/contracts/${contract.contractCode}`);
    },
    onError: (err: any) => {
      setSubmitError(
        err?.response?.data?.message || "Erreur lors de la création du contrat",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createMutation.mutate();
    }
  };

  const signatoryCount = parties.filter((p) => p.role === "SIGNATORY").length;
  const beneficiaryCount = parties.filter(
    (p) => p.role === "BENEFICIARY",
  ).length;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate("/contracts")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft size={18} />
            Retour aux contrats
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Créer un contrat
              </h1>
              <p className="text-gray-500 mt-1">
                Remplissez tous les détails du contrat
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Créer le contrat
              </button>
            </div>
          </div>
        </div>

        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle size={18} />
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Template */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="border-b bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-primary-600" />
                Template et informations
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template de contrat *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {templatesLoading ? (
                    <div className="col-span-2 text-center py-4">
                      <Loader2 className="animate-spin mx-auto" size={24} />
                    </div>
                  ) : (
                    templates.map((t) => (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, templateCode: t.code })
                        }
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          formData.templateCode === t.code
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-gray-900">{t.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {t.description}
                        </p>
                      </button>
                    ))
                  )}
                </div>
                {errors.templateCode && (
                  <p className="text-sm text-red-600 mt-2">
                    {errors.templateCode}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre du contrat *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="ex: Contrat d'abonnement Mensuel"
                    className={`w-full px-4 py-3 border rounded-xl ${errors.title ? "border-red-500" : "border-gray-200"}`}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1">{errors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Description optionnelle"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Propriétaire */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="border-b bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User size={18} className="text-primary-600" />
                Propriétaire du contrat
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de propriétaire *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {ownerTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            ownerType: type.value as any,
                            ownerCode: "",
                          })
                        }
                        className={`p-3 rounded-xl text-center transition-all ${
                          formData.ownerType === type.value
                            ? "bg-primary-50 border-2 border-primary-500"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="text-lg mb-1">{type.label}</div>
                        <div className="text-xs text-gray-500">
                          {type.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.ownerType === "MEMBER" ? "Membre" : "Customer"} *
                  </label>
                  {formData.ownerType === "MEMBER" ? (
                    <MemberAutocomplete
                      onSelect={(member) => handleOwnerSelect(member, "MEMBER")}
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
                  {errors.ownerCode && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.ownerCode}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business (optionnel)
                </label>
                <CustomerAutocomplete
                  onSelect={(customer) => {
                    setSelectedBusiness(customer);
                    setFormData({
                      ...formData,
                      businessCode: customer?.customerId || "",
                    });
                  }}
                  selectedCustomer={selectedBusiness}
                  placeholder="Lier à un business..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Si le contrat concerne une entité business spécifique
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Dates */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="border-b bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-primary-600" />
                Dates et renouvellement
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'effet *
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        effectiveDate: e.target.value,
                      })
                    }
                    className={`w-full px-4 py-3 border rounded-xl ${errors.effectiveDate ? "border-red-500" : "border-gray-200"}`}
                  />
                  {errors.effectiveDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.effectiveDate}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className={`w-full px-4 py-3 border rounded-xl ${errors.startDate ? "border-red-500" : "border-gray-200"}`}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.startDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    min={formData.startDate}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Laisser vide si durée indéterminée
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de renouvellement *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {renewalTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            renewalType: type.value as any,
                          })
                        }
                        className={`p-2 rounded-xl text-center transition-all ${
                          formData.renewalType === type.value
                            ? "bg-primary-50 border border-primary-500"
                            : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="text-xs font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">
                          {type.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Parties prenantes */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="border-b bg-gray-50 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-primary-600" />
                Parties prenantes
              </h2>
              <button
                type="button"
                onClick={() => setShowPartyForm(!showPartyForm)}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1"
              >
                <Plus size={14} />
                Ajouter une partie
              </button>
            </div>
            <div className="p-6 space-y-6">
              {(signatoryCount > 0 || beneficiaryCount > 0) && (
                <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm">
                      {signatoryCount} signataire{signatoryCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-blue-600" />
                    <span className="text-sm">
                      {beneficiaryCount} bénéficiaire
                      {beneficiaryCount > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              )}

              {parties.length > 0 && (
                <div className="space-y-3">
                  {parties.map((party, idx) => {
                    const roleConfig = partyRoles.find(
                      (r) => r.value === party.role,
                    );
                    return (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-xl"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${roleConfig?.color || "bg-gray-100"}`}
                            >
                              {roleConfig?.label || party.role}
                            </span>
                            <span className="text-xs text-gray-400 font-mono">
                              {party.partyCode}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900">
                            {party.displayName}
                          </p>
                          <p className="text-sm text-gray-500">{party.email}</p>
                          {party.phone && (
                            <p className="text-xs text-gray-400">
                              {party.phone}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeParty(idx)}
                          className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {showPartyForm && (
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Ajouter une partie prenante
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <div className="flex gap-2">
                          {partyTypes.map((type) => {
                            const Icon = type.icon;
                            return (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() =>
                                  setNewParty({
                                    ...newParty,
                                    partyType: type.value,
                                    partyCode: "",
                                    displayName: "",
                                    email: "",
                                  })
                                }
                                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                                  newParty.partyType === type.value
                                    ? "bg-primary-100 text-primary-700 border border-primary-300"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                <Icon size={16} />
                                {type.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rôle *
                        </label>
                        <select
                          value={newParty.role}
                          onChange={(e) =>
                            setNewParty({
                              ...newParty,
                              role: e.target.value,
                              mustSign: e.target.value === "SIGNATORY",
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        >
                          {partyRoles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rechercher
                      </label>
                      {newParty.partyType === "MEMBER" ? (
                        <MemberAutocomplete
                          onSelect={(member) =>
                            handlePartySelect(member, "MEMBER")
                          }
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={newParty.email}
                          onChange={(e) =>
                            setNewParty({ ...newParty, email: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                          readOnly={
                            !!(selectedPartyCustomer || selectedPartyMember)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={newParty.phone}
                          onChange={(e) =>
                            setNewParty({ ...newParty, phone: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        />
                      </div>
                    </div>

                    {errors.addParty && (
                      <p className="text-sm text-red-600">{errors.addParty}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPartyForm(false);
                          setNewParty({
                            partyType: "MEMBER",
                            partyCode: "",
                            displayName: "",
                            email: "",
                            phone: "",
                            role: "SIGNATORY",
                            mustSign: true,
                          });
                          setSelectedPartyCustomer(null);
                          setSelectedPartyMember(null);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={addParty}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
                      >
                        <Plus size={16} />
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {errors.parties && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle size={14} />
                  {errors.parties}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};
