import React from "react";
import { useQuery } from "@tanstack/react-query";
import { resourceOpsService } from "../../services/resourceOps.service";
import { formatDateTime } from "../subscription/kitUtils";

/**
 * Réservations à venir touchées par une mise hors service, une maintenance, une suppression ou une fermeture
 * (GET /resources/{code}/impacted-bookings). À afficher avant l'action, avec l'option « annuler et prévenir ».
 */
export const ImpactedBookingsList: React.FC<{ resourceCode: string; from?: string; to?: string }> = ({ resourceCode, from, to }) => {
  const q = useQuery({
    queryKey: ["resource-impacted", resourceCode, from, to],
    queryFn: () => resourceOpsService.getImpactedBookings(resourceCode, { from: from || undefined, to: to || undefined }),
    enabled: !!resourceCode,
  });
  if (q.isLoading) return <p className="text-xs text-gray-500">Recherche des réservations touchées…</p>;
  if (q.isError) return <p className="text-xs text-red-600">Les réservations touchées n'ont pas pu être chargées.</p>;
  const list = q.data ?? [];
  if (list.length === 0) return <p className="text-xs text-gray-600">Aucune réservation à venir n'est touchée.</p>;
  return (
    <ul className="space-y-1">
      {list.map((b) => (
        <li key={b.bookingNumber} className="rounded-xl bg-white px-3 py-2 text-xs text-gray-700">
          <span className="font-mono font-semibold">{b.bookingNumber}</span> · {formatDateTime(b.startedAt)} → {formatDateTime(b.endedAt)}
          {b.contactName ? ` · ${b.contactName}` : ""}
          {b.quantity && b.quantity > 1 ? ` · ${b.quantity} place(s)` : ""}
          {b.status ? ` · ${b.status}` : ""}
        </li>
      ))}
    </ul>
  );
};
