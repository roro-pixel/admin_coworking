import React from "react";
import { BillingShell } from "../../components/billing/BillingShell";
import { DocumentForm } from "../../components/billing/DocumentForm";

/** Page de création (nom conservé : c'est une page, plus une modale). */
export const CreateInvoiceModal: React.FC = () => (
  <BillingShell>
    <DocumentForm kind="invoice" />
  </BillingShell>
);
