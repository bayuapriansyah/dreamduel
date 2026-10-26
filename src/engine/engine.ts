// The referee. Runs inside the Next.js server process (see instrumentation.ts).
// It never holds player funds: it reads equity and positions on-chain, scores, and settles.
import { EventEmitter } from "node:events";
import { decodeFunctionResult, encodeFunctionData, formatUnits, parseAbi, type Address } from "viem";
import { createReactivity, unwrap } from "@somnia-chain/markets-sdk/reactivity";
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { createExchange } from "../lib/exchange";
import {
  addEvent,
  addSample,
  getDuel,
  listDuels,
  transition,
  updateDuel,
  type Duel,
} from "../lib/duels";
import { CAP_TOLERANCE, COUNTDOWN_SEC, KO_LOSS_SHARE, OPEN_CHALLENGE_TTL_SEC, marketLabel } from "../lib/rules";

export class MarginError extends Error {}
import { decide, scorePlayer } from "../lib/scoring";
import { duelView, type DuelView, type LiveSide } from "./view";
import { SparringBot } from "./sparring";

const HEALTH_ABI = parseAbi(["function getAccountHealth(address) view returns (int256,uint256,uint256,uint256)"]);
const POLL_MS = 2000;
const SAMPLE_MS = 5000;
const TICK_MS = 1000;

export interface MarketMeta {
  symbol: string;
  pool: Address;
  marginBank: Address;
  minQty: number;
  amountDecimals: number;
}

interface LiveDuel {
  id: string;
  a: LiveSide;
  b: LiveSide;
  markPrice: number | null;
  lastPoll: number;
  lastSample: number;
  lastPush: number;
  unwatch?: () => Promise<unknown>;
}

const toNum = (raw: bigint) => Number(formatUnits(raw, 18));
const emptySide = (): LiveSide => ({ equity: null, position: 0, notional: 0, entryPrice: null });

export class DuelEngine {
  readonly bus = new EventEmitter();
  readonly exchange: SomniaMarkets;
  readonly markets = new Map<string, MarketMeta>();
  readonly live = new Map<string, LiveDuel>();
  readonly bot: SparringBot | null;
  private timer?: NodeJS.Timeout;
  private ticking = false;
  private ready: Promise<void>;
  reactivityOk = false;

  constructor() {
    this.bus.setMaxListeners(500);
    this.exchange = createExchange();
    const botKey = process.env.SPARRING_PRIVATE_KEY;
    this.bot = botKey ? new SparringBot(botKey, this) : null;
    this.ready = this.loadMarkets();
  }

  private async loadMarkets() {
    const all = await this.exchange.loadMarkets();
    for (const m of Object.values(all) as any[]) {
      if (m.type !== "swap") continue;
      this.markets.set(m.symbol, {
        symbol: m.symbol,
        pool: m.id,
        marginBank: m.info.marginBank,
        minQty: m.limits?.amount?.min ?? 0,
        amountDecimals: m.precision?.amount ?? 4,
      });
    }
    await this.bot?.init();
  }

  async start() {
    await this.ready;
    if (this.timer) return;
    // Re-attach duels that were live before a restart.
    for (const d of listDuels(["live"])) await this.attach(d);
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    console.log(`[engine] started, ${this.markets.size} perp markets, sparring bot: ${this.bot?.address ?? "off"}`);
  }

  market(symbol: string): MarketMeta {
    const m = this.markets.get(symbol);
    if (!m) throw new Error(`Unknown market ${symbol}`);
    return m;
  }

  view(d: Duel): DuelView {
    const l = this.live.get(d.id);
    return duelView(d, l ? { a: l.a, b: l.b, markPrice: l.markPrice } : undefined, this.bot?.address);
  }

  publish(id: string) {
    const d = getDuel(id);
    if (d) this.bus.emit(`duel:${id}`, this.view(d));
    this.bus.emit("lobby");
  }

  /** Called by the API after an opponent joins. */
  scheduleStart(id: string) {
    this.publish(id);
  }

  // ---------------------------------------------------------------- tick

  private async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const now = Date.now();
      for (const d of listDuels(["open"], 200)) {
        if (now - d.createdAt > OPEN_CHALLENGE_TTL_SEC * 1000 && transition(d.id, "open", "expired")) {
          addEvent(d.id, "expired", null, "Nobody took the challenge");
          this.publish(d.id);
        } else if (d.vsBot && this.bot) {
          await this.bot.maybeAccept(d);
        }
      }
      for (const d of listDuels(["starting"])) {
        if (d.startAt != null && d.startAt <= now) await this.openBell(d);
      }
      for (const d of listDuels(["live"])) {
        const l = this.live.get(d.id) ?? (await this.attach(d));
        if (d.endAt != null && d.endAt <= now) {
          await this.closeBell(d, "time");
          continue;
        }
        if (now - l.lastPoll >= POLL_MS) await this.poll(d, l);
        if (now - l.lastSample >= SAMPLE_MS) this.sample(d, l);
        await this.bot?.onLiveTick(d, l);
      }
    } catch (e) {
      console.error("[engine] tick failed", e);
    } finally {
      this.ticking = false;
    }
  }

  // ---------------------------------------------------------------- reads

  async readEquity(account: string, marginBank: Address, blockNumber?: bigint) {
    const eq = await this.exchange.client.getAccountEquity(account as Address, {
      scope: "perps",
      marginBank,
      ...(blockNumber ? { blockNumber } : {}),
    });
    return { equity: toNum(eq.totalEquity), block: eq.asOfBlock };
  }

  /** Refuse a seat to an account that could not survive to the KO line. */
  async assertMargin(account: string, market: string, capUsd: number) {
    const need = capUsd * KO_LOSS_SHARE;
    const { equity } = await this.readEquity(account, this.market(market).marginBank);
    if (equity < need) {
      throw new MarginError(
        `Perps margin is $${equity.toFixed(2)}. Deposit at least $${need.toFixed(0)} USDso as margin (Setup page) to take a $${capUsd} duel.`,
      );
    }
  }

  async readPositions(account: string, m: MarketMeta) {
    const rows = await this.exchange.client.listPerpPositionAnalytics({ marginBank: m.marginBank, account: account as Address });
    let notional = 0;
    let position = 0;
    let entryPrice: number | null = null;
    for (const r of rows as any[]) {
      if (!r.priceable) continue;
      notional += toNum(r.notional);
      if (r.pool.toLowerCase() === m.pool.toLowerCase()) {
        // Size in human base units from notional/mark, so per-market base decimals never matter.
        const mark = toNum(r.markPrice);
        position = mark ? (Math.sign(Number(r.size)) * toNum(r.notional)) / mark : 0;
        entryPrice = toNum(r.avgEntryPrice);
      }
    }
    return { notional, position, entryPrice };
  }

  private async netFlows(account: string, fromMs: number, toMs: number): Promise<number> {
    const rows = await this.exchange.client.getMarginEvents(account, { kinds: ["Deposit", "Credited", "Withdraw"], limit: 100 });
    let flows = 0;
    for (const r of rows) {
      const ts = Number(r.timestamp) * 1000;
      if (ts < fromMs || ts > toMs) continue;
      const amt = toNum(BigInt(r.amount));
      flows += r.kind === "Withdraw" ? -amt : amt;
    }
    return flows;
  }

  // ---------------------------------------------------------------- lifecycle

  /** Both players in: start the countdown. */
  arm(id: string) {
    const startAt = Date.now() + COUNTDOWN_SEC * 1000;
    const d = getDuel(id)!;
    updateDuel(id, { startAt, endAt: startAt + d.durationMin * 60_000 });
    addEvent(id, "armed", null, `Both duelists in. Opening bell in ${COUNTDOWN_SEC}s`);
    this.publish(id);
  }

  private async openBell(d: Duel) {
    const m = this.market(d.market);
    const [a, b] = await Promise.all([this.readEquity(d.creator, m.marginBank), this.readEquity(d.opponent!, m.marginBank)]);
    if (!transition(d.id, "starting", "live", { startEqA: a.equity, startEqB: b.equity, startBlock: String(a.block) })) return;
    addEvent(d.id, "bell", null, `Opening bell at block ${a.block}. Equity A $${a.equity.toFixed(2)}, B $${b.equity.toFixed(2)}`);
    await this.attach(getDuel(d.id)!);
    this.publish(d.id);
  }

  private async attach(d: Duel): Promise<LiveDuel> {
    const existing = this.live.get(d.id);
    if (existing) return existing;
    const l: LiveDuel = { id: d.id, a: emptySide(), b: emptySide(), markPrice: null, lastPoll: 0, lastSample: 0, lastPush: 0 };
    this.live.set(d.id, l);
    await this.watch(d, l).catch((e) => console.warn(`[engine] reactivity watch failed for ${d.id}, polling only`, e?.message));
    return l;
  }

  /**
   * Somnia Reactivity: subscribe to every log the duel market's pool emits, and have the node
   * run MarginBank.getAccountHealth for both duelists in the same block. Each push carries
   * fresh equity, so the scoreboard moves with the chain instead of with a polling timer.
   */
  private async watch(d: Duel, l: LiveDuel) {
    const m = this.market(d.market);
    const call = (who: string) => ({
      to: m.marginBank,
      data: encodeFunctionData({ abi: HEALTH_ABI, functionName: "getAccountHealth", args: [who as Address] }),
    });
    const reactivity = createReactivity(this.exchange.client);
    const sub = unwrap(
      await reactivity.watch({
        eventContractSources: [m.pool],
        ethCalls: [call(d.creator), call(d.opponent!)],
        onlyPushChanges: true,
        onData: (n: any) => {
          const [ra, rb] = n.result.simulationResults as `0x${string}`[];
          try {
            const [ea] = decodeFunctionResult({ abi: HEALTH_ABI, functionName: "getAccountHealth", data: ra! });
            const [eb] = decodeFunctionResult({ abi: HEALTH_ABI, functionName: "getAccountHealth", data: rb! });
            // Health equity excludes collateral locked behind resting orders. Duel orders are
            // IOC, so nothing rests; the 2s poll reads totalEquity and corrects any drift.
            l.a.equity = toNum(ea as bigint);
            l.b.equity = toNum(eb as bigint);
            this.reactivityOk = true;
            const now = Date.now();
            if (now - l.lastPush > 250) {
              l.lastPush = now;
              this.publish(d.id);
            }
          } catch {
            /* a malformed push is skipped; the poll covers it */
          }
        },
      } as any),
    );
    l.unwatch = () => sub.unsubscribe();
  }

  private async poll(d: Duel, l: LiveDuel) {
    l.lastPoll = Date.now();
    const m = this.market(d.market);
    try {
      const [ea, eb, pa, pb] = await Promise.all([
        this.readEquity(d.creator, m.marginBank),
        this.readEquity(d.opponent!, m.marginBank),
        this.readPositions(d.creator, m),
        this.readPositions(d.opponent!, m),
      ]);
      this.applyPositions(d, "A", l.a, pa);
      this.applyPositions(d, "B", l.b, pb);
      l.a.equity = ea.equity;
      l.b.equity = eb.equity;
      const t = await this.exchange.fetchTicker(d.market).catch(() => null);
      l.markPrice = t?.markPrice ?? l.markPrice;
    } catch (e: any) {
      console.warn(`[engine] poll ${d.id} failed: ${e?.message}`);
      return;
    }
    const fresh = getDuel(d.id)!;
    // KO ends the duel on the spot.
    for (const who of ["A", "B"] as const) {
      const start = who === "A" ? fresh.startEqA : fresh.startEqB;
      const eq = who === "A" ? l.a.equity : l.b.equity;
      if (start == null || eq == null) continue;
      const s = scorePlayer({ startEquity: start, endEquity: eq, netFlows: 0, traded: true, fouled: false }, fresh.capUsd);
      if (s.ko) {
        addEvent(d.id, "ko", who, `${who} is knocked out at ${s.returnPct.toFixed(2)}%`);
        await this.closeBell(fresh, "ko");
        return;
      }
    }
    this.publish(d.id);
  }

  private applyPositions(d: Duel, who: "A" | "B", side: LiveSide, p: { notional: number; position: number; entryPrice: number | null }) {
    const label = marketLabel(d.market);
    const before = side.position;
    side.position = p.position;
    side.notional = p.notional;
    side.entryPrice = p.entryPrice;
    const tradedKey = who === "A" ? "tradedA" : "tradedB";
    const fouledKey = who === "A" ? "fouledA" : "fouledB";
    if (p.position !== 0 && !(who === "A" ? d.tradedA : d.tradedB)) updateDuel(d.id, { [tradedKey]: true });
    if (Math.abs(p.position - before) > 1e-9 && !(before === 0 && p.position === 0)) {
      const dir = p.position > 0 ? "long" : p.position < 0 ? "short" : "flat";
      const text =
        dir === "flat"
          ? `${who} closed ${label}`
          : `${who} is ${dir} ${Math.abs(p.position).toPrecision(3)} ${label.split("-")[0]} ($${p.notional.toFixed(0)} notional)`;
      addEvent(d.id, "position", who, text);
    }
    if (p.notional > d.capUsd * CAP_TOLERANCE && !(who === "A" ? d.fouledA : d.fouledB)) {
      updateDuel(d.id, { [fouledKey]: true });
      addEvent(d.id, "foul", who, `${who} broke the $${d.capUsd} cap with $${p.notional.toFixed(0)} notional`);
    }
  }

  private sample(d: Duel, l: LiveDuel) {
    l.lastSample = Date.now();
    if (d.startEqA == null || d.startEqB == null || l.a.equity == null || l.b.equity == null) return;
    const ret = (start: number, eq: number) => ((eq - start) / d.capUsd) * 100;
    addSample(d.id, l.lastSample, ret(d.startEqA, l.a.equity), ret(d.startEqB, l.b.equity));
  }

  private async closeBell(d: Duel, reason: "time" | "ko") {
    if (!transition(d.id, "live", "settling")) return;
    const l = this.live.get(d.id);
    await l?.unwatch?.().catch(() => {});
    this.live.delete(d.id);
    const m = this.market(d.market);
    const endMs = Date.now();
    try {
      const a = await this.readEquity(d.creator, m.marginBank);
      const b = await this.readEquity(d.opponent!, m.marginBank, a.block);
      const [flowsA, flowsB] = await Promise.all([
        this.netFlows(d.creator, d.startAt!, endMs).catch(() => 0),
        this.netFlows(d.opponent!, d.startAt!, endMs).catch(() => 0),
      ]);
      const fresh = getDuel(d.id)!;
      const sa = scorePlayer(
        { startEquity: fresh.startEqA!, endEquity: a.equity, netFlows: flowsA, traded: fresh.tradedA, fouled: fresh.fouledA },
        fresh.capUsd,
      );
      const sb = scorePlayer(
        { startEquity: fresh.startEqB!, endEquity: b.equity, netFlows: flowsB, traded: fresh.tradedB, fouled: fresh.fouledB },
        fresh.capUsd,
      );
      const outcome = decide(sa, sb);
      transition(d.id, "settling", "settled", {
        endEqA: a.equity,
        endEqB: b.equity,
        flowsA,
        flowsB,
        outcome,
        settledAt: endMs,
        endAt: reason === "ko" ? endMs : fresh.endAt,
        endBlock: String(a.block),
      });
      const verdict = outcome === "draw" ? "Draw" : `${outcome} wins`;
      addEvent(
        d.id,
        "settled",
        outcome === "draw" ? null : outcome,
        `${reason === "ko" ? "KO! " : "Closing bell. "}${verdict}: A ${sa.returnPct.toFixed(2)}% vs B ${sb.returnPct.toFixed(2)}% (block ${a.block})`,
      );
    } catch (e: any) {
      console.error(`[engine] settle ${d.id} failed, retrying next tick`, e);
      transition(d.id, "settling", "live");
      return;
    }
    await this.bot?.onSettled(d.id);
    this.publish(d.id);
  }
}

const g = globalThis as unknown as { __dreamduelEngine?: DuelEngine };

export function engine(): DuelEngine {
  if (!g.__dreamduelEngine) g.__dreamduelEngine = new DuelEngine();
  return g.__dreamduelEngine;
}
