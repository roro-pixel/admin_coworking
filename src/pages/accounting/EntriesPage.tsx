import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, Plus } from "lucide-react";
import { accountingService } from "../../services/accounting.service";
import type { Entry, EntryStatus } from "../../services/accounting.service";
import { useAuth } from "../../contexts/AuthContext";
import { AccountingShell } from "../../components/accounting/AccountingShell";
import { ENTRY_STATUS, ORIGIN_LABEL, PENDING_REASON_LABEL, money } from "../../components/accounting/accountingLabels";
import { statusOf } from "../../components/subscription/labels";
import { ActionButton, DataCard, EmptyState, ErrorBlock, HeadRow, ListHeader, StatusChip, Tabs } from "../../components/subscription/kit";
import type { TabItem } from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage, formatDate } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";

export const ENTRIES_KEY = "accounting-entries";
export const entryRef = (e: Entry): string => e.entryNumber || e.provisionalNumber || "";

type Tab = "all" | "pending";
const COLS = "lg:grid-cols-[9rem_6rem_5rem_1fr_8rem_8rem_8rem]";

export const EntriesPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [journalCode, setJournal] = useState("");
  const [status, setStatus] = useState<EntryStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const journals = useQuery({ queryKey: ["accounting-journals"], queryFn: accountingService.journals });
  const all = useQuery({
    queryKey: [ENTRIES_KEY, journalCode, status, from, to],
    queryFn: () => accountingService.entries({ journalCode, status: status || undefined, from, to }),
    enabled: tab === "all",
  });
  const pending = useQuery({
    queryKey: [ENTRIES_KEY, "pending"],
    queryFn: accountingService.pendingEntries,
  });
  const query = tab === "all" ? all : pending;
  const rows = query.data ?? [];

  const tabs: TabItem<Tab>[] = [
    { id: "all", label: "Toutes les écritures" },
    { id: "pending", label: "À équilibrer", count: pending.data?.length },
  ];

  return (
    <AccountingShell>
      <div className="space-y-5">
        <ListHeader
          title="Écritures comptables"
          subtitle="Une écriture validée ne se modifie plus : on la contrepasse."
          action={
            hasPermission("ACCOUNTING_ENTRY:CREATE") ? (
              <ActionButton icon={Plus} onClick={() => navigate("/accounting/entries/new")}>Nouvelle écriture</ActionButton>
            ) : undefined
          }
        />
        <Tabs variant="soft" items={tabs} active={tab} onChange={setTab} />

        {tab === "all" && (
          <div className="flex flex-wrap gap-3">
            <select className={`${FIELD} w-auto`} value={journalCode} onChange={(e) => setJournal(e.target.value)} aria-label="Journal">
              <option value="">Tous les journaux</option>
              {(journals.data ?? []).map((j) => (
                <option key={j.code} value={j.code}>{j.code} · {j.label}</option>
              ))}
            </select>
            <select className={`${FIELD} w-auto`} value={status} onChange={(e) => setStatus(e.target.value as EntryStatus | "")} aria-label="Statut">
              <option value="">Tous les statuts</option>
              {Object.entries(ENTRY_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input type="date" className={`${FIELD} w-auto`} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Du" />
            <input type="date" className={`${FIELD} w-auto`} value={to} onChange={(e) => setTo(e.target.value)} aria-label="Au" />
          </div>
        )}

        {query.isLoading ? (
          <ListSkeleton rows={8} />
        ) : query.isError ? (
          <ErrorBlock message={apiMessage(query.error, "Écritures indisponibles.")} onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title={tab === "pending" ? "Aucune écriture à équilibrer" : "Aucune écriture"}
            hint={tab === "all" ? "Aucun résultat pour ces critères." : undefined}
          />
        ) : (
          <DataCard>
            <HeadRow cols={COLS}>
              <span>N°</span><span>Date</span><span>Journal</span><span>Libellé</span>
              <span className="text-right">Débit</span><span className="text-right">Crédit</span><span>Statut</span>
            </HeadRow>
            <div className="space-y-1">
              {rows.map((e) => {
                const st = statusOf(ENTRY_STATUS, e.status);
                return (
                  <button
                    key={entryRef(e)}
                    type="button"
                    onClick={() => navigate(`/accounting/entries/${encodeURIComponent(entryRef(e))}`)}
                    className={`grid w-full items-center gap-x-4 gap-y-1 rounded-xl px-4 py-3 text-left transition ${ROW_HOVER} ${COLS}`}
                  >
                    <span className="font-mono text-xs font-bold text-gray-900">{entryRef(e)}</span>
                    <span className="text-sm text-gray-600">{formatDate(e.entryDate)}</span>
                    <span className="text-sm font-semibold text-gray-700">{e.journalCode}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-gray-900">{e.label}</span>
                      <span className="block truncate text-xs text-gray-400">
                        {e.origin ? ORIGIN_LABEL[e.origin] : ""}
                        {tab === "pending" && e.pendingReason ? ` · ${PENDING_REASON_LABEL[e.pendingReason] ?? e.pendingReason}` : ""}
                      </span>
                    </span>
                    <span className="font-mono text-sm lg:text-right">{money(e.totalDebit)}</span>
                    <span className="font-mono text-sm lg:text-right">{money(e.totalCredit)}</span>
                    <span><StatusChip tone={st.tone}>{st.label}</StatusChip></span>
                  </button>
                );
              })}
            </div>
          </DataCard>
        )}
      </div>
    </AccountingShell>
  );
};
