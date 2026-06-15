import React, { useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  FileText,
  ListChecks,
  FolderOpen,
  Eye,
  BarChart3,
  Clock,
  Calendar,
  CheckSquare,
  AlertTriangle,
  Search,
  ShieldCheck,
  Tags,
  FileSearch,
} from "lucide-react";
import { DocumentTypesList } from "./DocumentTypesList";
import { DocumentRequirementsList } from "./DocumentRequirementsList";
import { DocumentsList } from "./DocumentsList";
import { DocumentReviewQueue } from "./DocumentReviewQueue";
import { KycDashboardPage } from "./KycDashboardPage";
import { KycMyQueuePage } from "./KycMyQueuePage";
import { KycExpiringSoonPage } from "./KycExpiringSoonPage";
import { KycBulkReviewPage } from "./KycBulkReviewPage";
import { KycCorrectionPage } from "./KycCorrectionPage";
import { DocumentGedDashboard } from "./DocumentGedDashboard";
import { DocumentAdvancedSearchPage } from "./DocumentAdvancedSearchPage";
import { DocumentOwnerFolderPage } from "./DocumentOwnerFolderPage";
import { DocumentGovernancePage } from "./DocumentGovernancePage";
import { DocumentAnalyticsExportPage } from "./DocumentAnalyticsExportPage";

type TabId =
  | "dashboard"
  | "review"
  | "myqueue"
  | "corrections"
  | "expiring"
  | "bulk"
  | "documents"
  | "types"
  | "requirements"
  | "gedDashboard"
  | "advancedSearch"
  | "folder"
  | "governance"
  | "analytics";

const groups: {
  title: string;
  description: string;
  items: { id: TabId; label: string; icon: React.ElementType }[];
}[] = [
  {
    title: "KYC",
    description: "Traitement, revue et conformité",
    items: [
      { id: "dashboard", label: "Dashboard", icon: BarChart3 },
      { id: "review", label: "Revue", icon: Eye },
      { id: "myqueue", label: "Mes dossiers", icon: Clock },
      { id: "corrections", label: "Corrections", icon: AlertTriangle },
      { id: "expiring", label: "Expirations", icon: Calendar },
      { id: "bulk", label: "Revue masse", icon: CheckSquare },
    ],
  },
  {
    title: "GED",
    description: "Documents, recherche et dossiers",
    items: [
      { id: "gedDashboard", label: "Dashboard", icon: FileSearch },
      { id: "documents", label: "Documents", icon: FolderOpen },
      { id: "advancedSearch", label: "Recherche", icon: Search },
      { id: "folder", label: "Dossier", icon: FolderOpen },
    ],
  },
  {
    title: "Administration",
    description: "Règles, types et gouvernance",
    items: [
      { id: "types", label: "Types", icon: FileText },
      { id: "requirements", label: "Exigences", icon: ListChecks },
      { id: "governance", label: "Gouvernance", icon: Tags },
      { id: "analytics", label: "Analytics", icon: ShieldCheck },
    ],
  },
];

const allTabs = groups.flatMap((group) => group.items);

export const DocumentMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set(["dashboard"]),
  );

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  const activeTabInfo = allTabs.find((tab) => tab.id === activeTab);

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">
            Gestion documentaire & conformité
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            Pilotez les dossiers KYC, la revue documentaire, les exigences et la
            gouvernance des documents depuis un seul espace.
          </p>
        </div>
        {activeTabInfo && (
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
            <p className="text-xs text-gray-400">Section active</p>
            <p className="text-sm font-semibold text-gray-900">
              {activeTabInfo.label}
            </p>
          </div>
        )}
      </div>

      <div className="mb-6 space-y-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
        {groups.map((group) => (
          <div key={group.title} className="grid gap-3 lg:grid-cols-[180px_1fr]">
            <div className="px-2 py-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {group.title}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {group.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.items.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? "bg-gray-950 text-white shadow-sm"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {visitedTabs.has("dashboard") && (
          <div className={activeTab !== "dashboard" ? "hidden" : ""}>
            <KycDashboardPage />
          </div>
        )}
        {visitedTabs.has("review") && (
          <div className={activeTab !== "review" ? "hidden" : ""}>
            <DocumentReviewQueue />
          </div>
        )}
        {visitedTabs.has("myqueue") && (
          <div className={activeTab !== "myqueue" ? "hidden" : ""}>
            <KycMyQueuePage />
          </div>
        )}
        {visitedTabs.has("corrections") && (
          <div className={activeTab !== "corrections" ? "hidden" : ""}>
            <KycCorrectionPage />
          </div>
        )}
        {visitedTabs.has("expiring") && (
          <div className={activeTab !== "expiring" ? "hidden" : ""}>
            <KycExpiringSoonPage />
          </div>
        )}
        {visitedTabs.has("bulk") && (
          <div className={activeTab !== "bulk" ? "hidden" : ""}>
            <KycBulkReviewPage />
          </div>
        )}
        {visitedTabs.has("gedDashboard") && (
          <div className={activeTab !== "gedDashboard" ? "hidden" : ""}>
            <DocumentGedDashboard />
          </div>
        )}
        {visitedTabs.has("documents") && (
          <div className={activeTab !== "documents" ? "hidden" : ""}>
            <DocumentsList />
          </div>
        )}
        {visitedTabs.has("advancedSearch") && (
          <div className={activeTab !== "advancedSearch" ? "hidden" : ""}>
            <DocumentAdvancedSearchPage />
          </div>
        )}
        {visitedTabs.has("folder") && (
          <div className={activeTab !== "folder" ? "hidden" : ""}>
            <DocumentOwnerFolderPage />
          </div>
        )}
        {visitedTabs.has("types") && (
          <div className={activeTab !== "types" ? "hidden" : ""}>
            <DocumentTypesList />
          </div>
        )}
        {visitedTabs.has("requirements") && (
          <div className={activeTab !== "requirements" ? "hidden" : ""}>
            <DocumentRequirementsList />
          </div>
        )}
        {visitedTabs.has("governance") && (
          <div className={activeTab !== "governance" ? "hidden" : ""}>
            <DocumentGovernancePage />
          </div>
        )}
        {visitedTabs.has("analytics") && (
          <div className={activeTab !== "analytics" ? "hidden" : ""}>
            <DocumentAnalyticsExportPage />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
