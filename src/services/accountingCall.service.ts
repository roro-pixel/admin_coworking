import { apiClient } from "./api";
import { API } from "./pagination";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export interface CallSpec {
  method: HttpMethod;
  path: string; // relatif à /sni/api/v1 (ex. "/accounting/deferrals")
  query?: Record<string, unknown>;
  body?: unknown;
  file?: File | null; // multipart : champ "file"
  blob?: boolean;
}

const strip = (o?: Record<string, unknown>) => (o ? Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) : undefined);

/** Appel générique d'une route comptable (utilisé par les consoles de routes des lots 46 à 48). */
export const accountingCall = async (c: CallSpec): Promise<unknown> => {
  const url = `${API}${c.path}`;
  const params = strip(c.query);
  if (c.file) {
    const fd = new FormData();
    fd.append("file", c.file);
    return (await apiClient.post(url, fd, { params, headers: { "Content-Type": "multipart/form-data" } })).data;
  }
  const cfg = { params, ...(c.blob ? { responseType: "blob" as const } : {}) };
  switch (c.method) {
    case "GET": return (await apiClient.get(url, cfg)).data;
    case "POST": return (await apiClient.post(url, c.body ?? null, cfg)).data;
    case "PATCH": return (await apiClient.patch(url, c.body ?? null, cfg)).data;
    case "PUT": return (await apiClient.put(url, c.body ?? null, cfg)).data;
    default: return (await apiClient.delete(url, { ...cfg, ...(c.body ? { data: c.body } : {}) })).data;
  }
};
