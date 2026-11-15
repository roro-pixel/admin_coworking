import { useCallback, useEffect, useRef } from "react";

/**
 * Brouillon local d'un formulaire : survit à un changement de page, un rechargement ou une fermeture d'onglet.
 * Stocké dans le navigateur de l'utilisateur uniquement (aucun appel API), expire après 7 jours.
 */
const TTL = 7 * 24 * 3600 * 1000;

export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: T };
    if (Date.now() - at > TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function useFormDraft<T>(key: string, snapshot: T, shouldSave: boolean) {
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const blocked = useRef(false);

  useEffect(() => {
    if (blocked.current) return;
    const t = setTimeout(() => {
      try {
        if (shouldSave) localStorage.setItem(key, JSON.stringify({ at: Date.now(), data: latest.current }));
        else localStorage.removeItem(key);
      } catch {
        /* stockage plein ou indisponible : on ignore */
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, shouldSave, JSON.stringify(snapshot)]);

  /** Supprime le brouillon et empêche toute réécriture (après création ou annulation) */
  const clearDraft = useCallback(() => {
    blocked.current = true;
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  return { clearDraft };
}
