import type { Endpoint, EpField } from "../../../components/accounting/EndpointConsole";
import type { HttpMethod } from "../../../services/accountingCall.service";

export const A = "/accounting";
export const t = (key: string, label: string, o: Partial<EpField> = {}): EpField => ({ key, label, type: "text", ...o });
export const n = (key: string, label: string, o: Partial<EpField> = {}): EpField => ({ key, label, type: "number", ...o });
export const d = (key: string, label: string, o: Partial<EpField> = {}): EpField => ({ key, label, type: "date", ...o });
export const b = (key: string, label: string, o: Partial<EpField> = {}): EpField => ({ key, label, type: "bool", ...o });
export const l = (key: string, label: string, o: Partial<EpField> = {}): EpField => ({ key, label, type: "list", hint: "Séparés par des virgules", ...o });
export const j = (key: string, label: string, o: Partial<EpField> = {}): EpField => ({ key, label, type: "json", ...o });
export const q = (f: EpField): EpField => ({ ...f, in: "query" });
export const req = (f: EpField): EpField => ({ ...f, required: true });

export const ep = (method: HttpMethod, path: string, label: string, group: string, perm?: string, fields?: EpField[], extra: Partial<Endpoint> = {}): Endpoint => ({
  id: `${method} ${path}`, method, path, label, group, perm, fields, ...extra,
});
