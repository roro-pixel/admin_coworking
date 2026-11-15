import React from "react";
import { useParams } from "react-router-dom";
import { BillingShell } from "../../components/billing/BillingShell";
import { DocumentForm } from "../../components/billing/DocumentForm";

/** Modification d'un document : le même formulaire que la création, prérempli. */
export const BillingDocumentEditPage: React.FC = () => {
  const { documentNumber } = useParams<{ documentNumber: string }>();
  return (
    <BillingShell>
      <DocumentForm documentNumber={documentNumber} />
    </BillingShell>
  );
};
