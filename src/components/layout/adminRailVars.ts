import type { CSSProperties } from "react";

export const adminRailVars = {
  "--item": "clamp(26px, calc((100vh - 184px - 5 * var(--block-gap) - 9 * var(--item-gap)) / 15), 64px)",
  "--item-gap": "clamp(1px, 0.35vh, 5px)",
  "--block-gap": "clamp(6px, 1.1vh, 18px)",
  "--rail-pad-y": "clamp(4px, 0.7vh, 12px)",
  "--icon": "calc(var(--item) * 0.72)",
  "--rail-offset": "calc(var(--item) + 44px + 1rem)",
} as CSSProperties;