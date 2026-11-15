import React from "react";
import { Download, Eye } from "lucide-react";
import type { DocumentResponse } from "../../services/document.service";
import { DataCard, HeadRow, IconButton, Tag } from "../subscription/kit";
import { ROW_HOVER } from "../subscription/kitUtils";
import { Cell, DocStatusChip } from "./docKit";
import { CATEGORY_LABEL, OWNER_LABEL, dayOnly, isPast, label } from "./docUtils";

const COLS = "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_11rem_6.5rem_6.5rem_auto]";

/** Tableau de documents commun à la liste et à la recherche avancée */
export const DocumentTable: React.FC<{
  documents: DocumentResponse[];
  onOpen: (d: DocumentResponse) => void;
  onDownload: (d: DocumentResponse) => void;
  downloading?: string | null;
}> = ({ documents, onOpen, onDownload, downloading }) => (
  <>
    <HeadRow cols={COLS}>
      <span>Document</span>
      <span>Type</span>
      <span>Propriétaire</span>
      <span>Statut</span>
      <span>Envoyé le</span>
      <span>Expiration</span>
      <span className="text-right">Actions</span>
    </HeadRow>
    <DataCard>
      {documents.map((d) => {
        const expired = isPast(d.expiryDate);
        return (
          <div
            key={d.code}
            onClick={() => onOpen(d)}
            className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-2xl p-4 transition max-lg:mb-2 max-lg:bg-gray-50 ${COLS} ${ROW_HOVER}`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{d.title}</p>
              <p className="truncate font-mono text-xs text-[color:var(--logo-pink-dark)]">{d.code}</p>
            </div>
            <div className="max-lg:order-2 max-lg:justify-self-end lg:hidden">
              <DocStatusChip status={d.status} />
            </div>
            <Cell title="Type" className="max-lg:order-3 max-lg:col-span-2">
              <span className="text-sm text-gray-800">{d.documentTypeName}</span>
              {d.category && (
                <span className="ml-2 align-middle">
                  <Tag tone={d.category === "KYC" ? "pink" : "gray"}>{label(CATEGORY_LABEL, d.category)}</Tag>
                </span>
              )}
            </Cell>
            <Cell title="Propriétaire" className="max-lg:order-4 max-lg:col-span-2">
              <span className="text-sm text-gray-800">{label(OWNER_LABEL, d.ownerType)}</span>
              {d.ownerCode && <span className="ml-1 text-xs text-gray-400">{d.ownerCode}</span>}
            </Cell>
            <div className="hidden lg:block">
              <DocStatusChip status={d.status} />
            </div>
            <Cell title="Envoyé le" className="max-lg:order-5 max-lg:col-span-2">
              <span className="text-sm text-gray-700">{dayOnly(d.uploadedAt)}</span>
            </Cell>
            <Cell title="Expiration" className="max-lg:order-6 max-lg:col-span-2">
              {d.expiryDate ? <span className={`text-sm ${expired ? "font-semibold text-red-600" : "text-gray-700"}`}>{dayOnly(d.expiryDate)}</span> : <span className="text-sm text-gray-400">Aucune</span>}
            </Cell>
            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 max-lg:order-7 max-lg:col-span-2 lg:justify-end">
              <IconButton icon={Eye} label="Voir le détail" onClick={() => onOpen(d)} />
              <IconButton icon={Download} label="Télécharger" pending={downloading === d.code} onClick={() => onDownload(d)} />
            </div>
          </div>
        );
      })}
    </DataCard>
  </>
);
