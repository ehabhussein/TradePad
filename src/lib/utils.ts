import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(n: number | null | undefined, opts: { sign?: boolean } = {}) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = opts.sign && n > 0 ? "+" : "";
  return sign + n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

export function formatNumber(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function pnlColor(n: number | null | undefined) {
  if (n == null || n === 0) return "text-muted-foreground";
  return n > 0 ? "text-profit" : "text-loss";
}

export function pnlBg(n: number | null | undefined, intensity = 1) {
  if (n == null || n === 0) return "bg-muted/40";
  const opacity = Math.min(100, Math.round(Math.abs(n) * 20 * intensity));
  if (n > 0) return `bg-profit/[0.${Math.min(80, opacity).toString().padStart(2, "0")}]`;
  return `bg-loss/[0.${Math.min(80, opacity).toString().padStart(2, "0")}]`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function calcRMultiple(entry: number, exit: number, sl: number, direction: "BUY" | "SELL") {
  const risk = Math.abs(entry - sl);
  if (risk === 0) return 0;
  const reward = direction === "BUY" ? exit - entry : entry - exit;
  return reward / risk;
}
