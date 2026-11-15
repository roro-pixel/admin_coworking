import React from "react";
import { AdminLayout } from "../layout/AdminLayout";
import { brandVars } from "../layout/adminTheme";
import { Toaster } from "../ui/Toaster";

 // Habillage des pages détail et création : menu latéral, thème de marque et toasts.

export const BillingShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminLayout>
    <div style={brandVars}>
      <Toaster />
      {children}
    </div>
  </AdminLayout>
);
