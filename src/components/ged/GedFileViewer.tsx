import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, RefreshCw, X } from "lucide-react";
import { documentService } from "../../services/document.service";
import { gedService } from "../../services/ged.service";
import type { GedItem } from "../../services/ged.service";
import { ModalPortal } from "../ui/ModalPortal";
import { ActionButton, ErrorBlock, StatusChip, Tabs } from "../subscription/kit";
import { apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";
import { saveBlob } from "../payment/paymentUtils";
import { dateTime, formatBytes } from "../documents/docUtils";
import { TEXT_METHOD_LABEL, TEXT_STATUS_LABEL, useObjectUrl } from "./gedUtils";

type ViewTab = "preview" | "text";

const isImage = (i: GedItem) => (i.mimeType ?? "").startsWith("image/");

/**
 * Aperçu d'un fichier de la GED : le fichier est lu avec le jeton puis affiché depuis un blob: ;
 * les adresses previewUrl / downloadUrl ne s'ouvrent pas directement (elles demandent l'en-tête Authorization).
 */
export const GedFileViewer: React.FC<{ item: GedItem; canWrite: boolean; canDownload: boolean; onClose: () => void }> = ({ item, canWrite, canDownload, onClose }) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ViewTab>("preview");

  const blobQuery = useQuery({
    queryKey: ["ged-preview", item.code, item.version],
    queryFn: () => documentService.previewDocument(item.code),
    retry: false,
  });
  const url = useObjectUrl(blobQuery.data);

  const textQuery = useQuery({
    queryKey: ["ged-text", item.code],
    queryFn: () => gedService.fileText(item.code),
    enabled: tab === "text",
  });
  const refresh = useMutation({
    mutationFn: () => gedService.refreshText(item.code),
    onSuccess: (data) => {
      queryClient.setQueryData(["ged-text", item.code], data);
      toast.success("Texte relu");
    },
    onError: (e) => toast.error(apiMessage(e, "Lecture impossible")),
  });
  const download = useMutation({
    mutationFn: async () => saveBlob(await documentService.downloadDocument(item.code), item.fileName || item.name),
    onError: (e) => toast.error(apiMessage(e, "Téléchargement impossible")),
  });

  const text = textQuery.data;
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(text?.content ?? "");
      toast.success("Texte copié");
    } catch {
      toast.error("Copie impossible sur ce navigateur");
    }
  };

  return (
    <ModalPortal onClose={onClose} size="5xl">
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-gray-950">{item.name}</h3>
            <p className="text-xs text-gray-500">
              <span className="font-mono">{item.code}</span>
              {item.size !== undefined && ` · ${formatBytes(item.size)}`}
              {item.version !== undefined && ` · version ${item.version}`}
              {item.updatedAt && ` · ${dateTime(item.updatedAt)}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canDownload && (
              <ActionButton variant="ghost" icon={Download} pending={download.isPending} onClick={() => download.mutate()}>
                Télécharger
              </ActionButton>
            )}
            <button type="button" aria-label="Fermer" onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <Tabs
            variant="soft"
            items={[
              { id: "preview", label: "Aperçu" },
              { id: "text", label: "Texte" },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>

        {tab === "preview" && (
          <div className="overflow-hidden rounded-2xl bg-gray-50">
            {blobQuery.isLoading ? (
              <p className="p-10 text-center text-sm text-gray-500">Chargement de l'aperçu…</p>
            ) : blobQuery.isError || !url ? (
              <div className="p-4">
                <ErrorBlock message="L'aperçu n'est pas disponible pour ce fichier. Vous pouvez le télécharger." onRetry={() => blobQuery.refetch()} />
              </div>
            ) : isImage(item) ? (
              <img src={url} alt={item.name} className="mx-auto max-h-[70vh] object-contain" />
            ) : (
              <iframe title={item.name} src={url} className="h-[70vh] w-full border-0 bg-white" />
            )}
          </div>
        )}

        {tab === "text" && (
          <div className="space-y-3">
            {textQuery.isLoading ? (
              <p className="p-6 text-center text-sm text-gray-500">Chargement du texte…</p>
            ) : textQuery.isError || !text ? (
              <ErrorBlock message="Le texte du fichier n'a pas pu être chargé." onRetry={() => textQuery.refetch()} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <StatusChip tone={text.status === "DONE" ? "success" : text.status === "FAILED" ? "danger" : text.status === "PENDING" ? "warn" : "neutral"}>{TEXT_STATUS_LABEL[String(text.status)] ?? String(text.status ?? "")}</StatusChip>
                  {text.method && <span>{TEXT_METHOD_LABEL[text.method] ?? text.method}</span>}
                  {text.pageCount !== undefined && <span>· {text.pageCount} page{text.pageCount > 1 ? "s" : ""}</span>}
                  {text.ocrPages ? <span>· {text.ocrPages} lue{text.ocrPages > 1 ? "s" : ""} par OCR</span> : null}
                  {text.extractedAt && <span>· lu le {dateTime(text.extractedAt)}</span>}
                  {text.upToDate === false && <span className="font-semibold text-amber-600">· une nouvelle version attend sa lecture</span>}
                </div>
                {text.truncated && <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">Le texte est coupé à 300 000 caractères.</p>}
                {text.error && <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-700">{text.error}</p>}
                {text.content ? (
                  <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-800">{text.content}</pre>
                ) : (
                  <p className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">Aucun texte lu pour ce fichier.</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {text.content ? (
                    <ActionButton variant="ghost" icon={Copy} onClick={copyText}>
                      Copier le texte
                    </ActionButton>
                  ) : null}
                  {canWrite && (
                    <ActionButton variant="ghost" icon={RefreshCw} pending={refresh.isPending} onClick={() => refresh.mutate()}>
                      Relire
                    </ActionButton>
                  )}
                </div>
                {refresh.isPending && <p className="text-xs text-gray-500">La lecture par OCR prend 2 à 3 secondes par page.</p>}
              </>
            )}
          </div>
        )}
      </div>
    </ModalPortal>
  );
};
