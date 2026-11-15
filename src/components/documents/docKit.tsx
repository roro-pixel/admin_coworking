import React from "react";
import { StatusChip } from "../subscription/kit";
import type { Tone } from "../subscription/kitUtils";
import { DOC_STATUS_LABEL, DOC_STATUS_TONE, KYC_STATUS_LABEL, KYC_STATUS_TONE, RISK_TONE, label } from "./docUtils";
import { kycRiskLevelLabels } from "../../services/document.service";

export const DocStatusChip: React.FC<{ status?: string }> = ({ status }) =>
  status ? <StatusChip tone={DOC_STATUS_TONE[status] ?? "neutral"}>{label(DOC_STATUS_LABEL, status)}</StatusChip> : null;

export const KycStatusChip: React.FC<{ status?: string }> = ({ status }) =>
  status ? <StatusChip tone={KYC_STATUS_TONE[status] ?? "neutral"}>{label(KYC_STATUS_LABEL, status)}</StatusChip> : null;

export const RiskChip: React.FC<{ level?: string }> = ({ level }) =>
  level ? <StatusChip tone={(RISK_TONE[level] ?? "neutral") as Tone}>{kycRiskLevelLabels[level] ?? level}</StatusChip> : null;

/** Petit libellé gris au-dessus d'une valeur, pour les lignes de liste sur mobile */
export const Cell: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = "" }) => (
  <div className={`min-w-0 ${className}`}>
    <span className="mr-2 text-xs font-semibold text-gray-400 lg:hidden">{title}</span>
    {children}
  </div>
);

/** Cases à cocher de sélection multiple dans une liste */
export const RowCheck: React.FC<{ checked: boolean; onChange: () => void; name: string }> = ({ checked, onChange, name }) => (
  <input
    type="checkbox"
    aria-label={name}
    checked={checked}
    onChange={onChange}
    onClick={(e) => e.stopPropagation()}
    className="h-4 w-4 shrink-0 rounded accent-[color:var(--logo-pink-dark)]"
  />
);

/** Bloc de lecture libellé / valeur sur panneau gris */
export const Fact: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-w-0 rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-400">{title}</p>
    <div className="mt-1 break-words text-sm font-semibold text-gray-900">{children}</div>
  </div>
);
