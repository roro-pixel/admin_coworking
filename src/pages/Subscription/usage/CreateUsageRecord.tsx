import React from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { brandVars } from "../../../components/layout/adminTheme";
import { Toaster } from "../../../components/ui/Toaster";
import { PageHeader } from "../../../components/subscription/kit";
import { UsageRecordForm } from "./UsageRecordForm";

export const CreateUsageRecord: React.FC = () => {
  const navigate = useNavigate();
  const back = () => navigate("/subscriptions/usage");

  return (
    <AdminLayout>
      <div style={brandVars} className="mx-auto w-full max-w-4xl">
        <PageHeader
          title="Enregistrer un usage"
          subtitle="Consommation d'un droit par un membre ou un client"
          onBack={back}
          backLabel="Usages"
        />
        <UsageRecordForm layout="page" onDone={back} onCancel={back} />
      </div>
      <Toaster />
    </AdminLayout>
  );
};