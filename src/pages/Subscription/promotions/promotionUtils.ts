import type { Promotion } from "../../../services/subscription.service";
import { formatMoney } from "../../../components/subscription/kitUtils";

/** Valeur affichée : seuls les pourcentages et montants fixes ont une valeur chiffrée. */
export const discountValueText = (promo: Promotion): string => {
  if (promo.discountType === "PERCENTAGE") return `${promo.discountValue}%`;
  if (promo.discountType === "FIXED_AMOUNT") return formatMoney(promo.discountValue);
  return "";
};
