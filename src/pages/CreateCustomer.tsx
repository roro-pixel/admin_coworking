import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
import { ArrowLeft, Save, Building2, User } from "lucide-react";
import { customerService } from "../services/customer.service";
import type { CreateCustomerRequest } from "../services/customer.service";

const countries = [
  { code: "CG", name: "Congo", phoneCode: "+242" },
  { code: "CD", name: "République Démocratique du Congo", phoneCode: "+243" },
  { code: "CM", name: "Cameroun", phoneCode: "+237" },
  { code: "GA", name: "Gabon", phoneCode: "+241" },
  { code: "GQ", name: "Guinée équatoriale", phoneCode: "+240" },
  { code: "CF", name: "République centrafricaine", phoneCode: "+236" },
  { code: "TD", name: "Tchad", phoneCode: "+235" },
  { code: "ST", name: "Sao Tomé-et-Principe", phoneCode: "+239" },

  { code: "CI", name: "Côte d'Ivoire", phoneCode: "+225" },
  { code: "SN", name: "Sénégal", phoneCode: "+221" },
  { code: "ML", name: "Mali", phoneCode: "+223" },
  { code: "BF", name: "Burkina Faso", phoneCode: "+226" },
  { code: "NE", name: "Niger", phoneCode: "+227" },
  { code: "BJ", name: "Bénin", phoneCode: "+229" },
  { code: "TG", name: "Togo", phoneCode: "+228" },
  { code: "GN", name: "Guinée", phoneCode: "+224" },
  { code: "GW", name: "Guinée-Bissau", phoneCode: "+245" },
  { code: "SL", name: "Sierra Leone", phoneCode: "+232" },
  { code: "LR", name: "Libéria", phoneCode: "+231" },
  { code: "MR", name: "Mauritanie", phoneCode: "+222" },

  { code: "BI", name: "Burundi", phoneCode: "+257" },
  { code: "RW", name: "Rwanda", phoneCode: "+250" },
  { code: "DJ", name: "Djibouti", phoneCode: "+253" },
  { code: "KM", name: "Comores", phoneCode: "+269" },
  { code: "MG", name: "Madagascar", phoneCode: "+261" },
  { code: "MU", name: "Maurice", phoneCode: "+230" },
  { code: "SC", name: "Seychelles", phoneCode: "+248" },

  { code: "MA", name: "Maroc", phoneCode: "+212" },
  { code: "DZ", name: "Algérie", phoneCode: "+213" },
  { code: "TN", name: "Tunisie", phoneCode: "+216" },
  { code: "LY", name: "Libye", phoneCode: "+218" },
  { code: "EG", name: "Égypte", phoneCode: "+20" },
  { code: "MR", name: "Mauritanie", phoneCode: "+222" },
  { code: "SD", name: "Soudan", phoneCode: "+249" },

  { code: "AO", name: "Angola", phoneCode: "+244" },
  { code: "MZ", name: "Mozambique", phoneCode: "+258" },
  { code: "NA", name: "Namibie", phoneCode: "+264" },
  { code: "ZA", name: "Afrique du Sud", phoneCode: "+27" },
  { code: "ZM", name: "Zambie", phoneCode: "+260" },
  { code: "ZW", name: "Zimbabwe", phoneCode: "+263" },
  { code: "MW", name: "Malawi", phoneCode: "+265" },
  { code: "BW", name: "Botswana", phoneCode: "+267" },
  { code: "SZ", name: "Eswatini", phoneCode: "+268" },
  { code: "LS", name: "Lesotho", phoneCode: "+266" },

  { code: "CA", name: "Canada", phoneCode: "+1" },
  { code: "US", name: "États-Unis", phoneCode: "+1" },
  { code: "FR", name: "France", phoneCode: "+33" },
  { code: "BE", name: "Belgique", phoneCode: "+32" },
  { code: "CH", name: "Suisse", phoneCode: "+41" },
  { code: "LU", name: "Luxembourg", phoneCode: "+352" },
  { code: "MC", name: "Monaco", phoneCode: "+377" },

  { code: "GB", name: "Royaume-Uni", phoneCode: "+44" },
  { code: "DE", name: "Allemagne", phoneCode: "+49" },
  { code: "IT", name: "Italie", phoneCode: "+39" },
  { code: "ES", name: "Espagne", phoneCode: "+34" },
  { code: "PT", name: "Portugal", phoneCode: "+351" },
  { code: "NL", name: "Pays-Bas", phoneCode: "+31" },
];

export const CreateCustomer: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [type, setType] = useState<"PERSON" | "COMPANY">("PERSON");
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    companyName: "",
    email: "",
    billingEmail: "",
    phone: "",
    whatsappPhone: "",
    address: {
      streetNumber: "",
      streetName: "",
      district: "",
      city: "",
      countryCode: "",
    },
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      address: { ...formData.address, [e.target.name]: e.target.value },
    });
  };

  const validateForm = (): boolean => {
    if (type === "PERSON") {
      if (!formData.firstname) {
        setError("Le prénom est requis");
        return false;
      }
      if (!formData.lastname) {
        setError("Le nom est requis");
        return false;
      }
    } else {
      if (!formData.companyName) {
        setError("Le nom de l'entreprise est requis");
        return false;
      }
    }
    if (!formData.email) {
      setError("L'email est requis");
      return false;
    }
    if (!formData.phone) {
      setError("Le téléphone est requis");
      return false;
    }
    if (
      formData.billingEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.billingEmail)
    ) {
      setError("Email de facturation invalide");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    const payload: CreateCustomerRequest = {
      type,
      email: formData.email,
      phone: formData.phone,
      ...(type === "PERSON" && {
        firstname: formData.firstname,
        lastname: formData.lastname,
      }),
      ...(type === "COMPANY" && { companyName: formData.companyName }),
      ...(formData.billingEmail && { billingEmail: formData.billingEmail }),
      ...(formData.whatsappPhone && { whatsappPhone: formData.whatsappPhone }),
      ...(formData.address.streetNumber ||
      formData.address.streetName ||
      formData.address.city
        ? { address: formData.address }
        : {}),
    };

    try {
      const response = await customerService.createCustomer(payload);
      setSuccess(`Customer créé avec succès ! ID: ${response.customerId}`);
      setTimeout(() => navigate(`/customers/${response.customerId}`), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100">
        <button
          onClick={() => navigate("/customers")}
          className="mr-4 p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Créer un customer</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl space-y-6">
        {/* Type de customer */}
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Type de customer
          </h2>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setType("PERSON")}
              className={`flex-1 p-4 border-2 rounded-xl text-center transition-all ${
                type === "PERSON"
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-gray-200 hover:border-primary-200"
              }`}
            >
              <User
                size={24}
                className={`mx-auto mb-2 ${type === "PERSON" ? "text-primary-600" : "text-gray-400"}`}
              />
              <span className="font-medium">Personne physique</span>
            </button>
            <button
              type="button"
              onClick={() => setType("COMPANY")}
              className={`flex-1 p-4 border-2 rounded-xl text-center transition-all ${
                type === "COMPANY"
                  ? "border-primary-600 bg-primary-50 text-primary-700"
                  : "border-gray-200 hover:border-primary-200"
              }`}
            >
              <Building2
                size={24}
                className={`mx-auto mb-2 ${type === "COMPANY" ? "text-primary-600" : "text-gray-400"}`}
              />
              <span className="font-medium">Compagnie</span>
            </button>
          </div>
        </div>

        {/* Informations principales */}
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Informations principales
          </h2>

          {type === "PERSON" ? (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de facturation
              </label>
              <input
                type="email"
                name="billingEmail"
                value={formData.billingEmail}
                onChange={handleChange}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp
              </label>
              <input
                type="tel"
                name="whatsappPhone"
                value={formData.whatsappPhone}
                onChange={handleChange}
                placeholder="Laissez vide pour utiliser le téléphone"
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-100 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Adresse</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numéro rue
              </label>
              <input
                type="text"
                name="streetNumber"
                value={formData.address.streetNumber}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom rue
              </label>
              <input
                type="text"
                name="streetName"
                value={formData.address.streetName}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quartier
              </label>
              <input
                type="text"
                name="district"
                value={formData.address.district}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ville
              </label>
              <input
                type="text"
                name="city"
                value={formData.address.city}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pays
              </label>
              <select
                name="countryCode"
                value={formData.address.countryCode}
                onChange={handleAddressChange}
                className="w-full px-3 py-2 ring-1 ring-gray-100 rounded-2xl focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Sélectionner un pays</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
            {success}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/customers")}
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50/70"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 -2 border-white mr-2"></div>
            ) : (
              <Save size={16} className="mr-2" />
            )}
            {isLoading ? "Création..." : "Créer le customer"}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
};
