import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { gedService } from "../../services/ged.service";
import type { GedItem, GedUploadResult } from "../../services/ged.service";
import { documentService } from "../../services/document.service";
import { Field, IconButton, PanelForm } from "../subscription/kit";
import { FIELD, apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { formatBytes, OWNER_LABEL } from "../documents/docUtils";
import { descendantCodes, flattenTree, shrinkImage } from "./gedUtils";

// ───────────────────────── Choix d'un dossier ─────────────────────────

/** Sélecteur de dossier de destination. `exclude` : dossiers interdits (un dossier ne va pas dans ses descendants). */
export const FolderPicker: React.FC<{ value: string; onChange: (code: string) => void; exclude?: string[]; label?: string }> = ({ value, onChange, exclude = [], label = "Dossier de destination" }) => {
  const { data: tree = [] } = useQuery({ queryKey: ["ged-tree"], queryFn: () => gedService.tree() });
  const blocked = useMemo(() => {
    const set = new Set<string>();
    exclude.forEach((c) => descendantCodes(tree, c).forEach((d) => set.add(d)));
    return set;
  }, [tree, exclude]);
  const flat = useMemo(() => flattenTree(tree), [tree]);
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FIELD}>
        <option value="">Racine</option>
        {flat.map((f) => (
          <option key={f.code} value={f.code} disabled={blocked.has(f.code)}>
            {" ".repeat(f.depth)}
            {f.name}
          </option>
        ))}
      </select>
    </Field>
  );
};

// ───────────────────────── Déplacer / copier ─────────────────────────

export const MoveCopyPanel: React.FC<{
  mode: "move" | "copy";
  items: GedItem[];
  startFolder: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ mode, items, startFolder, onClose, onDone }) => {
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const docs = items.filter((i) => i.kind !== "FOLDER").map((i) => i.code);
  const folders = items.filter((i) => i.kind === "FOLDER").map((i) => i.code);

  const run = useMutation({
    mutationFn: async () => {
      if (mode === "move") {
        await gedService.move({ documentCodes: docs, folderCodes: folders, targetFolderCode: target || undefined });
        return null;
      }
      return gedService.copy({ documentCodes: docs, targetFolderCode: target || undefined });
    },
    onSuccess: (res) => {
      if (res && res.failed.length > 0) toast.error(`${res.uploaded.length} copié(s), ${res.failed.length} refusé(s) : ${res.failed[0].message ?? ""}`);
      else toast.success(mode === "move" ? "Éléments déplacés" : "Copie effectuée");
      onDone();
      onClose();
    },
    onError: (e) => setError(apiMessage(e, mode === "move" ? "Déplacement impossible" : "Copie impossible")),
  });

  return (
    <PanelForm
      title={mode === "move" ? `Déplacer ${items.length} élément${items.length > 1 ? "s" : ""}` : `Copier ${docs.length} fichier${docs.length > 1 ? "s" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        run.mutate();
      }}
      onCancel={onClose}
      pending={run.isPending}
      submitLabel={mode === "move" ? "Déplacer" : "Copier"}
      submitDisabled={mode === "copy" && docs.length === 0}
      error={error}
    >
      <FolderPicker value={target} onChange={setTarget} exclude={folders} />
      {mode === "copy" && <p className="text-xs text-gray-500">Chaque copie est un document général interne, indépendant de l'original. Les dossiers ne se copient pas{folders.length ? ` : ${folders.length} dossier(s) ignoré(s)` : ""}.</p>}
      {mode === "move" && target === startFolder && <p className="text-xs text-amber-700">C'est le dossier actuel.</p>}
    </PanelForm>
  );
};

// ───────────────────────── Dépôt ─────────────────────────

export interface PendingFile {
  file: File;
  relativePath?: string;
}

const OwnerFields: React.FC<{
  documentTypeCode: string;
  ownerType: string;
  ownerCode: string;
  onChange: (v: { documentTypeCode: string; ownerType: string; ownerCode: string }) => void;
}> = ({ documentTypeCode, ownerType, ownerCode, onChange }) => {
  const { data: types = [] } = useQuery({ queryKey: ["documentTypes", "ged-upload"], queryFn: () => documentService.getDocumentTypes(undefined, true) });
  const set = (patch: Partial<{ documentTypeCode: string; ownerType: string; ownerCode: string }>) => onChange({ documentTypeCode, ownerType, ownerCode, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Type de document" hint="Facultatif : sans type, document général interne.">
        <select value={documentTypeCode} onChange={(e) => set({ documentTypeCode: e.target.value })} className={FIELD}>
          <option value="">Document général</option>
          {types.map((t) => (
            <option key={`${t.ownerType}-${t.code}`} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Propriétaire">
        <select value={ownerType} onChange={(e) => set({ ownerType: e.target.value })} className={FIELD}>
          <option value="">Aucun</option>
          {Object.entries(OWNER_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Code du propriétaire">
        <input value={ownerCode} onChange={(e) => set({ ownerCode: e.target.value })} disabled={!ownerType} className={FIELD} />
      </Field>
    </div>
  );
};

/**
 * Dépôt de fichiers ou d'un dossier. Un fichier par requête (limite de 10 Mo par requête), l'un après l'autre,
 * avec une progression ; pour un dossier le même dossier de départ est repris et le chemin relatif de chaque fichier est transmis.
 */
export const UploadPanel: React.FC<{ files: PendingFile[]; folderCode: string; onClose: () => void; onDone: () => void }> = ({ files, folderCode, onClose, onDone }) => {
  const [meta, setMeta] = useState({ documentTypeCode: "", ownerType: "", ownerCode: "" });
  const [progress, setProgress] = useState({ done: 0, total: files.length });
  const [failures, setFailures] = useState<{ fileName?: string; message?: string }[]>([]);
  const stop = useRef(false);

  const run = useMutation({
    mutationFn: async () => {
      stop.current = false;
      const failed: { fileName?: string; message?: string }[] = [];
      let uploaded = 0;
      for (let i = 0; i < files.length; i++) {
        if (stop.current) break;
        const f = files[i];
        try {
          const res: GedUploadResult = await gedService.upload([f.file], {
            folderCode: folderCode || undefined,
            relativePaths: f.relativePath ? [f.relativePath] : undefined,
            documentTypeCode: meta.documentTypeCode || undefined,
            ownerType: meta.ownerType || undefined,
            ownerCode: meta.ownerType ? meta.ownerCode || undefined : undefined,
          });
          uploaded += res.uploaded.length;
          failed.push(...res.failed);
        } catch (e) {
          failed.push({ fileName: f.file.name, message: apiMessage(e, "Envoi impossible") });
        }
        setProgress({ done: i + 1, total: files.length });
      }
      return { uploaded, failed };
    },
    onSuccess: ({ uploaded, failed }) => {
      setFailures(failed);
      onDone();
      if (failed.length === 0) {
        toast.success(`${uploaded} fichier${uploaded > 1 ? "s" : ""} déposé${uploaded > 1 ? "s" : ""}`);
        onClose();
      } else {
        toast.error(`${uploaded} déposé(s), ${failed.length} refusé(s)`);
      }
    },
  });

  const tooBig = files.filter((f) => f.file.size > 10 * 1024 * 1024);
  const total = files.reduce((s, f) => s + f.file.size, 0);

  return (
    <PanelForm
      title={`Déposer ${files.length} fichier${files.length > 1 ? "s" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        setFailures([]);
        setProgress({ done: 0, total: files.length });
        run.mutate();
      }}
      onCancel={() => {
        stop.current = true;
        onClose();
      }}
      pending={run.isPending}
      submitLabel="Déposer"
      submitDisabled={files.length === 0 || tooBig.length > 0}
    >
      <p className="text-xs text-gray-500">
        {formatBytes(total)} au total. Formats : PDF, images, TXT, CSV, Word, Excel, PowerPoint, OpenDocument. Le format est reconnu au contenu du fichier. Les pièces KYC se limitent au PDF et aux images.
      </p>
      {tooBig.length > 0 && <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-700">{tooBig.length} fichier(s) dépassent 10 Mo, taille maximale d'une requête : {tooBig.slice(0, 3).map((f) => f.file.name).join(", ")}.</p>}
      <ul className="max-h-40 space-y-1 overflow-auto rounded-2xl bg-gray-50 p-3 text-xs text-gray-700">
        {files.slice(0, 50).map((f, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="truncate">{f.relativePath || f.file.name}</span>
            <span className="shrink-0 text-gray-400">{formatBytes(f.file.size)}</span>
          </li>
        ))}
        {files.length > 50 && <li className="text-gray-400">… et {files.length - 50} autres</li>}
      </ul>
      <OwnerFields {...meta} onChange={setMeta} />
      {run.isPending && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[color:var(--logo-pink-dark)] transition-all" style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {progress.done} / {progress.total} fichiers envoyés
          </p>
        </div>
      )}
      {failures.length > 0 && (
        <ul className="space-y-1 rounded-2xl bg-red-50 p-3 text-xs text-red-700">
          {failures.map((f, i) => (
            <li key={i}>
              <strong>{f.fileName}</strong> : {f.message}
            </li>
          ))}
        </ul>
      )}
    </PanelForm>
  );
};

// ───────────────────────── Numérisation ─────────────────────────

/** Plusieurs photos de pages assemblées en un seul PDF. Les photos sont réduites avant l'envoi. */
export const ScanPanel: React.FC<{ pages: File[]; folderCode: string; onChangePages: (p: File[]) => void; onClose: () => void; onDone: (item: GedItem) => void }> = ({ pages, folderCode, onChangePages, onClose, onDone }) => {
  const [title, setTitle] = useState("");
  const [meta, setMeta] = useState({ documentTypeCode: "", ownerType: "", ownerCode: "" });
  const [error, setError] = useState<string | null>(null);

  const move = (i: number, d: -1 | 1) => {
    const next = [...pages];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChangePages(next);
  };

  const run = useMutation({
    mutationFn: async () => {
      const small = await Promise.all(pages.map((p) => shrinkImage(p)));
      return gedService.scan(small, {
        folderCode: folderCode || undefined,
        title: title.trim() || undefined,
        documentTypeCode: meta.documentTypeCode || undefined,
        ownerType: meta.ownerType || undefined,
        ownerCode: meta.ownerType ? meta.ownerCode || undefined : undefined,
      });
    },
    onSuccess: (item) => {
      toast.success("Document numérisé");
      onDone(item);
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Numérisation impossible")),
  });

  return (
    <PanelForm
      title={`Numériser un document (${pages.length} page${pages.length > 1 ? "s" : ""})`}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        run.mutate();
      }}
      onCancel={onClose}
      pending={run.isPending}
      submitLabel="Créer le PDF"
      submitDisabled={pages.length === 0}
      error={error}
    >
      <p className="text-xs text-gray-500">Les pages sont assemblées dans l'ordre ci-dessous. Chaque photo est réduite avant l'envoi (1600 px de large, JPEG) : une vingtaine de pages tient dans la limite de 10 Mo.</p>
      <ol className="space-y-1">
        {pages.map((p, i) => (
          <li key={`${p.name}-${i}`} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-2 text-sm">
            <span className="truncate">
              <span className="mr-2 font-semibold text-gray-500">{i + 1}.</span>
              {p.name}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <IconButton icon={ArrowUp} label="Monter la page" disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton icon={ArrowDown} label="Descendre la page" disabled={i === pages.length - 1} onClick={() => move(i, 1)} />
              <IconButton icon={X} label="Retirer la page" tone="danger" onClick={() => onChangePages(pages.filter((_, k) => k !== i))} />
            </span>
          </li>
        ))}
      </ol>
      <Field label="Titre du PDF" hint="Facultatif. Sans titre : « Numérisation du jour à l'heure ».">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} />
      </Field>
      <OwnerFields {...meta} onChange={setMeta} />
    </PanelForm>
  );
};
