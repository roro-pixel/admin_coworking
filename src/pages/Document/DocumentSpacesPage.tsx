import React, { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Upload } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { DocumentDetailView } from "./DocumentDetail";
import type { DocumentResponse } from "../../services/document.service";
import { documentService } from "../../services/document.service";
import { gedService } from "../../services/ged.service";
import type { SpaceKey } from "../../services/ged.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, ListHeader, PanelForm, Pagination, SearchField, Tabs } from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { ChartCard, KpiRow, KpiRowSkeleton } from "../../components/operations/OpsCharts";
import { RankBars } from "../../components/reporting/ReportCharts";
import { RefreshButton } from "../../components/reporting/reportKit";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { DocStatusChip } from "../../components/documents/docKit";
import { CATEGORY_LABEL, DOC_STATUS_LABEL, OWNER_LABEL, dayOnly, formatBytes, fmtHours, fmtInt, label, toRank, useDebounced } from "../../components/documents/docUtils";

const SPACE_TABS: { id: SpaceKey; label: string }[] = [
  { id: "administrative", label: "Administratif" },
  { id: "assets", label: "Actifs" },
  { id: "contracts", label: "Contrats" },
  { id: "financial", label: "Financier" },
  { id: "general", label: "Général" },
];
const PAGE = 20;

const Upload_: React.FC<{ space: SpaceKey; onClose: () => void; onDone: () => void }> = ({ space, onClose, onDone }) => {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ ownerType: "CUSTOMER", ownerCode: "", documentTypeCode: "", title: "", description: "", documentNumber: "", issueDate: "", expiryDate: "", referenceCode: "" });
  const [error, setError] = useState<string | null>(null);
  const types = useQuery({ queryKey: ["documentTypes", "space-upload", f.ownerType], queryFn: () => documentService.getDocumentTypes(f.ownerType, true) });
  const set = (p: Partial<typeof f>) => setF((v) => ({ ...v, ...p }));
  const up = useMutation({
    mutationFn: () => gedService.spaceUpload(space, file!, { ...f, ownerCode: f.ownerCode.trim(), title: f.title.trim() }),
    onSuccess: () => {
      toast.success("Document déposé");
      onDone();
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Dépôt impossible")),
  });
  const ready = !!file && f.ownerCode.trim() && f.documentTypeCode && f.title.trim();
  return (
    <PanelForm title="Déposer un document dans cet espace" onSubmit={(e) => { e.preventDefault(); up.mutate(); }} onCancel={onClose} pending={up.isPending} submitLabel="Déposer" submitDisabled={!ready} error={error}>
      <p className="text-xs text-gray-500">Le type de document doit appartenir à cet espace : le serveur refuse un type d'un autre espace.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Propriétaire" required>
          <select value={f.ownerType} onChange={(e) => set({ ownerType: e.target.value, documentTypeCode: "" })} className={FIELD}>
            {Object.entries(OWNER_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Code du propriétaire" required>
          <input value={f.ownerCode} onChange={(e) => set({ ownerCode: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Type de document" required>
          <select value={f.documentTypeCode} onChange={(e) => set({ documentTypeCode: e.target.value })} className={FIELD}>
            <option value="">Choisir…</option>
            {(types.data ?? []).map((t) => (
              <option key={t.code} value={t.code}>{t.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Titre" required>
          <input value={f.title} onChange={(e) => set({ title: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Numéro du document">
          <input value={f.documentNumber} onChange={(e) => set({ documentNumber: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Référence">
          <input value={f.referenceCode} onChange={(e) => set({ referenceCode: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Émis le">
          <input type="date" value={f.issueDate} onChange={(e) => set({ issueDate: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Expire le">
          <input type="date" value={f.expiryDate} onChange={(e) => set({ expiryDate: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Description">
          <input value={f.description} onChange={(e) => set({ description: e.target.value })} className={FIELD} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton variant="ghost" icon={Upload} onClick={() => input.current?.click()}>
          {file ? "Changer le fichier" : "Choisir le fichier"}
        </ActionButton>
        {file && <span className="text-sm text-gray-600">{file.name} · {formatBytes(file.size)}</span>}
        <input ref={input} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
    </PanelForm>
  );
};

export const DocumentSpacesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canRead = hasPermission("DOCUMENT:READ");
  const canUpload = hasPermission("DOCUMENT:UPLOAD");
  const [space, setSpace] = useState<SpaceKey>("administrative");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [ownerType, setOwnerType] = useState("");
  const [ownerCode, setOwnerCode] = useState("");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<DocumentResponse | null>(null);
  const q = useDebounced(search.trim());

  const dash = useQuery({ queryKey: ["space-dashboard", space], queryFn: () => gedService.spaceDashboard(space), enabled: canRead });
  const list = useQuery({
    queryKey: ["space-documents", space, q, status, ownerType, ownerCode, after, before, page],
    queryFn: () =>
      gedService.spaceDocuments(space, {
        q: q || undefined,
        statuses: status ? [status] : undefined,
        ownerType: ownerType || undefined,
        ownerCode: ownerType && ownerCode.trim() ? ownerCode.trim() : undefined,
        uploadedAfter: after || undefined,
        uploadedBefore: before || undefined,
        page,
        size: PAGE,
      }),
    enabled: canRead,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["space-documents"] });
    queryClient.invalidateQueries({ queryKey: ["space-dashboard"] });
  };

  if (!canRead) return <EmptyState icon={Eye} title="Accès refusé" hint="Il faut le droit DOCUMENT:READ." />;
  if (selected) return <DocumentDetailView document={selected} onBack={() => { setSelected(null); refresh(); }} />;

  const d = dash.data;
  const docs = list.data?.content ?? [];
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <Tabs variant="soft" items={SPACE_TABS} active={space} onChange={(s) => { setSpace(s); setPage(0); setUploading(false); }} />
      <ListHeader
        title={`Espace ${SPACE_TABS.find((s) => s.id === space)?.label.toLowerCase()}`}
        subtitle="Documents de cet espace, avec leurs indicateurs de revue."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <RefreshButton fetching={dash.isFetching || list.isFetching} onClick={refresh} />
            {canUpload && <ActionButton icon={Upload} onClick={() => setUploading(true)}>Déposer</ActionButton>}
          </div>
        }
      />

      {uploading && <Upload_ space={space} onClose={() => setUploading(false)} onDone={refresh} />}

      {dash.isLoading ? (
        <KpiRowSkeleton count={4} columns={4} />
      ) : dash.isError || !d ? (
        <ErrorBlock message="Les indicateurs n'ont pas pu être chargés." onRetry={() => dash.refetch()} />
      ) : (
        <>
          <KpiRow
            items={[
              { label: "Documents", value: fmtInt(d.total ?? 0) },
              { label: "En attente depuis plus de 48 h", value: fmtInt(d.pendingReviewOlderThan48h ?? 0), tone: (d.pendingReviewOlderThan48h ?? 0) > 0 ? "danger" : "default" },
              { label: "À corriger", value: fmtInt(d.needsCorrectionCount ?? 0), tone: (d.needsCorrectionCount ?? 0) > 0 ? "pink" : "default" },
              { label: "Expirent sous 30 jours", value: fmtInt(d.expiringIn30Days ?? 0), tone: (d.expiringIn30Days ?? 0) > 0 ? "danger" : "default" },
            ]}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Par statut" subtitle={`Rejets sur 30 jours : ${d.rejectionRate30d !== undefined ? `${Math.round(d.rejectionRate30d * (d.rejectionRate30d <= 1 ? 100 : 1))} %` : "—"} · revue moyenne : ${fmtHours(d.avgReviewTimeHours)}`}>
              <RankBars items={toRank(d.byStatus, DOC_STATUS_LABEL)} format={fmtInt} />
            </ChartCard>
            <ChartCard title="Par catégorie">
              <RankBars items={toRank(d.byCategory, CATEGORY_LABEL)} format={fmtInt} />
            </ChartCard>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <SearchField value={search} onChange={reset(setSearch)} placeholder="Titre, nom de fichier ou numéro" className="min-w-[14rem] flex-1" />
        <select aria-label="Statut" value={status} onChange={(e) => reset(setStatus)(e.target.value)} className={`${FIELD_SOFT} w-auto`}>
          <option value="">Tous les statuts</option>
          {Object.entries(DOC_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select aria-label="Propriétaire" value={ownerType} onChange={(e) => reset(setOwnerType)(e.target.value)} className={`${FIELD_SOFT} w-auto`}>
          <option value="">Tous les propriétaires</option>
          {Object.entries(OWNER_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        {ownerType && <input aria-label="Code du propriétaire" placeholder="Code" value={ownerCode} onChange={(e) => reset(setOwnerCode)(e.target.value)} className={`${FIELD_SOFT} w-36`} />}
        {space === "financial" && (
          <>
            <input aria-label="Déposé après" type="date" value={after} onChange={(e) => reset(setAfter)(e.target.value)} className={`${FIELD_SOFT} w-40`} />
            <input aria-label="Déposé avant" type="date" value={before} onChange={(e) => reset(setBefore)(e.target.value)} className={`${FIELD_SOFT} w-40`} />
          </>
        )}
      </div>

      {list.isLoading ? (
        <ListSkeleton rows={5} />
      ) : list.isError ? (
        <ErrorBlock message="Les documents n'ont pas pu être chargés." onRetry={() => list.refetch()} />
      ) : docs.length === 0 ? (
        <EmptyState icon={Eye} title="Aucun document" hint="Aucun document ne correspond à ces filtres." />
      ) : (
        <DataCard>
          <div className="divide-y divide-gray-100">
            {docs.map((x) => (
              <div key={x.code} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{x.title || x.fileName}</p>
                  <p className="truncate text-xs text-gray-500">
                    {x.documentTypeName} · {label(OWNER_LABEL, String(x.ownerType))} {x.ownerCode} · déposé le {dayOnly(x.uploadedAt)}
                    {x.expiryDate ? ` · expire le ${dayOnly(x.expiryDate)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <DocStatusChip status={String(x.status)} />
                  <ActionButton variant="ghost" icon={Eye} onClick={() => setSelected(x)}>
                    Ouvrir
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}
      <Pagination page={page} totalPages={list.data?.totalPages ?? 1} total={list.data?.totalElements ?? docs.length} noun="document" onChange={setPage} />
    </div>
  );
};

export default DocumentSpacesPage;
