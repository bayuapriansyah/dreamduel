// Full duel against the Sparring Bot, played by DUEL_PRIVATE_KEY from the command line.
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { createTerms, intentMessage, type AuthAction } from "../src/lib/auth";
import { createExchange } from "../src/lib/exchange";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const key = process.env.DUEL_PRIVATE_KEY!;
const acct = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
const ex = createExchange(key);
await ex.loadMarkets();
const MARKET = "BTC/USDso:USDso";
const minutes = Number(process.argv[2] ?? 5);
const cap = 100;

async function intent(action: AuthAction, subject: string) {
  const issuedAt = Date.now();
  const signature = await acct.signMessage({ message: intentMessage({ address: acct.address, action, subject, issuedAt }) });
  return { address: acct.address, action, subject, issuedAt, signature };
}
const get = async (id: string) => (await (await fetch(`${BASE}/api/duels/${id}`)).json()).duel;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const r = await fetch(`${BASE}/api/duels`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ market: MARKET, durationMin: minutes, capUsd: cap, vsBot: true, intent: await intent("create", createTerms(MARKET, minutes, cap, true)) }),
});
const { duel, error } = await r.json();
if (!duel) throw new Error(error);
console.log(`duel ${duel.id}: ${BASE}/duel/${duel.id}`);

let d = await get(duel.id);
while (d.status !== "live") {
  if (["cancelled", "expired"].includes(d.status)) throw new Error(d.status);
  await sleep(1000);
  d = await get(duel.id);
}
console.log("bell rang at block", d.startBlock);

async function trade(side: "buy" | "sell", qty: number) {
  const o = await ex.createOrder(MARKET, "market", side, qty);
  const hash = (o.info as any)?.hash;
  await fetch(`${BASE}/api/duels/${duel.id}/trade`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txHash: hash, side, qty }) });
  console.log(`${side} ${qty} -> ${hash}`);
}
// Scripted plan: go long ~$60, flip short later, flatten before the bell.
const mark = d.markPrice ?? (await ex.fetchTicker(MARKET)).markPrice!;
const q = Math.max(0.00013, Math.floor((60 / mark) * 1e5) / 1e5);
await trade("buy", q);
await sleep((minutes * 60_000) / 2.5);
await trade("sell", q * 2);
await sleep((minutes * 60_000) / 3);
await trade("buy", q);

while (d.status !== "settled") {
  await sleep(3000);
  d = await get(duel.id);
  if (d.status === "live") console.log(`live A ${d.a.score?.returnPct?.toFixed(3)}% vs B ${d.b.score?.returnPct?.toFixed(3)}%`);
}
console.log("SETTLED outcome", d.outcome, "A", d.a.score?.returnPct, "B", d.b.score?.returnPct, "endBlock", d.endBlock);
await ex.close();
