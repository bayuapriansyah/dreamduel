// Sparring Bot: a house opponent so nobody waits for a human to accept.
// Its own faucet-funded EOA, its own MarginBank account; it plays one duel at a time
// so its equity is never shared between two scoreboards.
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { createExchange } from "../lib/exchange";
import { addEvent, getDuel, listDuels, transition, type Duel } from "../lib/duels";
import { marketLabel } from "../lib/rules";
import type { DuelEngine } from "./engine";
import type { LiveSide } from "./view";

const DECIDE_EVERY_MS = [18_000, 40_000] as const;
const FLATTEN_BEFORE_END_MS = 12_000;

export class SparringBot {
  readonly ex: SomniaMarkets;
  address: string | null = null;
  private busy = false;
  private nextDecision = 0;
  private marks: number[] = [];

  constructor(
    privateKey: string,
    private readonly engine: DuelEngine,
  ) {
    this.ex = createExchange(privateKey);
  }

  async init() {
    await this.ex.loadMarkets();
    this.address = this.ex.walletAddress!.toLowerCase();
  }

  private inPlay(): boolean {
    return listDuels(["starting", "live", "settling"]).some((d) => d.opponent === this.address);
  }

  async maybeAccept(d: Duel) {
    if (!this.address || d.creator === this.address || this.inPlay()) return;
    if (!transition(d.id, "open", "starting", { opponent: this.address })) return;
    addEvent(d.id, "joined", "B", "Sparring Bot accepted the challenge");
    this.nextDecision = 0;
    this.marks = [];
    this.engine.arm(d.id);
  }

  async onLiveTick(d: Duel, l: { b: LiveSide; markPrice: number | null; a: LiveSide }) {
    if (d.opponent !== this.address || this.busy) return;
    const now = Date.now();
    if (l.markPrice) this.marks.push(l.markPrice), this.marks.splice(0, Math.max(0, this.marks.length - 30));
    const position = l.b.position;
    if (d.endAt! - now < FLATTEN_BEFORE_END_MS) {
      if (position !== 0) await this.trade(d, -position, "flattens before the bell");
      return;
    }
    if (now < this.nextDecision) return;
    this.nextDecision = now + DECIDE_EVERY_MS[0] + Math.random() * (DECIDE_EVERY_MS[1] - DECIDE_EVERY_MS[0]);

    const mark = l.markPrice ?? this.marks.at(-1);
    if (!mark) return;
    // Short-horizon momentum with a coin-flip tiebreak: readable, beatable, never idle.
    const first = this.marks[0] ?? mark;
    const drift = (mark - first) / first;
    const dir = Math.abs(drift) > 0.0002 ? Math.sign(drift) : Math.random() < 0.5 ? 1 : -1;
    const wantFlat = position !== 0 && Math.random() < 0.2;
    const targetNotional = d.capUsd * (0.4 + Math.random() * 0.45);
    const target = wantFlat ? 0 : (dir * targetNotional) / mark;
    const delta = target - position;
    if (Math.abs(delta * mark) < d.capUsd * 0.1) return;
    await this.trade(d, delta, wantFlat ? "takes profit" : dir > 0 ? "goes long" : "goes short");
  }

  async onSettled(id: string) {
    const d = getDuel(id);
    if (!d || d.opponent !== this.address) return;
    const [pos] = await this.ex.fetchPositions([d.market]).catch(() => []);
    if (pos && pos.contracts > 0) await this.trade(d, pos.side === "long" ? -pos.contracts : pos.contracts, "cleans up", false);
  }

  private async trade(d: Duel, delta: number, why: string, log = true) {
    const meta = this.engine.market(d.market);
    const step = 10 ** meta.amountDecimals;
    const qty = Math.floor(Math.abs(delta) * step) / step;
    if (qty < meta.minQty) return;
    this.busy = true;
    try {
      const o = await this.ex.createOrder(d.market, "market", delta > 0 ? "buy" : "sell", qty);
      const hash = (o.info as any)?.hash as string | undefined;
      if (log) addEvent(d.id, "trade", "B", `Sparring Bot ${why}: ${delta > 0 ? "buy" : "sell"} ${qty} ${marketLabel(d.market).split("-")[0]}`, hash);
    } catch (e: any) {
      console.warn(`[sparring] ${d.id} order failed: ${e?.errorName ?? e?.message}`);
    } finally {
      this.busy = false;
    }
  }
}
