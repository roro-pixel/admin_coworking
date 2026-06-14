import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  RefreshCw,
  Calendar as CalendarIcon,
  XCircle,
  AlertCircle,
  Bell,
  Users,
  Loader2,
  Eye,
  ArrowRight,
  CheckCircle,
  X,
} from "lucide-react";
import { waitlistService } from "../../services/waitlist.service";
import { bookingService } from "../../services/booking.service";
import type {
  WaitlistEntry,
  WaitlistAlternative,
  WaitlistStatus,
} from "../../services/waitlist.service";
import { ModalPortal } from "../../components/ui/ModalPortal";

const statusConfig: Record<WaitlistStatus, { label: string; color: string }> = {
  WAITING: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
  OFFERED: { label: "Offre envoyée", color: "bg-blue-100 text-blue-700" },
  PROMOTED: { label: "Promue", color: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expirée", color: "bg-gray-100 text-gray-500" },
  CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-700" },
};

export const WaitlistManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | "">("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(
    null,
  );
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["waitlist-entries", statusFilter, resourceFilter],
    queryFn: () =>
      waitlistService.getWaitlistEntries({
        status: statusFilter || undefined,
        resourceCode: resourceFilter || undefined,
        page: 0,
        size: 50,
      }),
  });

  // CORRECTION : promoteAvailable attend un objet PromoteAvailableRequest
  const promoteMutation = useMutation({
    mutationFn: (limit: number) =>
      waitlistService.promoteAvailable({ limit, dryRun: false }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      alert(`${result.promotedCount} créneau(x) disponible(s) ont été promus.`);
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || "Erreur lors de la promotion");
    },
  });

  // CORRECTION : expireOffers attend un objet ExpireOffersRequest
  const expireMutation = useMutation({
    mutationFn: (limit: number) =>
      waitlistService.expireOffers({ limit, dryRun: false }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      alert(`${result.expiredCount} offre(s) expirée(s) ont été traitées.`);
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || "Erreur lors de l'expiration");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => waitlistService.cancelWaitlistEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      if (selectedEntry) {
        setSelectedEntry(null);
        setShowAlternativesModal(false);
      }
    },
    onError: (error: any) => {
      alert(error?.response?.data?.message || "Erreur lors de l'annulation");
    },
  });

  const getAlternativesForEntry = async (
    entry: WaitlistEntry,
  ): Promise<WaitlistAlternative[]> => {
    try {
      const identityLookup: any = {};
      if (entry.ownerCode) {
        if (entry.ownerType === "MEMBER")
          identityLookup.memberId =
            parseInt(entry.ownerCode.replace(/\D/g, "")) || entry.ownerCode;
        else if (entry.ownerType === "CUSTOMER")
          identityLookup.customerId = entry.ownerCode;
        else if (entry.ownerType === "BUSINESS")
          identityLookup.businessCode = entry.ownerCode;
      }
      if (entry.contactEmail) identityLookup.email = entry.contactEmail;
      if (entry.contactPhone) identityLookup.phone = entry.contactPhone;

      const alternatives = await waitlistService.getAlternatives({
        resourceCode: entry.resourceCode,
        identityLookup,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        quantity: 1,
        paymentMode: entry.paymentMode,
        contactName: entry.contactName,
        contactEmail: entry.contactEmail,
        contactPhone: entry.contactPhone,
      });
      return alternatives;
    } catch (error) {
      console.error("Erreur chargement alternatives:", error);
      return [];
    }
  };

  const handleViewAlternatives = async (entry: WaitlistEntry) => {
    setSelectedEntry(entry);
    setBookingResult(null);
    const alternatives = await getAlternativesForEntry(entry);
    setSelectedEntry({ ...entry, alternatives });
    setShowAlternativesModal(true);
  };

  const handleBookAlternative = async (alternative: WaitlistAlternative) => {
    if (!selectedEntry) return;

    try {
      const identityLookup: any = {};
      if (selectedEntry.ownerCode) {
        if (selectedEntry.ownerType === "MEMBER")
          identityLookup.memberId =
            parseInt(selectedEntry.ownerCode.replace(/\D/g, "")) ||
            selectedEntry.ownerCode;
        else if (selectedEntry.ownerType === "CUSTOMER")
          identityLookup.customerId = selectedEntry.ownerCode;
        else if (selectedEntry.ownerType === "BUSINESS")
          identityLookup.businessCode = selectedEntry.ownerCode;
      }
      if (selectedEntry.contactEmail)
        identityLookup.email = selectedEntry.contactEmail;
      if (selectedEntry.contactPhone)
        identityLookup.phone = selectedEntry.contactPhone;

      const booking = await bookingService.createBooking({
        resourceCode: alternative.resourceCode,
        startedAt: alternative.startedAt,
        endedAt: alternative.endedAt,
        quantity: 1,
        paymentMode: selectedEntry.paymentMode,
        confirmImmediately: true,
        sendEmail: true,
        contactName: selectedEntry.contactName,
        contactEmail: selectedEntry.contactEmail,
        contactPhone: selectedEntry.contactPhone,
        ...identityLookup,
      });

      await waitlistService.cancelWaitlistEntry(selectedEntry.id);

      setBookingResult({
        success: true,
        message: `Réservation ${booking.bookingNumber} créée avec succès. L'entrée en liste d'attente a été annulée.`,
      });

      queryClient.invalidateQueries({ queryKey: ["waitlist-entries"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });

      setTimeout(() => {
        setShowAlternativesModal(false);
        setSelectedEntry(null);
        setBookingResult(null);
      }, 2000);
    } catch (error: any) {
      setBookingResult({
        success: false,
        message:
          error?.response?.data?.message ||
          "Erreur lors de la réservation alternative",
      });
    }
  };

  const entries: WaitlistEntry[] = data?.content || [];
  const totalElements = data?.totalElements || 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Liste d'attente
          </h2>
          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {totalElements} entrée{totalElements > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => promoteMutation.mutate(50)}
            disabled={promoteMutation.isPending}
            className="px-3 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {promoteMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Bell size={14} />
            )}
            Promouvoir disponibles
          </button>
          <button
            onClick={() => expireMutation.mutate(50)}
            disabled={expireMutation.isPending}
            className="px-3 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {expireMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Clock size={14} />
            )}
            Expirer offres
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 border border-gray-200 rounded-xl hover:bg-primary-50/40"
            title="Actualiser"
          >
            <RefreshCw size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as WaitlistStatus | "")
            }
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statusConfig).map(([value, cfg]) => (
              <option key={value} value={value}>
                {cfg.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Code ressource..."
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl w-64"
          />
          {(statusFilter || resourceFilter) && (
            <button
              onClick={() => {
                setStatusFilter("");
                setResourceFilter("");
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-primary-50/40"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 ">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Ressource
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Créneau demandé
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Mode
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Offre
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const status = statusConfig[entry.status];
                return (
                  <tr key={entry.id} className="hover:bg-primary-50/40">
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono text-gray-500">
                        {entry.id}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.ownerName ||
                          entry.contactName ||
                          entry.ownerCode ||
                          "—"}
                      </p>
                      <p className="text-xs text-gray-500">{entry.ownerType}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {entry.resourceName}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {entry.resourceCode}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon
                          size={12}
                          className="mr-1 text-gray-400"
                        />
                        {new Date(entry.startedAt).toLocaleDateString("fr-FR")}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(entry.startedAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" — "}
                        {new Date(entry.endedAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
                        {entry.paymentMode === "SUBSCRIPTION"
                          ? "Abonnement"
                          : entry.paymentMode === "PASS"
                            ? "Pass"
                            : "Direct"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {status && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}
                        >
                          {status.label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {entry.offeredAt ? (
                        <p className="text-xs text-gray-500">
                          Offerte le{" "}
                          {new Date(entry.offeredAt).toLocaleDateString(
                            "fr-FR",
                          )}
                          {entry.expiresAt && (
                            <span className="block text-orange-600">
                              expire le{" "}
                              {new Date(entry.expiresAt).toLocaleDateString(
                                "fr-FR",
                              )}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">—</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        {entry.status === "WAITING" && (
                          <button
                            onClick={() => handleViewAlternatives(entry)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Voir créneaux alternatifs"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        {entry.status === "WAITING" && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "Annuler cette entrée en liste d'attente ?",
                                )
                              ) {
                                cancelMutation.mutate(entry.id);
                              }
                            }}
                            disabled={cancelMutation.isPending}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Annuler"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune entrée en liste d'attente</p>
          </div>
        )}
      </div>

      {/* MODALE DES ALTERNATIVES */}
      {showAlternativesModal && selectedEntry && (
        <ModalPortal onClose={() => setShowAlternativesModal(false)}>
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-xl font-bold">Créneaux alternatifs</h3>
            <button
              onClick={() => setShowAlternativesModal(false)}
              className="p-1 hover:bg-gray-100 rounded-xl"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {bookingResult && (
              <div
                className={`mb-4 p-3 rounded-xl ${bookingResult.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}
              >
                {bookingResult.success ? (
                  <CheckCircle size={16} className="inline mr-2" />
                ) : (
                  <AlertCircle size={16} className="inline mr-2" />
                )}
                {bookingResult.message}
              </div>
            )}

            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700">
                Demande originale
              </p>
              <p className="text-sm">
                <span className="font-medium">Ressource:</span>{" "}
                {selectedEntry.resourceName}
              </p>
              <p className="text-sm">
                <span className="font-medium">Créneau:</span>{" "}
                {new Date(selectedEntry.startedAt).toLocaleString("fr-FR")} →{" "}
                {new Date(selectedEntry.endedAt).toLocaleString("fr-FR")}
              </p>
              <p className="text-sm">
                <span className="font-medium">Client:</span>{" "}
                {selectedEntry.ownerName ||
                  selectedEntry.contactName ||
                  selectedEntry.ownerCode}
              </p>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-3">
              {selectedEntry.alternatives?.length || 0} créneau(x) alternatif(s)
              disponible(s)
            </p>

            {selectedEntry.alternatives &&
            selectedEntry.alternatives.length > 0 ? (
              <div className="space-y-3">
                {selectedEntry.alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-3 border border-gray-200 rounded-xl hover:bg-primary-50/40"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(alt.startedAt).toLocaleString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          <ArrowRight
                            size={12}
                            className="inline mx-2 text-gray-400"
                          />
                          {new Date(alt.endedAt).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {alt.resourceName}
                        </p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span>
                            Capacité: {alt.remainingCapacity} place(s)
                          </span>
                          <span>Score: {alt.score}%</span>
                          <span className="text-green-600 font-medium">
                            {alt.estimatedAmount.toLocaleString("fr-FR")} FCFA
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {alt.reason}
                        </p>
                      </div>
                      <button
                        onClick={() => handleBookAlternative(alt)}
                        disabled={!!bookingResult}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-700 disabled:opacity-50"
                      >
                        Réserver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                <p>Aucun créneau alternatif trouvé pour le moment.</p>
                <p className="text-sm mt-1">
                  Le client reste en liste d'attente.
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t flex gap-3">
              <button
                onClick={() => {
                  if (confirm("Annuler cette entrée en liste d'attente ?")) {
                    cancelMutation.mutate(selectedEntry.id);
                    setShowAlternativesModal(false);
                  }
                }}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 disabled:opacity-50"
              >
                {cancelMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin inline mr-2" />
                ) : (
                  <XCircle size={16} className="inline mr-2" />
                )}
                Annuler la liste d'attente
              </button>
              <button
                onClick={() => setShowAlternativesModal(false)}
                className="flex-1 px-4 py-2 border rounded-xl text-gray-700 hover:bg-primary-50/40"
              >
                Fermer
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
