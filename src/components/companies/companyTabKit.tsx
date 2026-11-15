import React from "react";
import { saveBlob } from "../payment/paymentUtils";
import { toast } from "../ui/toastStore";
import { apiMessage } from "../subscription/kitUtils";

/** Télécharge un fichier produit */
export const downloadFile = async (load: () => Promise<Blob>, fileName: string, failure: string): Promise<void> => {
  try {
    saveBlob(await load(), fileName);
  } catch (e) {
    toast.error(apiMessage(e, failure));
  }
};

export const toNumber = (v: string): number | undefined => {
  const t = v.trim().replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

export const numText = (n?: number | null): string => (n == null ? "" : String(n));

/** Libellé d'une valeur et de son unité */
export const amountOf = (n: number | null | undefined, unit?: string): string =>
  n == null ? "" : `${n.toLocaleString("fr-FR")}${unit ? ` ${unit}` : ""}`;

export const Stat: React.FC<{ label: string; value: string; tone?: "default" | "danger" }> = ({ label, value, tone = "default" }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-gray-500">{label}</p>
    <p className={`mt-1 text-lg font-bold tabular-nums ${tone === "danger" ? "text-red-600" : "text-gray-950"}`}>{value}</p>
  </div>
);
