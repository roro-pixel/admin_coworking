import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FolderOpen, FolderSearch, TriangleAlert } from "lucide-react";
import { documentService } from "../../services/document.service";
import type { DocumentResponse } from "../../services/document.service";
import { ActionButton, EmptyState, ErrorBlock, Field, ListHeader } from "../../components/subscription/kit";
import { FIELD } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { ChartCard, KpiRow } from "../../components/operations/OpsCharts";
import { Gauge } from "../../components/reporting/ReportCharts";
import { DocStatusChip } from "../../components/documents/docKit";
import { OWNER_LABEL, OWNER_TYPES, SPACE_LABEL, label } from "../../components/documents/docUtils";
import { DocumentDetailView } from "./DocumentDetail";

export const DocumentOwnerFolderPage: React.FC = () => {
  const [ownerType, setOwnerType] = useState("MEMBER");
  const [ownerCode, setOwnerCode] = useState("");
  const [submitted, setSubmitted] = useState<{ ownerType: string; ownerCode: string } | null>(null);
  const [selected, setSelected] = useState<DocumentResponse | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["document-folder", submitted?.ownerType, submitted?.ownerCode],
    queryFn: () => documentService.getDocumentFolder(submitted!.ownerType, submitted!.ownerCode),
    enabled: !!submitted?.ownerCode,
  });

  if (selected) return <DocumentDetailView document={selected} onBack={() => setSelected(null)} />;

  // Le backend renvoie une part entre 0 et 1 ; on tolère aussi un pourcentage déjà calculé.
  const raw = data?.completeness ?? 0;
  const percent = Math.round(raw <= 1 ? raw * 100 : raw);
  const missing = data?.missingRequiredTypes ?? [];
  const spaces = Object.entries(data?.bySpace ?? {});

  return (
    <div className="space-y-5">
      <ListHeader title="Dossier documentaire d'un propriétaire" subtitle="Documents groupés par espace et pièces obligatoires manquantes" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted({ ownerType, ownerCode: ownerCode.trim() });
        }}
        className="grid gap-3 rounded-[1.5rem] bg-gray-50 p-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end sm:p-5"
      >
        <Field label="Type de propriétaire">
          <select value={ownerType} onChange={(e) => setOwnerType(e.target.value)} className={FIELD}>
            {OWNER_TYPES.map((t) => (
              <option key={t} value={t}>
                {label(OWNER_LABEL, t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Code propriétaire">
          <input value={ownerCode} onChange={(e) => setOwnerCode(e.target.value)} className={FIELD} />
        </Field>
        <ActionButton type="submit" icon={FolderSearch} disabled={!ownerCode.trim()}>
          Charger
        </ActionButton>
      </form>

      {!submitted ? (
        <EmptyState icon={FolderOpen} title="Aucun dossier chargé" hint="Choisissez un type et saisissez un code propriétaire." />
      ) : isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError || !data ? (
        <ErrorBlock message="Impossible de charger ce dossier." onRetry={() => refetch()} />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <KpiRow
                columns={3}
                items={[
                  { label: "Documents", value: String(data.totalDocuments ?? 0) },
                  { label: "Pièces manquantes", value: String(missing.length), tone: missing.length > 0 ? "danger" : "success" },
                  { label: "Espaces", value: String(spaces.length) },
                ]}
              />
            </div>
            <ChartCard title="Complétude" subtitle="Pièces obligatoires fournies">
              <Gauge value={percent} color={percent >= 100 ? "#2E9E6B" : "#E0529C"} caption="complet" />
            </ChartCard>
          </div>

          {missing.length > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <p>
                <span className="font-semibold">Pièces obligatoires manquantes : </span>
                {missing.join(", ")}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 size={18} /> Aucune pièce obligatoire manquante.
            </div>
          )}

          {spaces.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Dossier vide" hint="Aucun document n'est rattaché à ce propriétaire." />
          ) : (
            spaces.map(([space, docs]) => (
              <section key={space} className="rounded-[1.5rem] bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-base font-bold text-gray-950">
                    <FolderOpen size={18} /> {label(SPACE_LABEL, space)}
                  </h3>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">{docs.length}</span>
                </div>
                <div className="space-y-2">
                  {docs.map((d) => (
                    <button key={d.code} type="button" onClick={() => setSelected(d)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 text-left transition hover:bg-gray-100">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{d.documentTypeName}</p>
                        <p className="font-mono text-xs text-gray-400">{d.code}</p>
                      </div>
                      <DocStatusChip status={d.status} />
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
};
