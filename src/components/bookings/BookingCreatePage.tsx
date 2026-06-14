import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  Building2,
  CreditCard,
  FileText,
  Bell,
} from "lucide-react";
import { bookingService } from "../../services/booking.service";
import { resourceService } from "../../services/resource.service";
import type { ResourceSummaryResponse } from "../../services/resource.service";
import type { CustomerSummaryResponse } from "../../services/customer.service";
import type { MemberSummaryResponse } from "../../services/member.service";
import type {
  CheckAvailabilityResponse,
  BookingSuggestion,
  BookingPaymentMode,
} from "../../services/booking.service";
import { CustomerAutocomplete } from "../../components/customers/CustomerAutocomplete";
import { MemberAutocomplete } from "../../components/members/MemberAutocomplete";
import { AdminLayout } from "../../components/layout/AdminLayout";

const paymentModes = [
  { value: "DIRECT", label: "Paiement direct", icon: CreditCard },
  { value: "SUBSCRIPTION", label: "Abonnement", icon: Building2 },
  { value: "PASS", label: "Pass", icon: FileText },
];

const durationOptions = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 heure" },
  { value: 90, label: "1h30" },
  { value: 120, label: "2 heures" },
  { value: 180, label: "3 heures" },
  { value: 240, label: "4 heures" },
  { value: 480, label: "8 heures" },
];

const toLocalDateTime = (datetimeLocal: string): string => {
  if (!datetimeLocal) return "";
  return datetimeLocal.length === 16
    ? `${datetimeLocal}:00`
    : datetimeLocal.substring(0, 19);
};

const buildDefaultFormData = () => ({
  resourceCode: "",
  resourceSearch: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  startedAt: "",
  endedAt: "",
  quantity: 1,
  paymentMode: "DIRECT" as BookingPaymentMode,
  notes: "",
  walkIn: false,
  confirmImmediately: true,
  sendEmail: true,
});

export const BookingCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(buildDefaultFormData);
  const [ownerType, setOwnerType] = useState<"MEMBER" | "CUSTOMER" | "WALKIN">(
    "MEMBER",
  );
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<MemberSummaryResponse | null>(null);
  const [selectedResource, setSelectedResource] =
    useState<ResourceSummaryResponse | null>(null);
  const [duration, setDuration] = useState(60);
  const [resourceResults, setResourceResults] = useState<
    ResourceSummaryResponse[]
  >([]);
  const [resourceSearchLoading, setResourceSearchLoading] = useState(false);

  const [availabilityResult, setAvailabilityResult] =
    useState<CheckAvailabilityResponse | null>(null);
  const [suggestions, setSuggestions] = useState<BookingSuggestion[]>([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarNav, setCalendarNav] = useState<{
    year: number;
    month: number;
  }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node)
      ) {
        setCalendarOpen(false);
      }
    };
    if (calendarOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [calendarOpen]);

  useEffect(() => {
    if (!formData.resourceSearch || formData.resourceSearch.length < 2) {
      setResourceResults([]);
      return;
    }
    if (selectedResource) return;

    setResourceSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await resourceService.searchResources(
          formData.resourceSearch,
        );
        setResourceResults(Array.isArray(results) ? results : []);
      } catch {
        setResourceResults([]);
      } finally {
        setResourceSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [formData.resourceSearch, selectedResource]);

  const snapToHalfHour = (datetimeLocal: string): string => {
    if (!datetimeLocal) return datetimeLocal;
    const [datePart, timePart] = datetimeLocal.slice(0, 16).split("T");
    const [h, m] = timePart.split(":").map(Number);
    const snappedM = m <= 0 ? 0 : m <= 30 ? 30 : 0;
    const snappedH = m > 30 ? (h + 1) % 24 : h;
    const newDate =
      m > 30 && h === 23
        ? (() => {
            const d = new Date(`${datePart}T12:00:00`);
            d.setDate(d.getDate() + 1);
            return d.toISOString().slice(0, 10);
          })()
        : datePart;
    return `${newDate}T${String(snappedH).padStart(2, "0")}:${String(snappedM).padStart(2, "0")}`;
  };

  const addMinutesToLocalDatetime = (
    datetimeLocal: string,
    minutes: number,
  ): string => {
    if (!datetimeLocal) return "";
    const [datePart, timePart] = datetimeLocal.slice(0, 16).split("T");
    const [h, m] = timePart.split(":").map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    if (totalMinutes >= 24 * 60) {
      const date = new Date(`${datePart}T12:00:00`);
      date.setDate(date.getDate() + Math.floor(totalMinutes / (24 * 60)));
      const newDate = date.toISOString().slice(0, 10);
      return `${newDate}T${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
    }
    return `${datePart}T${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
  };

  const handleStartDateChange = (startDate: string) => {
    setAvailabilityChecked(false);
    setAvailabilityResult(null);
    setSuggestions([]);
    const snapped = snapToHalfHour(startDate);
    if (snapped && duration) {
      const endedAt = addMinutesToLocalDatetime(snapped, duration);
      setFormData((prev) => ({ ...prev, startedAt: snapped, endedAt }));
    } else {
      setFormData((prev) => ({ ...prev, startedAt: snapped }));
    }
  };

  const handleDurationChange = (minutes: number) => {
    setDuration(minutes);
    setAvailabilityChecked(false);
    setAvailabilityResult(null);
    setSuggestions([]);
    if (formData.startedAt) {
      const endedAt = addMinutesToLocalDatetime(formData.startedAt, minutes);
      setFormData((prev) => ({ ...prev, endedAt }));
    }
  };

  const handleOwnerTypeChange = (type: "MEMBER" | "CUSTOMER" | "WALKIN") => {
    setOwnerType(type);
    setSelectedCustomer(null);
    setSelectedMember(null);
    setFormData((prev) => ({
      ...prev,
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      walkIn: type === "WALKIN",
      paymentMode: type === "WALKIN" ? "DIRECT" : prev.paymentMode,
    }));
  };

  const handleResourceSelect = (resource: ResourceSummaryResponse) => {
    setSelectedResource(resource);
    setFormData((prev) => ({
      ...prev,
      resourceCode: resource.code,
      resourceSearch: resource.name,
    }));
    setResourceResults([]);
    setAvailabilityChecked(false);
    setAvailabilityResult(null);
    setSuggestions([]);
  };

  const checkAvailabilityMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        resourceCode: formData.resourceCode,
        paymentMode: formData.paymentMode,
        startedAt: toLocalDateTime(formData.startedAt),
        endedAt: toLocalDateTime(formData.endedAt),
        quantity: formData.quantity,
      };
      if (ownerType === "MEMBER" && selectedMember)
        payload.memberId = selectedMember.memberId;
      else if (ownerType === "CUSTOMER" && selectedCustomer)
        payload.customerId = selectedCustomer.customerId;
      else if (ownerType === "WALKIN") {
        payload.walkIn = true;
        if (formData.contactName) payload.contactName = formData.contactName;
        if (formData.contactEmail) payload.contactEmail = formData.contactEmail;
      }
      return bookingService.checkAvailability(payload);
    },
    onSuccess: async (result) => {
      setAvailabilityResult(result);
      setAvailabilityChecked(true);
      if (!result.available) {
        try {
          const payload: any = {
            resourceCode: formData.resourceCode,
            paymentMode: formData.paymentMode,
            startedAt: toLocalDateTime(formData.startedAt),
            endedAt: toLocalDateTime(formData.endedAt),
            quantity: formData.quantity,
          };
          if (ownerType === "MEMBER" && selectedMember)
            payload.memberId = selectedMember.memberId;
          else if (ownerType === "CUSTOMER" && selectedCustomer)
            payload.customerId = selectedCustomer.customerId;
          const sug = await bookingService.getSuggestions(payload);
          setSuggestions(Array.isArray(sug) ? sug : []);
        } catch {
          setSuggestions([]);
        }
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "";
      if (
        message.includes("subscription") ||
        message.includes("abonnement") ||
        message.includes("no active subscription")
      ) {
        setErrorMessage(
          "Aucun abonnement actif pour ce client.\n\n" +
            "Actions possibles :\n" +
            "• Souscrire un abonnement\n" +
            "• Utiliser un pass\n" +
            '• Changer le mode de paiement en "Paiement direct"',
        );
      } else if (
        message.includes("entitlement") ||
        message.includes("solde") ||
        message.includes("insufficient")
      ) {
        setErrorMessage(
          "Solde de droits insuffisant pour cette réservation.\n\n" +
            "Actions possibles :\n" +
            "• Utiliser un autre mode de paiement\n" +
            "• Contacter l'administrateur pour un ajustement",
        );
      } else if (
        message.includes("resource type") ||
        message.includes("resource group") ||
        message.includes("not covered")
      ) {
        setErrorMessage(
          "Cette ressource n'est pas couverte par votre abonnement/pass.\n\n" +
            `Type de ressource requis: ${message.match(/resourceType[:\s]*(\w+)/i)?.[1] || "?"}\n` +
            "Action possible : Changer de mode de paiement ou choisir une autre ressource",
        );
      } else {
        setErrorMessage(
          message || "Erreur lors de la vérification de disponibilité.",
        );
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        resourceCode: formData.resourceCode,
        startedAt: toLocalDateTime(formData.startedAt),
        endedAt: toLocalDateTime(formData.endedAt),
        quantity: formData.quantity,
        paymentMode: formData.paymentMode,
        confirmImmediately: formData.confirmImmediately,
        sendEmail: formData.sendEmail,
      };
      if (formData.contactName) payload.contactName = formData.contactName;
      if (formData.contactEmail) payload.contactEmail = formData.contactEmail;
      if (formData.contactPhone) payload.contactPhone = formData.contactPhone;
      if (formData.notes) payload.notes = formData.notes;
      if (ownerType === "MEMBER" && selectedMember)
        payload.memberId = selectedMember.memberId;
      else if (ownerType === "CUSTOMER" && selectedCustomer)
        payload.customerId = selectedCustomer.customerId;
      else if (ownerType === "WALKIN") payload.walkIn = true;
      return bookingService.createBooking(payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      navigate(`/bookings/${data.bookingNumber}`);
    },
    onError: (error: any) => {
      setErrorMessage(
        error?.response?.data?.message ||
          "Erreur lors de la création de la réservation.",
      );
    },
  });

  const canCheckAvailability = !!(
    formData.resourceCode &&
    formData.startedAt &&
    formData.endedAt &&
    (ownerType === "WALKIN" || selectedMember || selectedCustomer)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.resourceCode || !formData.startedAt || !formData.endedAt) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (ownerType === "MEMBER" && !selectedMember) {
      setErrorMessage("Veuillez sélectionner un membre.");
      return;
    }
    if (ownerType === "CUSTOMER" && !selectedCustomer) {
      setErrorMessage("Veuillez sélectionner un customer.");
      return;
    }
    if (!availabilityChecked) {
      checkAvailabilityMutation.mutate();
      return;
    }
    if (availabilityResult && !availabilityResult.available) {
      setErrorMessage(
        "Cette ressource n'est pas disponible pour ce créneau. Choisissez un autre créneau.",
      );
      return;
    }
    createMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate("/bookings")}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Nouvelle réservation
          </h1>
          <p className="text-gray-600 mt-1">
            Créer une nouvelle réservation de ressource
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm whitespace-pre-line flex items-start gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Ressource */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ressource <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.resourceSearch}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    resourceSearch: e.target.value,
                    resourceCode: "",
                  }));
                  setSelectedResource(null);
                  setAvailabilityChecked(false);
                  setAvailabilityResult(null);
                }}
                placeholder="Rechercher une ressource (min 2 caractères)..."
                className="w-full px-4 py-2 border border-gray-200 rounded-xl pr-8 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {resourceSearchLoading && (
                <Loader2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
                />
              )}
              {resourceResults.length > 0 && !selectedResource && (
                <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {resourceResults.map((resource) => (
                    <button
                      key={resource.code}
                      type="button"
                      onClick={() => handleResourceSelect(resource)}
                      className="w-full px-4 py-3 text-left hover:bg-primary-50/40 border-b last:border-0 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {resource.name}
                        </p>
                        <p className="text-xs text-gray-500">{resource.code}</p>
                      </div>
                      {!resource.bookingEnabled && (
                        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                          Non réservable
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedResource && (
              <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm text-green-800">
                    {selectedResource.name}
                  </p>
                  <p className="text-xs text-green-600">
                    {selectedResource.code}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedResource(null);
                    setFormData((prev) => ({
                      ...prev,
                      resourceCode: "",
                      resourceSearch: "",
                    }));
                    setAvailabilityChecked(false);
                    setAvailabilityResult(null);
                  }}
                  className="text-xs text-green-600 hover:text-red-600"
                >
                  Changer
                </button>
              </div>
            )}
          </div>

          {/* Type de client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de client <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-6">
              {(["MEMBER", "CUSTOMER", "WALKIN"] as const).map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    checked={ownerType === type}
                    onChange={() => handleOwnerTypeChange(type)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    {type === "MEMBER"
                      ? "Membre"
                      : type === "CUSTOMER"
                        ? "Customer"
                        : "Walk-in"}
                  </span>
                </label>
              ))}
            </div>
            {ownerType === "WALKIN" && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle size={12} />
                Walk-in : paiement direct uniquement. Un propriétaire temporaire
                sera créé.
              </p>
            )}
          </div>

          {/* Membre / Customer */}
          {ownerType !== "WALKIN" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {ownerType === "MEMBER" ? "Membre" : "Customer"}{" "}
                <span className="text-red-500">*</span>
              </label>
              {ownerType === "MEMBER" ? (
                <MemberAutocomplete
                  onSelect={(member) => {
                    setSelectedMember(member);
                    setFormData((prev) => ({
                      ...prev,
                      contactName: member?.fullName || prev.contactName,
                      contactEmail: member?.email || prev.contactEmail,
                      contactPhone: member?.phone || prev.contactPhone,
                    }));
                    setAvailabilityChecked(false);
                    setAvailabilityResult(null);
                  }}
                  selectedMember={selectedMember}
                  placeholder="Rechercher un membre..."
                />
              ) : (
                <CustomerAutocomplete
                  onSelect={(customer) => {
                    setSelectedCustomer(customer);
                    setFormData((prev) => ({
                      ...prev,
                      contactName: customer?.displayName || prev.contactName,
                      contactEmail: customer?.email || prev.contactEmail,
                      contactPhone: customer?.phone || prev.contactPhone,
                    }));
                    setAvailabilityChecked(false);
                    setAvailabilityResult(null);
                  }}
                  selectedCustomer={selectedCustomer}
                  placeholder="Rechercher un customer..."
                />
              )}
            </div>
          )}

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du contact{" "}
                {ownerType === "WALKIN" && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactName: e.target.value,
                    }))
                  }
                  required={ownerType === "WALKIN"}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactEmail: e.target.value,
                    }))
                  }
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactPhone: e.target.value,
                    }))
                  }
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Date, heure et durée */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date et heure de début <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2" ref={calendarRef}>
                <div className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((o) => !o)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-left text-sm flex items-center justify-between bg-white hover:border-primary-400 transition-colors"
                  >
                    <span
                      className={
                        formData.startedAt ? "text-gray-900" : "text-gray-400"
                      }
                    >
                      {formData.startedAt
                        ? new Date(
                            `${formData.startedAt.slice(0, 10)}T12:00:00`,
                          ).toLocaleDateString("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Choisir une date"}
                    </span>
                    <CalendarIcon size={16} className="text-gray-400" />
                  </button>

                  {calendarOpen && (
                    <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 w-80">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarNav((n) => {
                              const d = new Date(n.year, n.month - 1, 1);
                              return {
                                year: d.getFullYear(),
                                month: d.getMonth(),
                              };
                            })
                          }
                          className="p-1 hover:bg-gray-100 rounded-xl text-gray-600"
                        >
                          ‹
                        </button>
                        <span className="text-sm font-semibold text-gray-800">
                          {new Date(
                            calendarNav.year,
                            calendarNav.month,
                            1,
                          ).toLocaleDateString("fr-FR", {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarNav((n) => {
                              const d = new Date(n.year, n.month + 1, 1);
                              return {
                                year: d.getFullYear(),
                                month: d.getMonth(),
                              };
                            })
                          }
                          className="p-1 hover:bg-gray-100 rounded-xl text-gray-600"
                        >
                          ›
                        </button>
                      </div>

                      <div className="grid grid-cols-7 mb-2">
                        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
                          (d, i) => (
                            <div
                              key={d}
                              className={`text-center text-xs font-medium py-1 ${i === 6 ? "text-gray-300" : "text-gray-500"}`}
                            >
                              {d}
                            </div>
                          ),
                        )}
                      </div>

                      <div className="grid grid-cols-7 gap-0.5">
                        {(() => {
                          const firstDay = new Date(
                            calendarNav.year,
                            calendarNav.month,
                            1,
                          );
                          const startOffset = (firstDay.getDay() + 6) % 7;
                          const daysInMonth = new Date(
                            calendarNav.year,
                            calendarNav.month + 1,
                            0,
                          ).getDate();
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const selectedDate = formData.startedAt
                            ? formData.startedAt.slice(0, 10)
                            : "";
                          const cells = [];
                          for (let i = 0; i < startOffset; i++) {
                            cells.push(<div key={`e${i}`} />);
                          }
                          for (let day = 1; day <= daysInMonth; day++) {
                            const date = new Date(
                              calendarNav.year,
                              calendarNav.month,
                              day,
                            );
                            const isSunday = date.getDay() === 0;
                            const isPast = date < today;
                            const dateStr = `${calendarNav.year}-${String(calendarNav.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const isSelected = dateStr === selectedDate;
                            const isToday = date.getTime() === today.getTime();
                            const disabled = isSunday || isPast;
                            cells.push(
                              <button
                                key={day}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  const time = formData.startedAt
                                    ? formData.startedAt.slice(11, 16)
                                    : "08:00";
                                  handleStartDateChange(`${dateStr}T${time}`);
                                  setCalendarOpen(false);
                                }}
                                className={[
                                  "w-full aspect-square rounded-xl text-xs font-medium transition-colors flex items-center justify-center",
                                  disabled
                                    ? "text-gray-200 cursor-not-allowed"
                                    : isSelected
                                      ? "bg-primary-600 text-white"
                                      : isToday
                                        ? "border border-primary-300 text-primary-600 hover:bg-primary-50"
                                        : "text-gray-700 hover:bg-gray-100",
                                ].join(" ")}
                              >
                                {day}
                              </button>,
                            );
                          }
                          return cells;
                        })()}
                      </div>
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        Les dimanches ne sont pas disponibles
                      </p>
                    </div>
                  )}
                </div>
                <select
                  value={
                    formData.startedAt ? formData.startedAt.slice(11, 13) : "08"
                  }
                  onChange={(e) => {
                    const date = formData.startedAt
                      ? formData.startedAt.slice(0, 10)
                      : new Date().toISOString().slice(0, 10);
                    const min = formData.startedAt
                      ? formData.startedAt.slice(14, 16)
                      : "00";
                    handleStartDateChange(`${date}T${e.target.value}:${min}`);
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 8).map((h) => (
                    <option key={h} value={String(h).padStart(2, "0")}>
                      {String(h).padStart(2, "0")}h
                    </option>
                  ))}
                </select>
                <select
                  value={
                    formData.startedAt ? formData.startedAt.slice(14, 16) : "00"
                  }
                  onChange={(e) => {
                    const date = formData.startedAt
                      ? formData.startedAt.slice(0, 10)
                      : new Date().toISOString().slice(0, 10);
                    const hour = formData.startedAt
                      ? formData.startedAt.slice(11, 13)
                      : "08";
                    handleStartDateChange(`${date}T${hour}:${e.target.value}`);
                  }}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm"
                >
                  <option value="00">:00</option>
                  <option value="30">:30</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Durée <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <select
                  value={duration}
                  onChange={(e) =>
                    handleDurationChange(parseInt(e.target.value))
                  }
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {durationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {formData.endedAt && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={12} />
              Fin prévue : {new Date(formData.endedAt).toLocaleString("fr-FR")}
            </p>
          )}

          {/* Quantité et mode de paiement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantité
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1,
                  }))
                }
                min="1"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode de paiement
              </label>
              <div className="relative">
                {(() => {
                  const mode = paymentModes.find(
                    (m) => m.value === formData.paymentMode,
                  );
                  const Icon = mode?.icon || CreditCard;
                  return (
                    <Icon
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  );
                })()}
                <select
                  value={formData.paymentMode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentMode: e.target.value as BookingPaymentMode,
                    }))
                  }
                  disabled={ownerType === "WALKIN"}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl disabled:bg-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {paymentModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
              {formData.paymentMode === "SUBSCRIPTION" && (
                <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                  <Building2 size={12} />
                  Le client doit avoir un abonnement actif avec un droit
                  compatible.
                </p>
              )}
              {formData.paymentMode === "PASS" && (
                <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
                  <FileText size={12} />
                  Le client doit avoir un pass valide avec des crédits
                  disponibles.
                </p>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.confirmImmediately}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmImmediately: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                Confirmer immédiatement
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendEmail}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sendEmail: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Envoyer un email</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Informations complémentaires..."
            />
          </div>

          {/* Résultat de disponibilité */}
          {availabilityChecked && availabilityResult && (
            <div
              className={`p-4 rounded-xl border ${
                availabilityResult.available
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {availabilityResult.available ? (
                  <CheckCircle size={18} className="text-green-600" />
                ) : (
                  <XCircle size={18} className="text-red-600" />
                )}
                <span
                  className={`text-sm font-medium ${availabilityResult.available ? "text-green-700" : "text-red-700"}`}
                >
                  {availabilityResult.available
                    ? "Disponible"
                    : "Non disponible"}
                </span>
              </div>
              {availabilityResult.available && (
                <div className="text-sm text-green-600 space-y-1">
                  <p>
                    Capacité restante : {availabilityResult.remainingCapacity}
                  </p>
                  <p>Durée : {availabilityResult.durationMinutes} min</p>
                  <p className="font-medium text-green-700">
                    Montant estimé :{" "}
                    {availabilityResult.estimatedAmount.toLocaleString("fr-FR")}{" "}
                    {availabilityResult.currency}
                  </p>
                </div>
              )}
              {!availabilityResult.available && availabilityResult.message && (
                <p className="text-sm text-red-600">
                  {availabilityResult.message}
                </p>
              )}
            </div>
          )}

          {/* Suggestions */}
          {availabilityChecked &&
            !availabilityResult?.available &&
            suggestions.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-amber-600" />
                  <p className="text-sm font-medium text-amber-700">
                    Créneaux alternatifs disponibles
                  </p>
                </div>
                <div className="space-y-2">
                  {suggestions.slice(0, 3).map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const start = sug.startedAt.substring(0, 16);
                        const end = sug.endedAt.substring(0, 16);
                        const dur = Math.round(
                          (new Date(sug.endedAt).getTime() -
                            new Date(sug.startedAt).getTime()) /
                            60000,
                        );
                        setDuration(dur);
                        setFormData((prev) => ({
                          ...prev,
                          startedAt: start,
                          endedAt: end,
                        }));
                        setAvailabilityChecked(false);
                        setAvailabilityResult(null);
                        setSuggestions([]);
                      }}
                      className="w-full text-left p-3 bg-white border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                        <CalendarIcon size={14} />
                        <span>
                          {new Date(sug.startedAt).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                        <ArrowRight size={12} />
                        <span>
                          {new Date(sug.endedAt).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <p className="text-amber-600 text-xs mt-1">
                        {sug.estimatedAmount.toLocaleString("fr-FR")} XAF ·{" "}
                        {sug.remainingCapacity} place
                        {sug.remainingCapacity > 1 ? "s" : ""}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Boutons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/bookings")}
              disabled={
                createMutation.isPending || checkAvailabilityMutation.isPending
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-primary-50/40 disabled:opacity-50 transition-colors"
            >
              Annuler
            </button>

            {!availabilityChecked && (
              <button
                type="button"
                onClick={() =>
                  canCheckAvailability && checkAvailabilityMutation.mutate()
                }
                disabled={
                  !canCheckAvailability || checkAvailabilityMutation.isPending
                }
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {checkAvailabilityMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Vérifier la disponibilité
              </button>
            )}

            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                checkAvailabilityMutation.isPending ||
                (availabilityChecked && !availabilityResult?.available)
              }
              className="flex-1 bg-primary-600 text-white py-2 rounded-xl hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {createMutation.isPending ||
              checkAvailabilityMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : availabilityChecked && availabilityResult?.available ? (
                <CheckCircle size={16} />
              ) : (
                <Bell size={16} />
              )}
              {availabilityChecked && availabilityResult?.available
                ? "Créer la réservation"
                : "Vérifier et créer"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};
