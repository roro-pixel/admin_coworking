import { useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";

/** Identifiant numérique de l'administrateur connecté (1 si l'identifiant n'est pas numérique : jamais NaN envoyé à l'API). */
export const useActorId = (): number => {
  const { admin } = useAuth();
  const n = Number(admin?.id);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/** Date au format AAAA-MM-JJ (le backend renvoie parfois une heure, qu'il refuse en entrée). */
export const dateOnly = (v?: string | null): string => (v ? v.split("T")[0] : "");

/** Clé d'idempotence d'une création : stable tant que le formulaire est ouvert, renouvelée après un succès. */
export const useIdempotencyKey = () => {
  const key = useRef<string>(newKey());
  return {
    get: () => key.current,
    renew: () => {
      key.current = newKey();
    },
  };
};

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
