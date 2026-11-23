import type { ElementType } from "react";
import {
  BarChart3,
  Calculator,
  Receipt,
  Landmark,
  Layers,
  UsersRound,
  Briefcase,
  ConciergeBell,
  Building,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  Package,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  Lock,
  ArrowLeftRight,
  CalendarClock,
  Banknote,
  ShieldCheck,
  ScrollText,
} from "lucide-react";

/*
 * Configuration unique de la navigation admin : la sidebar (grand écran) et la barre mobile
 * lisent toutes les deux ce fichier. Pour ajouter une page, ajoute une ligne ici.
 *
 * Droits : une page est accessible si l'utilisateur est admin, ou s'il possède AU MOINS UNE des
 * permissions listées. Sans permission listée, elle est toujours accessible. Sans accès, la page
 * reste visible mais floutée et non cliquable.
 *
 * ⚠ Adapte les noms de permissions à ceux de ton backend (page « Permissions »).
 *   `read("CUSTOMER")` accepte "CUSTOMER:READ" et "CUSTOMER_READ" (les deux écritures
 *   existent dans SettingsMaster).
 */
/** Pages de la caisse : elles restent sous /payments pour ne pas changer les adresses. */
const CASH_PATHS = ["/payments/registers", "/payments/sessions", "/payments/variances", "/payments/movements", "/payments/vouchers", "/payments/requests", "/payments/metrics", "/payments/anomalies", "/payments/transfers", "/payments/staff", "/payments/position", "/payments/accounting", "/payments/settings", "/payments/cash-registers"];

const read = (module: string) => [`${module}:READ`, `${module}_READ`];

export type AdminNavItem = {
  path: string;
  label: string;
  /** Libellé court pour la barre mobile */
  shortLabel?: string;
  icon: ElementType;
  permissions?: string[];
  /** Affiché dans la barre du bas sur mobile (4 maximum) */
  primary?: boolean;
  /** Phrase affichée sous le titre dans la page de la famille */
  description?: string;
  /** Rubrique de la page de la famille ; sans rubrique, la carte n'a pas de titre au-dessus */
  section?: string;
  /** Autres adresses comptées comme appartenant à ce module (module dont le chemin d'entrée est une sous-page d'un autre) */
  alsoActiveUnder?: string[];
  /** Adresses sous le chemin du module qui appartiennent à un autre module */
  excludeUnder?: string[];
};

export type AdminNavGroup = {
  id: string;
  /** Titre de la famille ; null = pas de titre */
  label: string | null;
  /** Famille (label non nul) : icône et nom court affichés dans le rail */
  icon?: ElementType;
  shortLabel?: string;
  /** Phrase affichée sous le titre dans la page de la famille */
  description?: string;
  items: AdminNavItem[];
  /** Collé en bas de la sidebar (Paramètres) */
  pinned?: boolean;
};

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: "home",
    label: null,
    items: [
      { path: "/", label: "Tableau de bord", shortLabel: "Accueil", icon: LayoutDashboard, primary: true },
    ],
  },
  {
    id: "clientele",
    icon: UsersRound,
    shortLabel: "Clientèle",
    label: "Clientèle",
    description: "Accédez aux clients, aux entreprises, aux membres et à leurs abonnements.",
    items: [
      { path: "/customers", label: "Clients", shortLabel: "Clients", icon: Building2, permissions: read("CUSTOMER"), primary: true, section: "Comptes", description: "Personnes et fiches clients" },
      { path: "/companies", label: "Entreprises", icon: Building, permissions: read("CUSTOMER"), section: "Comptes", description: "Organisations, membres rattachés, facturation et portefeuille" },
      { path: "/members", label: "Membres", icon: Users, permissions: read("MEMBER"), section: "Comptes", description: "Membres, accès au portail et organisations" },
      { path: "/subscriptions", label: "Abonnements", icon: CreditCard, permissions: read("SUBSCRIPTION"), section: "Offres", description: "Abonnements, formules, passes et droits" },
    ],
  },
  {
    id: "espaces",
    icon: Layers,
    shortLabel: "Espaces",
    label: "Espaces",
    description: "Accédez aux ressources du coworking et à leurs réservations.",
    items: [
      { path: "/resources", label: "Ressources", icon: Building2, permissions: read("RESOURCE"), description: "Salles, bureaux, types et règles de réservation" },
      { path: "/bookings", label: "Réservations", shortLabel: "Réserv.", icon: Calendar, permissions: read("BOOKING"), primary: true, description: "Planning, création et suivi des réservations" },
    ],
  },
  {
    id: "finance",
    icon: Landmark,
    shortLabel: "Finance",
    label: "Finance",
    description: "Accédez à la facturation, aux encaissements, aux portefeuilles et aux rapports.",
    items: [
      { path: "/payments", label: "Paiements", icon: CreditCard, permissions: read("PAYMENT"), section: "Encaissements", description: "Intentions, recouvrement, reçus et mobile money", excludeUnder: CASH_PATHS },
      { path: "/payments/registers", label: "Caisse", icon: Banknote, permissions: ["CASH:READ"], section: "Encaissements", description: "Caisses, sessions, écarts, mouvements et demandes", alsoActiveUnder: CASH_PATHS },
      { path: "/billing", label: "Facturation", shortLabel: "Factures", icon: FileText, permissions: read("BILLING"), primary: true, section: "Encaissements", description: "Factures, devis, avoirs et relances" },
      { path: "/wallets", label: "Portefeuilles", icon: Wallet, permissions: read("WALLET"), section: "Encaissements", description: "Soldes, mouvements et contrôles" },
      { path: "/reports", label: "Rapports", icon: BarChart3, permissions: read("REPORT"), section: "Pilotage", description: "Chiffres clés et analyses" },
    ],
  },
  {
    id: "administration",
    icon: FolderOpen,
    shortLabel: "Admin",
    label: "Administration",
    description: "Accédez aux documents, aux contrats, au stock, à la boutique et aux opérations.",
    items: [
      { path: "/document", label: "Documents", icon: FolderOpen, permissions: read("DOCUMENT"), section: "Documents", description: "Documents administratifs par propriétaire" },
      { path: "/contracts", label: "Contrats", icon: FileText, permissions: read("CONTRACT"), section: "Documents", description: "Contrats, signatures et modèles" },
      { path: "/templates", label: "Modèles", icon: LayoutTemplate, permissions: ["SYSTEM:DOCUMENT_TEMPLATES"], section: "Documents", description: "Pièces PDF et courriels : composer, prévisualiser, publier" },
      { path: "/services", label: "Services", icon: ConciergeBell, section: "Exploitation", description: "Catalogue de services et contrats de domiciliation" },
      { path: "/inventory", label: "Inventaire", icon: Package, permissions: read("INVENTORY"), section: "Exploitation", description: "Articles, emplacements et mouvements de stock" },
      { path: "/marketplace", label: "Marketplace", icon: ShoppingBag, section: "Exploitation", description: "Offres de la boutique et commandes au comptoir" },
      { path: "/operations", label: "Opérations", icon: Briefcase, permissions: read("OPERATION"), section: "Exploitation", description: "Support, tickets et tâches" },
    ],
  },
  {
    id: "accounting",
    icon: Calculator,
    shortLabel: "Compta",
    label: "Comptabilité",
    description: "Écritures, plan de comptes et, au fil des lots, trésorerie, achats, immobilisations et clôture.",
    items: [
      { path: "/accounting/entries", label: "Écritures", icon: FileText, permissions: ["ACCOUNTING_REPORT:READ"], section: "Saisie", description: "Saisir, valider et contrepasser les écritures" },
      { path: "/accounting/accounts", label: "Plan de comptes", icon: Layers, permissions: ["ACCOUNTING_REPORT:READ"], section: "Saisie", description: "Comptes SYSCOHADA, création et historique" },
      { path: "/accounting/treasury", label: "Trésorerie", icon: Landmark, permissions: ["ACCOUNTING_REPORT:READ"], section: "Trésorerie", description: "Banques, rapprochements, chèques, caisses et taux de change" },
      { path: "/accounting/purchases", label: "Achats", icon: ShoppingBag, permissions: ["PURCHASE:READ"], section: "Tiers", description: "Fournisseurs, commandes, factures, paiements et retenues" },
      { path: "/accounting/sales-control", label: "Contrôle des ventes", icon: BarChart3, permissions: ["ACCOUNTING_REPORT:READ"], section: "Tiers", description: "Cohérence facturation, portefeuille et comptabilité" },
      { path: "/accounting/vat", label: "Déclarations de TVA", icon: Receipt, permissions: ["VAT_RETURN:READ"], section: "Déclarations", description: "Préparer, valider et liquider la TVA" },
      { path: "/accounting/fixed-assets", label: "Immobilisations", icon: Package, permissions: ["ACCOUNTING_REPORT:READ"], section: "Actifs", description: "Biens, dotations, inventaires et états" },
      { path: "/accounting/analytic", label: "Analytique", icon: Layers, permissions: ["ANALYTIC_REPORT:READ"], section: "Pilotage", description: "Sections, ventilation et états analytiques" },
      { path: "/accounting/budget", label: "Budget", icon: Wallet, permissions: ["BUDGET_REPORT:READ"], section: "Pilotage", description: "Versions, suivi, prévisions et virements" },
      { path: "/accounting/period", label: "Fin de période", icon: CalendarClock, permissions: ["ACCOUNTING_REPORT:READ"], section: "Clôture", description: "Constatations, provisions, financement, paie et comptabilisation" },
      { path: "/accounting/closing", label: "Clôture et états", icon: Lock, permissions: ["ACCOUNTING_REPORT:READ"], section: "Clôture", description: "États financiers, clôture, liasse et gestion" },
      { path: "/accounting/exchange", label: "Échanges", icon: ArrowLeftRight, permissions: ["ACCOUNTING_REPORT:READ"], section: "Clôture", description: "Exports, reprise, double tenue et archives" },
      { path: "/accounting/fund", label: "Demandes de fonds", icon: Banknote, permissions: ["FUND_REQUEST:CREATE"], section: "Dépenses", description: "États de besoin, avances, décaissements et justification" },
      { path: "/accounting/approvals", label: "Approbations", icon: ShieldCheck, permissions: ["ADMIN:ACCESS"], section: "Dépenses", description: "Validations, circuits, organigramme et délégations" },
    ],
  },
  {
    id: "system",
    label: null,
    pinned: true,
    items: [
      {
        path: "/settings",
        label: "Paramètres",
        icon: Settings,
        permissions: [
          ...read("USER"),
          ...read("ROLE"),
          ...read("PERMISSION"),
          "SYSTEM:USERS",
          "SYSTEM:ROLES",
          "SYSTEM:PERMISSIONS",
        ],
      },
      {
        path: "/audit",
        label: "Audit",
        icon: ScrollText,
        permissions: ["SYSTEM:AUDIT"],
      },
    ],
  },
];

export type AccessChecker = {
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
};

/** L'utilisateur peut-il ouvrir cette page ? */
export const canAccess = (permissions: string[] | undefined, access: AccessChecker) =>
  access.isAdmin ||
  !permissions ||
  permissions.length === 0 ||
  permissions.some((permission) => access.hasPermission(permission));

/** Page d'une famille : les modules y sont présentés avec leur description. */
export const hubPath = (group: AdminNavGroup) => `/section/${group.id}`;

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export const isItemActive = (pathname: string, item: AdminNavItem) => {
  if (item.path === "/") return pathname === "/";
  if (item.excludeUnder?.some((base) => under(pathname, base))) return false;
  return under(pathname, item.path) || !!item.alsoActiveUnder?.some((base) => under(pathname, base));
};

export const primaryItems = adminNavGroups.flatMap((group) => group.items).filter((item) => item.primary);