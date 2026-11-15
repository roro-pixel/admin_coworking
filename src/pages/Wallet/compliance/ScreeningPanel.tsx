import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ListPlus, ScanSearch, Upload } from "lucide-react";
import { walletControlService } from "../../../services/walletControl.service";
import type { CheckView, ScreeningListEntryInput, ScreeningListType } from "../../../services/walletControl.service";
import { ActionButton, CheckField, EmptyState, ErrorBlock, Field, ItemRow, ListHeader, Pagination, PanelForm, StatusChip } from "../../../components/subscription/kit";
import { FIELD, FIELD_SOFT, apiMessage } from "../../../components/subscription/kitUtils";
import { ListSkeleton } from "../../../components/ui/Skeleton";
import { toast } from "../../../components/ui/toastStore";
import { SCREENING_RESULT, SUBJECT_TYPE_OPTIONS } from "../../../components/wallet/walletLabels";
import { OpenFields } from "../../../components/wallet/control/OpenFields";
import { extraEntries } from "../../../components/wallet/control/controlUtils";
import { OpenReport } from "../../../components/subscription/promotions/OpenReport";

const PAGE_SIZE = 10;
type Panel = null | "check" | "list";

/** Une ligne « Nom; alias1|alias2; année; nationalité; référence » par personne de la liste. */
const parseEntries = (text: string): { ok: ScreeningListEntryInput[]; bad: string[] } => {
  const ok: ScreeningListEntryInput[] = [];
  const bad: string[] = [];
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [fullName, aliases, year, nationality, reference] = line.split(";").map((p) => p.trim());
      const birthYear = year ? Number(year) : null;
      if (!fullName || (year && !Number.isInteger(birthYear))) return bad.push(line);
      ok.push({
        fullName,
        aliases: aliases ? aliases.split("|").map((a) => a.trim()).filter(Boolean) : undefined,
        birthYear,
        nationality: nationality || null,
        reference: reference || null,
      });
    });
  return { ok, bad };
};

const KNOWN = ["checkNumber", "subjectType", "subjectCode", "result"];

/** Filtrage sur listes de sanctions et de personnes exposées : revue des correspondances, contrôle et chargement de liste. */
export const ScreeningPanel: React.FC = () => {
  const qc = useQueryClient();
  const [scope, setScope] = useState<"pending" | "all">("pending");
  const [page, setPage] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [trueMatch, setTrueMatch] = useState(true);
  const [rationale, setRationale] = useState("");

  const [subjectType, setSubjectType] = useState("CUSTOMER");
  const [subjectCode, setSubjectCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [checkResult, setCheckResult] = useState<CheckView | null>(null);

  const [listCode, setListCode] = useState("");
  const [listVersion, setListVersion] = useState("");
  const [listType, setListType] = useState<ScreeningListType>("SANCTION");
  const [entriesText, setEntriesText] = useState("");
  const [uploadResult, setUploadResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["wallet-screening", scope, page],
    queryFn: () => walletControlService.getScreeningChecks({ scope, page, size: PAGE_SIZE }),
  });
  const rows = data?.content ?? [];
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["wallet-screening"] });
    qc.invalidateQueries({ queryKey: ["wallet-compliance-dashboard"] });
  };

  const checkMutation = useMutation({
    mutationFn: () =>
      walletControlService.runScreeningCheck({ subjectType, subjectCode: subjectCode.trim(), fullName: fullName.trim(), birthYear: birthYear ? Number(birthYear) : null }),
    onSuccess: (r) => {
      setCheckResult(r);
      setPanel(null);
      setError(null);
      refresh();
    },
    onError: (e) => setError(apiMessage(e, "Contrôle impossible.")),
  });

  const parsed = parseEntries(entriesText);
  const uploadMutation = useMutation({
    mutationFn: () => walletControlService.uploadScreeningList({ listCode: listCode.trim(), listVersion: listVersion.trim(), type: listType, entries: parsed.ok }),
    onSuccess: (r) => {
      toast.success("Liste chargée");
      setUploadResult(r && typeof r === "object" ? (r as Record<string, unknown>) : null);
      setEntriesText("");
      setPanel(null);
      setError(null);
    },
    onError: (e) => setError(apiMessage(e, "Chargement impossible.")),
  });

  const reviewMutation = useMutation({
    mutationFn: (checkNumber: string) => walletControlService.reviewScreeningCheck(checkNumber, { trueMatch, rationale: rationale.trim() }),
    onSuccess: () => {
      toast.success(trueMatch ? "Correspondance confirmée" : "Fausse correspondance enregistrée");
      setReviewing(null);
      setRationale("");
      refresh();
    },
    onError: (e) => toast.error(apiMessage(e, "Revue impossible.")),
  });

  return (
    <div className="space-y-5">
      <ListHeader
        title="Filtrage"
        subtitle="Contrôles sur les listes de sanctions et de personnes exposées"
        action={
          panel === null && (
            <div className="flex flex-wrap gap-2">
              <ActionButton variant="ghost" icon={Upload} onClick={() => setPanel("list")}>
                Charger une liste
              </ActionButton>
              <ActionButton icon={ScanSearch} onClick={() => setPanel("check")}>
                Contrôler une personne
              </ActionButton>
            </div>
          )
        }
      />

      {checkResult && <OpenReport title="Résultat du contrôle" data={checkResult} onClose={() => setCheckResult(null)} />}
      {uploadResult && <OpenReport title="Liste chargée" data={uploadResult} onClose={() => setUploadResult(null)} />}

      {panel === "check" && (
        <PanelForm title="Contrôler une personne" pending={checkMutation.isPending} submitLabel="Lancer le contrôle" submitDisabled={!subjectCode.trim() || !fullName.trim()} error={error} onCancel={() => setPanel(null)} onSubmit={(e) => { e.preventDefault(); setError(null); checkMutation.mutate(); }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Type" required>
              <select className={FIELD_SOFT} value={subjectType} onChange={(e) => setSubjectType(e.target.value)}>
                {SUBJECT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Code" required>
              <input className={`${FIELD_SOFT} font-mono`} value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="CUS-000001" />
            </Field>
            <Field label="Nom complet" required>
              <input className={FIELD_SOFT} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="Année de naissance">
              <input inputMode="numeric" className={FIELD_SOFT} value={birthYear} onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            </Field>
          </div>
        </PanelForm>
      )}

      {panel === "list" && (
        <PanelForm title="Charger une liste" pending={uploadMutation.isPending} submitLabel={`Charger ${parsed.ok.length} personne${parsed.ok.length > 1 ? "s" : ""}`} submitDisabled={!listCode.trim() || !listVersion.trim() || parsed.ok.length === 0 || parsed.bad.length > 0} error={error} onCancel={() => setPanel(null)} onSubmit={(e) => { e.preventDefault(); setError(null); uploadMutation.mutate(); }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Code de la liste" required>
              <input className={`${FIELD_SOFT} font-mono`} value={listCode} onChange={(e) => setListCode(e.target.value)} />
            </Field>
            <Field label="Version" required>
              <input className={FIELD_SOFT} value={listVersion} onChange={(e) => setListVersion(e.target.value)} />
            </Field>
            <Field label="Type" required>
              <select className={FIELD_SOFT} value={listType} onChange={(e) => setListType(e.target.value as ScreeningListType)}>
                <option value="SANCTION">Sanctions</option>
                <option value="PEP">Personnes exposées</option>
              </select>
            </Field>
          </div>
          <Field label="Personnes" required hint="Une ligne par personne : nom; alias séparés par | ; année de naissance; nationalité; référence. Seul le nom est obligatoire.">
            <textarea className={`${FIELD_SOFT} resize-none font-mono text-xs`} rows={6} value={entriesText} onChange={(e) => setEntriesText(e.target.value)} placeholder={"Jean Dupont; J. Dupont|Jo Dupont; 1975; CG; REF-001"} />
          </Field>
          {parsed.bad.length > 0 && (
            <p className="text-sm text-red-600">
              {parsed.bad.length} ligne{parsed.bad.length > 1 ? "s" : ""} invalide{parsed.bad.length > 1 ? "s" : ""} : {parsed.bad.slice(0, 3).join(" | ")}
            </p>
          )}
        </PanelForm>
      )}

      <div className="w-full sm:w-56">
        <Field label="Contrôles">
          <select
            className={FIELD}
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as "pending" | "all");
              setPage(0);
            }}
          >
            <option value="pending">À revoir</option>
            <option value="all">Tous</option>
          </select>
        </Field>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorBlock message="Impossible de charger les contrôles." onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ListPlus} title={scope === "pending" ? "Aucune correspondance à revoir" : "Aucun contrôle"} hint="Les contrôles avec correspondance possible attendent une revue ici." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {rows.map((c) => {
              const res = SCREENING_RESULT[c.result] ?? { label: c.result, tone: "neutral" as const };
              const needsReview = scope === "pending" || c.result !== "CLEAR";
              return (
                <ItemRow key={c.checkNumber}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold text-gray-950">{c.checkNumber}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{[c.subjectType, c.subjectCode].filter(Boolean).join(" ")}</p>
                    </div>
                    <StatusChip tone={res.tone}>{res.label}</StatusChip>
                  </div>
                  <OpenFields entries={extraEntries(c, KNOWN)} className="mt-2" />
                  {needsReview && reviewing !== c.checkNumber && c.result !== "CLEAR" && (
                    <div className="mt-3">
                      <ActionButton variant="ghost" className="!px-4 !py-2" onClick={() => { setReviewing(c.checkNumber); setRationale(""); setTrueMatch(true); }}>
                        Revoir
                      </ActionButton>
                    </div>
                  )}
                  {reviewing === c.checkNumber && (
                    <div className="mt-3 space-y-3 rounded-2xl bg-gray-50 p-3">
                      <CheckField checked={trueMatch} onChange={setTrueMatch} label="Vraie correspondance (décochez pour une fausse)" />
                      <Field label="Justification" required>
                        <input className={`${FIELD_SOFT} !bg-white`} value={rationale} onChange={(e) => setRationale(e.target.value)} />
                      </Field>
                      <div className="flex gap-2">
                        <ActionButton variant="ghost" onClick={() => setReviewing(null)}>
                          Annuler
                        </ActionButton>
                        <ActionButton pending={reviewMutation.isPending} disabled={!rationale.trim()} onClick={() => reviewMutation.mutate(c.checkNumber)}>
                          Valider
                        </ActionButton>
                      </div>
                    </div>
                  )}
                </ItemRow>
              );
            })}
          </div>
          <Pagination page={page} totalPages={data?.totalPages ?? 0} total={data?.totalElements ?? 0} noun="contrôle" onChange={setPage} />
        </>
      )}
    </div>
  );
};
