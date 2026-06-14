import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Tag,
  CheckCircle,
  Clock,
  Archive,
  Loader2,
  Shield,
  DollarSign,
  Star,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import { subscriptionService } from "../../../services/subscription.service";
import type {
  Plan,
  PlanVersion,
  EntitlementDefinition,
} from "../../../services/subscription.service";

// ─── Labels ──────────────────────────────────────────────────────────────────

const billingCycleLabels: Record<string, string> = {
  ONE_TIME: "Unique",
  DAILY: "Journalier",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
  YEARLY: "Annuel",
};

const entitlementTypeLabels: Record<string, string> = {
  ACCESS: "Accès",
  CREDIT: "Crédit",
  TIME: "Temps",
  DISCOUNT: "Réduction",
  QUOTA: "Quota",
  FEATURE_FLAG: "Fonctionnalité",
  SERVICE_ALLOWANCE: "Forfait",
};

const consumptionModeLabels: Record<string, string> = {
  CHECK_ONLY: "Vérification",
  RESERVABLE: "Réservable",
  CONSUMABLE: "Consommable",
  RESERVE_THEN_CONSUME: "Réserver puis consommer",
};

const resetPolicyLabels: Record<string, string> = {
  NEVER: "Jamais",
  DAILY: "Quotidien",
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  PER_BILLING_CYCLE: "Par cycle",
};

// ─── Types onglets ────────────────────────────────────────────────────────────

type Tab = "entitlements" | "prices" | "benefits" | "billable";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "entitlements", label: "Droits inclus", icon: Shield },
  { id: "prices", label: "Tarifs", icon: DollarSign },
  { id: "benefits", label: "Avantages", icon: Star },
  { id: "billable", label: "Items facturables", icon: CreditCard },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface PlanVersionDetailPageProps {
  plan: Plan;
  version: PlanVersion;
  onBack: () => void;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export const PlanVersionDetailPage: React.FC<PlanVersionDetailPageProps> = ({
  plan,
  version,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("entitlements");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(
    new Set(["entitlements"]),
  );

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setVisitedTabs((p) => new Set([...p, tab]));
  };

  // Définitions des droits pour enrichir l'affichage
  const { data: entDefData } = useQuery({
    queryKey: ["entitlement-definitions", "", "", 0],
    queryFn: () =>
      subscriptionService.getEntitlementDefinitions({
        active: true,
        size: 100,
      }),
  });
  const entDefs: EntitlementDefinition[] = entDefData?.content ?? [];
  const getEntDef = (code: string) => entDefs.find((d) => d.code === code);
  const getEntName = (code: string) => getEntDef(code)?.name ?? code;

  // Items facturables filtrés sur la version (sourceType=SUBSCRIPTION, sourceId=planVersionId)
  const { data: billableData, isLoading: billableLoading } = useQuery({
    queryKey: ["billable-items-version", String(version.id)],
    queryFn: () =>
      subscriptionService.getBillableItems({
        sourceType: "SUBSCRIPTION",
        sourceId: String(version.id),
        size: 100,
      }),
    enabled: visitedTabs.has("billable"),
  });
  const billableItems = billableData?.content ?? [];

  const statusConfig: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    DRAFT: {
      label: "Brouillon",
      color: "bg-gray-100 text-gray-700",
      icon: <Clock size={13} />,
    },
    ACTIVE: {
      label: "Active",
      color: "bg-green-100 text-green-700",
      icon: <CheckCircle size={13} />,
    },
    ARCHIVED: {
      label: "Archivée",
      color: "bg-gray-100 text-gray-500",
      icon: <Archive size={13} />,
    },
  };
  const vCfg = statusConfig[version.status] ?? {
    label: version.status,
    color: "bg-gray-100 text-gray-600",
    icon: null,
  };

  return (
    <>
      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour à {plan.name}
        </button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                Version {version.versionNumber} — {version.name}
              </h1>
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${vCfg.color}`}
              >
                {vCfg.icon}
                {vCfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Plan : <span className="font-medium">{plan.name}</span>
              <span className="mx-2 text-gray-300">·</span>
              <span className="font-mono text-xs">{plan.code}</span>
            </p>
            {version.description && (
              <p className="text-gray-600 mt-2 max-w-2xl">
                {version.description}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="flex gap-4 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-400">Effet</p>
              <p className="text-sm font-medium flex items-center gap-1 justify-end">
                <Calendar size={13} className="text-gray-400" />
                {new Date(version.effectiveFrom).toLocaleDateString("fr-FR")}
              </p>
            </div>
            {version.effectiveTo && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Fin</p>
                <p className="text-sm font-medium flex items-center gap-1 justify-end">
                  <Calendar size={13} className="text-gray-400" />
                  {new Date(version.effectiveTo).toLocaleDateString("fr-FR")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Conditions générales */}
        {version.termsJson &&
          (() => {
            try {
              const entries = Object.entries(JSON.parse(version.termsJson));
              if (!entries.length) return null;
              return (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entries.map(([k, v]) => (
                    <span
                      key={k}
                      className="text-xs bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1 rounded-lg"
                    >
                      <span className="font-medium">{k}</span> : {String(v)}
                    </span>
                  ))}
                </div>
              );
            } catch {
              return null;
            }
          })()}
      </div>

      {/* ── Onglets ────────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count =
              tab.id === "entitlements"
                ? (version.entitlements?.length ?? 0)
                : tab.id === "prices"
                  ? (version.prices?.length ?? 0)
                  : tab.id === "benefits"
                    ? (version.benefits?.length ?? 0)
                    : billableItems.length;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? "bg-primary-100 text-primary-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Onglet Droits ──────────────────────────────────────────────────── */}
      {activeTab === "entitlements" && (
        <div>
          {version.entitlements?.length === 0 ? (
            <EmptyState
              icon={Shield}
              text="Aucun droit inclus dans cette version"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...version.entitlements]
                .sort((a, b) => a.priority - b.priority)
                .map((ent, i) => {
                  const def = getEntDef(ent.entitlementCode);
                  return (
                    <div
                      key={i}
                      className="rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 p-5"
                    >
                      {/* En-tête */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {getEntName(ent.entitlementCode)}
                          </h3>
                          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                            {ent.entitlementCode}
                          </p>
                        </div>
                        <div className="ml-3 flex-shrink-0 text-right">
                          <p className="text-xl font-bold text-primary-600">
                            {ent.unlimited ? "∞" : ent.quantity}
                          </p>
                          {def && (
                            <p className="text-xs text-gray-400">{def.unit}</p>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {def && (
                          <>
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              {entitlementTypeLabels[def.entitlementType] ??
                                def.entitlementType}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {consumptionModeLabels[def.consumptionMode] ??
                                def.consumptionMode}
                            </span>
                          </>
                        )}
                        {ent.unlimited && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                            Illimité
                          </span>
                        )}
                      </div>

                      {/* Détails */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {ent.rolloverAllowed && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <RotateCcw size={11} className="text-gray-400" />
                            Report :{" "}
                            {ent.rolloverLimit > 0
                              ? `max ${ent.rolloverLimit}`
                              : "illimité"}
                          </div>
                        )}
                        {ent.validForDays > 0 && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar size={11} className="text-gray-400" />
                            Valide {ent.validForDays} jours
                          </div>
                        )}
                        {def && (
                          <div className="text-gray-500">
                            Reset :{" "}
                            {resetPolicyLabels[def.resetPolicy] ??
                              def.resetPolicy}
                          </div>
                        )}
                        <div className="text-gray-500">
                          Priorité : {ent.priority}
                        </div>
                      </div>

                      {/* Restrictions */}
                      {ent.restrictionsJson &&
                        (() => {
                          try {
                            const r = JSON.parse(ent.restrictionsJson);
                            return (
                              <div className="mt-3 pt-3 border-t border-gray-50">
                                <p className="text-xs text-gray-400 mb-1">
                                  Restrictions
                                </p>
                                <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(r, null, 2)}
                                </pre>
                              </div>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Tarifs ──────────────────────────────────────────────────── */}
      {activeTab === "prices" && (
        <div>
          {version.prices?.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              text="Aucun tarif défini pour cette version"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {version.prices.map((price, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {billingCycleLabels[price.billingCycle] ??
                        price.billingCycle}
                    </span>
                    {!price.taxIncluded && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        HT
                      </span>
                    )}
                    {price.taxIncluded && (
                      <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">
                        TTC
                      </span>
                    )}
                  </div>

                  <p className="text-3xl font-bold text-gray-900 mb-1">
                    {price.amount.toLocaleString("fr-FR")}
                    <span className="text-base font-normal text-gray-400 ml-1">
                      {price.currency}
                    </span>
                  </p>

                  {price.commitmentMonths > 0 && (
                    <p className="text-xs text-gray-500 mb-3">
                      Engagement : {price.commitmentMonths} mois
                    </p>
                  )}

                  {(price.setupFee > 0 || price.depositAmount > 0) && (
                    <div className="border-t border-gray-50 pt-3 mt-3 space-y-1">
                      {price.setupFee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">
                            Frais d'activation
                          </span>
                          <span className="font-medium">
                            {price.setupFee.toLocaleString("fr-FR")}{" "}
                            {price.currency}
                          </span>
                        </div>
                      )}
                      {price.depositAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">
                            Dépôt de garantie
                          </span>
                          <span className="font-medium">
                            {price.depositAmount.toLocaleString("fr-FR")}{" "}
                            {price.currency}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Avantages ───────────────────────────────────────────────── */}
      {activeTab === "benefits" && (
        <div>
          {version.benefits?.length === 0 ? (
            <EmptyState
              icon={Star}
              text="Aucun avantage défini pour cette version"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...version.benefits]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((benefit, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-4 p-4 rounded-xl border ${
                      benefit.highlighted
                        ? "border-primary-100 bg-primary-50"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    {benefit.icon ? (
                      <div
                        className={`text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
                          benefit.highlighted ? "bg-primary-100" : "bg-gray-100"
                        }`}
                      >
                        {benefit.icon}
                      </div>
                    ) : (
                      <div
                        className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
                          benefit.highlighted ? "bg-primary-100" : "bg-gray-100"
                        }`}
                      >
                        <Star
                          size={18}
                          className={
                            benefit.highlighted
                              ? "text-primary-600"
                              : "text-gray-400"
                          }
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={`font-semibold text-sm ${benefit.highlighted ? "text-primary-800" : "text-gray-800"}`}
                        >
                          {benefit.title}
                        </p>
                        {benefit.highlighted && (
                          <Tag
                            size={12}
                            className="text-primary-500 flex-shrink-0"
                          />
                        )}
                        {!benefit.included && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            Non inclus
                          </span>
                        )}
                      </div>
                      {benefit.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {benefit.description}
                        </p>
                      )}
                      {benefit.category && (
                        <span className="inline-block text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full mt-1">
                          {benefit.category}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-300 flex-shrink-0 self-start mt-1">
                      #{benefit.displayOrder}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet Items facturables ───────────────────────────────────────── */}
      {activeTab === "billable" && (
        <div>
          {billableLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={24} className="animate-spin mr-3" /> Chargement...
            </div>
          ) : billableItems.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              text="Aucun item facturable lié à cette version de plan"
            />
          ) : (
            <>
              {/* Résumé */}
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Items en attente
                  </p>
                  <p className="text-xs text-yellow-600 mt-0.5">
                    {billableItems.filter((i) => i.status === "PENDING").length}{" "}
                    item(s) à facturer
                  </p>
                </div>
                <p className="text-xl font-bold text-yellow-800">
                  {billableItems
                    .filter((i) => i.status === "PENDING")
                    .reduce((s, i) => s + i.amount, 0)
                    .toLocaleString("fr-FR")}{" "}
                  FCFA
                </p>
              </div>

              <div className="rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        N° Billable
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Souscripteur
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                        Montant
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr+tr]:border-t [&>tr+tr]:border-slate-100">
                    {billableItems.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3 text-sm font-mono">
                          {item.billableNumber}
                        </td>
                        <td className="px-5 py-3 text-sm">
                          <p className="font-mono">{item.subscriberCode}</p>
                          <p className="text-xs text-gray-400">
                            {item.subscriberType}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-sm text-right font-semibold">
                          {item.amount.toLocaleString("fr-FR")} {item.currency}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              item.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : item.status === "INVOICED"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.status === "PENDING"
                              ? "En attente"
                              : item.status === "INVOICED"
                                ? "Facturé"
                                : item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ icon: React.ElementType; text: string }> = ({
  icon: Icon,
  text,
}) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <Icon size={40} className="mb-3 text-gray-200" />
    <p className="text-sm">{text}</p>
  </div>
);
