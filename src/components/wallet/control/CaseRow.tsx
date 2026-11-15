import React from "react";
import { ChevronRight } from "lucide-react";
import type { CaseView } from "../../../services/walletControl.service";
import { StatusChip } from "../../subscription/kit";
import { ROW_HOVER, formatDate } from "../../subscription/kitUtils";
import { CASE_STATUS, PRIORITY } from "../walletLabels";

/** Ligne d'un dossier de conformité, cliquable. */
export const CaseRow: React.FC<{ item: CaseView; onOpen: (caseNumber: string) => void }> = ({ item, onOpen }) => {
  const st = CASE_STATUS[item.status] ?? { label: item.status, tone: "neutral" as const };
  const pr = PRIORITY[item.priority] ?? { label: item.priority, tone: "neutral" as const };
  return (
    <button
      type="button"
      onClick={() => onOpen(item.caseNumber)}
      className={`flex w-full flex-col items-start justify-between gap-3 sm:flex-row sm:items-center rounded-2xl bg-white p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] ${ROW_HOVER}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-950 sm:truncate">{item.title}</p>
        <p className="mt-0.5 break-words text-xs text-gray-500 sm:truncate">
          <span className="font-mono">{item.caseNumber}</span> · {item.subjectCode}
          {item.assignedTo ? ` · ${item.assignedTo}` : ""} · {formatDate(item.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {item.overdue && <StatusChip tone="danger">En retard</StatusChip>}
        <StatusChip tone={pr.tone}>{pr.label}</StatusChip>
        <StatusChip tone={st.tone}>{st.label}</StatusChip>
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </button>
  );
};
