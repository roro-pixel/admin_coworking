import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LogIn,
  LogOut,
  Users,
  QrCode,
  ScanLine,
  UserPlus,
  ClipboardList,
  CalendarCheck,
} from "lucide-react";
import { operationsService } from "../../services/operations.service";
import type {
  VisitorPass,
  VisitorPassStatus,
} from "../../services/operations.service";
import { useAuth } from "../../contexts/AuthContext";
import {
  ActionButton,
  DataCard,
  EmptyState,
  Field,
  HeadRow,
  ListHeader,
  Pagination,
  SearchField,
  Section,
  StatusChip,
} from "../../components/subscription/kit";
import { FIELD, FIELD_SOFT, MONO_LINK, ROW_HOVER, apiMessage, formatDateTime } from "../../components/subscription/kitUtils";
import { statusOf } from "../../components/subscription/labels";
import { ListSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/toastStore";
import { Avatar, SectionBar, ViewSwitch } from "../../components/operations/opsKit";
import type { ViewItem } from "../../components/operations/opsKit";
import { PASS_STATUS } from "../../components/operations/opsLabels";

type SubTab = "today" | "all" | "checkin" | "create" | "log";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const EMPTY_FORM = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  hostMemberCode: "",
  hostName: "",
  validFrom: "",
  validUntil: "",
  purpose: "",
};

export const VisitorMaster: React.FC = () => {
  const { admin, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>("today");
  const [visitedTabs, setVisitedTabs] = useState<Set<SubTab>>(
    new Set(["today"]),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisitorPassStatus | "">("");
  const [page, setPage] = useState(0);

  const [checkPassNumber, setCheckPassNumber] = useState("");
  const [checkNotes, setCheckNotes] = useState("");
  const [checkResult, setCheckResult] = useState<VisitorPass | null>(null);

  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const switchTab = (tab: SubTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => new Set([...prev, tab]));
    setPage(0);
  };

  useEffect(() => {
    if (activeTab !== "create") return;
    setCreateForm(EMPTY_FORM);
  }, [activeTab]);

  const { data: todayPasses = [], isLoading: todayLoading } = useQuery({
    queryKey: ["visitor-today"],
    queryFn: () => operationsService.getVisitorPassesToday(),
    enabled: visitedTabs.has("today"),
  });

  const { data: allPassesData, isLoading: allLoading } = useQuery({
    queryKey: ["visitor-passes", statusFilter, page],
    queryFn: () =>
      operationsService.getVisitorPasses({
        status: statusFilter || undefined,
        page,
        size: 20,
      }),
    enabled: visitedTabs.has("all"),
  });

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ["visitor-log", page],
    queryFn: () => operationsService.getVisitorLog({ page, size: 20 }),
    enabled: visitedTabs.has("log"),
  });

  const allPasses: VisitorPass[] = allPassesData?.content || [];
  const logEntries: any[] = logData?.content || [];
  const totalPagesAll = allPassesData?.totalPages ?? 0;
  const totalPagesLog = logData?.totalPages ?? 0;

  const filteredAll = search
    ? allPasses.filter(
        (p) =>
          p.fullName.toLowerCase().includes(search.toLowerCase()) ||
          p.passNumber.toLowerCase().includes(search.toLowerCase()),
      )
    : allPasses;

  const createMutation = useMutation({
    mutationFn: () =>
      operationsService.createVisitorPass({
        ...createForm,
        createdBy: admin?.email || "admin",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitor-today"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-passes"] });
      toast.success("Pass visiteur créé");
      switchTab("today");
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur création pass")),
  });

  const checkInMutation = useMutation({
    mutationFn: () =>
      operationsService.checkIn(checkPassNumber, {
        agent: admin?.email || "admin",
        notes: checkNotes || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitor-today"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-passes"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-log"] });
      setCheckResult(data);
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur check-in")),
  });

  const checkOutMutation = useMutation({
    mutationFn: () =>
      operationsService.checkOut(checkPassNumber, {
        agent: admin?.email || "admin",
        notes: checkNotes || undefined,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visitor-today"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-passes"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-log"] });
      setCheckResult(data);
    },
    onError: (e: any) => toast.error(apiMessage(e, "Erreur check-out")),
  });

  const tabs: (ViewItem<SubTab> & { permission?: string })[] = [
    { id: "today", label: "Aujourd'hui", count: todayPasses.length, icon: CalendarCheck, permission: "VISITOR:READ" },
    { id: "all", label: "Tous les passes", icon: ClipboardList, permission: "VISITOR:READ" },
    { id: "checkin", label: "Check-in / out", icon: ScanLine, permission: "VISITOR:CHECKIN" },
    { id: "log", label: "Journal", icon: ClipboardList, permission: "VISITOR:READ" },
  ];
  const visibleTabs = tabs.filter(
    (tab) => !tab.permission || hasPermission(tab.permission),
  );
  const canCreate = hasPermission("VISITOR:WRITE");

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCreateForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <SectionBar
        action={
          canCreate && (
            <ActionButton icon={UserPlus} onClick={() => switchTab("create")} className="w-full sm:w-auto">
              Nouveau pass
            </ActionButton>
          )
        }
      >
        <ViewSwitch
          items={visibleTabs}
          active={activeTab}
          onChange={switchTab}
        />
      </SectionBar>

      {/* Aujourd'hui */}
      {activeTab === "today" && (
        <div className="space-y-4">
          <ListHeader
            title="Visiteurs du jour"
            subtitle={`${todayPasses.length} pass attendu${todayPasses.length > 1 ? "s" : ""} aujourd'hui`}
          />
          {todayLoading ? (
            <ListSkeleton rows={3} />
          ) : todayPasses.length === 0 ? (
            <EmptyState icon={Users} title="Aucun visiteur aujourd'hui" hint="Les passes du jour apparaîtront ici." />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {todayPasses.map((pass: VisitorPass) => {
                const st = statusOf(PASS_STATUS, pass.status);
                return (
                  <div
                    key={pass.passNumber}
                    className="flex items-start gap-4 rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm"
                  >
                    <Avatar name={pass.fullName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-gray-950">{pass.fullName}</p>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </div>
                      {pass.company && <p className="truncate text-sm text-gray-500">{pass.company}</p>}
                      {pass.hostName && <p className="truncate text-xs text-gray-500">Reçu par {pass.hostName}</p>}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className={MONO_LINK}>{pass.passNumber}</span>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-gray-950">
                          {time(pass.validFrom)} → {time(pass.validUntil)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tous les passes */}
      {activeTab === "all" && (
        <div className="space-y-4">
          <ListHeader title="Tous les passes" subtitle="Recherche sur la page affichée" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchField value={search} onChange={setSearch} placeholder="Rechercher un nom ou un numéro de pass" className="flex-1" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as VisitorPassStatus | "");
                setPage(0);
              }}
              className={`${FIELD_SOFT} sm:w-56`}
            >
              <option value="">Tous les statuts</option>
              {(Object.keys(PASS_STATUS) as VisitorPassStatus[]).map((s) => (
                <option key={s} value={s}>
                  {PASS_STATUS[s].label}
                </option>
              ))}
            </select>
          </div>
          {allLoading ? (
            <ListSkeleton rows={5} />
          ) : filteredAll.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Aucun pass trouvé" hint="Modifiez la recherche ou le filtre." />
          ) : (
            <DataCard>
              <HeadRow cols="lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
                <span>Pass</span>
                <span>Visiteur</span>
                <span>Hôte</span>
                <span>Validité</span>
                <span>Statut</span>
              </HeadRow>
              <div className="space-y-1">
                {filteredAll.map((pass) => {
                  const st = statusOf(PASS_STATUS, pass.status);
                  return (
                    <div
                      key={pass.passNumber}
                      className={`grid grid-cols-1 items-center gap-2 rounded-2xl max-lg:bg-gray-50 px-4 py-3 transition lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-4 ${ROW_HOVER}`}
                    >
                      <span className={MONO_LINK}>{pass.passNumber}</span>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar size="sm" name={pass.fullName} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-950">{pass.fullName}</p>
                          {pass.company && <p className="truncate text-xs text-gray-500">{pass.company}</p>}
                        </div>
                      </div>
                      <p className="truncate text-sm text-gray-600">{pass.hostName}</p>
                      <p className="text-xs leading-relaxed text-gray-500">
                        {formatDateTime(pass.validFrom)}
                        <br />→ {formatDateTime(pass.validUntil)}
                      </p>
                      <div>
                        <StatusChip tone={st.tone}>{st.label}</StatusChip>
                      </div>
                    </div>
                  );
                })}
              </div>
            </DataCard>
          )}
          <Pagination page={page} totalPages={totalPagesAll} total={allPassesData?.totalElements ?? 0} noun="pass" onChange={setPage} />
        </div>
      )}

      {/* Guichet d'accueil */}
      {activeTab === "checkin" && (
        <div className="mx-auto w-full max-w-lg">
          <div className="rounded-[1.75rem] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] text-[color:var(--logo-pink-dark)]">
                <QrCode size={30} />
              </span>
              <h3 className="mt-4 text-xl font-bold text-gray-950">Guichet d'accueil</h3>
              <p className="mt-1 text-sm text-gray-500">Saisissez le numéro de pass ou scannez le QR code</p>
            </div>
            <div className="mt-6 space-y-4">
              <Field label="N° de pass" required>
                <input
                  type="text"
                  value={checkPassNumber}
                  onChange={(e) => {
                    setCheckPassNumber(e.target.value);
                    setCheckResult(null);
                  }}
                  placeholder="VIS-..."
                  className={`${FIELD_SOFT} font-mono text-base`}
                />
              </Field>
              <Field label="Notes">
                <input
                  type="text"
                  value={checkNotes}
                  onChange={(e) => setCheckNotes(e.target.value)}
                  placeholder="Badge remis, observation..."
                  className={FIELD_SOFT}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <ActionButton
                  icon={LogIn}
                  pending={checkInMutation.isPending}
                  disabled={!checkPassNumber || checkOutMutation.isPending}
                  onClick={() => checkInMutation.mutate()}
                >
                  Check-in
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  icon={LogOut}
                  pending={checkOutMutation.isPending}
                  disabled={!checkPassNumber || checkInMutation.isPending}
                  onClick={() => checkOutMutation.mutate()}
                >
                  Check-out
                </ActionButton>
              </div>
              {checkResult && (
                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4">
                  <Avatar name={checkResult.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-950">{checkResult.fullName}</p>
                    <div className="mt-1">
                      <StatusChip tone={statusOf(PASS_STATUS, checkResult.status).tone}>
                        {statusOf(PASS_STATUS, checkResult.status).label}
                      </StatusChip>
                    </div>
                    {checkResult.checkedInAt && (
                      <p className="mt-2 text-xs text-gray-600">
                        Entrée : {new Date(checkResult.checkedInAt).toLocaleTimeString("fr-FR")}
                      </p>
                    )}
                    {checkResult.checkedOutAt && (
                      <p className="text-xs text-gray-600">
                        Sortie : {new Date(checkResult.checkedOutAt).toLocaleTimeString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Création pass */}
      {activeTab === "create" && (
        <form
          className="mx-auto w-full max-w-3xl space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (createForm.fullName && createForm.validFrom && createForm.validUntil) createMutation.mutate();
          }}
        >
          <ListHeader title="Nouveau pass visiteur" subtitle="Le visiteur présentera ce pass à l'accueil" />
          <Section title="Le visiteur" icon={Users}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nom complet" required className="sm:col-span-2">
                <input type="text" value={createForm.fullName} onChange={set("fullName")} className={FIELD} />
              </Field>
              <Field label="Email">
                <input type="email" value={createForm.email} onChange={set("email")} className={FIELD} />
              </Field>
              <Field label="Téléphone">
                <input type="tel" value={createForm.phone} onChange={set("phone")} className={FIELD} />
              </Field>
              <Field label="Entreprise" className="sm:col-span-2">
                <input type="text" value={createForm.company} onChange={set("company")} className={FIELD} />
              </Field>
            </div>
          </Section>
          <Section title="La visite" icon={CalendarCheck}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Code du membre hôte">
                <input type="text" value={createForm.hostMemberCode} onChange={set("hostMemberCode")} placeholder="MBR-000001" className={FIELD} />
              </Field>
              <Field label="Nom de l'hôte">
                <input type="text" value={createForm.hostName} onChange={set("hostName")} className={FIELD} />
              </Field>
              <Field label="Valide du" required>
                <input type="datetime-local" value={createForm.validFrom} onChange={set("validFrom")} className={FIELD} />
              </Field>
              <Field label="Valide jusqu'au" required>
                <input type="datetime-local" value={createForm.validUntil} onChange={set("validUntil")} className={FIELD} />
              </Field>
              <Field label="Objet de la visite" className="sm:col-span-2">
                <input type="text" value={createForm.purpose} onChange={set("purpose")} placeholder="Rendez-vous commercial, livraison..." className={FIELD} />
              </Field>
            </div>
          </Section>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ActionButton variant="ghost" onClick={() => switchTab("today")} disabled={createMutation.isPending}>
              Annuler
            </ActionButton>
            <ActionButton
              type="submit"
              icon={UserPlus}
              pending={createMutation.isPending}
              disabled={!createForm.fullName || !createForm.validFrom || !createForm.validUntil}
            >
              Créer le pass
            </ActionButton>
          </div>
        </form>
      )}

      {/* Journal */}
      {activeTab === "log" && (
        <div className="space-y-4">
          <ListHeader title="Journal des passages" subtitle="Entrées et sorties enregistrées à l'accueil" />
          {logLoading ? (
            <ListSkeleton rows={5} />
          ) : logEntries.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Aucune entrée" hint="Les passages à l'accueil seront listés ici." />
          ) : (
            <DataCard>
              <HeadRow cols="lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1.6fr)]">
                <span>Date et heure</span>
                <span>Visiteur</span>
                <span>Événement</span>
                <span>Agent</span>
                <span>Notes</span>
              </HeadRow>
              <div className="space-y-1">
                {logEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-1 items-center gap-2 rounded-2xl max-lg:bg-gray-50 px-4 py-3 transition lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1.6fr)] lg:gap-4 ${ROW_HOVER}`}
                  >
                    <p className="text-sm text-gray-600">{formatDateTime(entry.eventAt)}</p>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-950">{entry.fullName}</p>
                      <span className={MONO_LINK}>{entry.passNumber}</span>
                    </div>
                    <div>
                      <StatusChip tone={entry.eventType === "CHECK_IN" ? "success" : "warn"}>
                        {entry.eventType === "CHECK_IN" ? "Entrée" : "Sortie"}
                      </StatusChip>
                    </div>
                    <p className="truncate text-sm text-gray-600">{entry.agent}</p>
                    <p className="text-sm text-gray-500">{entry.notes}</p>
                  </div>
                ))}
              </div>
            </DataCard>
          )}
          <Pagination page={page} totalPages={totalPagesLog} total={logData?.totalElements ?? 0} noun="entrée" onChange={setPage} />
        </div>
      )}
    </div>
  );
};
