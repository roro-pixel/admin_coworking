import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import { customerService } from "../services/customer.service";
import type { CustomerResponse } from "../services/customer.service";

export const CustomerDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CustomerResponse | null>(null);

  const {
    data: customer,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => customerService.getCustomerById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CustomerResponse>) =>
      customerService.updateCustomer(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsEditing(false);
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
          Customer non trouvé
        </div>
      </AdminLayout>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
    });
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        address: {
          ...(prev.address || {}),
          [name]: value,
        },
      };
    });
  };
  const handleSave = () => {
    if (formData) {
      updateMutation.mutate(formData);
    }
  };

  const getStatusIcon = () => {
    switch (customer.status) {
      case "ACTIVE":
        return <CheckCircle size={16} className="text-green-600" />;
      case "INACTIVE":
        return <XCircle size={16} className="text-gray-600" />;
      case "SUSPENDED":
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  const getDisplayName = () => {
    if (customer.type === "PERSON") {
      return `${customer.firstname} ${customer.lastname}`;
    } else {
      return customer.companyName;
    }
  };

  return (
    <AdminLayout>
      <div className="mb-5 flex flex-col gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center">
          <button
            onClick={() => navigate("/customers")}
            className="mr-3 shrink-0 rounded-xl p-2 transition-colors hover:bg-gray-100 sm:mr-4"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="max-w-[220px] truncate text-xl font-black tracking-tight text-gray-900 sm:max-w-none sm:text-2xl">
                {getDisplayName()}
              </h1>
              <span
                className={`px-2 py-1 rounded-full text-xs flex items-center ${
                  customer.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : customer.status === "INACTIVE"
                      ? "bg-gray-100 text-gray-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {getStatusIcon()}
                <span className="ml-1">{customer.status}</span>
              </span>
            </div>
            <p className="mt-1 break-all text-xs font-medium text-gray-500 sm:text-sm">{customer.customerId}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50/70 sm:w-auto"
              >
                <X size={16} className="inline mr-1" />
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
              >
                <Save size={16} className="inline mr-1" />
                {updateMutation.isPending ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  navigate(`/members/create?customerId=${customer.customerId}`)
                }
                className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50/70 sm:w-auto"
              >
                <UserPlus size={16} className="mr-1" />
                Créer un member
              </button>
              <button
                onClick={() => {
                  setFormData(customer);
                  setIsEditing(true);
                }}
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 sm:w-auto"
              >
                <Edit size={16} className="inline mr-1" />
                Modifier
              </button>
            </>
          )}
        </div>
      </div>

      {/* Informations générales */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-6">
        <h2 className="mb-4 text-base font-black text-gray-900 sm:text-lg">
          Informations générales
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {customer.type === "PERSON" ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Prénom
                </label>
                {isEditing && formData ? (
                  <input
                    type="text"
                    name="firstname"
                    value={formData.firstname || ""}
                    onChange={handleChange}
                    className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="break-words text-sm font-semibold text-gray-900">{customer.firstname}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Nom
                </label>
                {isEditing && formData ? (
                  <input
                    type="text"
                    name="lastname"
                    value={formData.lastname || ""}
                    onChange={handleChange}
                    className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="break-words text-sm font-semibold text-gray-900">{customer.lastname}</p>
                )}
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-bold text-gray-700">
                Nom de l'entreprise
              </label>
              {isEditing && formData ? (
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName || ""}
                  onChange={handleChange}
                  className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="break-words text-sm font-semibold text-gray-900">{customer.companyName}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contact */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-6">
        <h2 className="mb-4 text-base font-black text-gray-900 sm:text-lg">Contact</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              <Mail size={14} className="inline mr-1" /> Email principal
            </label>
            {isEditing && formData ? (
              <input
                type="email"
                name="email"
                value={formData.email || ""}
                onChange={handleChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900">{customer.email}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              <Mail size={14} className="inline mr-1" /> Email de facturation
            </label>
            {isEditing && formData ? (
              <input
                type="email"
                name="billingEmail"
                value={formData.billingEmail || ""}
                onChange={handleChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900">{customer.billingEmail || "-"}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              <Phone size={14} className="inline mr-1" /> Téléphone
            </label>
            {isEditing && formData ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone || ""}
                onChange={handleChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900">{customer.phone || "-"}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              <Phone size={14} className="inline mr-1" /> WhatsApp
            </label>
            {isEditing && formData ? (
              <input
                type="tel"
                name="whatsappPhone"
                value={formData.whatsappPhone || ""}
                onChange={handleChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900">{customer.whatsappPhone || "-"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Adresse */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-6">
        <h2 className="mb-4 text-base font-black text-gray-900 sm:text-lg">
          <MapPin size={16} className="inline mr-1" /> Adresse
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-gray-700">
              Rue
            </label>
            {isEditing && formData ? (
              <input
                type="text"
                name="streetName"
                value={formData.address?.streetName || ""}
                onChange={handleAddressChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900">
                {customer.address?.streetName || "-"}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              Ville
            </label>
            {isEditing && formData ? (
              <input
                type="text"
                name="city"
                value={formData.address?.city || ""}
                onChange={handleAddressChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900">{customer.address?.city || "-"}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              Pays
            </label>
            {isEditing && formData ? (
              <input
                type="text"
                name="countryCode"
                value={formData.address?.country || ""}
                onChange={handleAddressChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900">
                {customer.address?.country || "-"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Métadonnées */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-6">
        <h2 className="mb-4 text-base font-black text-gray-900 sm:text-lg">
          Métadonnées
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              Type
            </label>
            <p className="break-words text-sm font-semibold text-gray-900">
              {customer.type === "PERSON" ? "Personne physique" : "Compagnie"}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              Créé le
            </label>
            <p className="break-words text-sm font-semibold text-gray-900">
              {new Date(customer.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              Statut
            </label>
            {isEditing && formData ? (
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500 sm:w-auto"
              >
                <option value="ACTIVE">Actif</option>
                <option value="INACTIVE">Inactif</option>
                <option value="SUSPENDED">Suspendu</option>
              </select>
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900">{customer.status}</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
