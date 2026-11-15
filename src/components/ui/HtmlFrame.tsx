import React, { useCallback, useRef, useState } from "react";

/**
 * Affiche du HTML renvoyé par le serveur (aperçu, document à signer) dans un iframe isolé.
 * Remplace dangerouslySetInnerHTML : le contenu ne peut ni lire la page ni exécuter de script.
 * `trusted` reprend les droits de l'aperçu d'origine (scripts, popups, formulaires).
 * `autoHeight` ajuste la hauteur au contenu ; sinon `height` (CSS) s'applique.
 */
export const HtmlFrame: React.FC<{
  html: string;
  title: string;
  trusted?: boolean;
  autoHeight?: boolean;
  height?: string;
  className?: string;
}> = ({ html, title, trusted = false, autoHeight = false, height = "70vh", className = "" }) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [h, setH] = useState<number | null>(null);

  const fit = useCallback(() => {
    if (!autoHeight) return;
    const doc = ref.current?.contentDocument;
    if (doc?.documentElement) setH(doc.documentElement.scrollHeight);
  }, [autoHeight]);

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      onLoad={fit}
      sandbox={
        trusted ? "allow-same-origin allow-scripts allow-popups allow-forms" : "allow-same-origin"
      }
      style={{ height: autoHeight && h ? h : height }}
      className={`block w-full rounded-2xl bg-white ${className}`}
    />
  );
};
