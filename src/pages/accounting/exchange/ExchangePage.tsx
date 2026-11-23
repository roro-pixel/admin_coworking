import React from "react";
import { AccountingShell } from "../../../components/accounting/AccountingShell";
import { EndpointConsole } from "../../../components/accounting/EndpointConsole";
import { EXCHANGE_ENDPOINTS } from "./exchangeEndpoints";

export const ExchangePage: React.FC = () => (
  <AccountingShell>
    <EndpointConsole title="Échanges et paramétrage" subtitle="Exports Sage / Odoo / CSV, correspondances, reprise des données, double tenue et archives annuelles." endpoints={EXCHANGE_ENDPOINTS} />
  </AccountingShell>
);
