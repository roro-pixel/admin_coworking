import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  Edit,
  Save,
  X,
  Lock,
  Unlock,
  Trash2,
  ArrowRightLeft,
  ShieldCheck,
  User,
} from "lucide-react";
import { memberService } from "../services/member.service";
import type { MemberResponse } from "../services/member.service";
import type { CustomerSummaryResponse } from "../services/customer.service";
import { CustomerAutocomplete } from "../components/customers/CustomerAutocomplete";
import { Skeleton } from "../components/ui/Skeleton";
import { brandVars } from "../components/layout/adminTheme";
import { Toaster, Dots } from "../components/ui/Toaster";
import { MemberCompaniesSection } from "../components/members/MemberCompaniesSection";
import { useAuth } from "../contexts/AuthContext";
import { MemberPreferencesSection } from "../components/members/MemberPreferencesSection";
import { toast } from "../components/ui/toastStore";

type MemberStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED";

const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)]";
const FIELD =
  "w-full rounded-2xl border border-transparent bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition focus:border-[color:var(--logo-pink)] focus:outline-none focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--logo-pink)_20%,white)]";
const BTN_GHOST = `inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50 disabled:opacity-50 sm:w-auto ${FOCUS}`;
const BTN_PRIMARY = `inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--logo-pink-dark)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto ${FOCUS}`;
const PINK_SOFT = "bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)]";

const STATUSES: { value: MemberStatus; label: string; chip: string; dot: string }[] = [
  { value: "ACTIVE", label: "Actif", chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  { value: "PENDING", label: "En attente", chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  { value: "INACTIVE", label: "Inactif", chip: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  { value: "SUSPENDED", label: "Suspendu", chip: "bg-red-50 text-red-600", dot: "bg-red-500" },
];

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
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}>
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
  icon?: React.ElementType;
}> = ({ label, value, editing, name, type = "text", onChange, icon: Icon }) => (
  <div>
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

export const MemberDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isAdmin } = useAuth();
  const canEditPrefs = isAdmin() || hasPermission("CLIENT:UPDATE") || hasPermission("CLIENT_UPDATE");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<MemberResponse | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<CustomerSummaryResponse | null>(null);

  const {
    data: member,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["member", id],
    queryFn: () => memberService.getMemberById(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<MemberResponse>) => memberService.updateMember(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setIsEditing(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: MemberStatus) => memberService.updateMemberStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  const portalMutation = useMutation({
    mutationFn: (enable: boolean) =>
      enable ? memberService.enablePortalAccess(id!) : memberService.disablePortalAccess(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: (customerId: string) => memberService.transferCustomer(id!, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => memberService.deleteMember(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members-list"] });
      queryClient.invalidateQueries({ queryKey: ["members-basic"] });
      queryClient.invalidateQueries({ queryKey: ["members-advanced"] });
      navigate("/members");
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-4xl space-y-4" style={brandVars}>
          <Skeleton className="h-24 rounded-[1.75rem]" />
          <Skeleton className="h-40 rounded-[1.75rem]" />
          <Skeleton className="h-56 rounded-[1.75rem]" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !member) {
    return (
      <AdminLayout>
        <div className="mx-auto w-full max-w-4xl rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
          Member non trouvé
        </div>
      </AdminLayout>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (!prev) return prev;
      return { ...prev, [name]: value };
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

  const handleDelete = () => {
    toast.confirm({
      message: "Supprimer ce membre ?",
      detail: member.fullname,
      confirmLabel: "Supprimer",
      pendingLabel: "Suppression en cours",
      successMessage: "Membre supprimé",
      errorMessage: "Impossible de supprimer ce membre",
      onConfirm: () => deleteMutation.mutateAsync(),
    });
  };

  const handleStatus = (status: MemberStatus) => {
    if (status === member.status) return;
    statusMutation.mutate(status, {
      onSuccess: () => toast.success("Statut mis à jour"),
      onError: () => toast.error("Le changement de statut a échoué"),
    });
  };

  const handlePortal = () => {
    const enable = !member.portalAccess;
    portalMutation.mutate(enable, {
      onSuccess: () => toast.success(enable ? "Accès portail activé" : "Accès portail désactivé"),
      onError: () => toast.error("Le changement d'accès portail a échoué"),
    });
  };

  const handleTransfer = () => {
    if (!targetCustomer) return;
    transferMutation.mutate(targetCustomer.customerId, {
      onSuccess: () => {
        toast.success("Membre transféré");
        setShowTransfer(false);
        setTargetCustomer(null);
      },
      onError: () => toast.error("Le transfert a échoué"),
    });
  };

  const current = STATUSES.find((s) => s.value === member.status) || STATUSES[2];
  const ed = isEditing && !!formData;
  const src = ed && formData ? formData : member;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-4xl space-y-4" style={brandVars}>
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/members")}
              aria-label="Retour aux membres"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-600 transition hover:bg-gray-100 ${FOCUS}`}
            >
              <ArrowLeft size={19} />
            </button>
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}
            >
              {initials(member.fullname)}
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="min-w-0 break-words text-xl font-bold tracking-tight text-gray-950 sm:text-2xl">
                  {member.fullname}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${current.chip}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
                  {current.label}
                </span>
              </div>
              <p className="mt-0.5 break-all font-mono text-xs text-gray-400">{member.memberId}</p>
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
                  onClick={() => {
                    setFormData(member);
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

        <Section title="Informations personnelles" icon={User}>
          <Item label="Prénom" name="firstname" value={src.firstname} editing={ed} onChange={handleChange} />
          <Item label="Nom" name="lastname" value={src.lastname} editing={ed} onChange={handleChange} />
        </Section>

        <Section title="Contact" icon={Mail}>
          <Item label="Email" icon={Mail} name="email" type="email" value={src.email} editing={ed} onChange={handleChange} />
          <Item label="Téléphone" icon={Phone} name="phone" type="tel" value={src.phone} editing={ed} onChange={handleChange} />
          <Item
            label="WhatsApp"
            icon={MessageCircle}
            name="whatsappPhone"
            type="tel"
            value={src.whatsappPhone}
            editing={ed}
            onChange={handleChange}
          />
        </Section>

        <section className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2.5 px-3 pb-3 pt-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-[color:var(--logo-pink-dark)] ${PINK_SOFT}`}>
              <ShieldCheck size={16} />
            </span>
            <h2 className="text-base font-semibold text-gray-950">Accès et statut</h2>
          </div>

          <div className="space-y-3 rounded-2xl bg-gray-50 p-3 sm:p-4">
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Statut</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => {
                  const active = s.value === member.status;
                  const applying = statusMutation.isPending && statusMutation.variables === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => handleStatus(s.value)}
                      disabled={statusMutation.isPending}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-wait ${FOCUS} ${
                        active
                          ? `${s.chip} ring-2 ring-current`
                          : "bg-white text-gray-600 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      {applying ? <Dots /> : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    member.portalAccess ? `${PINK_SOFT} text-[color:var(--logo-pink-dark)]` : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {member.portalAccess ? <Unlock size={16} /> : <Lock size={16} />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Accès portail</p>
                  <p className="text-xs text-gray-500">{member.portalAccess ? "Activé" : "Désactivé"}</p>
                </div>
              </div>
              <button type="button" onClick={handlePortal} disabled={portalMutation.isPending} className={BTN_GHOST}>
                {portalMutation.isPending && <Dots />}
                {portalMutation.isPending ? "En cours" : member.portalAccess ? "Désactiver" : "Activer"}
              </button>
            </div>

            <div className="rounded-xl bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Customer associé</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${member.customerId}`)}
                    className={`mt-1 max-w-full truncate rounded-md font-mono text-sm font-semibold text-[color:var(--logo-pink-dark)] hover:underline ${FOCUS}`}
                  >
                    {member.customerId}
                  </button>
                </div>
                {!showTransfer && (
                  <button type="button" onClick={() => setShowTransfer(true)} className={BTN_GHOST}>
                    <ArrowRightLeft size={16} />
                    Transférer
                  </button>
                )}
              </div>

              {showTransfer && (
                <div className="mt-3 space-y-3 rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Transférer ce membre vers un autre customer</p>
                  <CustomerAutocomplete onSelect={setTargetCustomer} selectedCustomer={targetCustomer} />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowTransfer(false);
                        setTargetCustomer(null);
                      }}
                      className={BTN_GHOST}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleTransfer}
                      disabled={!targetCustomer || transferMutation.isPending}
                      className={BTN_PRIMARY}
                    >
                      {transferMutation.isPending ? <Dots /> : <ArrowRightLeft size={16} />}
                      {transferMutation.isPending ? "Transfert en cours" : "Confirmer le transfert"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <MemberCompaniesSection memberId={member.memberId} />

        <MemberPreferencesSection memberId={member.memberId} canEdit={canEditPrefs} />

        <section className="rounded-[1.75rem] border border-gray-100 bg-white p-3 shadow-sm">
          <h2 className="px-3 pb-3 pt-2 text-base font-semibold text-gray-950">Métadonnées</h2>
          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-gray-50 p-3 sm:p-4 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Créé le</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(member.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-gray-500">Dernière modification</p>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(member.updatedAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
        </section>

        <Toaster />
      </div>
    </AdminLayout>
  );
};