import { LOGO_PINK } from "../layout/adminTheme";

export const CHART_COLORS = [LOGO_PINK, "#E8A33D", "#7FB08A", "#9B8FD1", "#E4C7D6", "#B9B4B0"];
export const GRID = "#EFEBE9";

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

export const toSlices = (
  data: Record<string, number> | undefined,
  labels: Record<string, string> = {},
  order?: readonly string[],
  colors: Record<string, string> = {},
): Slice[] => {
  const entries = Object.entries(data ?? {});
  const sorted = order
    ? [...entries].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    : [...entries].sort((a, b) => b[1] - a[1]);
  return sorted.map(([key, value], i) => ({
    key,
    label: labels[key] ?? key,
    value,
    color: colors[key] ?? CHART_COLORS[i % CHART_COLORS.length],
  }));
};

export const niceMax = (v: number): number => {
  if (v <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
};
