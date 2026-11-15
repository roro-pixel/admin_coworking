import type { ElementType } from "react";
import {
  BarChart3,
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
  Package,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";

const read = (module: string) => [`${module}:READ`, `${module}_READ`];

export type AdminNavItem = {
  path: string;
  label: string;
  shortLabel?: string;
  icon: ElementType;
  permissions?: string[];
  primary?: boolean;
  description?: string;
  section?: string;
};

export type AdminNavGroup = {
  id: string;
  label: string | null;
  icon?: ElementType;
  shortLabel?: string;
  description?: string;
  items: AdminNavItem[];
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
      { path: "/payments", label: "Paiements", icon: CreditCard, permissions: read("PAYMENT"), section: "Encaissements", description: "Paiements, caisse et clôtures" },
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
      { path: "/services", label: "Services", icon: ConciergeBell, section: "Exploitation", description: "Catalogue de services et contrats de domiciliation" },
      { path: "/inventory", label: "Inventaire", icon: Package, permissions: read("INVENTORY"), section: "Exploitation", description: "Articles, emplacements et mouvements de stock" },
      { path: "/marketplace", label: "Marketplace", icon: ShoppingBag, section: "Exploitation", description: "Offres de la boutique et commandes au comptoir" },
      { path: "/operations", label: "Opérations", icon: Briefcase, permissions: read("OPERATION"), section: "Exploitation", description: "Support, tickets et tâches" },
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
    ],
  },
];

export type AccessChecker = {
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
};

export const canAccess = (permissions: string[] | undefined, access: AccessChecker) =>
  access.isAdmin ||
  !permissions ||
  permissions.length === 0 ||
  permissions.some((permission) => access.hasPermission(permission));

export const hubPath = (group: AdminNavGroup) => `/section/${group.id}`;

export const isItemActive = (pathname: string, item: AdminNavItem) =>
  item.path === "/"
    ? pathname === "/"
    : pathname === item.path || pathname.startsWith(`${item.path}/`);

export const primaryItems = adminNavGroups.flatMap((group) => group.items).filter((item) => item.primary);