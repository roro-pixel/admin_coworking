import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import { ArrowLeft, Save, Building2, Users, KeyRound, PenLine, Check } from "lucide-react";
import { CustomerAutocomplete } from "../components/customers/CustomerAutocomplete";
import { memberService } from "../services/member.service";
import { customerService } from "../services/customer.service";
import { companyService } from "../services/company.service";
import type { CompanyMemberRole, CompanyResponse } from "../services/company.service";
import { CompanyPicker } from "../components/companies/CompanyPicker";
import type { CreateMemberRequest } from "../services/member.service";
import type { CustomerSummaryResponse } from "../services/customer.service";
import { brandVars } from "../components/layout/adminTheme";
import { Dots } from "../components/ui/Toaster";

const FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]";
const FIELD =
  "w-full rounded-2xl border border-transparent bg-white px-4 py-3 text-sm shadow-sm text-gray-900 placeholder:text-gray-400 transition focus:border-[color:var(--logo-pink)] focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--logo-pink)_20%,white)]";

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

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({
  title,
  hint,
  children,
}) => (
  <section className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
    <div className="px-3 pb-3 pt-2">
      <h2 className="text-base font-semibold text-gray-950">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
    <div className="rounded-2xl bg-gray-50/60 p-3 sm:p-4">{children}</div>
  </section>
);

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  required,
  children,
}) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="ml-0.5 text-[color:var(--logo-pink-dark)]">*</span>}
    </span>
    {children}
  </label>
);

const TypeTile: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  text: string;
}> = ({ active, onClick, icon: Icon, title, text }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`relative flex items-center gap-4 rounded-2xl p-4 text-left transition ${FOCUS} ${
      active
        ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] ring-2 ring-[color:var(--logo-pink)]"
        : "bg-white ring-1 ring-gray-100 hover:bg-gray-50"
    }`}
  >
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
        active ? "bg-white text-[color:var(--logo-pink-dark)]" : "bg-gray-50 text-gray-400"
      }`}
    >
      <Icon size={21} />
    </span>
    <span className="min-w-0">
      <span className={`block text-sm font-semibold ${active ? "text-[color:var(--logo-pink-dark)]" : "text-gray-900"}`}>
        {title}
      </span>
      <span className="mt-0.5 block text-xs text-gray-500">{text}</span>
    </span>
    {active && (
      <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--logo-pink)] text-white">
        <Check size={12} strokeWidth={3} />
      </span>
    )}
  </button>
);

export const CreateMember: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Mode: 'new' ou 'existing'
  const [mode, setMode] = useState<"new" | "existing">("new");

  // Customer existant sélectionné
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummaryResponse | null>(null);

  // Arrivée depuis la fiche d'un customer (?customerId=...) : on pré-sélectionne ce customer
  const [searchParams] = useSearchParams();
  const presetCustomerId = searchParams.get("customerId");
  const { data: presetCustomer } = useQuery({
    queryKey: ["customer", presetCustomerId],
    queryFn: () => customerService.getCustomerById(presetCustomerId!),
    enabled: !!presetCustomerId,
  });

  useEffect(() => {
    if (!presetCustomer) return;
    setMode("existing");
    setSelectedCustomer({
      id: 0,
      customerId: presetCustomer.customerId,
      displayName:
        (presetCustomer.type === "PERSON"
          ? `${presetCustomer.firstname || ""} ${presetCustomer.lastname || ""}`.trim()
          : presetCustomer.companyName) || presetCustomer.customerId,
      email: presetCustomer.email,
      phone: presetCustomer.phone,
      status: presetCustomer.status,
    });
  }, [presetCustomer]);

  // Rattachement facultatif à une organisation, fait après la création du membre
  const [company, setCompany] = useState<CompanyResponse | null>(null);
  const [companyRole, setCompanyRole] = useState<CompanyMemberRole>("EMPLOYEE");
  const [canSign, setCanSign] = useState(false);
  const [canCollectMail, setCanCollectMail] = useState(false);

  // Informations du member
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    whatsappPhone: "",
    password: "",
    generatePassword: true,
  });

  // Informations du nouveau customer (si mode new)
  const [newCustomerData, setNewCustomerData] = useState({
    address: {
      streetNumber: "",
      streetName: "",
      district: "",
      city: "",
      countryCode: "",
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setNewCustomerData({
      ...newCustomerData,
      address: { ...newCustomerData.address, [e.target.name]: e.target.value },
    });
  };

  const validateForm = (): boolean => {
    if (!formData.firstname) {
      setError("Le prénom est requis");
      return false;
    }
    if (!formData.lastname) {
      setError("Le nom est requis");
      return false;
    }
    if (!formData.email) {
      setError("L'email est requis");
      return false;
    }
    if (!formData.phone) {
      setError("Le téléphone est requis");
      return false;
    }

    if (!formData.generatePassword && !formData.password) {
      setError("Le mot de passe est requis");
      return false;
    }

    if (mode === "existing" && !selectedCustomer) {
      setError("Veuillez sélectionner un client existant");
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

    const payload: CreateMemberRequest = {
      firstname: formData.firstname,
      lastname: formData.lastname,
      email: formData.email,
      phone: formData.phone,
      whatsappPhone: formData.whatsappPhone || formData.phone,
      generatePassword: formData.generatePassword,
      ...(mode === "existing" &&
        selectedCustomer && {
          existingCustomerId: selectedCustomer.customerId,
        }),
      ...(mode === "new" && {
        customerType: "PERSON" as const,
        ...(newCustomerData.address.streetNumber ||
        newCustomerData.address.streetName ||
        newCustomerData.address.city
          ? {
              address: {
                streetNumber: newCustomerData.address.streetNumber,
                streetName: newCustomerData.address.streetName,
                district: newCustomerData.address.district,
                city: newCustomerData.address.city,
                countryCode: newCustomerData.address.countryCode,
              },
            }
          : {}),
      }),
      ...(!formData.generatePassword &&
        formData.password && { password: formData.password }),
    };

    try {
      const response = await memberService.createMemberAdmin(payload);
      let message = `Member créé avec succès ! ID: ${response.memberId}`;
      let delay = 2000;
      if (company) {
        try {
          await companyService.addMember(company.customerId, {
            memberId: response.memberId,
            role: companyRole,
            canSign,
            canCollectMail,
          });
          message += `, rattaché à ${company.name}`;
        } catch (err: any) {
          message += `. Le rattachement à ${company.name} a échoué : ${err.response?.data?.message || "erreur"}. Refais-le depuis la fiche du membre.`;
          delay = 4000;
        }
      }
      setSuccess(message);
      setTimeout(() => navigate(`/members/${response.memberId}`), delay);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-4xl" style={brandVars}>
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/members")}
            aria-label="Retour aux membres"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 ${FOCUS}`}
          >
            <ArrowLeft size={19} />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">Créer un membre</h1>
            <p className="mt-0.5 text-sm text-gray-500">Les champs marqués d'un astérisque sont requis.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pb-28 lg:pb-0">
          <Section title="Rattachement client">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TypeTile
                  active={mode === "new"}
                  onClick={() => setMode("new")}
                  icon={Users}
                  title="Nouveau client"
                  text="Crée un client et un membre"
                />
                <TypeTile
                  active={mode === "existing"}
                  onClick={() => setMode("existing")}
                  icon={Building2}
                  title="Client existant"
                  text="Rattache le membre à un client existant"
                />
              </div>

              {mode === "existing" ? (
                <Field label="Rechercher un client" required>
                  <CustomerAutocomplete
                    onSelect={setSelectedCustomer}
                    selectedCustomer={selectedCustomer}
                    placeholder="Rechercher par nom, email..."
                  />
                </Field>
              ) : (
                <p className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                  Le membre reçoit sa propre fiche client. Pour une entreprise, crée-la d'abord dans{" "}
                  <Link to="/companies/create" className="font-semibold text-[color:var(--logo-pink-dark)] hover:underline">
                    Entreprises
                  </Link>
                  , puis rattache le membre ci-dessous.
                </p>
              )}
            </div>
          </Section>

          <Section title="Organisation" hint="Facultatif : rattache le membre à une entreprise déjà créée">
            <div className="space-y-4">
              <Field label="Organisation">
                <CompanyPicker selected={company} onSelect={setCompany} />
              </Field>
              {company && (
                <>
                  <Field label="Rôle">
                    <select
                      value={companyRole}
                      onChange={(e) => setCompanyRole(e.target.value as CompanyMemberRole)}
                      className={FIELD}
                    >
                      <option value="EMPLOYEE">Employé</option>
                      <option value="OWNER">Gérant</option>
                    </select>
                  </Field>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm">
                      <input
                        type="checkbox"
                        checked={canSign}
                        onChange={(e) => setCanSign(e.target.checked)}
                        className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
                      />
                      Peut signer pour l'organisation
                    </label>
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm">
                      <input
                        type="checkbox"
                        checked={canCollectMail}
                        onChange={(e) => setCanCollectMail(e.target.checked)}
                        className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]"
                      />
                      Peut retirer le courrier
                    </label>
                  </div>
                </>
              )}
            </div>
          </Section>

          <Section title="Informations du membre">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Prénom" required>
                <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} className={FIELD} />
              </Field>
              <Field label="Nom" required>
                <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} className={FIELD} />
              </Field>
              <Field label="Email" required>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className={FIELD} />
              </Field>
              <Field label="Téléphone" required>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={FIELD} />
              </Field>
              <Field label="WhatsApp">
                <input
                  type="tel"
                  name="whatsappPhone"
                  value={formData.whatsappPhone}
                  onChange={handleChange}
                  placeholder="Laissez vide pour utiliser le téléphone"
                  className={FIELD}
                />
              </Field>
            </div>
          </Section>

          <Section title="Accès portail">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TypeTile
                  active={formData.generatePassword}
                  onClick={() => setFormData({ ...formData, generatePassword: true, password: "" })}
                  icon={KeyRound}
                  title="Mot de passe automatique"
                  text="Généré à la création"
                />
                <TypeTile
                  active={!formData.generatePassword}
                  onClick={() => setFormData({ ...formData, generatePassword: false })}
                  icon={PenLine}
                  title="Définir un mot de passe"
                  text="Saisi par vous"
                />
              </div>

              {!formData.generatePassword && (
                <Field label="Mot de passe" required>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={FIELD}
                  />
                </Field>
              )}
            </div>
          </Section>

          {mode === "new" && (
            <Section title="Adresse du client" hint="Facultative">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Numéro rue">
                  <input type="text" name="streetNumber" value={newCustomerData.address.streetNumber} onChange={handleAddressChange} className={FIELD} />
                </Field>
                <Field label="Nom rue">
                  <input type="text" name="streetName" value={newCustomerData.address.streetName} onChange={handleAddressChange} className={FIELD} />
                </Field>
                <Field label="Quartier">
                  <input type="text" name="district" value={newCustomerData.address.district} onChange={handleAddressChange} className={FIELD} />
                </Field>
                <Field label="Ville">
                  <input type="text" name="city" value={newCustomerData.address.city} onChange={handleAddressChange} className={FIELD} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Pays">
                    <select name="countryCode" value={newCustomerData.address.countryCode} onChange={handleAddressChange} className={FIELD}>
                      <option value="">Sélectionner un pays</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            </Section>
          )}

          {error && (
            <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/members")}
              className={`w-full rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 sm:w-auto ${FOCUS}`}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--logo-pink-dark)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto ${FOCUS}`}
            >
              {isLoading ? <Dots /> : <Save size={16} />}
              {isLoading ? "Création en cours" : "Créer le membre"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};