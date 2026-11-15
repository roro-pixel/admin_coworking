import React from "react";
import { AdminLayout } from "../layout/AdminLayout";
import { brandVars } from "../layout/adminTheme";
import { Toaster } from "../ui/Toaster";

export const MarketplaceShell: React.FC<{ children: React.ReactNode; narrow?: boolean }> = ({ children, narrow }) => (
  <AdminLayout>
    <div style={brandVars}>
      <Toaster />
      <div className={narrow ? "mx-auto w-full max-w-4xl" : ""}>{children}</div>
    </div>
  </AdminLayout>
);
