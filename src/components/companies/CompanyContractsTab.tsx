import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSignature } from "lucide-react";
import { companyService } from "../../services/company.service";
import type { CompanyResponse } from "../../services/company.service";
import { DataCard, EmptyState, ErrorBlock, IconButton, ItemRow, Section, StatusChip, Tag } from "../subscription/kit";
import { ListSkeleton } from "../ui/Skeleton";
import { COMPANIES_KEY } from "./companyLabels";
import { downloadFile } from "./companyTabKit";

const SOURCE_LABEL: Record<string, string> = { LEGAL_REPRESENTATIVE: "Représentant légal", MEMBER: "Membre habilité" };

const text = (v: unknown): string => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** Onglet Contrats  */
export const CompanyContractsTab: React.FC<{ company: CompanyResponse }> = ({ company }) => {
  const id = company.customerId;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [COMPANIES_KEY, "contracts", id],
    queryFn: () => companyService.getContracts(id),
  });
  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError || !data) return <ErrorBlock message="Impossible de charger les contrats." onRetry={() => refetch()} />;
  const empty = data.contracts.length === 0 && data.domiciliations.length === 0;

  return (
    <div className="space-y-5">
      <Section title="Signataires désignés" description="Ceux qui signent à la place de l'organisation">
        {data.signers.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun signataire : renseigne le représentant légal ou autorise un membre à signer.</p>
        ) : (
          <div className="space-y-2">
            {data.signers.map((s, i) => (
              <ItemRow key={`${s.memberId ?? s.name}-${i}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-950">{s.name}</p>
                    <p className="truncate text-xs text-gray-400">{s.email}</p>
                  </div>
                  {s.source && <Tag tone="pink">{SOURCE_LABEL[s.source] ?? s.source}</Tag>}
                </div>
              </ItemRow>
            ))}
          </div>
        )}
      </Section>

      {empty && <EmptyState icon={FileSignature} title="Aucun contrat" hint="Les contrats et domiciliations de l'organisation apparaissent ici." />}

      {data.contracts.length > 0 && (
        <DataCard>
          <div className="space-y-2">
            {data.contracts.map((c) => (
              <div key={c.contractCode} className="flex flex-col gap-2 rounded-2xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link to={`/contracts/${encodeURIComponent(c.contractCode)}`} className="truncate text-sm font-bold text-gray-950 hover:underline">
                    {c.title ?? c.contractCode}
                  </Link>
                  <p className="truncate font-mono text-xs text-gray-400">{c.contractCode}</p>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2">
                  <StatusChip tone="neutral">{c.status}</StatusChip>
                  <IconButton icon={Download} label="Télécharger le PDF" tone="pink" onClick={() => downloadFile(() => companyService.getContractPdf(id, c.contractCode), `${c.contractCode}.pdf`, "PDF indisponible.")} />
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}

      {data.domiciliations.length > 0 && (
        <Section title="Domiciliations">
          <div className="space-y-2">
            {data.domiciliations.map((d, i) => {
              const number = text(d.contractNumber);
              return (
                <ItemRow key={number || i}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {number ? (
                      <Link to={`/services/contracts/${encodeURIComponent(number)}`} className="font-mono text-sm font-bold text-[color:var(--logo-pink-dark)] hover:underline">
                        {number}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">Domiciliation</span>
                    )}
                    {text(d.status) && <StatusChip tone="neutral">{text(d.status)}</StatusChip>}
                  </div>
                </ItemRow>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
};
