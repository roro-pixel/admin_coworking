import React from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { AdminBottomNav } from "./AdminBottomNav";
import { AdminRealtimeBridge } from "../realtime/AdminRealtimeBridge";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => (
  <div className="flex h-screen bg-gray-50">
    <AdminSidebar />

    <div className="flex min-w-0 flex-1 flex-col">
      <AdminHeader />

      <AdminRealtimeBridge />

      <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 lg:px-6 lg:pb-6">
        {children}
      </main>
    </div>

    <AdminBottomNav />
  </div>
);