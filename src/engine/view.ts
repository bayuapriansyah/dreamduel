// The public shape of a duel, served by the API and pushed over SSE.
import type { Duel } from "../lib/duels";
import { scorePlayer, decide, type Outcome, type PlayerScore } from "../lib/scoring";

export interface LiveSide {
  equity: number | null;
  /** Signed position size on the duel market, base units. */
  position: number;
  notional: number;
  entryPrice: number | null;
}

export interface SideView {
  address: string | null;
  isBot: boolean;
  startEquity: number | null;
  equity: number | null;
  position: number;
  notional: number;
  entryPrice: number | null;
  score: PlayerScore | null;
  traded: boolean;
  fouled: boolean;
}

export interface DuelView {
  id: string;
  market: string;
  durationMin: number;
  capUsd: number;
  vsBot: boolean;
  status: Duel["status"];
  createdAt: number;
  startAt: number | null;
  endAt: number | null;
  serverNow: number;
  a: SideView;
  b: SideView;
  /** Final outcome once settled; the current leader while live. */
  outcome: Outcome | null;
  leader: Outcome | null;
  markPrice: number | null;
  startBlock: string | null;
  endBlock: string | null;
}

export function duelView(
  d: Duel,
  live?: { a: LiveSide; b: LiveSide; markPrice: number | null },
  botAddress?: string | null,
): DuelView {
  const side = (who: "A" | "B"): SideView => {
    const isA = who === "A";
    const address = isA ? d.creator : d.opponent;
    const startEquity = isA ? d.startEqA : d.startEqB;
    const finalEquity = isA ? d.endEqA : d.endEqB;
    const l = live ? (isA ? live.a : live.b) : null;
    const equity = finalEquity ?? l?.equity ?? null;
    const traded = (isA ? d.tradedA : d.tradedB) || (l ? l.position !== 0 : false);
    const fouled = isA ? d.fouledA : d.fouledB;
    const score =
      startEquity != null && equity != null
        ? scorePlayer(
            { startEquity, endEquity: equity, netFlows: isA ? d.flowsA : d.flowsB, traded, fouled },
            d.capUsd,
          )
        : null;
    return {
      address,
      isBot: !!botAddress && !!address && address.toLowerCase() === botAddress.toLowerCase(),
      startEquity,
      equity,
      position: l?.position ?? 0,
      notional: l?.notional ?? 0,
      entryPrice: l?.entryPrice ?? null,
      score,
      traded,
      fouled,
    };
  };
  const a = side("A");
  const b = side("B");
  return {
    id: d.id,
    market: d.market,
    durationMin: d.durationMin,
    capUsd: d.capUsd,
    vsBot: d.vsBot,
    status: d.status,
    createdAt: d.createdAt,
    startAt: d.startAt,
    endAt: d.endAt,
    serverNow: Date.now(),
    a,
    b,
    outcome: d.outcome,
    leader: a.score && b.score ? decide(a.score, b.score) : null,
    markPrice: live?.markPrice ?? null,
    startBlock: d.startBlock,
    endBlock: d.endBlock,
  };
}
