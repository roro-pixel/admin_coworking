import React from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { AdminRealtimeBridge } from "../realtime/AdminRealtimeBridge";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <AdminHeader />
      <AdminRealtimeBridge />
      <main className="px-4 pb-28 pt-20 md:pl-24 md:pr-6 md:pb-8 lg:pr-8">
        {children}
      </main>
    </div>
  );
};
