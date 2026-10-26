// Duel persistence. Rows are plain objects; the engine owns state transitions.
import { randomBytes } from "node:crypto";
import { db } from "./db";
import type { Outcome } from "./scoring";

export type DuelStatus = "open" | "starting" | "live" | "settling" | "settled" | "cancelled" | "expired";

export interface Duel {
  id: string;
  market: string;
  durationMin: number;
  capUsd: number;
  creator: string;
  opponent: string | null;
  vsBot: boolean;
  status: DuelStatus;
  createdAt: number;
  startAt: number | null;
  endAt: number | null;
  startEqA: number | null;
  startEqB: number | null;
  endEqA: number | null;
  endEqB: number | null;
  flowsA: number;
  flowsB: number;
  tradedA: boolean;
  tradedB: boolean;
  fouledA: boolean;
  fouledB: boolean;
  outcome: Outcome | null;
  settledAt: number | null;
  startBlock: string | null;
  endBlock: string | null;
}

export interface DuelEvent {
  id: number;
  duelId: string;
  ts: number;
  kind: string;
  side: "A" | "B" | null;
  text: string;
  txHash: string | null;
}

type Row = Record<string, unknown>;

function toDuel(r: Row): Duel {
  return {
    id: r.id as string,
    market: r.market as string,
    durationMin: Number(r.duration_min),
    capUsd: Number(r.cap_usd),
    creator: r.creator as string,
    opponent: (r.opponent as string) ?? null,
    vsBot: Boolean(r.vs_bot),
    status: r.status as DuelStatus,
    createdAt: Number(r.created_at),
    startAt: r.start_at == null ? null : Number(r.start_at),
    endAt: r.end_at == null ? null : Number(r.end_at),
    startEqA: (r.start_eq_a as number) ?? null,
    startEqB: (r.start_eq_b as number) ?? null,
    endEqA: (r.end_eq_a as number) ?? null,
    endEqB: (r.end_eq_b as number) ?? null,
    flowsA: Number(r.flows_a),
    flowsB: Number(r.flows_b),
    tradedA: Boolean(r.traded_a),
    tradedB: Boolean(r.traded_b),
    fouledA: Boolean(r.fouled_a),
    fouledB: Boolean(r.fouled_b),
    outcome: (r.outcome as Outcome) ?? null,
    settledAt: r.settled_at == null ? null : Number(r.settled_at),
    startBlock: (r.start_block as string) ?? null,
    endBlock: (r.end_block as string) ?? null,
  };
}

const COLUMNS: Record<string, string> = {
  opponent: "opponent",
  status: "status",
  startAt: "start_at",
  endAt: "end_at",
  startEqA: "start_eq_a",
  startEqB: "start_eq_b",
  endEqA: "end_eq_a",
  endEqB: "end_eq_b",
  flowsA: "flows_a",
  flowsB: "flows_b",
  tradedA: "traded_a",
  tradedB: "traded_b",
  fouledA: "fouled_a",
  fouledB: "fouled_b",
  outcome: "outcome",
  settledAt: "settled_at",
  startBlock: "start_block",
  endBlock: "end_block",
};

export function createDuel(p: {
  market: string;
  durationMin: number;
  capUsd: number;
  creator: string;
  vsBot: boolean;
}): Duel {
  const id = randomBytes(5).toString("hex");
  db()
    .prepare(
      `INSERT INTO duels (id, market, duration_min, cap_usd, creator, vs_bot, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
    )
    .run(id, p.market, p.durationMin, p.capUsd, p.creator.toLowerCase(), p.vsBot ? 1 : 0, Date.now());
  addEvent(id, "created", "A", `Challenge posted: ${p.market.split("/")[0]}-PERP, ${p.durationMin} min, $${p.capUsd} cap`);
  return getDuel(id)!;
}

export function getDuel(id: string): Duel | null {
  const r = db().prepare("SELECT * FROM duels WHERE id = ?").get(id) as Row | undefined;
  return r ? toDuel(r) : null;
}

export function listDuels(statuses: readonly DuelStatus[], limit = 50): Duel[] {
  const marks = statuses.map(() => "?").join(",");
  const rows = db()
    .prepare(`SELECT * FROM duels WHERE status IN (${marks}) ORDER BY created_at DESC LIMIT ?`)
    .all(...statuses, limit) as Row[];
  return rows.map(toDuel);
}

export function listDuelsFor(address: string, limit = 50): Duel[] {
  const a = address.toLowerCase();
  const rows = db()
    .prepare("SELECT * FROM duels WHERE creator = ? OR opponent = ? ORDER BY created_at DESC LIMIT ?")
    .all(a, a, limit) as Row[];
  return rows.map(toDuel);
}

/** Settled duels oldest first, for the ladder replay. */
export function listSettledChronological(): Duel[] {
  const rows = db().prepare("SELECT * FROM duels WHERE status = 'settled' ORDER BY settled_at ASC").all() as Row[];
  return rows.map(toDuel);
}

export function updateDuel(id: string, patch: Partial<Duel>): void {
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  for (const [k, v] of Object.entries(patch)) {
    const col = COLUMNS[k];
    if (!col) throw new Error(`updateDuel: column ${k} is not updatable`);
    sets.push(`${col} = ?`);
    vals.push(typeof v === "boolean" ? (v ? 1 : 0) : (v as string | number | null));
  }
  if (sets.length) db().prepare(`UPDATE duels SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
}

/** Atomically move a duel between states; false when it was not in `from`. */
export function transition(id: string, from: DuelStatus, to: DuelStatus, patch: Partial<Duel> = {}): boolean {
  const res = db().prepare("UPDATE duels SET status = ? WHERE id = ? AND status = ?").run(to, id, from);
  if (Number(res.changes) !== 1) return false;
  updateDuel(id, patch);
  return true;
}

export function addEvent(duelId: string, kind: string, side: "A" | "B" | null, text: string, txHash?: string): void {
  db()
    .prepare("INSERT INTO duel_events (duel_id, ts, kind, side, text, tx_hash) VALUES (?, ?, ?, ?, ?, ?)")
    .run(duelId, Date.now(), kind, side, text, txHash ?? null);
}

export function listEvents(duelId: string, limit = 100): DuelEvent[] {
  const rows = db()
    .prepare("SELECT * FROM duel_events WHERE duel_id = ? ORDER BY id DESC LIMIT ?")
    .all(duelId, limit) as Row[];
  return rows.map((r) => ({
    id: Number(r.id),
    duelId: r.duel_id as string,
    ts: Number(r.ts),
    kind: r.kind as string,
    side: (r.side as "A" | "B") ?? null,
    text: r.text as string,
    txHash: (r.tx_hash as string) ?? null,
  }));
}

export function addSample(duelId: string, ts: number, retA: number, retB: number): void {
  db().prepare("INSERT INTO duel_samples (duel_id, ts, ret_a, ret_b) VALUES (?, ?, ?, ?)").run(duelId, ts, retA, retB);
}

export function listSamples(duelId: string): { ts: number; a: number; b: number }[] {
  const rows = db()
    .prepare("SELECT ts, ret_a, ret_b FROM duel_samples WHERE duel_id = ? ORDER BY ts ASC")
    .all(duelId) as Row[];
  return rows.map((r) => ({ ts: Number(r.ts), a: Number(r.ret_a), b: Number(r.ret_b) }));
}
