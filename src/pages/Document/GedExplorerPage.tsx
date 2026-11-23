import React, { useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ChevronDown, ChevronRight, Copy, Download, FolderInput, FolderOpen, FolderPlus, FolderUp, Home, Lock, Pencil, ShieldCheck, Trash2, Unlock, Upload } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { gedService } from "../../services/ged.service";
import type { GedItem } from "../../services/ged.service";
import type { DocumentFolderTreeNode } from "../../services/document.service";
import { documentService } from "../../services/document.service";
import { ActionButton, DataCard, EmptyState, ErrorBlock, Field, IconButton, PanelForm, Pagination, SearchField, StatusChip, Tabs } from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage } from "../../components/subscription/kitUtils";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { saveBlob } from "../../components/payment/paymentUtils";
import { dateTime, formatBytes, useDebounced } from "../../components/documents/docUtils";
import { RefreshButton } from "../../components/reporting/reportKit";
import { GedFileViewer } from "../../components/ged/GedFileViewer";
import { GedFolderAccessPanel } from "../../components/ged/GedFolderAccessPanel";
import { MoveCopyPanel, ScanPanel, UploadPanel } from "../../components/ged/GedTransferPanels";
import type { PendingFile } from "../../components/ged/GedTransferPanels";
import { SORT_OPTIONS, Snippet, isFolder, itemIcon } from "../../components/ged/gedUtils";
import { GedHoldsPanel, GedIndexPanel, GedRetentionPanel, GedTrashPanel } from "./GedAdminPanels";

type SubTab = "files" | "trash" | "holds" | "retention" | "index";
type SearchMode = "names" | "content";
const PAGE_SIZE = 25;

// ───────────────────────── Arborescence ─────────────────────────

const TreeNode: React.FC<{ node: DocumentFolderTreeNode; depth: number; current: string; onOpen: (code: string) => void }> = ({ node, depth, current, onOpen }) => {
  const kids = (node.children ?? []) as DocumentFolderTreeNode[];
  const [open, setOpen] = useState(depth < 1);
  const active = node.code === current;
  return (
    <li>
      <div className={`flex items-center gap-1 rounded-xl pr-2 ${active ? "bg-pink-50 font-semibold text-gray-950" : "text-gray-700 hover:bg-gray-100"}`} style={{ paddingLeft: depth * 12 }}>
        <button type="button" aria-label={open ? "Replier" : "Déplier"} onClick={() => setOpen(!open)} className={`flex h-7 w-6 items-center justify-center text-gray-400 ${kids.length ? "" : "invisible"}`}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <button type="button" onClick={() => onOpen(node.code)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm">
          <FolderOpen size={15} className="shrink-0 text-gray-400" />
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {open && kids.length > 0 && (
        <ul>
          {kids.map((k) => (
            <TreeNode key={k.code} node={k} depth={depth + 1} current={current} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </li>
  );
};

// ───────────────────────── Page ─────────────────────────

export const GedExplorerPage: React.FC = () => {
  const { hasPermission, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const canRead = hasPermission("DOCUMENT:READ");
  const canWrite = hasPermission("DOCUMENT:WRITE");
  const canUpload = hasPermission("DOCUMENT:UPLOAD") || canWrite;
  const admin = isAdmin();

  const [tab, setTab] = useState<SubTab>("files");
  const [folder, setFolder] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("names");
  const [selected, setSelected] = useState<GedItem[]>([]);
  const [viewing, setViewing] = useState<GedItem | null>(null);
  const [panel, setPanel] = useState<null | "newFolder" | "access" | "move" | "copy" | "upload" | "scan">(null);
  const [renaming, setRenaming] = useState<GedItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [scanPages, setScanPages] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const q = useDebounced(query.trim(), 400);
  const searching = q.length >= 2 && mode === "content";

  const tree = useQuery({ queryKey: ["ged-tree"], queryFn: () => gedService.tree(), enabled: canRead });
  const listing = useQuery({
    queryKey: ["ged-items", folder, q, mode, sort, direction, page],
    queryFn: () => gedService.items({ folderCode: folder || undefined, search: q.length >= 1 && mode === "names" ? q : undefined, sort, direction, page, size: PAGE_SIZE }),
    enabled: canRead && !searching,
    placeholderData: keepPreviousData,
  });
  const hits = useQuery({
    queryKey: ["ged-search", folder, q, page],
    queryFn: () => gedService.search({ q, folderCode: folder || undefined, page, size: PAGE_SIZE }),
    enabled: canRead && searching,
    placeholderData: keepPreviousData,
  });

  const data = listing.data;
  const access = data?.access;
  const items = data?.items ?? [];
  const crumbs = data?.breadcrumb ?? [];
  const folderName = data?.folder?.name ?? "Racine";
  const canEdit = canWrite && (folder === "" ? true : access?.canEdit !== false);
  const canDelete = canWrite && (folder === "" ? true : access?.canDelete !== false);
  const canDownload = folder === "" ? true : access?.canDownload !== false;

  const refresh = () => {
    setSelected([]);
    queryClient.invalidateQueries({ queryKey: ["ged-items"] });
    queryClient.invalidateQueries({ queryKey: ["ged-search"] });
    queryClient.invalidateQueries({ queryKey: ["ged-tree"] });
    queryClient.invalidateQueries({ queryKey: ["ged-trash"] });
    queryClient.invalidateQueries({ queryKey: ["ged-usage"] });
  };
  const openFolder = (code: string) => {
    setFolder(code);
    setPage(0);
    setQuery("");
    setSelected([]);
    setPanel(null);
    setTab("files");
  };

  const createFolder = useMutation({
    mutationFn: () => gedService.createFolder({ name: newFolderName.trim(), parentCode: folder || undefined }),
    onSuccess: () => {
      toast.success("Dossier créé");
      setNewFolderName("");
      setPanel(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Création impossible")),
  });
  const rename = useMutation({
    mutationFn: () => (isFolder(renaming!) ? gedService.renameFolder(renaming!.code, renameValue.trim()) : gedService.renameFile(renaming!.code, renameValue.trim())),
    onSuccess: () => {
      toast.success("Renommé");
      setRenaming(null);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Renommage impossible")),
  });
  const lock = useMutation({
    mutationFn: (i: GedItem) => (i.lock ? gedService.unlock(i.code) : gedService.lock(i.code)),
    onSuccess: (_d, i) => {
      toast.success(i.lock ? "Fichier déverrouillé" : "Fichier verrouillé 1 heure");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Verrou impossible")),
  });
  const trash = useMutation({
    mutationFn: (list: GedItem[]) =>
      gedService.trash({
        documentCodes: list.filter((i) => !isFolder(i)).map((i) => i.code),
        folderCodes: list.filter(isFolder).map((i) => i.code),
      }),
    onSuccess: (r) => {
      toast.success(`Mis à la corbeille : ${r.folders ?? 0} dossier(s), ${r.documents ?? 0} fichier(s)`);
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Suppression impossible")),
  });
  const download = useMutation({
    mutationFn: async (i: GedItem) => saveBlob(await documentService.downloadDocument(i.code), i.fileName || i.name),
    onError: (e) => toast.error(apiMessage(e, "Téléchargement impossible")),
  });

  const askTrash = (list: GedItem[]) =>
    toast.confirm({
      message: list.length === 1 ? `Mettre « ${list[0].name} » à la corbeille ?` : `Mettre ${list.length} éléments à la corbeille ?`,
      detail: "Ils restent 30 jours dans la corbeille et peuvent être restaurés. Un dossier part avec tout son contenu.",
      confirmLabel: "Mettre à la corbeille",
      pendingLabel: "Suppression",
      tone: "danger",
      onConfirm: () => trash.mutateAsync(list),
    });

  // Éléments qu'on ne peut pas supprimer / déplacer
  const noDelete = (i: GedItem) => (isFolder(i) ? !!i.protectedItem : !!i.protectedItem || !!i.held);
  const noMove = (i: GedItem) => isFolder(i) && !!i.protectedItem;
  const noRename = (i: GedItem) => isFolder(i) && !!i.protectedItem;

  // Dépôt
  const addFiles = (list: FileList | File[] | null, withPaths = false) => {
    if (!list || !canUpload) return;
    const arr = Array.from(list).map<PendingFile>((f) => ({
      file: f,
      relativePath: withPaths ? ((f as File & { webkitRelativePath?: string }).webkitRelativePath || undefined) : undefined,
    }));
    if (arr.length === 0) return;
    setPending(arr);
    setPanel("upload");
  };
  const addScan = (list: FileList | null) => {
    if (!list) return;
    setScanPages((p) => [...p, ...Array.from(list)]);
    setPanel("scan");
  };

  const toggle = (i: GedItem) => setSelected((p) => (p.some((s) => s.code === i.code) ? p.filter((s) => s.code !== i.code) : [...p, i]));
  const rows: GedItem[] = useMemo(() => (searching ? (hits.data?.hits ?? []).map((h) => h.item) : items), [searching, hits.data, items]);
  const totalPages = searching ? (hits.data?.totalPages ?? 1) : (data?.page?.totalPages ?? 1);
  const total = searching ? (hits.data?.totalElements ?? 0) : (data?.page?.totalElements ?? rows.length);
  const loading = searching ? hits.isLoading : listing.isLoading;
  const failed = searching ? hits.isError : listing.isError;
  const movable = selected.filter((i) => !noMove(i));
  const deletable = selected.filter((i) => !noDelete(i));
  const copyable = selected.filter((i) => !isFolder(i));

  if (!canRead) return <EmptyState icon={FolderOpen} title="Accès refusé" hint="Il faut le droit DOCUMENT:READ pour ouvrir l'explorateur." />;

  const subTabs = [
    { id: "files" as SubTab, label: "Fichiers" },
    { id: "trash" as SubTab, label: "Corbeille" },
    ...(admin ? [{ id: "holds" as SubTab, label: "Gel juridique" }, { id: "retention" as SubTab, label: "À détruire" }] : []),
    { id: "index" as SubTab, label: "Indexation" },
  ];

  return (
    <div className="space-y-4">
      <Tabs variant="soft" items={subTabs} active={tab} onChange={setTab} />

      {tab === "trash" && <GedTrashPanel canWrite={canDelete} isAdmin={admin} onChanged={refresh} />}
      {tab === "holds" && <GedHoldsPanel canWrite={canWrite} isAdmin={admin} />}
      {tab === "retention" && <GedRetentionPanel canWrite={canWrite} isAdmin={admin} />}
      {tab === "index" && <GedIndexPanel canWrite={canWrite} />}

      {tab === "files" && (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <aside className="rounded-3xl bg-white p-3 shadow-sm lg:max-h-[75vh] lg:overflow-auto">
            <button type="button" onClick={() => openFolder("")} className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm ${folder === "" ? "bg-pink-50 font-semibold text-gray-950" : "text-gray-700 hover:bg-gray-100"}`}>
              <Home size={15} className="text-gray-400" /> Racine
            </button>
            {tree.isLoading ? (
              <p className="p-3 text-xs text-gray-500">Chargement…</p>
            ) : tree.isError ? (
              <p className="p-3 text-xs text-red-600">Arborescence indisponible.</p>
            ) : (
              <ul>
                {(tree.data ?? []).map((n) => (
                  <TreeNode key={n.code} node={n} depth={0} current={folder} onOpen={openFolder} />
                ))}
              </ul>
            )}
          </aside>

          <div
            className={`min-w-0 space-y-3 rounded-3xl ${dragging ? "ring-2 ring-pink-300" : ""}`}
            onDragOver={(e) => {
              if (!canUpload) return;
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-500" aria-label="Chemin">
              <button type="button" onClick={() => openFolder("")} className="hover:text-gray-900">Racine</button>
              {crumbs.map((c) => (
                <React.Fragment key={c.code}>
                  <ChevronRight size={12} />
                  <button type="button" onClick={() => openFolder(c.code)} className="hover:text-gray-900">{c.name}</button>
                </React.Fragment>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <SearchField value={query} onChange={(v) => { setQuery(v); setPage(0); }} placeholder={mode === "content" ? "Chercher dans le texte des fichiers" : "Chercher par nom"} className="min-w-[14rem] flex-1" />
              <Tabs variant="soft" items={[{ id: "names" as SearchMode, label: "Noms" }, { id: "content" as SearchMode, label: "Contenu" }]} active={mode} onChange={(m) => { setMode(m); setPage(0); }} />
              {!searching && (
                <>
                  <select aria-label="Trier par" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }} className={`${FIELD_SOFT} w-auto`}>
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setDirection(direction === "asc" ? "desc" : "asc")} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm">
                    {direction === "asc" ? "A → Z" : "Z → A"}
                  </button>
                </>
              )}
              <RefreshButton fetching={listing.isFetching || hits.isFetching} onClick={() => { listing.refetch(); if (searching) hits.refetch(); }} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <ActionButton variant="ghost" icon={FolderPlus} onClick={() => setPanel("newFolder")}>Nouveau dossier</ActionButton>
              )}
              {canUpload && (
                <>
                  <ActionButton icon={Upload} onClick={() => fileInput.current?.click()}>Déposer des fichiers</ActionButton>
                  <ActionButton variant="ghost" icon={FolderUp} onClick={() => folderInput.current?.click()}>Déposer un dossier</ActionButton>
                  <ActionButton variant="ghost" icon={Camera} onClick={() => cameraInput.current?.click()}>Numériser</ActionButton>
                </>
              )}
              {folder && <ActionButton variant="ghost" icon={ShieldCheck} onClick={() => setPanel(panel === "access" ? null : "access")}>Accès et quota</ActionButton>}
              <input ref={fileInput} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <input
                ref={(el) => {
                  folderInput.current = el;
                  if (el) el.setAttribute("webkitdirectory", "");
                }}
                type="file"
                multiple
                hidden
                onChange={(e) => { addFiles(e.target.files, true); e.target.value = ""; }}
              />
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { addScan(e.target.files); e.target.value = ""; }} />
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm">
                <span className="text-sm font-semibold text-gray-700">{selected.length} sélectionné(s)</span>
                {canEdit && movable.length > 0 && <ActionButton variant="ghost" icon={FolderInput} onClick={() => setPanel("move")}>Déplacer</ActionButton>}
                {canEdit && copyable.length > 0 && <ActionButton variant="ghost" icon={Copy} onClick={() => setPanel("copy")}>Copier</ActionButton>}
                {canDelete && deletable.length > 0 && (
                  <ActionButton variant="danger" icon={Trash2} pending={trash.isPending} onClick={() => askTrash(deletable)}>
                    Corbeille{deletable.length < selected.length ? ` (${deletable.length})` : ""}
                  </ActionButton>
                )}
                <button type="button" onClick={() => setSelected([])} className="ml-auto text-xs font-semibold text-gray-500 hover:text-gray-800">Désélectionner</button>
              </div>
            )}

            {panel === "newFolder" && (
              <PanelForm title={`Nouveau dossier dans « ${folderName} »`} onSubmit={(e) => { e.preventDefault(); createFolder.mutate(); }} onCancel={() => setPanel(null)} pending={createFolder.isPending} submitLabel="Créer" submitDisabled={!newFolderName.trim()}>
                <Field label="Nom" required>
                  <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className={FIELD} />
                </Field>
              </PanelForm>
            )}
            {renaming && (
              <PanelForm title={`Renommer « ${renaming.name} »`} onSubmit={(e) => { e.preventDefault(); rename.mutate(); }} onCancel={() => setRenaming(null)} pending={rename.isPending} submitLabel="Renommer" submitDisabled={!renameValue.trim() || renameValue.trim() === renaming.name}>
                <Field label="Nouveau nom" required>
                  <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className={FIELD} />
                </Field>
              </PanelForm>
            )}
            {panel === "access" && folder && <GedFolderAccessPanel folderCode={folder} folderName={folderName} canWrite={canWrite} isAdmin={admin} onChanged={refresh} />}
            {(panel === "move" || panel === "copy") && <MoveCopyPanel mode={panel} items={panel === "move" ? movable : copyable} startFolder={folder} onClose={() => setPanel(null)} onDone={() => { setPanel(null); refresh(); }} />}
            {panel === "upload" && pending.length > 0 && <UploadPanel files={pending} folderCode={folder} onClose={() => { setPanel(null); setPending([]); }} onDone={refresh} />}
            {panel === "scan" && scanPages.length > 0 && (
              <ScanPanel pages={scanPages} folderCode={folder} onChangePages={setScanPages} onClose={() => { setPanel(null); setScanPages([]); }} onDone={(it) => { setPanel(null); setScanPages([]); toast.success(`« ${it.name} » ajouté`); refresh(); }} />
            )}

            {loading ? (
              <ListSkeleton rows={6} />
            ) : failed ? (
              <ErrorBlock message="La liste n'a pas pu être chargée." onRetry={() => (searching ? hits.refetch() : listing.refetch())} />
            ) : rows.length === 0 ? (
              <EmptyState icon={FolderOpen} title={q ? "Aucun résultat" : "Ce dossier est vide"} hint={q ? "Essayez d'autres mots." : canUpload ? "Glissez des fichiers ici ou utilisez « Déposer des fichiers »." : undefined} />
            ) : (
              <DataCard>
                <div className="divide-y divide-gray-100">
                  {rows.map((i, idx) => {
                    const Icon = itemIcon(i);
                    const snippet = searching ? hits.data?.hits[idx]?.snippet : undefined;
                    const place = searching ? hits.data?.hits[idx]?.location : undefined;
                    const checked = selected.some((s) => s.code === i.code);
                    return (
                      <div key={`${i.kind}-${i.code}`} className="flex items-start gap-3 p-3 hover:bg-gray-50">
                        {!searching && <input type="checkbox" aria-label={`Sélectionner ${i.name}`} checked={checked} onChange={() => toggle(i)} className="mt-2 h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />}
                        <Icon size={20} className="mt-1.5 shrink-0 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => (isFolder(i) ? openFolder(i.code) : setViewing(i))} className="max-w-full truncate text-left text-sm font-semibold text-gray-900 hover:underline">
                            {i.name}
                          </button>
                          <p className="truncate text-xs text-gray-500">
                            {isFolder(i) ? `${i.childrenCount ?? 0} dossier(s), ${i.documentsCount ?? 0} fichier(s)` : `${formatBytes(i.size)}${i.version ? ` · v${i.version}` : ""}`}
                            {i.updatedAt ? ` · ${dateTime(i.updatedAt)}` : ""}
                            {place ? ` · ${place}` : ""}
                          </p>
                          {snippet && <p className="mt-1 text-xs text-gray-600"><Snippet text={snippet} /></p>}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {i.restricted && <StatusChip tone="warn">Restreint</StatusChip>}
                            {i.held && <StatusChip tone="warn">Sous gel</StatusChip>}
                            {i.protectedItem && <StatusChip tone="neutral">Protégé</StatusChip>}
                            {i.lock && <StatusChip tone="info">{i.lock.mine ? "Verrouillé par vous" : `Verrouillé par ${i.lock.lockedBy ?? "un autre compte"}`}</StatusChip>}
                            {i.destructionDueAt && <StatusChip tone="danger">À détruire</StatusChip>}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!isFolder(i) && canDownload && <IconButton icon={Download} label="Télécharger" pending={download.isPending && download.variables?.code === i.code} onClick={() => download.mutate(i)} />}
                          {!searching && canEdit && !isFolder(i) && (!i.lock || i.lock.mine) && <IconButton icon={i.lock ? Unlock : Lock} label={i.lock ? "Déverrouiller" : "Verrouiller 1 h"} onClick={() => lock.mutate(i)} />}
                          {!searching && canEdit && !noRename(i) && <IconButton icon={Pencil} label="Renommer" onClick={() => { setRenaming(i); setRenameValue(i.name); setPanel(null); }} />}
                          {!searching && canDelete && !noDelete(i) && <IconButton icon={Trash2} label="Mettre à la corbeille" tone="danger" onClick={() => askTrash([i])} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DataCard>
            )}

            <Pagination page={page} totalPages={totalPages} total={total} noun={searching ? "résultat" : "élément"} onChange={setPage} />
          </div>
        </div>
      )}

      {viewing && <GedFileViewer item={viewing} canWrite={canWrite} canDownload={canDownload} onClose={() => setViewing(null)} />}
    </div>
  );
};

export default GedExplorerPage;
