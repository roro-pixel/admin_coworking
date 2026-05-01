import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, UserPlus, UserMinus, History, Calendar, Mail, Phone,
  Play, CheckCircle, XCircle, AlertTriangle, LogIn, LogOut, Loader2,
} from 'lucide-react';
import { bookingService } from '../../services/booking.service';
import type {
  BookingResponse,
  BookingHistory,
  BookingEvent,
  BookingParticipantRole,
  BookingStatus,
} from '../../services/booking.service';
import { ModalPortal } from '../ui/ModalPortal';
import { MemberAutocomplete } from '../members/MemberAutocomplete';
import type { MemberSummaryResponse } from '../../services/member.service';

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingResponse;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700' },
  PENDING_APPROVAL: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  REJECTED: { label: 'Rejetée', color: 'bg-red-100 text-red-700' },
  CONFIRMED: { label: 'Confirmée', color: 'bg-green-100 text-green-700' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Terminée', color: 'bg-gray-100 text-gray-700' },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
  NO_SHOW: { label: 'Non présent', color: 'bg-orange-100 text-orange-700' },
  EXPIRED: { label: 'Expirée', color: 'bg-gray-100 text-gray-500' },
};

const paymentModeLabels: Record<string, string> = {
  DIRECT: 'Paiement direct',
  SUBSCRIPTION: 'Abonnement',
  PASS: 'Pass',
};

const roleLabels: Record<string, string> = {
  HOST: 'Organisateur',
  GUEST: 'Invité',
  ORGANIZER: 'Responsable',
};

const roleOptions: { value: BookingParticipantRole; label: string }[] = [
  { value: 'HOST', label: 'Organisateur' },
  { value: 'GUEST', label: 'Invité' },
  { value: 'ORGANIZER', label: 'Responsable' },
];

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  isOpen,
  onClose,
  booking: initialBooking,
  onRefresh,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'info' | 'participants' | 'history' | 'events'>('info');
  const [newParticipant, setNewParticipant] = useState({
    memberCode: '',
    name: '',
    email: '',
    phone: '',
    role: 'GUEST' as BookingParticipantRole,
  });
  const [selectedParticipantMember, setSelectedParticipantMember] = useState<MemberSummaryResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // CORRECTION : refresh du booking pour avoir les données à jour après actions
  const { data: refreshedBooking, refetch: refetchBooking } = useQuery({
    queryKey: ['booking', initialBooking.bookingNumber],
    queryFn: () => bookingService.getBooking(initialBooking.bookingNumber),
    enabled: isOpen,
  });

  const booking = refreshedBooking || initialBooking;

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['booking-history', booking.bookingNumber],
    queryFn: () => bookingService.getBookingHistory(booking.bookingNumber),
    enabled: isOpen && activeTab === 'history',
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['booking-events', booking.bookingNumber],
    queryFn: () => bookingService.getBookingEvents(booking.bookingNumber),
    enabled: isOpen && activeTab === 'events',
  });

  const invalidateAndRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['booking', booking.bookingNumber] });
    refetchBooking();
    onRefresh();
  };

  // CORRECTION : toutes les mutations de changement de statut
  const makeStatusMutation = (fn: (bookingNumber: string) => Promise<BookingResponse>) =>
    useMutation({
      mutationFn: () => fn(booking.bookingNumber),
      onSuccess: invalidateAndRefresh,
      onError: (error: any) => {
        setActionError(error?.response?.data?.message || 'Erreur lors du changement de statut.');
      },
    });

  const confirmMutation = makeStatusMutation(bookingService.confirmBooking.bind(bookingService));
  const approveMutation = makeStatusMutation(bookingService.approveBooking.bind(bookingService));
  const rejectMutation = useMutation({
    mutationFn: () => bookingService.rejectBooking(booking.bookingNumber, { reason: 'Rejeté par admin' }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) => setActionError(error?.response?.data?.message || 'Erreur lors du rejet.'),
  });
  const startMutation = makeStatusMutation(bookingService.startBooking.bind(bookingService));
  const checkInMutation = useMutation({
    mutationFn: () => bookingService.checkIn(booking.bookingNumber, { actor: 'admin' }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) => setActionError(error?.response?.data?.message || 'Erreur lors du check-in.'),
  });
  const checkOutMutation = useMutation({
    mutationFn: () => bookingService.checkOut(booking.bookingNumber, { actor: 'admin' }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) => setActionError(error?.response?.data?.message || 'Erreur lors du check-out.'),
  });
  const completeMutation = makeStatusMutation(bookingService.completeBooking.bind(bookingService));
  const cancelMutation = useMutation({
    mutationFn: () => bookingService.cancelBooking(booking.bookingNumber, { reason: 'Annulé par admin' }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) => setActionError(error?.response?.data?.message || 'Erreur lors de l\'annulation.'),
  });
  const noShowMutation = useMutation({
    mutationFn: () => bookingService.noShowBooking(booking.bookingNumber, { reason: 'Non-présentation' }),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) => setActionError(error?.response?.data?.message || 'Erreur.'),
  });

  const anyStatusPending =
    confirmMutation.isPending || approveMutation.isPending || rejectMutation.isPending ||
    startMutation.isPending || checkInMutation.isPending || checkOutMutation.isPending ||
    completeMutation.isPending || cancelMutation.isPending || noShowMutation.isPending;

  const addParticipantMutation = useMutation({
    mutationFn: () => bookingService.addParticipant(booking.bookingNumber, {
      memberCode: newParticipant.memberCode || undefined,
      name: newParticipant.name,
      email: newParticipant.email || undefined,
      phone: newParticipant.phone || undefined,
      role: newParticipant.role,
    }),
    onSuccess: () => {
      invalidateAndRefresh();
      setNewParticipant({ memberCode: '', name: '', email: '', phone: '', role: 'GUEST' });
      setSelectedParticipantMember(null);
    },
    onError: (error: any) => {
      setActionError(error?.response?.data?.message || 'Erreur lors de l\'ajout du participant.');
    },
  });

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: number) => bookingService.removeParticipant(booking.bookingNumber, participantId),
    onSuccess: invalidateAndRefresh,
    onError: (error: any) => {
      setActionError(error?.response?.data?.message || 'Erreur lors du retrait du participant.');
    },
  });

  const handleRemoveParticipant = (id: number, name: string) => {
    // CORRECTION : confirm avant suppression
    if (confirm(`Retirer "${name}" de la réservation ?`)) {
      removeParticipantMutation.mutate(id);
    }
  };

  if (!isOpen) return null;

  const status = statusConfig[booking.status];
  const s = booking.status as BookingStatus;

  return (
    <ModalPortal onClose={onClose}>
      <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-white">
        <div>
          <h3 className="text-xl font-bold">{booking.bookingNumber}</h3>
          <p className="text-sm text-gray-500">{booking.resourceName}</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X size={20} />
        </button>
      </div>

      {/* Statut */}
      <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.color}`}>
          {status?.label}
        </span>
        <span className="text-xs text-gray-500">
          Créée le {new Date(booking.createdAt).toLocaleString('fr-FR')}
        </span>
      </div>

      {/* CORRECTION : Actions de changement de statut selon les transitions du MD */}
      <div className="px-6 py-3 border-b bg-white flex flex-wrap gap-2">
        {actionError && (
          <div className="w-full text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 mb-1">
            {actionError}
            <button onClick={() => setActionError(null)} className="ml-2 underline">Fermer</button>
          </div>
        )}

        {/* DRAFT → CONFIRMED */}
        {s === 'DRAFT' && (
          <button
            onClick={() => confirmMutation.mutate()}
            disabled={anyStatusPending}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
          >
            {confirmMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            Confirmer
          </button>
        )}

        {/* PENDING_APPROVAL → approuver ou rejeter */}
        {s === 'PENDING_APPROVAL' && (
          <>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={anyStatusPending}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {approveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Approuver
            </button>
            <button
              onClick={() => {
                if (confirm('Rejeter cette réservation ?')) rejectMutation.mutate();
              }}
              disabled={anyStatusPending}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {rejectMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
              Rejeter
            </button>
          </>
        )}

        {/* CONFIRMED → démarrer, check-in, no-show, annuler */}
        {s === 'CONFIRMED' && (
          <>
            <button
              onClick={() => startMutation.mutate()}
              disabled={anyStatusPending}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {startMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Démarrer
            </button>
            <button
              onClick={() => checkInMutation.mutate()}
              disabled={anyStatusPending}
              className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {checkInMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
              Check-in
            </button>
            <button
              onClick={() => {
                if (confirm('Marquer comme non-présentation ?')) noShowMutation.mutate();
              }}
              disabled={anyStatusPending}
              className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {noShowMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
              No-show
            </button>
          </>
        )}

        {/* IN_PROGRESS → check-out, compléter, no-show */}
        {s === 'IN_PROGRESS' && (
          <>
            <button
              onClick={() => checkOutMutation.mutate()}
              disabled={anyStatusPending}
              className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {checkOutMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
              Check-out
            </button>
            <button
              onClick={() => completeMutation.mutate()}
              disabled={anyStatusPending}
              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {completeMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Compléter
            </button>
            <button
              onClick={() => {
                if (confirm('Marquer comme non-présentation ?')) noShowMutation.mutate();
              }}
              disabled={anyStatusPending}
              className="px-3 py-1 bg-orange-600 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
            >
              {noShowMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
              No-show
            </button>
          </>
        )}

        {/* Annuler — disponible pour DRAFT, PENDING_APPROVAL, CONFIRMED, IN_PROGRESS, REJECTED */}
        {['DRAFT', 'PENDING_APPROVAL', 'CONFIRMED', 'IN_PROGRESS', 'REJECTED'].includes(s) && (
          <button
            onClick={() => {
              if (confirm('Annuler cette réservation ?')) cancelMutation.mutate();
            }}
            disabled={anyStatusPending}
            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"
          >
            {cancelMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
            Annuler
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex space-x-6">
          {(['info', 'participants', 'history', 'events'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'info' ? 'Informations' :
               tab === 'participants' ? `Participants (${booking.participants?.length || 0})` :
               tab === 'history' ? 'Historique' : 'Événements'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Informations */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Client</p>
                <p className="font-medium text-sm">{booking.ownerCode}</p>
                <p className="text-xs text-gray-400">{booking.ownerType}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Contact</p>
                <p className="font-medium text-sm">{booking.contactName || '—'}</p>
                {booking.contactEmail && (
                  <p className="text-xs flex items-center gap-1 text-gray-500">
                    <Mail size={10} />{booking.contactEmail}
                  </p>
                )}
                {booking.contactPhone && (
                  <p className="text-xs flex items-center gap-1 text-gray-500">
                    <Phone size={10} />{booking.contactPhone}
                  </p>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Période</p>
                <p className="font-medium text-sm">{new Date(booking.startedAt).toLocaleString('fr-FR')}</p>
                <p className="text-xs text-gray-500">→ {new Date(booking.endedAt).toLocaleString('fr-FR')}</p>
                <p className="text-xs text-gray-400">{booking.durationMinutes} minutes</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Montant</p>
                <p className="font-bold text-lg">{booking.totalAmount.toLocaleString('fr-FR')} {booking.currency}</p>
                <p className="text-xs text-gray-500">{paymentModeLabels[booking.paymentMode] || booking.paymentMode}</p>
              </div>
            </div>

            {/* Lignes de facturation */}
            {booking.lines && booking.lines.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Détail des lignes</p>
                <div className="space-y-1">
                  {booking.lines.map((line) => (
                    <div key={line.id} className="flex justify-between p-2 bg-gray-50 rounded-lg text-sm">
                      <span className="text-gray-700">{line.description} × {line.quantity}</span>
                      <span className="font-medium">{line.amount.toLocaleString('fr-FR')} {line.currency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {booking.notes && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm mt-1">{booking.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Participants */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {booking.participants?.map((participant) => (
                <div key={participant.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{participant.name}</p>
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      {participant.email && (
                        <span className="flex items-center gap-1"><Mail size={10} />{participant.email}</span>
                      )}
                      {participant.phone && (
                        <span className="flex items-center gap-1"><Phone size={10} />{participant.phone}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {roleLabels[participant.role] || participant.role}
                      {participant.status && ` · ${participant.status}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(participant.id!, participant.name)}
                    disabled={removeParticipantMutation.isPending}
                    className="p-1 text-red-600 hover:text-red-800 disabled:opacity-40"
                    title="Retirer"
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
              ))}
              {(!booking.participants || booking.participants.length === 0) && (
                <div className="text-center py-4 text-gray-500 text-sm">Aucun participant</div>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Ajouter un participant</p>

              {/* Membre existant (optionnel) — remplit auto nom/email */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">
                  Membre existant (optionnel — pré-remplit les champs)
                </label>
                <MemberAutocomplete
                  onSelect={(member) => {
                    setSelectedParticipantMember(member);
                    if (member) {
                      setNewParticipant(prev => ({
                        ...prev,
                        memberCode: member.memberId,
                        name: member.fullName || prev.name,
                        email: member.email || prev.email,
                        phone: member.phone || prev.phone,
                      }));
                    } else {
                      setNewParticipant(prev => ({ ...prev, memberCode: '' }));
                    }
                  }}
                  selectedMember={selectedParticipantMember}
                  placeholder="Lier à un membre (optionnel)..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nom *"
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <select
                  value={newParticipant.role}
                  onChange={(e) => setNewParticipant({ ...newParticipant, role: e.target.value as BookingParticipantRole })}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="email"
                  placeholder="Email"
                  value={newParticipant.email}
                  onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={newParticipant.phone}
                  onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                  className="px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {newParticipant.memberCode && (
                <p className="text-xs text-blue-500 mt-1 font-mono">
                  Lié au membre : {newParticipant.memberCode}
                </p>
              )}

              <button
                onClick={() => addParticipantMutation.mutate()}
                disabled={!newParticipant.name || addParticipantMutation.isPending}
                className="mt-3 w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {addParticipantMutation.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <UserPlus size={14} />}
                Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Historique */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {historyLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : (!history || history.length === 0) ? (
              <div className="text-center py-8 text-gray-500">Aucun historique</div>
            ) : (
              history.map((item: BookingHistory, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <History size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs mr-1 ${statusConfig[item.fromStatus]?.color || 'bg-gray-100'}`}>
                        {statusConfig[item.fromStatus]?.label || item.fromStatus}
                      </span>
                      →
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs ml-1 ${statusConfig[item.toStatus]?.color || 'bg-gray-100'}`}>
                        {statusConfig[item.toStatus]?.label || item.toStatus}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Par {item.changedBy} · {new Date(item.changedAt).toLocaleString('fr-FR')}
                    </p>
                    {item.reason && (
                      <p className="text-xs text-gray-400 mt-0.5">Motif : {item.reason}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Événements */}
        {activeTab === 'events' && (
          <div className="space-y-3">
            {eventsLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : (!events || events.length === 0) ? (
              <div className="text-center py-8 text-gray-500">Aucun événement</div>
            ) : (
              events.map((event: BookingEvent) => (
                <div key={event.eventNumber} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-gray-500">{new Date(event.createdAt).toLocaleString('fr-FR')}</p>
                    <p className="text-xs text-gray-400 font-mono">{event.eventType}</p>
                    {event.description && (
                      <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  );
};