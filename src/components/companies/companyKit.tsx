import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionButton, Field, IconButton } from "../subscription/kit";
import { FIELD } from "../subscription/kitUtils";
import type {
  CompanyAddress,
  CompanyIdentifier,
  CompanyIdentifierInput,
  CompanyIdentifierType,
  CompanyResponse,
  OrganizationType,
  UpdateCompanyBillingRequest,
  UpdateCompanyContactRequest,
  UpdateCompanyLegalRequest,
  VatRegime,
} from "../../services/company.service";
import { IDENTIFIER_HINT, IDENTIFIER_LABEL, IDENTIFIER_TYPES, LEGAL_FORMS, ORG_TYPES, ORG_TYPE_LABEL, VAT_LABEL } from "./companyLabels";

export function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const clean = (s: string): string | undefined => {
  const t = s.trim();
  return t === "" ? undefined : t;
};

const toNumber = (s: string): number | undefined => {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

// Identifiants

export interface IdentifierRow {
  type: CompanyIdentifierType;
  value: string;
  label: string;
}

export const identifierRows = (list?: CompanyIdentifier[] | null): IdentifierRow[] =>
  (list ?? []).map((i) => ({ type: i.type, value: i.value, label: i.type === "AUTRE" ? i.label ?? "" : "" }));

/** Lignes vides écartées */
export const identifierPayload = (rows: IdentifierRow[]): CompanyIdentifierInput[] =>
  rows
    .filter((r) => r.value.trim() !== "")
    .map((r) => ({ type: r.type, value: r.value.trim(), ...(r.type === "AUTRE" ? { label: r.label.trim() } : {}) }));

export const IdentifiersEditor: React.FC<{
  rows: IdentifierRow[];
  onChange: (rows: IdentifierRow[]) => void;
  suggested?: string[];
}> = ({ rows, onChange, suggested = [] }) => {
  const set = (i: number, patch: Partial<IdentifierRow>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const missing = suggested.filter((t) => !rows.some((r) => r.type === t)) as CompanyIdentifierType[];
  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="text-sm text-gray-500">Aucun identifiant : aucun n'est obligatoire, seuls ceux saisis sont imprimés sur la facture.</p>}
      {rows.map((r, i) => (
        <div key={i} className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
            <Field label="Type">
              <select value={r.type} onChange={(e) => set(i, { type: e.target.value as CompanyIdentifierType })} className={FIELD}>
                {IDENTIFIER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {IDENTIFIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Valeur" hint={IDENTIFIER_HINT[r.type]}>
              <input value={r.value} onChange={(e) => set(i, { value: e.target.value })} className={`${FIELD} font-mono`} />
            </Field>
            <div className="flex justify-end">
              <IconButton icon={Trash2} label="Retirer cet identifiant" tone="danger" onClick={() => onChange(rows.filter((_, k) => k !== i))} />
            </div>
          </div>
          {r.type === "AUTRE" && (
            <Field label="Libellé imprimé" required className="mt-3">
              <input value={r.label} onChange={(e) => set(i, { label: e.target.value })} className={FIELD} />
            </Field>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {missing.map((t) => (
          <ActionButton key={t} variant="ghost" icon={Plus} onClick={() => onChange([...rows, { type: t, value: "", label: "" }])}>
            {IDENTIFIER_LABEL[t]}
          </ActionButton>
        ))}
        <ActionButton variant="ghost" icon={Plus} onClick={() => onChange([...rows, { type: "AUTRE", value: "", label: "" }])}>
          Autre identifiant
        </ActionButton>
      </div>
    </div>
  );
};

// Adresse

export interface AddressDraft {
  streetNumber: string;
  streetName: string;
  city: string;
  countryCode: string;
}

export const addressDraft = (a?: CompanyAddress | null): AddressDraft => ({
  streetNumber: a?.streetNumber ?? "",
  streetName: a?.streetName ?? "",
  city: a?.city ?? "",
  countryCode: a?.countryCode ?? "",
});

export const addressPayload = (d: AddressDraft): CompanyAddress | undefined => {
  const out: CompanyAddress = {
    streetNumber: clean(d.streetNumber),
    streetName: clean(d.streetName),
    city: clean(d.city),
    countryCode: clean(d.countryCode)?.toUpperCase(),
  };
  return Object.values(out).some(Boolean) ? out : undefined;
};

export const AddressFields: React.FC<{ value: AddressDraft; onChange: (v: AddressDraft) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<AddressDraft>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Field label="Numéro" className="sm:col-span-1">
        <input value={value.streetNumber} onChange={(e) => set({ streetNumber: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Rue" className="sm:col-span-5">
        <input value={value.streetName} onChange={(e) => set({ streetName: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Ville" className="sm:col-span-4">
        <input value={value.city} onChange={(e) => set({ city: e.target.value })} className={FIELD} />
      </Field>
      <Field label="Pays" hint="Code à deux lettres" className="sm:col-span-2">
        <input value={value.countryCode} maxLength={2} onChange={(e) => set({ countryCode: e.target.value })} className={`${FIELD} uppercase`} placeholder="CG" />
      </Field>
    </div>
  );
};

// Identité légale

export interface LegalDraft {
  organizationType: OrganizationType;
  name: string;
  legalForm: string;
  activity: string;
  legalRepresentativeName: string;
  legalRepresentativeTitle: string;
  vatRegime: VatRegime;
  vatExemptionNote: string;
  identifiers: IdentifierRow[];
}

export const emptyLegalDraft = (): LegalDraft => ({
  organizationType: "SOCIETE",
  name: "",
  legalForm: "",
  activity: "",
  legalRepresentativeName: "",
  legalRepresentativeTitle: "",
  vatRegime: "SUBJECT",
  vatExemptionNote: "",
  identifiers: [],
});

export const legalDraftOf = (c: CompanyResponse): LegalDraft => ({
  organizationType: (ORG_TYPES.includes(c.organizationType as OrganizationType) ? c.organizationType : "SOCIETE") as OrganizationType,
  name: c.name ?? "",
  legalForm: c.legalForm ?? "",
  activity: c.activity ?? "",
  legalRepresentativeName: c.legalRepresentativeName ?? "",
  legalRepresentativeTitle: c.legalRepresentativeTitle ?? "",
  vatRegime: (c.vatRegime === "EXEMPT" ? "EXEMPT" : "SUBJECT") as VatRegime,
  vatExemptionNote: c.vatExemptionNote ?? "",
  identifiers: identifierRows(c.identifiers),
});

export const legalPayload = (d: LegalDraft): UpdateCompanyLegalRequest => ({
  organizationType: d.organizationType,
  name: d.name.trim(),
  legalForm: clean(d.legalForm),
  activity: clean(d.activity),
  legalRepresentativeName: clean(d.legalRepresentativeName),
  legalRepresentativeTitle: clean(d.legalRepresentativeTitle),
  vatRegime: d.vatRegime,
  vatExemptionNote: d.vatRegime === "EXEMPT" ? clean(d.vatExemptionNote) : undefined,
  identifiers: identifierPayload(d.identifiers),
});

export const legalInvalid = (d: LegalDraft): boolean =>
  d.name.trim() === "" ||
  (d.vatRegime === "EXEMPT" && d.vatExemptionNote.trim() === "") ||
  d.identifiers.some((r) => r.type === "AUTRE" && r.value.trim() !== "" && r.label.trim() === "");

export const LegalFields: React.FC<{
  value: LegalDraft;
  onChange: (v: LegalDraft) => void;
  suggested?: string[];
}> = ({ value, onChange, suggested }) => {
  const set = (patch: Partial<LegalDraft>) => onChange({ ...value, ...patch });
  const society = value.organizationType === "SOCIETE";
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type d'organisation" required>
          <select value={value.organizationType} onChange={(e) => set({ organizationType: e.target.value as OrganizationType })} className={FIELD}>
            {ORG_TYPES.map((t) => (
              <option key={t} value={t}>
                {ORG_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dénomination" required>
          <input value={value.name} onChange={(e) => set({ name: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Forme juridique" hint={society ? "SARL, SA, SAS..." : "Libre ou vide pour ce type"}>
          {society ? (
            <select value={value.legalForm} onChange={(e) => set({ legalForm: e.target.value })} className={FIELD}>
              <option value="">Choisir</option>
              {LEGAL_FORMS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          ) : (
            <input value={value.legalForm} onChange={(e) => set({ legalForm: e.target.value })} className={FIELD} />
          )}
        </Field>
        <Field label="Activité">
          <input value={value.activity} onChange={(e) => set({ activity: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Représentant légal">
          <input value={value.legalRepresentativeName} onChange={(e) => set({ legalRepresentativeName: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Qualité du représentant" hint="Gérant, directeur...">
          <input value={value.legalRepresentativeTitle} onChange={(e) => set({ legalRepresentativeTitle: e.target.value })} className={FIELD} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Régime de TVA">
          <select value={value.vatRegime} onChange={(e) => set({ vatRegime: e.target.value as VatRegime })} className={FIELD}>
            {(["SUBJECT", "EXEMPT"] as VatRegime[]).map((v) => (
              <option key={v} value={v}>
                {VAT_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
        {value.vatRegime === "EXEMPT" && (
          <Field label="Mention d'exonération" required hint="Texte ou décision, imprimée sur la facture">
            <input value={value.vatExemptionNote} onChange={(e) => set({ vatExemptionNote: e.target.value })} className={FIELD} />
          </Field>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">Identifiants</p>
        <IdentifiersEditor rows={value.identifiers} onChange={(identifiers) => set({ identifiers })} suggested={suggested} />
      </div>
    </div>
  );
};

// Facturation et contact 

export interface BillingDraft {
  billingEmail: string;
  paymentTermsDays: string;
  creditLimit: string;
  removeCreditLimit: boolean;
  currencyCode: string;
  billingAddress: AddressDraft;
}

export const billingDraftOf = (c?: CompanyResponse): BillingDraft => ({
  billingEmail: c?.billingEmail ?? "",
  paymentTermsDays: c?.paymentTermsDays != null ? String(c.paymentTermsDays) : "",
  creditLimit: c?.creditLimit != null ? String(c.creditLimit) : "",
  removeCreditLimit: false,
  currencyCode: c?.currencyCode ?? "XAF",
  billingAddress: addressDraft(c?.billingAddress),
});

export const billingPayload = (d: BillingDraft): UpdateCompanyBillingRequest => ({
  billingEmail: clean(d.billingEmail),
  paymentTermsDays: toNumber(d.paymentTermsDays),
  creditLimit: d.removeCreditLimit ? undefined : toNumber(d.creditLimit),
  removeCreditLimit: d.removeCreditLimit || undefined,
  currencyCode: clean(d.currencyCode)?.toUpperCase(),
  billingAddress: addressPayload(d.billingAddress),
});

export const BillingFields: React.FC<{ value: BillingDraft; onChange: (v: BillingDraft) => void; hasLimit: boolean }> = ({ value, onChange, hasLimit }) => {
  const set = (patch: Partial<BillingDraft>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-mail de facturation" hint="Destinataire des factures et des relances">
          <input type="email" value={value.billingEmail} onChange={(e) => set({ billingEmail: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Délai de paiement (jours)" hint="Échéance = date d'émission + délai">
          <input inputMode="numeric" value={value.paymentTermsDays} onChange={(e) => set({ paymentTermsDays: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Plafond d'encours" hint="Une facture est refusée si l'encours le dépasserait">
          <input inputMode="decimal" value={value.removeCreditLimit ? "" : value.creditLimit} disabled={value.removeCreditLimit} onChange={(e) => set({ creditLimit: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Devise">
          <input value={value.currencyCode} maxLength={3} onChange={(e) => set({ currencyCode: e.target.value })} className={`${FIELD} uppercase`} />
        </Field>
      </div>
      {hasLimit && (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm">
          <input type="checkbox" checked={value.removeCreditLimit} onChange={(e) => set({ removeCreditLimit: e.target.checked })} className="h-4 w-4 rounded accent-[color:var(--logo-pink-dark)]" />
          Retirer le plafond d'encours
        </label>
      )}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">Adresse de facturation</p>
        <p className="mb-3 text-xs text-gray-400">Vide : l'adresse du siège sert de destinataire.</p>
        <AddressFields value={value.billingAddress} onChange={(billingAddress) => set({ billingAddress })} />
      </div>
    </div>
  );
};

export interface ContactDraft {
  email: string;
  phone: string;
  website: string;
  address: AddressDraft;
}

export const contactDraftOf = (c?: CompanyResponse): ContactDraft => ({
  email: c?.email ?? "",
  phone: c?.phone ?? "",
  website: c?.website ?? "",
  address: addressDraft(c?.address),
});

export const contactPayload = (d: ContactDraft): UpdateCompanyContactRequest => ({
  email: clean(d.email),
  phone: clean(d.phone),
  website: clean(d.website),
  address: addressPayload(d.address),
});

export const ContactFields: React.FC<{ value: ContactDraft; onChange: (v: ContactDraft) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<ContactDraft>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-mail">
          <input type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} className={FIELD} />
        </Field>
        <Field label="Téléphone">
          <input value={value.phone} onChange={(e) => set({ phone: e.target.value })} className={FIELD} placeholder="+242..." />
        </Field>
        <Field label="Site web" className="sm:col-span-2">
          <input value={value.website} onChange={(e) => set({ website: e.target.value })} className={FIELD} placeholder="https://" />
        </Field>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">Adresse du siège</p>
        <AddressFields value={value.address} onChange={(address) => set({ address })} />
      </div>
    </div>
  );
};

export const addressLine = (a?: CompanyAddress | null): string =>
  a ? [[a.streetNumber, a.streetName].filter(Boolean).join(" "), a.city, a.countryCode].filter(Boolean).join(", ") : "";
