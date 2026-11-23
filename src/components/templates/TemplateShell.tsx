import React from "react";
import { AdminLayout } from "../layout/AdminLayout";
import { brandVars } from "../layout/adminTheme";
import { Toaster } from "../ui/Toaster";

export const TemplateShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminLayout>
    <div style={brandVars}>
      <Toaster />
      {children}
    </div>
  </AdminLayout>
);
