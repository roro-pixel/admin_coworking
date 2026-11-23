import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fundService } from "../../../services/fund.service";
import { formatDateTime } from "../../../components/subscription/kitUtils";
import { money } from "./fundUtils";

/** Page publique ouverte par le QR d'une pièce : numéro, type, montant, émission, impressions et état. */
export const VoucherVerifyPage: React.FC = () => {
  const { number = "" } = useParams();
  const q = useQuery({ queryKey: ["voucher-verify", number], queryFn: () => fundService.verify(number), retry: false });
  const v = q.data;
  const valid = v?.status === "VALIDE";
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vérification de pièce</p>
        <h1 className="mt-1 font-mono text-lg font-bold text-gray-900">{number}</h1>
        {q.isLoading ? <p className="mt-4 text-sm text-gray-500">Vérification…</p> : q.isError || !v ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Pièce introuvable : ce numéro n'a pas été émis.</p> : (
          <>
            <p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${valid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{valid ? "Pièce authentique et valide" : v.status ?? "État inconnu"}</p>
            <dl className="mt-4 space-y-2 text-sm">
              {([["Type", v.type], ["Montant", v.amount != null ? money(v.amount) : undefined], ["Émise le", v.issuedAt ? formatDateTime(v.issuedAt) : undefined], ["Impressions", v.printCount != null ? String(v.printCount) : undefined]] as [string, string | undefined][]).map(([k, x]) => x && (
                <div key={k} className="flex justify-between gap-3"><dt className="text-gray-500">{k}</dt><dd className="font-medium text-gray-900">{x}</dd></div>
              ))}
            </dl>
          </>
        )}
      </div>
    </div>
  );
};
