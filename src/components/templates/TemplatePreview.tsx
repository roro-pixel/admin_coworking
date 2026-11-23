import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { documentTemplateService } from "../../services/documentTemplate.service";
import type { TemplateCatalog, TemplateContent, TemplateFamily } from "../../services/documentTemplate.service";
import { ActionButton, ErrorBanner, Field } from "../subscription/kit";
import { FIELD, apiMessage } from "../subscription/kitUtils";
import { toast } from "../ui/toastStore";

/** Aperçu du contenu en cours d'édition (même non enregistré). */
export const TemplatePreview: React.FC<{
  code: string;
  family: TemplateFamily;
  content: TemplateContent;
  catalog: TemplateCatalog | undefined;
}> = ({ code, family, content, catalog }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [number, setNumber] = useState("");
  const [sending, setSending] = useState(false);
  const contentRef = useRef(content);
  contentRef.current = content;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (family === "PDF") {
        const blob = await documentTemplateService.previewPdf(code, contentRef.current, number);
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      } else {
        setHtml(await documentTemplateService.previewEmail(code, contentRef.current));
      }
    } catch (e) {
      setError(apiMessage(e, "Aperçu impossible."));
    } finally {
      setLoading(false);
    }
  }, [code, family, number]);

  useEffect(() => {
    load();
    // un seul rendu à l'ouverture : la suite se fait à la demande
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const testSend = async () => {
    setSending(true);
    try {
      const r = await documentTemplateService.testSend(code);
      toast.success(`Courriel d'essai envoyé à ${r.sentTo}`);
    } catch (e) {
      toast.error(apiMessage(e, "Envoi d'essai impossible."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {family === "PDF" && catalog?.realPreview && (
          <Field label="Numéro d'une vraie pièce" hint={catalog.previewNumberHint ?? "Laisser vide pour des données d'exemple"} className="min-w-[14rem]">
            <input className={FIELD} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Numéro" />
          </Field>
        )}
        <ActionButton variant="ghost" icon={RefreshCw} pending={loading} onClick={load}>
          Actualiser l'aperçu
        </ActionButton>
        {family === "EMAIL" && (
          <ActionButton variant="ghost" icon={Send} pending={sending} onClick={testSend}>
            M'envoyer un essai
          </ActionButton>
        )}
      </div>
      {family === "EMAIL" && <p className="text-xs text-gray-500">L'essai envoie le modèle tel qu'il est enregistré (enregistrez d'abord le brouillon), objet préfixé « [Essai] », à l'adresse de votre compte.</p>}
      <ErrorBanner message={error} />
      <div className="overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm">
        {family === "PDF" ? (
          url ? (
            <iframe title="Aperçu PDF" src={url} className="h-[75vh] w-full" />
          ) : (
            <p className="p-10 text-center text-sm text-gray-400">{loading ? "Génération de l'aperçu…" : "Aucun aperçu."}</p>
          )
        ) : html !== null ? (
          <iframe title="Aperçu du courriel" sandbox="" srcDoc={html} className="h-[75vh] w-full bg-white" />
        ) : (
          <p className="p-10 text-center text-sm text-gray-400">{loading ? "Génération de l'aperçu…" : "Aucun aperçu."}</p>
        )}
      </div>
    </div>
  );
};
