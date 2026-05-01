import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { bookingService } from '../../services/booking.service';
import { resourceService } from '../../services/resource.service';
import type { ResourceSummaryResponse } from '../../services/resource.service';
import type { CustomerSummaryResponse } from '../../services/customer.service';
import type { MemberSummaryResponse } from '../../services/member.service';
import type {
  CheckAvailabilityResponse,
  BookingSuggestion,
  BookingPaymentMode,
} from '../../services/booking.service';
import { CustomerAutocomplete } from '../customers/CustomerAutocomplete';
import { MemberAutocomplete } from '../members/MemberAutocomplete';
import { ModalPortal } from '../ui/ModalPortal';

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const paymentModes = [
  { value: 'DIRECT', label: 'Paiement direct' },
  { value: 'SUBSCRIPTION', label: 'Abonnement' },
  { value: 'PASS', label: 'Pass' },
];

const durationOptions = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 heure' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 heures' },
  { value: 180, label: '3 heures' },
  { value: 240, label: '4 heures' },
  { value: 480, label: '8 heures' },
];

// CORRECTION : format LocalDateTime sans secondes, sans timezone (exigé par le MD)
const toLocalDateTime = (datetimeLocal: string): string => {
  if (!datetimeLocal) return '';
  // datetime-local donne "2026-04-20T09:00" → on veut "2026-04-20T09:00:00"
  return datetimeLocal.length === 16 ? `${datetimeLocal}:00` : datetimeLocal.substring(0, 19);
};

const buildDefaultFormData = () => ({
  resourceCode: '',
  resourceSearch: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  startedAt: '',
  endedAt: '',
  quantity: 1,
  paymentMode: 'DIRECT' as BookingPaymentMode,
  notes: '',
  walkIn: false,
  confirmImmediately: true,
  sendEmail: true,
});

export const BookingFormModal: React.FC<BookingFormModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(buildDefaultFormData);
  const [ownerType, setOwnerType] = useState<'MEMBER' | 'CUSTOMER' | 'WALKIN'>('MEMBER');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummaryResponse | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberSummaryResponse | null>(null);
  const [selectedResource, setSelectedResource] = useState<ResourceSummaryResponse | null>(null);
  const [duration, setDuration] = useState(60);
  const [resourceResults, setResourceResults] = useState<ResourceSummaryResponse[]>([]);
  const [resourceSearchLoading, setResourceSearchLoading] = useState(false);

  // États checkAvailability
  const [availabilityResult, setAvailabilityResult] = useState<CheckAvailabilityResponse | null>(null);
  const [suggestions, setSuggestions] = useState<BookingSuggestion[]>([]);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calendar custom
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarNav, setCalendarNav] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    if (calendarOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calendarOpen]);

  // CORRECTION : reset complet à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setFormData(buildDefaultFormData());
      setOwnerType('MEMBER');
      setSelectedCustomer(null);
      setSelectedMember(null);
      setSelectedResource(null);
      setDuration(60);
      setResourceResults([]);
      setAvailabilityResult(null);
      setSuggestions([]);
      setAvailabilityChecked(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Recherche ressource avec debounce
  useEffect(() => {
    if (!formData.resourceSearch || formData.resourceSearch.length < 2) {
      setResourceResults([]);
      return;
    }
    if (selectedResource) return; // déjà sélectionnée

    setResourceSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await resourceService.searchResources(formData.resourceSearch);
        setResourceResults(Array.isArray(results) ? results : []);
      } catch {
        setResourceResults([]);
      } finally {
        setResourceSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [formData.resourceSearch, selectedResource]);

  // Arrondit au créneau de 30 min le plus proche (00 ou 30)
  const snapToHalfHour = (datetimeLocal: string): string => {
    if (!datetimeLocal) return datetimeLocal;
    const [datePart, timePart] = datetimeLocal.slice(0, 16).split('T');
    const [h, m] = timePart.split(':').map(Number);
    // Arrondi supérieur au prochain multiple de 30
    const snappedM = m <= 0 ? 0 : m <= 30 ? 30 : 0;
    const snappedH = m > 30 ? (h + 1) % 24 : h;
    const newDate = m > 30 && h === 23
      ? (() => {
          const d = new Date(`${datePart}T12:00:00`);
          d.setDate(d.getDate() + 1);
          return d.toISOString().slice(0, 10);
        })()
      : datePart;
    return `${newDate}T${String(snappedH).padStart(2, '0')}:${String(snappedM).padStart(2, '0')}`;
  };

  // CORRECTION : addMinutesToLocalDatetime évite le bug UTC
  // new Date("2026-04-27T09:00") est interprété en UTC → décalage selon fuseau
  // On manipule directement la chaîne datetime-local pour rester en heure locale
  const addMinutesToLocalDatetime = (datetimeLocal: string, minutes: number): string => {
    if (!datetimeLocal) return '';
    // Extraire les composants sans passer par new Date() (qui convertirait en UTC)
    const [datePart, timePart] = datetimeLocal.slice(0, 16).split('T');
    const [h, m] = timePart.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newH = Math.floor(totalMinutes / 60) % 24;
    const newM = totalMinutes % 60;
    // Gérer le passage au jour suivant
    if (totalMinutes >= 24 * 60) {
      const date = new Date(`${datePart}T12:00:00`); // midi pour éviter DST edge
      date.setDate(date.getDate() + Math.floor(totalMinutes / (24 * 60)));
      const newDate = date.toISOString().slice(0, 10);
      return `${newDate}T${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }
    return `${datePart}T${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Recalcul de endedAt quand startedAt ou duration change
  const handleStartDateChange = (startDate: string) => {
    setAvailabilityChecked(false);
    setAvailabilityResult(null);
    setSuggestions([]);
    // Forcer l'arrondi à 00 ou 30 même si le navigateur n'a pas respecté step=1800
    const snapped = snapToHalfHour(startDate);
    if (snapped && duration) {
      const endedAt = addMinutesToLocalDatetime(snapped, duration);
      setFormData(prev => ({ ...prev, startedAt: snapped, endedAt }));
    } else {
      setFormData(prev => ({ ...prev, startedAt: snapped }));
    }
  };

  const handleDurationChange = (minutes: number) => {
    setDuration(minutes);
    setAvailabilityChecked(false);
    setAvailabilityResult(null);
    setSuggestions([]);
    if (formData.startedAt) {
      const endedAt = addMinutesToLocalDatetime(formData.startedAt, minutes);
      setFormData(prev => ({ ...prev, endedAt }));
    }
  };

  const handleOwnerTypeChange = (type: 'MEMBER' | 'CUSTOMER' | 'WALKIN') => {
    setOwnerType(type);
    setSelectedCustomer(null);
    setSelectedMember(null);
    setFormData(prev => ({
      ...prev,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      walkIn: type === 'WALKIN',
      paymentMode: type === 'WALKIN' ? 'DIRECT' : prev.paymentMode,
    }));
  };

  const handleResourceSelect = (resource: ResourceSummaryResponse) => {
    setSelectedResource(resource);
    setFormData(prev => ({ ...prev, resourceCode: resource.code, resourceSearch: resource.name }));
    setResourceResults([]);
    setAvailabilityChecked(false);
    setAvailabilityResult(null);
    setSuggestions([]);
  };

  // CORRECTION : checkAvailability avant création (workflow recommandé par le MD)
  const checkAvailabilityMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        resourceCode: formData.resourceCode,
        paymentMode: formData.paymentMode,
        startedAt: toLocalDateTime(formData.startedAt),
        endedAt: toLocalDateTime(formData.endedAt),
        quantity: formData.quantity,
      };
      if (ownerType === 'MEMBER' && selectedMember) payload.memberId = selectedMember.memberId;
      else if (ownerType === 'CUSTOMER' && selectedCustomer) payload.customerId = selectedCustomer.customerId;
      else if (ownerType === 'WALKIN') {
        payload.walkIn = true;
        if (formData.contactName) payload.contactName = formData.contactName;
        if (formData.contactEmail) payload.contactEmail = formData.contactEmail;
      }
      return bookingService.checkAvailability(payload);
    },
    onSuccess: async (result) => {
      setAvailabilityResult(result);
      setAvailabilityChecked(true);
      // Si non disponible, charger les suggestions
      if (!result.available) {
        try {
          const payload: any = {
            resourceCode: formData.resourceCode,
            paymentMode: formData.paymentMode,
            startedAt: toLocalDateTime(formData.startedAt),
            endedAt: toLocalDateTime(formData.endedAt),
            quantity: formData.quantity,
          };
          if (ownerType === 'MEMBER' && selectedMember) payload.memberId = selectedMember.memberId;
          else if (ownerType === 'CUSTOMER' && selectedCustomer) payload.customerId = selectedCustomer.customerId;
          const sug = await bookingService.getSuggestions(payload);
          setSuggestions(Array.isArray(sug) ? sug : []);
        } catch { setSuggestions([]); }
      }
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la vérification de disponibilité.');
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
      if (ownerType === 'MEMBER' && selectedMember) payload.memberId = selectedMember.memberId;
      else if (ownerType === 'CUSTOMER' && selectedCustomer) payload.customerId = selectedCustomer.customerId;
      else if (ownerType === 'WALKIN') payload.walkIn = true;
      return bookingService.createBooking(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onSuccess();
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.message || 'Erreur lors de la création de la réservation.');
    },
  });

  const canCheckAvailability = !!(
    formData.resourceCode &&
    formData.startedAt &&
    formData.endedAt &&
    (ownerType === 'WALKIN' || selectedMember || selectedCustomer)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.resourceCode || !formData.startedAt || !formData.endedAt) {
      setErrorMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (ownerType === 'MEMBER' && !selectedMember) {
      setErrorMessage('Veuillez sélectionner un membre.');
      return;
    }
    if (ownerType === 'CUSTOMER' && !selectedCustomer) {
      setErrorMessage('Veuillez sélectionner un customer.');
      return;
    }
    // CORRECTION : si pas encore vérifié, on vérifie d'abord
    if (!availabilityChecked) {
      checkAvailabilityMutation.mutate();
      return;
    }
    // Si vérifié et non disponible → bloquer
    if (availabilityResult && !availabilityResult.available) {
      setErrorMessage('Cette ressource n\'est pas disponible pour ce créneau. Choisissez un autre créneau.');
      return;
    }
    createMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <ModalPortal onClose={onClose}>
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
        <h3 className="text-xl font-bold">Nouvelle réservation</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {/* Recherche ressource */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ressource *</label>
          <div className="relative">
            <input
              type="text"
              value={formData.resourceSearch}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, resourceSearch: e.target.value, resourceCode: '' }));
                setSelectedResource(null);
                setAvailabilityChecked(false);
                setAvailabilityResult(null);
              }}
              placeholder="Rechercher une ressource (min 2 caractères)..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg pr-8"
            />
            {resourceSearchLoading && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
            )}
            {resourceResults.length > 0 && !selectedResource && (
              <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {resourceResults.map((resource) => (
                  <button
                    key={resource.code}
                    type="button"
                    onClick={() => handleResourceSelect(resource)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-sm">{resource.name}</p>
                      <p className="text-xs text-gray-500">{resource.code}</p>
                    </div>
                    {!resource.bookingEnabled && (
                      <span className="text-xs text-red-500">Non réservable</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedResource && (
            <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-medium text-sm text-green-800">{selectedResource.name}</p>
                <p className="text-xs text-green-600">{selectedResource.code}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedResource(null);
                  setFormData(prev => ({ ...prev, resourceCode: '', resourceSearch: '' }));
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Type de client *</label>
          <div className="flex gap-4">
            {(['MEMBER', 'CUSTOMER', 'WALKIN'] as const).map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={ownerType === type}
                  onChange={() => handleOwnerTypeChange(type)}
                  className="rounded"
                />
                <span className="text-sm">
                  {type === 'MEMBER' ? 'Membre' : type === 'CUSTOMER' ? 'Customer' : 'Walk-in'}
                </span>
              </label>
            ))}
          </div>
          {ownerType === 'WALKIN' && (
            <p className="text-xs text-amber-600 mt-1">
              Walk-in : paiement direct uniquement. Un owner temporaire sera créé.
            </p>
          )}
        </div>

        {/* Sélection client */}
        {ownerType !== 'WALKIN' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {ownerType === 'MEMBER' ? 'Membre *' : 'Customer *'}
            </label>
            {ownerType === 'MEMBER' ? (
              <MemberAutocomplete
                onSelect={(member) => {
                  setSelectedMember(member);
                  setFormData(prev => ({
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
                  setFormData(prev => ({
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du contact{ownerType === 'WALKIN' ? ' *' : ''}
            </label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              required={ownerType === 'WALKIN'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Date et durée */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date et heure *</label>
            <div className="flex gap-2">
              {/* Date — calendar custom sans dimanches */}
              <div className="relative flex-1" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => setCalendarOpen(o => !o)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-left text-sm flex items-center justify-between bg-white hover:border-primary-400"
                >
                  <span className={formData.startedAt ? 'text-gray-900' : 'text-gray-400'}>
                    {formData.startedAt
                      ? new Date(`${formData.startedAt.slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Choisir une date'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                {calendarOpen && (
                  <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-72">
                    {/* Navigation mois */}
                    <div className="flex items-center justify-between mb-3">
                      <button type="button"
                        onClick={() => setCalendarNav(n => {
                          const d = new Date(n.year, n.month - 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-600">
                        ‹
                      </button>
                      <span className="text-sm font-semibold text-gray-800">
                        {new Date(calendarNav.year, calendarNav.month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                      <button type="button"
                        onClick={() => setCalendarNav(n => {
                          const d = new Date(n.year, n.month + 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-600">
                        ›
                      </button>
                    </div>

                    {/* Jours de la semaine — dim grisé */}
                    <div className="grid grid-cols-7 mb-1">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d, i) => (
                        <div key={d} className={`text-center text-xs font-medium py-1 ${i === 6 ? 'text-gray-300' : 'text-gray-500'}`}>
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Grille des jours */}
                    <div className="grid grid-cols-7 gap-0.5">
                      {(() => {
                        const firstDay = new Date(calendarNav.year, calendarNav.month, 1);
                        // Lundi = 0 dans notre grille (getDay: 0=dim,1=lun,...6=sam)
                        const startOffset = (firstDay.getDay() + 6) % 7;
                        const daysInMonth = new Date(calendarNav.year, calendarNav.month + 1, 0).getDate();
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const selectedDate = formData.startedAt ? formData.startedAt.slice(0, 10) : '';
                        const cells = [];
                        // Cases vides avant le 1er
                        for (let i = 0; i < startOffset; i++) {
                          cells.push(<div key={`e${i}`} />);
                        }
                        for (let day = 1; day <= daysInMonth; day++) {
                          const date = new Date(calendarNav.year, calendarNav.month, day);
                          const isSunday = date.getDay() === 0;
                          const isPast = date < today;
                          const dateStr = `${calendarNav.year}-${String(calendarNav.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isSelected = dateStr === selectedDate;
                          const isToday = date.getTime() === today.getTime();
                          const disabled = isSunday || isPast;
                          cells.push(
                            <button
                              key={day}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                const time = formData.startedAt ? formData.startedAt.slice(11, 16) : '08:00';
                                handleStartDateChange(`${dateStr}T${time}`);
                                setCalendarOpen(false);
                              }}
                              className={[
                                'w-full aspect-square rounded-lg text-xs font-medium transition-colors flex items-center justify-center',
                                disabled
                                  ? 'text-gray-200 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-primary-600 text-white'
                                  : isToday
                                  ? 'border border-primary-300 text-primary-600 hover:bg-primary-50'
                                  : 'text-gray-700 hover:bg-gray-100',
                              ].join(' ')}
                            >
                              {day}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>

                    {/* Légende */}
                    <p className="text-xs text-gray-400 mt-2 text-center">Les dimanches ne sont pas disponibles</p>
                  </div>
                )}
              </div>
              {/* Heure */}
              <select
                value={formData.startedAt ? formData.startedAt.slice(11, 13) : '08'}
                onChange={(e) => {
                  const date = formData.startedAt ? formData.startedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                  const min = formData.startedAt ? formData.startedAt.slice(14, 16) : '00';
                  handleStartDateChange(`${date}T${e.target.value}:${min}`);
                }}
                className="px-2 py-2 border border-gray-200 rounded-lg bg-white text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 8).map(h => (
                  <option key={h} value={String(h).padStart(2, '0')}>
                    {String(h).padStart(2, '0')}h
                  </option>
                ))}
              </select>
              {/* Minutes — uniquement 00 ou 30 */}
              <select
                value={formData.startedAt ? formData.startedAt.slice(14, 16) : '00'}
                onChange={(e) => {
                  const date = formData.startedAt ? formData.startedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                  const hour = formData.startedAt ? formData.startedAt.slice(11, 13) : '08';
                  handleStartDateChange(`${date}T${hour}:${e.target.value}`);
                }}
                className="w-20 px-2 py-2 border border-gray-200 rounded-lg bg-white text-sm"
              >
                <option value="00">:00</option>
                <option value="30">:30</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durée *</label>
            <select
              value={duration}
              onChange={(e) => handleDurationChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {durationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {formData.endedAt && (
          <p className="text-xs text-gray-500">
            Fin prévue : {new Date(formData.endedAt).toLocaleString('fr-FR')}
          </p>
        )}

        {/* Quantité et mode de paiement */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              min="1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
            <select
              value={formData.paymentMode}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentMode: e.target.value as BookingPaymentMode }))}
              disabled={ownerType === 'WALKIN'}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg disabled:bg-gray-100"
            >
              {paymentModes.map(mode => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Options */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.confirmImmediately}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmImmediately: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">Confirmer immédiatement</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.sendEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, sendEmail: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm">Envoyer un email</span>
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
          />
        </div>

        {/* Résultat checkAvailability */}
        {availabilityChecked && availabilityResult && (
          <div className={`p-3 rounded-lg border ${
            availabilityResult.available
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {availabilityResult.available
                ? <CheckCircle size={16} className="text-green-600" />
                : <XCircle size={16} className="text-red-600" />}
              <span className={`text-sm font-medium ${availabilityResult.available ? 'text-green-700' : 'text-red-700'}`}>
                {availabilityResult.available ? 'Disponible' : 'Non disponible'}
              </span>
            </div>
            {availabilityResult.available && (
              <div className="text-xs text-green-600 space-y-0.5">
                <p>Capacité restante : {availabilityResult.remainingCapacity}</p>
                <p>Durée : {availabilityResult.durationMinutes} min</p>
                <p className="font-medium">
                  Montant estimé : {availabilityResult.estimatedAmount.toLocaleString('fr-FR')} {availabilityResult.currency}
                </p>
              </div>
            )}
            {!availabilityResult.available && availabilityResult.message && (
              <p className="text-xs text-red-600">{availabilityResult.message}</p>
            )}
          </div>
        )}

        {/* Suggestions si non disponible */}
        {availabilityChecked && !availabilityResult?.available && suggestions.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-1 mb-2">
              <AlertCircle size={14} className="text-amber-600" />
              <p className="text-sm font-medium text-amber-700">Créneaux alternatifs disponibles</p>
            </div>
            <div className="space-y-2">
              {suggestions.slice(0, 3).map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    // Pré-remplir avec le créneau suggéré
                    const start = sug.startedAt.substring(0, 16);
                    const end = sug.endedAt.substring(0, 16);
                    const dur = Math.round((new Date(sug.endedAt).getTime() - new Date(sug.startedAt).getTime()) / 60000);
                    setDuration(dur);
                    setFormData(prev => ({ ...prev, startedAt: start, endedAt: end }));
                    setAvailabilityChecked(false);
                    setAvailabilityResult(null);
                    setSuggestions([]);
                  }}
                  className="w-full text-left p-2 bg-white border border-amber-200 rounded-lg hover:bg-amber-50 text-xs"
                >
                  <div className="flex items-center gap-1 text-amber-800 font-medium">
                    <span>{new Date(sug.startedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <ArrowRight size={10} />
                    <span>{new Date(sug.endedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <p className="text-amber-600 mt-0.5">
                    {sug.estimatedAmount.toLocaleString('fr-FR')} XAF · {sug.remainingCapacity} place{sug.remainingCapacity > 1 ? 's' : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending || checkAvailabilityMutation.isPending}
            className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>

          {/* Bouton vérifier dispo si pas encore fait */}
          {!availabilityChecked && (
            <button
              type="button"
              onClick={() => canCheckAvailability && checkAvailabilityMutation.mutate()}
              disabled={!canCheckAvailability || checkAvailabilityMutation.isPending}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkAvailabilityMutation.isPending
                ? <Loader2 size={14} className="animate-spin" />
                : <CheckCircle size={14} />}
              Vérifier la dispo
            </button>
          )}

          <button
            type="submit"
            disabled={
              createMutation.isPending ||
              checkAvailabilityMutation.isPending ||
              (availabilityChecked && !availabilityResult?.available)
            }
            className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createMutation.isPending || checkAvailabilityMutation.isPending
              ? <Loader2 size={16} className="animate-spin" />
              : availabilityChecked && availabilityResult?.available
              ? 'Créer la réservation'
              : 'Vérifier et créer'}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};