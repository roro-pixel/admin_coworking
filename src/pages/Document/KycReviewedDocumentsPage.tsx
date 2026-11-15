import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { KycDocumentResponse } from "../../services/document.service";
import { DataCard, EmptyState, ErrorBlock, HeadRow, ListHeader, Pagination, SearchField, Tabs } from "../../components/subscription/kit";
import { ROW_HOVER } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { Cell } from "../../components/documents/docKit";
import { StatusChip } from "../../components/subscription/kit";
import { dayOnly, usePaged } from "../../components/documents/docUtils";

type View = "all" | "approved" | "rejected";
const COLS = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_8rem_8rem]";

export const KycReviewedDocumentsPage: React.FC = () => {
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["kyc-reviewed-documents", view],
    queryFn: () =>
      view === "approved" ? documentService.getApprovedKycDocuments() : view === "rejected" ? documentService.getRejectedKycDocuments() : documentService.getReviewedKycDocuments(),
  });

  const q = search.trim().toLowerCase();
  const docs: KycDocumentResponse[] = (data ?? []).filter((d) =>
    q === "" ? true : [d.documentTypeName, d.documentType, d.documentCode, d.fileName, d.ownerName, d.ownerCode].filter(Boolean).join(" ").toLowerCase().includes(q),
  );
  const { page, setPage, slice, totalPages, total } = usePaged(docs, 15);

  return (
    <div className="space-y-5">
      <ListHeader title="Documents traités" subtitle={isLoading ? undefined : `${total} document${total > 1 ? "s" : ""}`} />
      <Tabs
        variant="soft"
        active={view}
        onChange={(v) => {
          setView(v);
          setPage(0);
        }}
        items={[
          { id: "all", label: "Tous" },
          { id: "approved", label: "Approuvés" },
          { id: "rejected", label: "Rejetés" },
        ]}
      />
      <SearchField value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Type, code, fichier ou propriétaire" />

      {isLoading ? (
        <ListSkeleton rows={8} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les documents traités." onRetry={() => refetch()} />
      ) : docs.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucun document traité" hint={q ? "Aucun résultat pour cette recherche." : "Aucun document n'a encore été revu."} />
      ) : (
        <>
          <HeadRow cols={COLS}>
            <span>Document</span>
            <span>Type</span>
            <span>Propriétaire</span>
            <span>Statut</span>
            <span>Envoyé le</span>
          </HeadRow>
          <DataCard>
            {slice.map((d, i) => (
              <div key={`${d.documentCode}-${i}`} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl p-4 max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}>
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold text-[color:var(--logo-pink-dark)]">{d.documentCode}</p>
                  <p className="truncate text-xs text-gray-400">{d.fileName ?? ""}</p>
                </div>
                <div className="max-lg:order-2 max-lg:justify-self-end lg:order-4">
                  <StatusChip tone={["VERIFIED", "APPROVED"].includes(d.status) ? "success" : d.status === "REJECTED" ? "danger" : "neutral"}>
                    {["VERIFIED", "APPROVED"].includes(d.status) ? "Approuvé" : d.status === "REJECTED" ? "Rejeté" : d.status}
                  </StatusChip>
                </div>
                <Cell title="Type" className="max-lg:order-3 max-lg:col-span-2 lg:order-2">
                  <span className="text-sm font-semibold text-gray-900">{d.documentTypeName ?? d.documentType ?? "Non précisé"}</span>
                </Cell>
                <Cell title="Propriétaire" className="max-lg:order-4 max-lg:col-span-2 lg:order-3">
                  <span className="text-sm text-gray-700">{d.ownerName ?? (d.ownerCode ? String(d.ownerCode) : "Non renseigné")}</span>
                </Cell>
                <Cell title="Envoyé le" className="max-lg:order-5 max-lg:col-span-2 lg:order-5">
                  <span className="text-sm text-gray-700">{d.uploadedAt ? dayOnly(d.uploadedAt) : "Inconnu"}</span>
                </Cell>
              </div>
            ))}
          </DataCard>
          <Pagination page={page} totalPages={totalPages} total={total} noun="document" onChange={setPage} />
        </>
      )}
    </div>
  );
};
