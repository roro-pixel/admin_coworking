import React, { useState } from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminRealtimeBridge } from "../realtime/AdminRealtimeBridge";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <AdminSidebar
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
      />

      <AdminRealtimeBridge />

      <main
        className={`
          px-4 pb-32 pt-24 transition-all duration-300
          md:pr-6 md:pb-8 lg:pr-8
          ${sidebarExpanded ? "lg:pl-72" : "lg:pl-24"}
        `}
      >
        {children}
      </main>

      <AdminBottomNav />
    </div>
  );
};