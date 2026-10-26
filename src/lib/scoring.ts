// Pure scoring: no I/O, so the engine, the UI and the tests agree on every number.
import { DRAW_EPSILON_PCT, ELO_K, ELO_START, KO_LOSS_SHARE } from "./rules";

export interface PlayerTally {
  /** Perps total equity (USDso) at the opening bell. */
  startEquity: number;
  /** Perps total equity (USDso) at the closing bell, or latest while live. */
  endEquity: number;
  /** Deposits + credits − withdrawals inside the window (USDso). Not trading gains. */
  netFlows: number;
  /** Held a non-zero position at some point during the duel. */
  traded: boolean;
  /** Exceeded the notional cap. */
  fouled: boolean;
}

export interface PlayerScore {
  pnl: number;
  returnPct: number;
  ko: boolean;
  disqualified: boolean;
}

export type Outcome = "A" | "B" | "draw";

export function scorePlayer(t: PlayerTally, capUsd: number): PlayerScore {
  const pnl = t.endEquity - t.startEquity - t.netFlows;
  const returnPct = (pnl / capUsd) * 100;
  return {
    pnl,
    returnPct,
    ko: pnl <= -capUsd * KO_LOSS_SHARE,
    disqualified: t.fouled || !t.traded,
  };
}

/** Decide a duel. Disqualification beats KO, KO beats return. */
export function decide(a: PlayerScore, b: PlayerScore): Outcome {
  if (a.disqualified || b.disqualified) {
    if (a.disqualified && b.disqualified) return "draw";
    return a.disqualified ? "B" : "A";
  }
  if (a.ko !== b.ko) return a.ko ? "B" : "A";
  const diff = a.returnPct - b.returnPct;
  if (Math.abs(diff) < DRAW_EPSILON_PCT) return "draw";
  return diff > 0 ? "A" : "B";
}

export function eloExpected(ra: number, rb: number): number {
  return 1 / (1 + 10 ** ((rb - ra) / 400));
}

/** New ratings after one game. */
export function eloUpdate(ra: number, rb: number, outcome: Outcome): [number, number] {
  const sa = outcome === "A" ? 1 : outcome === "B" ? 0 : 0.5;
  const ea = eloExpected(ra, rb);
  const delta = ELO_K * (sa - ea);
  return [ra + delta, rb - delta];
}

export interface RatedGame {
  a: string;
  b: string;
  outcome: Outcome;
}

export interface LadderRow {
  address: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
}

/** Replay settled games in order into a ladder, best rating first. */
export function buildLadder(games: readonly RatedGame[]): LadderRow[] {
  const rows = new Map<string, LadderRow>();
  const row = (address: string) => {
    const key = address.toLowerCase();
    let r = rows.get(key);
    if (!r) rows.set(key, (r = { address: key, rating: ELO_START, wins: 0, losses: 0, draws: 0, streak: 0 }));
    return r;
  };
  for (const g of games) {
    const ra = row(g.a);
    const rb = row(g.b);
    [ra.rating, rb.rating] = eloUpdate(ra.rating, rb.rating, g.outcome);
    if (g.outcome === "draw") {
      ra.draws++, rb.draws++;
      ra.streak = rb.streak = 0;
    } else {
      const [w, l] = g.outcome === "A" ? [ra, rb] : [rb, ra];
      w.wins++, l.losses++;
      w.streak = w.streak > 0 ? w.streak + 1 : 1;
      l.streak = l.streak < 0 ? l.streak - 1 : -1;
    }
  }
  return [...rows.values()].sort((x, y) => y.rating - x.rating);
}
