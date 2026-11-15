import type { CSSProperties } from "react";

export const LOGO_PINK = "#C290AD";
export const LOGO_PINK_DARK = "#8A4F6E";

export const brandVars = {
  "--logo-pink": LOGO_PINK,
  "--logo-pink-dark": LOGO_PINK_DARK,
} as CSSProperties;

export const NAV_REST = "text-gray-900";
export const NAV_HOVER =
  "hover:bg-[color:color-mix(in_srgb,var(--logo-pink)_16%,white)] hover:text-[color:var(--logo-pink-dark)]";
export const NAV_ACTIVE =
  "bg-[color:color-mix(in_srgb,var(--logo-pink)_24%,white)] text-[color:var(--logo-pink-dark)] font-semibold";
export const NAV_FOCUS =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--logo-pink)] focus-visible:ring-offset-2";