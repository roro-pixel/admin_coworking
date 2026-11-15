import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitPullRequestDraft, Plus } from "lucide-react";
import { contractService } from "../../../services/contract.service";
import type { ContractDraftRequest } from "../../../services/contract.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, ListHeader, Pagination, PanelForm, SearchField, StatusChip, Tabs, Tag } from "../../subscription/kit";
import type { TabItem } from "../../subscription/kit";
import { FIELD, apiMessage, formatDate } from "../../subscription/kitUtils";
import { ListSkeleton } from "../../ui/Skeleton";
import { toast } from "../../ui/toastStore";
import { DRAFT_STATUS, OWNER_TYPE_LABELS, statusOf } from "../contractLabels";
import { OwnerPicker } from "../OwnerPicker";
import { useActorId } from "../contractUtils";
import { DraftEditor } from "./DraftEditor";

const SIZE = 20;
const STATUS_TABS: TabItem<string>[] = [{ id: "", label: "Toutes" }, ...Object.entries(DRAFT_STATUS).map(([id, s]) => ({ id, label: s.label }))];
const blank = { title: "", description: "", templateCode: "", ownerType: "MEMBER", ownerCode: "", businessCode: "" };

export const DraftsTab: React.FC = () => {
  const qc = useQueryClient();
  const actor = useActorId();
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);

  const q = useQuery({
    queryKey: ["contract-drafts-admin", search, status, page],
    queryFn: async () => {
      if (search.trim()) {
        const r = await contractService.searchDrafts(search, { page, size: SIZE });
        if (!status) return r;
        const content = r.content.filter((d) => d.status === status);
        return { ...r, content, totalElements: content.length };
      }
      return contractService.getDrafts({ status: status || undefined, page, size: SIZE, sort: "createdAt,desc" });
    },
    enabled: openCode === null,
  });
  const { data: templates = [] } = useQuery({ queryKey: ["contract-templates"], queryFn: () => contractService.getTemplates(), enabled: creating });

  const create = useMutation({
    mutationFn: () => {
      const payload: ContractDraftRequest = {
        title: form.title.trim(),
        description: form.description || undefined,
        ownerType: form.ownerType as ContractDraftRequest["ownerType"],
        ownerCode: form.ownerCode || undefined,
        businessCode: form.businessCode || undefined,
        templateCode: form.templateCode || undefined,
        createdBy: actor,
      };
      return form.templateCode ? contractService.createDraftFromTemplate(form.templateCode, payload) : contractService.createDraft(payload);
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["contract-drafts-admin"] });
      toast.success("Rédaction créée");
      setCreating(false);
      setForm(blank);
      setError(null);
      setOpenCode(d.code);
    },
    onError: (e: unknown) => setError(apiMessage(e, "Erreur lors de la création de la rédaction.")),
  });

  if (openCode) return <DraftEditor code={openCode} onBack={() => setOpenCode(null)} />;

  const drafts = q.data?.content ?? [];
  return (
    <div className="space-y-5">
      <ListHeader
        title="Rédactions"
        subtitle="Contrats rédigés section par section, libres ou à partir d'un template"
        action={
          !creating && (
            <ActionButton icon={Plus} onClick={() => setCreating(true)}>
              Nouvelle rédaction
            </ActionButton>
          )
        }
      />

      {creating && (
        <PanelForm
          title="Nouvelle rédaction"
          pending={create.isPending}
          submitLabel="Créer la rédaction"
          submitDisabled={!form.title.trim()}
          error={error}
          onCancel={() => {
            setCreating(false);
            setError(null);
          }}
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            create.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Titre" required>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${FIELD} bg-gray-50 shadow-none`} />
            </Field>
            <Field label="Template" hint="Les sections du template sont reprises">
              <select value={form.templateCode} onChange={(e) => setForm({ ...form, templateCode: e.target.value })} className={`${FIELD} bg-gray-50 shadow-none`}>
                <option value="">Sans template</option>
                {templates.map((t) => (
                  <option key={t.code} value={t.code}>{t.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <OwnerPicker value={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={`${FIELD} resize-none bg-gray-50 shadow-none`} />
          </Field>
        </PanelForm>
      )}

      <Tabs
        variant="soft"
        items={STATUS_TABS}
        active={status}
        onChange={(s) => {
          setStatus(s);
          setPage(0);
        }}
      />
      <SearchField
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(0);
        }}
        placeholder="Rechercher une rédaction..."
      />

      {q.isLoading ? (
        <ListSkeleton rows={5} />
      ) : q.isError ? (
        <ErrorBlock message="Impossible de charger les rédactions." onRetry={() => q.refetch()} />
      ) : drafts.length === 0 ? (
        <EmptyState icon={GitPullRequestDraft} title="Aucune rédaction" hint={search || status ? "Aucune rédaction ne correspond à ces critères." : "Créez une rédaction pour commencer."} />
      ) : (
        <DataCard>
          <div className="space-y-1.5">
            {drafts.map((d) => {
              const st = statusOf(DRAFT_STATUS, d.status);
              return (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => setOpenCode(d.code)}
                  className="flex w-full flex-col gap-2 rounded-2xl bg-gray-50 px-4 py-3 text-left transition hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_8%,white)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{d.title}</p>
                    <p className="font-mono text-xs text-gray-400">{d.code}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {d.ownerCode && <Tag>{`${OWNER_TYPE_LABELS[String(d.ownerType)] ?? d.ownerType ?? ""} ${d.ownerCode}`.trim()}</Tag>}
                    {d.createdAt && <span className="text-xs text-gray-400">{formatDate(d.createdAt)}</span>}
                    <StatusChip tone={st.tone}>{st.label}</StatusChip>
                  </div>
                </button>
              );
            })}
          </div>
        </DataCard>
      )}

      <Pagination page={page} totalPages={q.data?.totalPages ?? 0} total={q.data?.totalElements ?? 0} noun="rédaction" onChange={setPage} />
    </div>
  );
};
