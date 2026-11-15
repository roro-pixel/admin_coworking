import React from "react";
import type { KycCaseResponse } from "../../services/document.service";
import { DataCard, HeadRow } from "../subscription/kit";
import { ROW_HOVER } from "../subscription/kitUtils";
import { Cell, KycStatusChip, RiskChip } from "./docKit";
import { OWNER_LABEL, dayOnly, isPast, label } from "./docUtils";

/** Colonnes communes à toutes les listes de dossiers KYC */
export const CASE_COLS = "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_9rem_8rem_9rem_auto]";

export const CaseHead: React.FC<{ dateTitle?: string; lead?: React.ReactNode }> = ({ dateTitle = "Échéance SLA" }) => (
  <HeadRow cols={CASE_COLS}>
    <span>Dossier</span>
    <span>Propriétaire</span>
    <span>Statut</span>
    <span>Risque</span>
    <span>{dateTitle}</span>
    <span className="text-right">Actions</span>
  </HeadRow>
);

interface CaseRowProps {
  kycCase: KycCaseResponse;
  onOpen?: () => void;
  /** Colonne de date : valeur et alerte de dépassement */
  date?: string | null;
  /** false : la colonne date est informative, pas une échéance */
  alert?: boolean;
  lead?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const CaseRow: React.FC<CaseRowProps> = ({ kycCase, onOpen, date, alert = true, lead, actions, children }) => {
  const late = alert && !!date && isPast(date) && !["APPROVED", "REJECTED"].includes(kycCase.status);
  return (
    <div className={`rounded-2xl max-lg:mb-2 max-lg:bg-gray-50 ${ROW_HOVER}`}>
      <div
        onClick={onOpen}
        className={`grid ${onOpen ? "cursor-pointer" : ""} grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 ${CASE_COLS}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {lead}
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{kycCase.code}</p>
            <p className="text-xs text-gray-400">{kycCase.submittedAt ? `Soumis le ${dayOnly(kycCase.submittedAt)}` : "Non soumis"}
              {kycCase.assignedTo ? ` · Agent #${kycCase.assignedTo}` : ""}</p>
          </div>
        </div>
        <div className="min-w-0 max-lg:order-3 max-lg:col-span-2">
          <p className="truncate text-sm font-semibold text-gray-900">{kycCase.ownerName || kycCase.ownerCode || `#${kycCase.ownerId ?? ""}`}</p>
          <p className="truncate text-xs text-gray-400">
            {label(OWNER_LABEL, kycCase.ownerType)}
            {kycCase.ownerCode && kycCase.ownerName ? ` · ${kycCase.ownerCode}` : ""}
          </p>
        </div>
        <div className="max-lg:order-2 max-lg:justify-self-end">
          <KycStatusChip status={kycCase.status} />
        </div>
        <Cell title="Risque" className="max-lg:order-4">
          {kycCase.riskLevel ? <RiskChip level={kycCase.riskLevel} /> : <span className="text-sm text-gray-400">Non évalué</span>}
        </Cell>
        <Cell title="Échéance" className="max-lg:order-5">
          <span className={`text-sm ${late ? "font-semibold text-red-600" : "text-gray-700"}`}>{date ? dayOnly(date) : "Aucune"}</span>
          {late && <span className="ml-1 text-xs text-red-500">dépassée</span>}
        </Cell>
        {actions && (
          <div onClick={(e) => e.stopPropagation()} className="flex flex-wrap items-center gap-1 max-lg:order-6 max-lg:col-span-2 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export const CaseCard: React.FC<{ children: React.ReactNode }> = ({ children }) => <DataCard>{children}</DataCard>;
