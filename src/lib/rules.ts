// Duel rules shared by the server engine and the browser UI.

export const DUEL_MARKETS = ["BTC/USDso:USDso", "ETH/USDso:USDso"] as const;
export type DuelMarket = (typeof DUEL_MARKETS)[number];

/** Allowed duel lengths, in minutes. */
export const DUEL_DURATIONS_MIN = [5, 15, 30, 60] as const;

/** Allowed notional caps, in USDso. The cap is the most notional a player may hold at once. */
export const DUEL_CAPS_USD = [100, 250, 500] as const;

/** A player whose loss reaches this share of the cap is knocked out. */
export const KO_LOSS_SHARE = 0.2;

/** Notional may drift this far over the cap from mark moves before it counts as a foul. */
export const CAP_TOLERANCE = 1.05;

/** Seconds between "both players in" and the opening bell. */
export const COUNTDOWN_SEC = 15;

/** Open challenges nobody accepts are dropped after this long. */
export const OPEN_CHALLENGE_TTL_SEC = 24 * 3600;

/** Returns closer than this (percentage points) are a draw. */
export const DRAW_EPSILON_PCT = 0.01;

export const ELO_START = 1200;
export const ELO_K = 32;

export function marketLabel(symbol: string): string {
  return symbol.split("/")[0] + "-PERP";
}

export function isDuelMarket(s: string): s is DuelMarket {
  return (DUEL_MARKETS as readonly string[]).includes(s);
}
