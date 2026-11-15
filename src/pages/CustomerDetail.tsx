import React, { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Edit,
  Save,
  X,
  Trash2,
  UserPlus,
  Receipt,
} from "lucide-react";
import { customerService } from "../services/customer.service";
import type { CustomerResponse } from "../services/customer.service";
import { Skeleton } from "../components/ui/Skeleton";
import { brandVars } from "../components/layout/adminTheme";
import { Toaster, Dots } from "../components/ui/Toaster";
import { toast } from "../components/ui/toastStore";

const FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]";
const FIELD =
  "w-full rounded-2xl border border-transparent bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-[color:var(--logo-pink)] focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--logo-pink)_20%,white)]";
const BTN_GHOST = `inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 disabled:opacity-50 sm:w-auto ${FOCUS}`;
const BTN_PRIMARY = `inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--logo-pink-dark)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto ${FOCUS}`;

const statusLabel = (status: string) =>
  status === "ACTIVE" ? "Actif" : status === "INACTIVE" ? "Inactif" : "Suspendu";

const initials = (name: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const Section: React.FC<{ title: string; icon?: React.ElementType; children: React.ReactNode }> = ({
  title,
  icon: Icon,
  children,
}) => (
  <section className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
    <div className="flex items-center gap-2.5 px-3 pb-3 pt-2">
      {Icon && (
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] text-[color:var(--logo-pink-dark)]">
          <Icon size={16} />
        </span>
      )}
      <h2 className="text-base font-semibold text-gray-950">{title}</h2>
    </div>
    <div className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:p-4 md:grid-cols-2">{children}</div>
  </section>
);

const Item: React.FC<{
  label: string;
  value?: string;
  editing?: boolean;
  name?: string;
  type?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  wide?: boolean;
  icon?: React.ElementType;
}> = ({ label, value, editing, name, type = "text", onChange, wide, icon: Icon }) => (
  <div className={wide ? "md:col-span-2" : ""}>
    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
      {Icon && <Icon size={13} />}
      {label}
    </p>
    {editing && name ? (
      <input type={type} name={name} value={value || ""} onChange={onChange} className={FIELD} />
    ) : (
      <p className="break-words text-sm font-semibold text-gray-900">{value || "Non renseigné"}</p>
    )}
  </div>
);

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
    mutationFn: (data: Partial<CustomerResponse>) => customerService.updateCustomer(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => customerService.deleteCustomer(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      navigate("/customers");
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4" style={brandVars}>
          <Skeleton className="h-24 rounded-[1.75rem]" />
          <Skeleton className="h-40 rounded-[1.75rem]" />
          <Skeleton className="h-56 rounded-[1.75rem]" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout>
        <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">Client non trouvé</div>
      </AdminLayout>
    );
  }

  if (customer.type === "COMPANY") {
    return <Navigate to={`/companies/${encodeURIComponent(customer.customerId)}`} replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      updateMutation.mutate(formData, {
        onSuccess: () => toast.success("Modifications enregistrées"),
        onError: () => toast.error("La mise à jour a échoué"),
      });
    }
  };

  const displayName =
    (customer.type === "PERSON"
      ? `${customer.firstname || ""} ${customer.lastname || ""}`.trim()
      : customer.companyName) || "Sans nom";

  const handleDelete = () => {
    toast.confirm({
      message: "Supprimer ce client ?",
      detail: displayName,
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression en cours",
      successMessage: "Client supprimé",
      errorMessage: "La suppression a échoué",
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  };

  const ed = isEditing && !!formData;
  const src = ed && formData ? formData : customer;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-4xl space-y-4" style={brandVars}>
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/customers")}
              aria-label="Retour aux clients"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition hover:bg-gray-100 ${FOCUS}`}
            >
              <ArrowLeft size={19} />
            </button>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] text-sm font-bold text-[color:var(--logo-pink-dark)]">
              {initials(displayName)}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">{displayName}</h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    customer.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : customer.status === "INACTIVE"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-red-50 text-red-600"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      customer.status === "ACTIVE"
                        ? "bg-emerald-500"
                        : customer.status === "INACTIVE"
                          ? "bg-gray-400"
                          : "bg-red-500"
                    }`}
                  />
                  {statusLabel(customer.status)}
                </span>
              </div>
              <p className="mt-0.5 break-all font-mono text-xs text-gray-400">{customer.customerId}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {isEditing ? (
              <>
                <button type="button" onClick={() => setIsEditing(false)} className={BTN_GHOST}>
                  <X size={16} />
                  Annuler
                </button>
                <button type="button" onClick={handleSave} disabled={updateMutation.isPending} className={BTN_PRIMARY}>
                  {updateMutation.isPending ? <Dots /> : <Save size={16} />}
                  {updateMutation.isPending ? "Enregistrement" : "Enregistrer"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50 sm:w-auto"
                >
                  {deleteMutation.isPending ? <Dots /> : <Trash2 size={16} />}
                  {deleteMutation.isPending ? "Suppression" : "Supprimer"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/members/create?customerId=${customer.customerId}`)}
                  className={BTN_GHOST}
                >
                  <UserPlus size={16} />
                  Créer un member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(customer);
                    setIsEditing(true);
                  }}
                  className={BTN_PRIMARY}
                >
                  <Edit size={16} />
                  Modifier
                </button>
              </>
            )}
          </div>
        </div>

        <Section title="Informations générales">
          {customer.type === "PERSON" ? (
            <>
              <Item label="Prénom" name="firstname" value={src.firstname} editing={ed} onChange={handleChange} />
              <Item label="Nom" name="lastname" value={src.lastname} editing={ed} onChange={handleChange} />
            </>
          ) : (
            <Item label="Nom de l'entreprise" name="companyName" value={src.companyName} editing={ed} onChange={handleChange} wide />
          )}
        </Section>

        <Section title="Contact" icon={Mail}>
          <Item label="Email principal" icon={Mail} name="email" type="email" value={src.email} editing={ed} onChange={handleChange} />
          <Item label="Email de facturation" icon={Receipt} name="billingEmail" type="email" value={src.billingEmail} editing={ed} onChange={handleChange} />
          <Item label="Téléphone" icon={Phone} name="phone" type="tel" value={src.phone} editing={ed} onChange={handleChange} />
          <Item label="WhatsApp" icon={MessageCircle} name="whatsappPhone" type="tel" value={src.whatsappPhone} editing={ed} onChange={handleChange} />
        </Section>

        <Section title="Adresse" icon={MapPin}>
          <Item label="Numéro rue" name="streetNumber" value={src.address?.streetNumber} editing={ed} onChange={handleAddressChange} />
          <Item label="Rue" name="streetName" value={src.address?.streetName} editing={ed} onChange={handleAddressChange} />
          <Item label="Quartier" name="district" value={src.address?.district} editing={ed} onChange={handleAddressChange} />
          <Item label="Ville" name="city" value={src.address?.city} editing={ed} onChange={handleAddressChange} />
          <Item label="Pays" name="country" value={src.address?.country} editing={ed} onChange={handleAddressChange} wide />
        </Section>

        <section className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
          <h2 className="px-3 pb-3 pt-2 text-base font-semibold text-gray-950">Métadonnées</h2>
          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:p-4 md:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Type</p>
              <p className="text-sm font-semibold text-gray-900">
                {customer.type === "PERSON" ? "Personne physique" : "Compagnie"}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Créé le</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(customer.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Statut</p>
              {ed && formData ? (
                <select name="status" value={formData.status} onChange={handleChange} className={FIELD}>
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="SUSPENDED">Suspendu</option>
                </select>
              ) : (
                <p className="text-sm font-semibold text-gray-900">{statusLabel(customer.status)}</p>
              )}
            </div>
          </div>
        </section>
        <Toaster />
      </div>
    </AdminLayout>
  );
};