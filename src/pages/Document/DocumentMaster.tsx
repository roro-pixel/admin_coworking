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

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard KYC", icon: BarChart3 },
  { id: "review", label: "Revue KYC", icon: Eye },
  { id: "myqueue", label: "Mes dossiers", icon: Clock },
  { id: "corrections", label: "Corrections", icon: AlertTriangle }, // NOUVEAU
  { id: "expiring", label: "Expirations", icon: Calendar },
  { id: "bulk", label: "Revue en masse", icon: CheckSquare },
  { id: "gedDashboard", label: "Dashboard GED", icon: FileSearch },
  { id: "documents", label: "Tous les documents", icon: FolderOpen },
  { id: "advancedSearch", label: "Recherche avancée", icon: Search },
  { id: "folder", label: "Dossier propriétaire", icon: FolderOpen },
  { id: "types", label: "Types de documents", icon: FileText },
  { id: "requirements", label: "Exigences", icon: ListChecks },
  { id: "governance", label: "Gouvernance", icon: Tags },
  { id: "analytics", label: "Analytics GED", icon: ShieldCheck },
];

export const DocumentMaster: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(
    new Set(["dashboard"]),
  );

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set([...prev, tabId]));
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestion documentaire & KYC
        </h1>
        <p className="text-gray-600 mt-1">
          Gérez les types de documents, les exigences KYC, la revue et le
          dashboard conformité
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap text-sm
                ${
                  activeTab === tab.id
                    ? "bg-primary-50 text-primary-600 border-b-2 border-primary-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }
              `}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
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
