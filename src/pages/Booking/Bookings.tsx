import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Ban,
  UserX,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Loader2,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";
import type { BookingResponse } from "../../services/booking.service";
import { useAuth } from "../../contexts/AuthContext";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  DRAFT: {
    label: "Brouillon",
    color: "bg-gray-100 text-gray-700",
    icon: Clock,
  },
  PENDING_APPROVAL: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  REJECTED: {
    label: "Rejetée",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
  CONFIRMED: {
    label: "Confirmée",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    label: "En cours",
    color: "bg-blue-100 text-blue-700",
    icon: Play,
  },
  COMPLETED: {
    label: "Terminée",
    color: "bg-gray-100 text-gray-700",
    icon: CheckCircle,
  },
  CANCELLED: { label: "Annulée", color: "bg-red-100 text-red-700", icon: Ban },
  NO_SHOW: {
    label: "Non présent",
    color: "bg-orange-100 text-orange-700",
    icon: UserX,
  },
  EXPIRED: {
    label: "Expirée",
    color: "bg-gray-100 text-gray-500",
    icon: Clock,
  },
};

const paymentModeLabels: Record<string, string> = {
  DIRECT: "Direct",
  SUBSCRIPTION: "Abonnement",
  PASS: "Pass",
};

export const AdminBookings: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = <T,>(setter: (v: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const {
    data: bookingsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["bookings", page, statusFilter, resourceFilter, debouncedSearch],
    queryFn: () =>
      bookingService.getBookings({
        query: debouncedSearch || undefined,
        status: statusFilter || undefined,
        resourceCode: resourceFilter || undefined,
        page,
        size: 20,
        sort: "startedAt,desc",
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["bookings"] });

  const confirmMutation = useMutation({
    mutationFn: ({
      bookingNumber,
      reason,
    }: {
      bookingNumber: string;
      reason?: string;
    }) =>
      bookingService.confirmBooking(bookingNumber, {
        changedBy: admin?.email,
        reason,
        sendEmail: true,
      }),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors de la confirmation."),
  });

  const approveMutation = useMutation({
    mutationFn: ({
      bookingNumber,
      reason,
    }: {
      bookingNumber: string;
      reason?: string;
    }) =>
      bookingService.approveBooking(bookingNumber, {
        changedBy: admin?.email,
        reason,
        sendEmail: true,
      }),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors de l'approbation."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      bookingNumber,
      reason,
    }: {
      bookingNumber: string;
      reason?: string;
    }) =>
      bookingService.rejectBooking(bookingNumber, {
        changedBy: admin?.email,
        reason,
        sendEmail: true,
      }),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors du rejet."),
  });

  const startMutation = useMutation({
    mutationFn: (bookingNumber: string) =>
      bookingService.startBooking(bookingNumber, { changedBy: admin?.email }),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors du démarrage."),
  });

  const checkInMutation = useMutation({
    mutationFn: (bookingNumber: string) =>
      bookingService.checkIn(bookingNumber, { actor: admin?.email }),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors du check-in."),
  });

  const checkOutMutation = useMutation({
    mutationFn: (bookingNumber: string) =>
      bookingService.checkOut(bookingNumber, { actor: admin?.email }),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors du check-out."),
  });

  const completeMutation = useMutation({
    mutationFn: (bookingNumber: string) =>
      bookingService.completeBooking(bookingNumber, {
        changedBy: admin?.email,
      }),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors de la complétion."),
  });

  const cancelMutation = useMutation({
    mutationFn: ({
      bookingNumber,
      reason,
    }: {
      bookingNumber: string;
      reason?: string;
    }) =>
      bookingService.cancelBooking(bookingNumber, {
        changedBy: admin?.email,
        reason,
        sendEmail: true,
      }),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors de l'annulation."),
  });

  const noShowMutation = useMutation({
    mutationFn: (bookingNumber: string) =>
      bookingService.noShowBooking(bookingNumber, { changedBy: admin?.email }),
    onSuccess: invalidate,
    onError: () => alert("Erreur lors du no-show."),
  });

  const bookings: BookingResponse[] = bookingsData?.data || [];
  const totalPages = bookingsData?.pageable?.totalPages ?? 0;
  const totalElements = bookingsData?.pageable?.totalElements ?? 0;

  const anyPending =
    confirmMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    startMutation.isPending ||
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending ||
    noShowMutation.isPending;

  const getAvailableActions = (booking: BookingResponse) => {
    const s = booking.status;
    const actions: {
      label: string;
      action: string;
      icon: React.ElementType;
      color: string;
    }[] = [];

    if (s === "DRAFT") {
      actions.push({
        label: "Confirmer",
        action: "confirm",
        icon: CheckCircle,
        color: "text-green-600",
      });
      actions.push({
        label: "Annuler",
        action: "cancel",
        icon: Ban,
        color: "text-red-600",
      });
    }
    if (s === "PENDING_APPROVAL") {
      actions.push({
        label: "Approuver",
        action: "approve",
        icon: CheckCircle,
        color: "text-green-600",
      });
      actions.push({
        label: "Rejeter",
        action: "reject",
        icon: XCircle,
        color: "text-red-600",
      });
    }
    if (s === "CONFIRMED") {
      actions.push({
        label: "Démarrer",
        action: "start",
        icon: Play,
        color: "text-blue-600",
      });
      actions.push({
        label: "Check-in",
        action: "checkIn",
        icon: LogIn,
        color: "text-indigo-600",
      });
      actions.push({
        label: "No-show",
        action: "noShow",
        icon: UserX,
        color: "text-orange-600",
      });
      actions.push({
        label: "Annuler",
        action: "cancel",
        icon: Ban,
        color: "text-red-600",
      });
    }
    if (s === "IN_PROGRESS") {
      actions.push({
        label: "Check-out",
        action: "checkOut",
        icon: LogOut,
        color: "text-indigo-600",
      });
      actions.push({
        label: "Terminer",
        action: "complete",
        icon: CheckCircle,
        color: "text-green-600",
      });
      actions.push({
        label: "No-show",
        action: "noShow",
        icon: UserX,
        color: "text-orange-600",
      });
      actions.push({
        label: "Annuler",
        action: "cancel",
        icon: Ban,
        color: "text-red-600",
      });
    }
    if (s === "REJECTED") {
      actions.push({
        label: "Annuler",
        action: "cancel",
        icon: Ban,
        color: "text-red-600",
      });
    }

    return actions;
  };

  const handleAction = (action: string, booking: BookingResponse) => {
    const bn = booking.bookingNumber;
    switch (action) {
      case "confirm": {
        const reason =
          window.prompt("Motif de confirmation (optionnel) :") ?? undefined;
        confirmMutation.mutate({
          bookingNumber: bn,
          reason: reason || undefined,
        });
        break;
      }
      case "approve": {
        const reason =
          window.prompt("Motif d'approbation (optionnel) :") ?? undefined;
        approveMutation.mutate({
          bookingNumber: bn,
          reason: reason || undefined,
        });
        break;
      }
      case "reject": {
        const reason = window.prompt("Motif du rejet (obligatoire) :");
        if (reason) rejectMutation.mutate({ bookingNumber: bn, reason });
        break;
      }
      case "start":
        startMutation.mutate(bn);
        break;
      case "checkIn":
        checkInMutation.mutate(bn);
        break;
      case "checkOut":
        checkOutMutation.mutate(bn);
        break;
      case "complete":
        if (window.confirm("Marquer cette réservation comme terminée ?"))
          completeMutation.mutate(bn);
        break;
      case "cancel": {
        const reason = window.prompt("Motif de l'annulation (obligatoire) :");
        if (reason) cancelMutation.mutate({ bookingNumber: bn, reason });
        break;
      }
      case "noShow":
        if (window.confirm("Marquer comme non-présentation ?"))
          noShowMutation.mutate(bn);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Réservations</h2>
          {totalElements > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {totalElements} réservation{totalElements > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate("/admin/bookings/create")}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={18} />
          Nouvelle réservation
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Rechercher par numéro, membre, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
            />
            {isFetching && search && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
              />
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) =>
              handleFilterChange(setStatusFilter, e.target.value)
            }
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white"
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
            onChange={(e) =>
              handleFilterChange(setResourceFilter, e.target.value)
            }
            className="px-4 py-2 border border-gray-200 rounded-lg w-40"
          />
          {(statusFilter || resourceFilter || search) && (
            <button
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setStatusFilter("");
                setResourceFilter("");
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 whitespace-nowrap"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  N° Réservation
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Ressource
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Type/Groupe
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Abonnement/Droit
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Date & Horaire
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                  Montant
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Mode
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.map((booking) => {
                const status = statusConfig[booking.status];
                const StatusIcon = status?.icon;
                const actions = getAvailableActions(booking);

                return (
                  <tr
                    key={booking.bookingNumber}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() =>
                          navigate(`/admin/bookings/${booking.bookingNumber}`)
                        }
                        className="font-medium text-primary-600 hover:text-primary-700 hover:underline text-left"
                      >
                        {booking.bookingNumber}
                      </button>
                      <p className="text-xs text-gray-500">
                        {new Date(booking.createdAt).toLocaleDateString(
                          "fr-FR",
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {booking.resourceName}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {booking.resourceCode}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-500">
                        {booking.resourceTypeCode || "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {booking.resourceGroupCode || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {booking.ownerName || booking.ownerCode}
                      </p>
                      <p className="text-xs text-gray-500">
                        {booking.contactEmail || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {booking.subscriptionNumber && (
                        <p className="text-xs text-blue-600 font-medium">
                          {booking.subscriptionNumber}
                        </p>
                      )}
                      {booking.passNumber && !booking.subscriptionNumber && (
                        <p className="text-xs text-purple-600">
                          {booking.passNumber}
                        </p>
                      )}
                      {booking.entitlementCode &&
                        !booking.subscriptionNumber &&
                        !booking.passNumber && (
                          <p className="text-xs text-green-600">
                            {booking.entitlementCode}
                          </p>
                        )}
                      {!booking.subscriptionNumber &&
                        !booking.passNumber &&
                        !booking.entitlementCode &&
                        booking.paymentMode === "SUBSCRIPTION" && (
                          <p className="text-xs text-orange-500">
                            En attente d'activation
                          </p>
                        )}
                      {booking.paymentMode === "DIRECT" && (
                        <p className="text-xs text-gray-400">Sans abonnement</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar size={12} className="mr-1 text-gray-400" />
                        {new Date(booking.startedAt).toLocaleDateString(
                          "fr-FR",
                        )}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-0.5">
                        <Clock size={12} className="mr-1 text-gray-400" />
                        {new Date(booking.startedAt).toLocaleTimeString(
                          "fr-FR",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                        {" — "}
                        {new Date(booking.endedAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-gray-900">
                        {booking.totalAmount.toLocaleString("fr-FR")} FCFA
                      </p>
                      <p className="text-xs text-gray-500">
                        {booking.durationMinutes} min
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {status && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${status.color}`}
                        >
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {paymentModeLabels[booking.paymentMode] ||
                          booking.paymentMode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-1 flex-wrap">
                        <button
                          onClick={() =>
                            navigate(`/admin/bookings/${booking.bookingNumber}`)
                          }
                          className="p-1 text-primary-600 hover:text-primary-700"
                          title="Voir détail"
                        >
                          <Eye size={16} />
                        </button>
                        {actions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.action}
                              onClick={() =>
                                handleAction(action.action, booking)
                              }
                              disabled={anyPending}
                              className={`p-1 ${action.color} hover:opacity-80 disabled:opacity-40`}
                              title={action.label}
                            >
                              <Icon size={15} />
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {bookings.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Aucune réservation trouvée</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {totalElements} réservation{totalElements > 1 ? "s" : ""} — Page{" "}
              {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
