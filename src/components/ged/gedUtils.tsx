import React, { useEffect, useState } from "react";
import { File as FileIcon, FileImage, FileSpreadsheet, FileText, Folder, Presentation } from "lucide-react";
import type { GedAccessLevel, GedItem } from "../../services/ged.service";
import type { DocumentFolderTreeNode } from "../../services/document.service";

export const ACCESS_LEVELS: GedAccessLevel[] = ["NONE", "READ", "DOWNLOAD", "EDIT", "DELETE", "ADMIN"];

export const ACCESS_LABEL: Record<string, string> = {
  NONE: "Aucun accès",
  READ: "Voir",
  DOWNLOAD: "Télécharger",
  EDIT: "Modifier",
  DELETE: "Supprimer",
  ADMIN: "Gérer l'accès",
};

export const ACCESS_HINT: Record<string, string> = {
  NONE: "Retire l'accès : le dossier n'existe plus pour cette personne.",
  READ: "Voir le dossier et la liste de ses fichiers.",
  DOWNLOAD: "Ouvrir, télécharger, prévisualiser un fichier et lire son texte.",
  EDIT: "Déposer, numériser, créer un sous-dossier, renommer, déplacer et verrouiller.",
  DELETE: "Mettre à la corbeille et restaurer.",
  ADMIN: "Restreindre, rouvrir, donner et retirer des droits.",
};

export const GRANTEE_LABEL: Record<string, string> = { USER: "Utilisateur", ROLE: "Rôle" };

export const TEXT_STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente de lecture",
  DONE: "Lu",
  EMPTY: "Rien à lire",
  UNSUPPORTED: "Format non lu",
  FAILED: "Échec de lecture",
};

export const TEXT_METHOD_LABEL: Record<string, string> = {
  TEXT_LAYER: "Texte du PDF",
  OCR: "Reconnaissance de caractères (OCR)",
  MIXED: "Texte du PDF et OCR",
  PLAIN: "Texte brut",
  OFFICE: "Document bureautique",
  UNSUPPORTED: "Non lu",
};

export const SORT_OPTIONS = [
  { value: "name", label: "Nom" },
  { value: "updatedAt", label: "Dernière modification" },
  { value: "size", label: "Taille" },
  { value: "type", label: "Type" },
];

export const isFolder = (i: GedItem): boolean => i.kind === "FOLDER";

export const itemIcon = (i: GedItem): React.ElementType => {
  if (isFolder(i)) return Folder;
  const ext = (i.extension || i.fileName?.split(".").pop() || "").toLowerCase();
  const mime = i.mimeType ?? "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "tif", "tiff", "bmp"].includes(ext)) return FileImage;
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return FileSpreadsheet;
  if (["ppt", "pptx"].includes(ext)) return Presentation;
  if (["pdf", "doc", "docx", "odt", "txt"].includes(ext) || mime === "application/pdf") return FileText;
  return FileIcon;
};

/** Aplatit l'arborescence pour un sélecteur de dossier (profondeur conservée pour l'indentation). */
export interface FlatFolder {
  code: string;
  name: string;
  depth: number;
  path: string;
}

export function flattenTree(nodes: DocumentFolderTreeNode[], depth = 0, prefix = ""): FlatFolder[] {
  const out: FlatFolder[] = [];
  nodes.forEach((n) => {
    const path = prefix ? `${prefix} / ${n.name}` : n.name;
    out.push({ code: n.code, name: n.name, depth, path });
    if (Array.isArray(n.children) && n.children.length) out.push(...flattenTree(n.children as DocumentFolderTreeNode[], depth + 1, path));
  });
  return out;
}

/** Codes d'un dossier et de tous ses descendants (pour interdire de le déplacer dans lui-même). */
export function descendantCodes(nodes: DocumentFolderTreeNode[], code: string): Set<string> {
  const result = new Set<string>();
  const walk = (list: DocumentFolderTreeNode[], inside: boolean) => {
    list.forEach((n) => {
      const here = inside || n.code === code;
      if (here) result.add(n.code);
      if (Array.isArray(n.children)) walk(n.children as DocumentFolderTreeNode[], here);
    });
  };
  walk(nodes, false);
  return result;
}

/**
 * Extrait de recherche : les mots trouvés sont entre ⟦ et ⟧.
 * Le texte vient de fichiers déposés : il est affiché comme du texte, jamais comme du HTML.
 */
export const Snippet: React.FC<{ text?: string }> = ({ text }) => {
  if (!text) return null;
  const parts = text.split(/(⟦[^⟧]*⟧)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("⟦") ? (
          <mark key={i} className="rounded bg-yellow-100 px-0.5 text-gray-900">
            {p.replace(/^⟦|⟧$/g, "")}
          </mark>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
};

/** Adresse blob: qui se libère toute seule quand le blob change ou que l'écran se ferme. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

/**
 * Réduit une photo avant l'envoi : 1600 px de large au plus, JPEG qualité 0,8 (environ 300 Ko la page),
 * pour qu'une vingtaine de pages tienne dans la limite de 10 Mo d'une requête.
 */
export async function shrinkImage(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/tiff") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxWidth / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export const percent = (used?: number, quota?: number): number => (quota && quota > 0 ? Math.min(100, Math.round(((used ?? 0) / quota) * 100)) : 0);

export const purgeSummary = (r: { documents?: number; filesErased?: number; heldSkipped?: number; failed?: number } | undefined): string => {
  if (!r) return "Destruction terminée.";
  const parts = [`${r.filesErased ?? r.documents ?? 0} fichier${(r.filesErased ?? r.documents ?? 0) > 1 ? "s" : ""} détruit${(r.filesErased ?? r.documents ?? 0) > 1 ? "s" : ""}`];
  if (r.heldSkipped) parts.push(`${r.heldSkipped} épargné${r.heldSkipped > 1 ? "s" : ""} (gel juridique)`);
  if (r.failed) parts.push(`${r.failed} en erreur de stockage, à rejouer`);
  return parts.join(", ") + ".";
};
