import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { kycService } from "../../services/document.service";
import { apiClient } from "../../services/api";
import { memberService } from "../../services/member.service";
import { customerService } from "../../services/customer.service";
import { Field, PanelForm, SearchField } from "../../components/subscription/kit";
import { apiMessage } from "../../components/subscription/kitUtils";
import { toast } from "../../components/ui/toastStore";
import { OWNER_LABEL, KYC_OWNER_TYPES, useDebounced } from "../../components/documents/docUtils";

interface OwnerHit {
  code: string;
  name: string;
  email?: string;
  phone?: string;
}

const searchOwners = async (ownerType: string, q: string): Promise<OwnerHit[]> => {
  if (ownerType === "MEMBER") {
    const rows = await memberService.searchMembers(q);
    return (rows ?? []).map((m) => ({ code: String(m.memberId), name: m.fullName, email: m.email, phone: m.phone }));
  }
  if (ownerType === "CUSTOMER") {
    const rows = await customerService.searchCustomers(q);
    return (rows ?? []).map((c) => ({ code: String(c.customerId), name: c.displayName, email: c.email, phone: c.phone }));
  }
  const raw = (await apiClient.get("/sni/api/v1/businesses/search/basic", { params: { query: q } })).data;
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.content) ? raw.content : Array.isArray(raw?.data) ? raw.data : [];
  return list.map((b: Record<string, string>) => ({
    code: String(b.code || b.businessCode || b.businessEntityCode || b.id || ""),
    name: b.name || b.businessName || b.displayName || b.code || "Entreprise",
    email: b.email,
    phone: b.phone,
  }));
};

export const CreateKycCasePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [ownerType, setOwnerType] = useState("MEMBER");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<OwnerHit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebounced(query, 400);

  const { data: hits = [], isFetching } = useQuery({
    queryKey: ["kyc-owner-search", ownerType, debounced],
    queryFn: () => searchOwners(ownerType, debounced),
    enabled: !selected && debounced.trim().length >= 2,
  });

  const create = useMutation({
    mutationFn: () => kycService.createKycCase(ownerType, selected!.code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kycCases"] });
      queryClient.invalidateQueries({ queryKey: ["kyc-dashboard"] });
      toast.success("Dossier KYC créé");
      onClose();
    },
    onError: (e) => setError(apiMessage(e, "Création du dossier impossible")),
  });

  return (
    <PanelForm
      title="Nouveau dossier KYC"
      onCancel={onClose}
      pending={create.isPending}
      submitLabel="Créer le dossier"
      submitDisabled={!selected}
      error={error}
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) return setError("Choisissez un propriétaire dans la liste.");
        create.mutate();
      }}
    >
      <Field label="Type de propriétaire" required>
        <div className="flex flex-wrap gap-2">
          {KYC_OWNER_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setOwnerType(t);
                setSelected(null);
                setQuery("");
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                ownerType === t ? "bg-[color:var(--logo-pink-dark)] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {OWNER_LABEL[t] ?? t}
            </button>
          ))}
        </div>
      </Field>
      <Field label={`Rechercher un ${(OWNER_LABEL[ownerType] ?? ownerType).toLowerCase()}`} required hint="Nom, e-mail, téléphone ou code, deux caractères minimum.">
        <SearchField
          value={query}
          onChange={(v) => {
            setQuery(v);
            setSelected(null);
          }}
          placeholder="Rechercher"
        />
      </Field>
      {!selected && debounced.trim().length >= 2 && (
        <div className="space-y-2">
          {isFetching ? (
            <p className="text-sm text-gray-400">Recherche en cours</p>
          ) : hits.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun résultat.</p>
          ) : (
            hits.slice(0, 8).map((h) => (
              <button
                key={h.code}
                type="button"
                onClick={() => {
                  setSelected(h);
                  setQuery(h.name);
                }}
                className="block w-full rounded-2xl bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100"
              >
                <p className="text-sm font-semibold text-gray-900">{h.name}</p>
                <p className="text-xs text-gray-400">{[h.email, h.phone, `Code ${h.code}`].filter(Boolean).join(" · ")}</p>
              </button>
            ))
          )}
        </div>
      )}
      {selected && (
        <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Propriétaire retenu : <span className="font-semibold text-gray-900">{selected.name}</span> <span className="font-mono text-xs text-gray-400">{selected.code}</span>
        </p>
      )}
    </PanelForm>
  );
};
