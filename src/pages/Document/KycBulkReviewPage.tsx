import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileCheck2, XCircle } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { KycBulkActionResponse, KycDocumentResponse } from "../../services/document.service";
import { useAuth } from "../../contexts/AuthContext";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, HeadRow, ListHeader, PanelForm, Pagination, SearchField } from "../../components/subscription/kit";
import { FIELD, ROW_HOVER, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { Cell, RowCheck } from "../../components/documents/docKit";
import { OWNER_LABEL, bulkSummary, dayOnly, label, usePaged } from "../../components/documents/docUtils";

const COLS = "lg:grid-cols-[2rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_8rem]";
const codeOf = (d: KycDocumentResponse): string => String(d.documentCode ?? d.code ?? d.id ?? "");

export const KycBulkReviewPage: React.FC = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const adminId = Number(admin?.id) || 1;
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<KycBulkActionResponse | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kyc-documents-review-queue"],
    queryFn: () => documentService.getKycDocumentReviewQueue(),
  });

  const q = search.trim().toLowerCase();
  const docs = (data ?? []).filter((d) =>
    q === "" ? true : [d.documentTypeName, d.documentType, d.documentCode, d.fileName, d.ownerName, d.ownerCode].filter(Boolean).join(" ").toLowerCase().includes(q),
  );
  const { page, setPage, slice, totalPages, total } = usePaged(docs, 15);

  const done = (r: KycBulkActionResponse, ok: string) => {
    setResult(r);
    setSelected([]);
    setRejecting(false);
    setReason("");
    queryClient.invalidateQueries({ queryKey: ["kyc-documents-review-queue"] });
    queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] });
    if ((r.failed ?? 0) > 0) toast.error(bulkSummary(r));
    else if (ok) toast.success(ok);
  };

  const approve = useMutation({
    mutationFn: () => documentService.bulkApproveDocuments(selected, adminId),
    onSuccess: (r) => done(r, ""),
  });
  const reject = useMutation({
    mutationFn: () => documentService.bulkRejectDocuments(selected.map((documentCode) => ({ documentCode, reason })), adminId),
    onSuccess: (r) => done(r, "Documents rejetés"),
    onError: (e) => toast.error(apiMessage(e, "Rejet en masse impossible")),
  });

  const toggle = (c: string) => setSelected((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  // La sélection porte sur tous les documents filtrés, pas seulement sur la page affichée.
  const allCodes = docs.map(codeOf);
  const allSelected = allCodes.length > 0 && allCodes.every((c) => selected.includes(c));

  const confirmApprove = () =>
    toast.confirm({
      message: `Approuver ${selected.length} document${selected.length > 1 ? "s" : ""} ?`,
      confirmLabel: "Approuver",
      pendingLabel: "Approbation",
      successMessage: "Documents approuvés",
      errorMessage: "Approbation en masse impossible",
      onConfirm: () => approve.mutateAsync(),
    });

  const failures = (result?.results ?? []).filter((r) => r.success === false);

  return (
    <div className="space-y-5">
      <ListHeader
        title="Revue en masse"
        subtitle={isLoading ? undefined : `${total} document${total > 1 ? "s" : ""} en attente de revue`}
        action={
          selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="danger" icon={XCircle} onClick={() => setRejecting(true)}>
                Rejeter ({selected.length})
              </ActionButton>
              <ActionButton icon={CheckCircle2} pending={approve.isPending} onClick={confirmApprove}>
                Approuver ({selected.length})
              </ActionButton>
            </div>
          )
        }
      />

      {rejecting && (
        <PanelForm
          title={`Rejeter ${selected.length} document${selected.length > 1 ? "s" : ""}`}
          onCancel={() => setRejecting(false)}
          pending={reject.isPending}
          submitLabel="Rejeter"
          submitDisabled={!reason.trim()}
          onSubmit={(e) => {
            e.preventDefault();
            reject.mutate();
          }}
        >
          <Field label="Motif du rejet" required hint="Le même motif est appliqué à tous les documents sélectionnés.">
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={`${FIELD} resize-none`} />
          </Field>
        </PanelForm>
      )}

      {result && (
        <div className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-950">Résultat du traitement</p>
              <p className="mt-1 text-sm text-gray-600">{bulkSummary(result)}</p>
            </div>
            <ActionButton variant="ghost" onClick={() => setResult(null)}>
              Fermer
            </ActionButton>
          </div>
          {failures.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-red-600">
              {failures.map((f, i) => (
                <li key={i}>
                  <span className="font-mono text-xs">{f.documentCode ?? f.code}</span> : {f.error ?? f.reason ?? "échec"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Type, code, nom de fichier ou propriétaire" />

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger la file de revue." onRetry={() => refetch()} />
      ) : docs.length === 0 ? (
        <EmptyState icon={FileCheck2} title="Aucun document à revoir" hint={q ? "Aucun résultat pour cette recherche." : "La file de revue est vide."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <RowCheck checked={allSelected} onChange={() => setSelected(allSelected ? [] : allCodes)} name="Tout sélectionner" />
            <span>Document</span>
            <span>Type</span>
            <span>Propriétaire</span>
            <span>Envoyé le</span>
          </HeadRow>
          <DataCard>
            {slice.map((d) => {
              const c = codeOf(d);
              const on = selected.includes(c);
              return (
                <div
                  key={c}
                  onClick={() => toggle(c)}
                  className={`grid cursor-pointer grid-cols-[2rem_1fr] items-center gap-x-3 gap-y-1 rounded-2xl p-4 transition max-lg:mb-2 ${on ? "bg-[color:color-mix(in_srgb,var(--logo-pink)_10%,white)]" : "max-lg:bg-gray-50"} ${COLS} ${ROW_HOVER}`}
                >
                  <RowCheck checked={on} onChange={() => toggle(c)} name={`Sélectionner ${c}`} />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{c}</p>
                    <p className="truncate text-xs text-gray-400">{d.fileName ?? ""}</p>
                  </div>
                  <Cell title="Type" className="max-lg:col-start-2">
                    <span className="text-sm font-semibold text-gray-900">{d.documentTypeName ?? d.documentType ?? "Non précisé"}</span>
                  </Cell>
                  <Cell title="Propriétaire" className="max-lg:col-start-2">
                    <span className="text-sm text-gray-700">
                      {d.ownerName ?? (d.ownerCode ? String(d.ownerCode) : "Non renseigné")}
                      {d.ownerType ? <span className="ml-1 text-xs text-gray-400">{label(OWNER_LABEL, String(d.ownerType))}</span> : null}
                    </span>
                  </Cell>
                  <Cell title="Envoyé le" className="max-lg:col-start-2">
                    <span className="text-sm text-gray-700">{d.uploadedAt ? dayOnly(d.uploadedAt) : "Inconnu"}</span>
                  </Cell>
                </div>
              );
            })}
          </DataCard>
          <Pagination page={page} totalPages={totalPages} total={total} noun="document" onChange={setPage} />
        </>
      )}
    </div>
  );
};
