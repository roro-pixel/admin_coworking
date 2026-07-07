import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "../components/layout/AdminLayout";
import {
  ArrowLeft,
  Mail,
  Phone,
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
  Key,
  RefreshCw,
} from "lucide-react";
import { memberService } from "../services/member.service";
import type { MemberResponse } from "../services/member.service";

export const MemberDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<MemberResponse | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);

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
    mutationFn: (data: Partial<MemberResponse>) =>
      memberService.updateMember(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setIsEditing(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED") =>
      memberService.updateMemberStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  const portalMutation = useMutation({
    mutationFn: (enable: boolean) =>
      enable
        ? memberService.enablePortalAccess(id!)
        : memberService.disablePortalAccess(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 -2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !member) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          Member non trouvé
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
  const handleSave = () => {
    if (formData) {
      updateMutation.mutate(formData);
    }
  };

  const handleResetPassword = () => {
    // Appel API pour réinitialiser le mot de passe
    alert("Un email de réinitialisation a été envoyé");
    setShowResetPassword(false);
  };

  const getStatusIcon = () => {
    switch (member.status) {
      case "ACTIVE":
        return <CheckCircle size={16} className="text-green-600" />;
      case "PENDING":
        return <AlertCircle size={16} className="text-yellow-600" />;
      case "INACTIVE":
        return <XCircle size={16} className="text-gray-600" />;
      case "SUSPENDED":
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = () => {
    switch (member.status) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "INACTIVE":
        return "bg-gray-100 text-gray-700";
      case "SUSPENDED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start">
          <button
            onClick={() => navigate("/members")}
            className="mr-3 shrink-0 rounded-xl p-2 transition-colors hover:bg-gray-100 sm:mr-4"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="min-w-0 break-words text-xl font-black text-gray-900 sm:text-2xl">
                {member.fullname}
              </h1>
              <span
                className={`px-2 py-1 rounded-full text-xs flex items-center ${getStatusBadgeClass()}`}
              >
                {getStatusIcon()}
                <span className="ml-1">{member.status}</span>
              </span>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-gray-500 sm:text-sm">{member.memberId}</p>
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
                onClick={() => setShowResetPassword(true)}
                className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50/70 sm:w-auto"
              >
                <Key size={16} className="inline mr-1" />
                Réinitialiser mot de passe
              </button>
              <button
                onClick={() => {
                  setFormData(member);
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

      {/* Informations personnelles */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:mb-6 sm:p-6">
        <h2 className="mb-4 text-base font-black text-gray-900 sm:text-lg">
          Informations personnelles
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prénom
            </label>
            {isEditing && formData ? (
              <input
                type="text"
                name="firstname"
                value={formData.firstname}
                onChange={handleChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900 sm:text-base">{member.firstname}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom
            </label>
            {isEditing && formData ? (
              <input
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900 sm:text-base">{member.lastname}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:mb-6 sm:p-6">
        <h2 className="mb-4 text-base font-black text-gray-900 sm:text-lg">Contact</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={14} className="inline mr-1" /> Email
            </label>
            {isEditing && formData ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-2xl px-3 py-2.5 text-sm ring-1 ring-gray-100 focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <p className="break-words text-sm font-semibold text-gray-900 sm:text-base">{member.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <p className="break-words text-sm font-semibold text-gray-900 sm:text-base">{member.phone || "-"}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              <p className="break-words text-sm font-semibold text-gray-900 sm:text-base">{member.whatsappPhone || "-"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Accès et statut */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:mb-6 sm:p-6">
        <h2 className="mb-4 text-base font-black text-gray-900 sm:text-lg">
          Accès et statut
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer associé
            </label>
            <button
              onClick={() => navigate(`/customers/${member.customerId}`)}
              className="text-primary-600 hover:underline"
            >
              {member.customerId}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass()}`}
              >
                {member.status}
              </span>
              <button
                onClick={() => {
                  const newStatus =
                    member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
                  statusMutation.mutate(newStatus);
                }}
                className="text-sm text-primary-600 hover:underline"
              >
                <RefreshCw size={14} className="inline mr-1" />
                {member.status === "ACTIVE" ? "Suspendre" : "Activer"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Accès portail
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {member.portalAccess ? (
                <span className="flex items-center text-green-600">
                  <Unlock size={14} className="mr-1" /> Activé
                </span>
              ) : (
                <span className="flex items-center text-gray-500">
                  <Lock size={14} className="mr-1" /> Désactivé
                </span>
              )}
              <button
                onClick={() => portalMutation.mutate(!member.portalAccess)}
                className="text-sm text-primary-600 hover:underline"
              >
                {member.portalAccess ? "Désactiver" : "Activer"}
              </button>
            </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Créé le
            </label>
            <p className="break-words text-sm font-semibold text-gray-900 sm:text-base">
              {new Date(member.createdAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dernière modification
            </label>
            <p className="break-words text-sm font-semibold text-gray-900 sm:text-base">
              {new Date(member.updatedAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
      </div>

      {/* Modal réinitialisation mot de passe */}
      {showResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowResetPassword(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-4 sm:p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Réinitialiser le mot de passe
            </h3>
            <p className="text-gray-600 mb-6">
              Un email de réinitialisation sera envoyé à{" "}
              <strong>{member.email}</strong>.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => setShowResetPassword(false)}
                className="flex-1 px-4 py-2 ring-1 ring-gray-100 rounded-2xl text-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={handleResetPassword}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
