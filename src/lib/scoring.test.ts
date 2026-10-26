import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLadder, decide, eloUpdate, scorePlayer, type PlayerTally } from "./scoring";

const tally = (over: Partial<PlayerTally>): PlayerTally => ({
  startEquity: 100,
  endEquity: 100,
  netFlows: 0,
  traded: true,
  fouled: false,
  ...over,
});

test("return is pnl over cap, excluding deposits", () => {
  const s = scorePlayer(tally({ endEquity: 160, netFlows: 50 }), 250);
  assert.equal(s.pnl, 10);
  assert.equal(s.returnPct, 4);
});

test("higher return wins", () => {
  const a = scorePlayer(tally({ endEquity: 105 }), 100);
  const b = scorePlayer(tally({ endEquity: 102 }), 100);
  assert.equal(decide(a, b), "A");
  assert.equal(decide(b, a), "B");
});

test("near-equal returns draw", () => {
  const a = scorePlayer(tally({ endEquity: 100.001 }), 100);
  const b = scorePlayer(tally({ endEquity: 100.0 }), 100);
  assert.equal(decide(a, b), "draw");
});

test("KO loses even to a smaller loss", () => {
  const ko = scorePlayer(tally({ endEquity: 75 }), 100); // -25 >= 20% of cap
  const small = scorePlayer(tally({ endEquity: 99 }), 100);
  assert.equal(ko.ko, true);
  assert.equal(decide(ko, small), "B");
});

test("both KO falls back to return", () => {
  const a = scorePlayer(tally({ endEquity: 70 }), 100);
  const b = scorePlayer(tally({ endEquity: 78 }), 100);
  assert.equal(decide(a, b), "B");
});

test("no-show and foul are disqualified", () => {
  const idle = scorePlayer(tally({ traded: false }), 100);
  const loser = scorePlayer(tally({ endEquity: 90 }), 100);
  assert.equal(decide(idle, loser), "B");
  const foul = scorePlayer(tally({ endEquity: 150, fouled: true }), 100);
  assert.equal(decide(loser, foul), "A");
  assert.equal(decide(idle, foul), "draw");
});

test("elo is zero-sum and favours the upset", () => {
  const [a, b] = eloUpdate(1200, 1400, "A");
  assert.ok(Math.abs(a + b - 2600) < 1e-9);
  assert.ok(a - 1200 > 16);
});

test("ladder tracks records and streaks", () => {
  const ladder = buildLadder([
    { a: "0xA", b: "0xB", outcome: "A" },
    { a: "0xA", b: "0xC", outcome: "A" },
    { a: "0xB", b: "0xC", outcome: "draw" },
  ]);
  const top = ladder[0]!;
  assert.equal(top.address, "0xa");
  assert.equal(top.wins, 2);
  assert.equal(top.streak, 2);
  const b = ladder.find((r) => r.address === "0xb")!;
  assert.deepEqual([b.wins, b.losses, b.draws, b.streak], [0, 1, 1, 0]);
});
