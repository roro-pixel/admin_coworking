import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { ApprovalCenterView } from "../accounting/approval/ApprovalsPage";
import { ApprovalRequestView } from "../accounting/approval/ApprovalDetailPage";
import { approvalService } from "../../services/approval.service";

/** Centre d'approbation des réservations : demandes de remise au-delà du plafond ou sans le droit d'ajuster. */
export const BookingApprovals: React.FC = () => <ApprovalCenterView center="BOOKING" basePath="/bookings/approvals" />;

const REQUEST_LABEL: Record<string, string> = { PRICE_ADJUSTMENT: "Remise sur le prix" };

/** Fiche d'une demande : lien vers la réservation et rappel de l'effet de la décision. */
export const BookingApprovalDetail: React.FC = () => {
  const { number = "" } = useParams();
  const { data: r } = useQuery({ queryKey: ["approval-request", number], queryFn: () => approvalService.get(number) });
  const booking = r?.center === "BOOKING" ? r.subjectRef : undefined;
  return (
    <div className="space-y-4">
      {booking && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-gray-900">{REQUEST_LABEL[r?.requestType ?? ""] ?? r?.requestType ?? "Demande"} · réservation {booking}</p>
          <p className="mt-1 text-xs text-gray-500">
            Accord : la remise est appliquée et la réservation continue. Refus : le prix calculé est gardé et la réservation continue aussi.
          </p>
          <Link to={`/bookings/${encodeURIComponent(booking)}`} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--logo-pink-dark)] hover:underline">
            <ExternalLink size={14} /> Ouvrir la réservation
          </Link>
        </div>
      )}
      <ApprovalRequestView basePath="/bookings/approvals" backLabel="Approbations de réservations" />
    </div>
  );
};
