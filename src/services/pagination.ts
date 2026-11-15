/**
 * Normalisation partagée des réponses du backend.
 *
 * Réponse paginée documentée :
 *   { data: [...], pageable: { page, size, totalPages, totalElements, ... } }
 * On accepte aussi { content: [...] } (Spring brut) et un tableau nu.
 */

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export function toPage<T>(raw: any, fallbackSize = 20): PageResult<T> {
  if (Array.isArray(raw?.data)) {
    const p = raw.pageable ?? {};
    return {
      content: raw.data,
      totalElements: p.totalElements ?? raw.data.length,
      totalPages: p.totalPages ?? Math.max(1, Math.ceil((p.totalElements ?? raw.data.length) / (p.size || fallbackSize))),
      page: p.page ?? 0,
      size: p.size ?? fallbackSize,
    };
  }
  if (Array.isArray(raw?.content)) {
    return {
      content: raw.content,
      totalElements: raw.totalElements ?? raw.content.length,
      totalPages: raw.totalPages ?? Math.max(1, Math.ceil((raw.totalElements ?? raw.content.length) / (raw.size || fallbackSize))),
      page: raw.number ?? raw.page ?? 0,
      size: raw.size ?? fallbackSize,
    };
  }
  if (Array.isArray(raw)) {
    return {
      content: raw,
      totalElements: raw.length,
      totalPages: 1,
      page: 0,
      size: raw.length,
    };
  }
  return { content: [], totalElements: 0, totalPages: 0, page: 0, size: 0 };
}

/** Liste non paginée : { data: [...] } | { content: [...] } | T[] */
export function toList<T>(raw: any): T[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.content)) return raw.content;
  return [];
}

export interface PageParams {
  page?: number;
  size?: number;
}

/** Préfixe commun de l'API. */
export const API = "/sni/api/v1";
