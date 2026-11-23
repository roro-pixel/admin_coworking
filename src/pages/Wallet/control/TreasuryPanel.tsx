import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Plus } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ItemRow, ListHeader, Pagination, PanelForm, Section, StatusChip } from "../../../components/subscription/kit";
import { FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton, Skeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { OpenFields } from "../../../components/wallet/control/OpenFields";
import { extraEntries, todayIso } from "../../../components/wallet/control/controlUtils";

const PAGE_SIZE = 10;

/** Trésorerie : situation courante et rapprochements entre le ledger et l'encaisse. */
export const TreasuryPanel: React.FC = () => {
  const qc = useQueryClient();
  const [currency, setCurrency] = useState("XAF");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [ledger, setLedger] = useState("");
  const [cash, setCash] = useState("");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const snapshot = useQuery({
    queryKey: ["wallet-treasury", "snapshot", currency],
    queryFn: () => walletControlService.getTreasurySnapshot(currency),
    enabled: currency.length === 3,
  });
  const list = useQuery({
    queryKey: ["wallet-treasury", "list", page],
    queryFn: () => walletControlService.getReconciliations({ page, size: PAGE_SIZE }),
  });
  const rows = list.data?.content ?? [];

  const create = useMutation({
    mutationFn: () =>
      walletControlService.createReconciliation({
        date,
        currency,
        ledgerAccountBalance: Number(ledger),
        availableCash: Number(cash),
        explanation: explanation.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Rapprochement enregistré");
      setOpen(false);
      setLedger("");
      setCash("");
      setExplanation("");
      setError(null);
      qc.invalidateQueries({ queryKey: ["wallet-treasury"] });
      qc.invalidateQueries({ queryKey: ["wallet-control-dashboard"] });
    },
    onError: (e) => setError(apiMessage(e, "Enregistrement impossible.")),
  });

  return (
    <div className="space-y-5">
      <ListHeader
        title="Trésorerie"
        subtitle="Rapprochement entre le compte ledger et l'encaisse disponible"
        action={
          !open && (
            <ActionButton icon={Plus} onClick={() => setOpen(true)}>
              Nouveau rapprochement
            </ActionButton>
          )
        }
      />

      {open && (
        <PanelForm
          title="Nouveau rapprochement"
          pending={create.isPending}
          submitLabel="Enregistrer"
          submitDisabled={!date || ledger === "" || cash === ""}
          error={error}
          onCancel={() => setOpen(false)}
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            create.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Date" required>
              <input type="date" className={FIELD_SOFT} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Devise" required>
              <input className={`${FIELD_SOFT} font-mono`} value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
            </Field>
            <Field label="Solde du compte ledger" required>
              <input inputMode="decimal" className={FIELD_SOFT} value={ledger} onChange={(e) => setLedger(e.target.value.replace(/[^\d.-]/g, ""))} />
            </Field>
            <Field label="Encaisse disponible" required>
              <input inputMode="decimal" className={FIELD_SOFT} value={cash} onChange={(e) => setCash(e.target.value.replace(/[^\d.-]/g, ""))} />
            </Field>
            <Field label="Explication de l'écart" className="md:col-span-2">
              <textarea className={`${FIELD_SOFT} resize-none`} rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
            </Field>
          </div>
        </PanelForm>
      )}

      <Section title="Situation courante" description={`Devise ${currency}`} icon={Landmark}>
        <div className="mb-4 w-28">
          <Field label="Devise">
            <input className={`${FIELD_SOFT} !bg-white font-mono`} value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </Field>
        </div>
        {snapshot.isLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl" />
        ) : snapshot.isError ? (
          <ErrorBlock message="Impossible de charger la situation de trésorerie." onRetry={() => snapshot.refetch()} />
        ) : (
          <OpenFields entries={extraEntries(snapshot.data ?? {}, [])} />
        )}
      </Section>

      <Section title="Rapprochements enregistrés" description="Du plus récent au plus ancien">
        {list.isLoading ? (
          <ListSkeleton rows={3} />
        ) : list.isError ? (
          <ErrorBlock message="Impossible de charger les rapprochements." onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Landmark} title="Aucun rapprochement" hint="Enregistrez le premier rapprochement de la trésorerie." />
        ) : (
          <>
            <div className="space-y-2">
              {rows.map((r) => (
                <ItemRow key={r.reconciliationNumber}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm font-bold text-gray-950">{r.reconciliationNumber}</p>
                    <StatusChip tone={r.status === "BALANCED" ? "success" : r.status === "VARIANCE" ? "danger" : "info"}>
                      {r.status === "BALANCED" ? "Équilibré" : r.status === "VARIANCE" ? "Écart" : r.status === "UNDER_REVIEW" ? "En revue" : r.status}
                    </StatusChip>
                  </div>
                  <OpenFields entries={extraEntries(r, ["reconciliationNumber", "status"])} className="mt-2" />
                </ItemRow>
              ))}
            </div>
            <Pagination page={page} totalPages={list.data?.totalPages ?? 0} total={list.data?.totalElements ?? 0} noun="rapprochement" onChange={setPage} />
          </>
        )}
      </Section>
    </div>
  );
};
