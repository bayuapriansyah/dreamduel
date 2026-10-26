export function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "--";
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}%` : `${s}%`;
}

export function fmtUsd(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "--";
  const abs = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${v < 0 ? "-" : ""}$${abs}`;
}

export function fmtSignedUsd(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return "--";
  return v > 0 ? `+${fmtUsd(v, digits)}` : fmtUsd(v, digits);
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function toneOf(v: number | null | undefined): string {
  if (v == null || Math.abs(v) < 0.005) return "text-muted";
  return v > 0 ? "text-up" : "text-down";
}

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export const EXPLORER = "https://explorer.testnet.somnia.network/tokyo";
export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`;
export const addrUrl = (a: string) => `${EXPLORER}/address/${a}`;
