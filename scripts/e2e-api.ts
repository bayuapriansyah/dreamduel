// Drive the HTTP API with a local key: create a challenge, read it, cancel it (or accept with a 2nd key).
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { createTerms, intentMessage, type AuthAction } from "../src/lib/auth";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const norm = (k: string) => (k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`;
const player = privateKeyToAccount(norm(process.env.DUEL_PRIVATE_KEY!));

async function intent(action: AuthAction, subject: string) {
  const issuedAt = Date.now();
  const address = player.address;
  const signature = await player.signMessage({ message: intentMessage({ address, action, subject, issuedAt }) });
  return { address, action, subject, issuedAt, signature };
}
async function post(path: string, body: unknown) {
  const r = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json() };
}

const mode = process.argv[2] ?? "cancel";
const vsBot = mode === "bot";
const terms = { market: "BTC/USDso:USDso", durationMin: Number(process.argv[3] ?? 5), capUsd: 100, vsBot };
const created = await post("/api/duels", { ...terms, intent: await intent("create", createTerms(terms.market, terms.durationMin, terms.capUsd, vsBot)) });
console.log("create", created.status, created.json.duel?.id ?? created.json);
const id = created.json.duel?.id;
if (!id) process.exit(1);
const bad = await post(`/api/duels/${id}/accept`, { intent: await intent("accept", id) });
console.log("self-accept (should fail)", bad.status, bad.json.error);
const forged = await post(`/api/duels/${id}/cancel`, { intent: { ...(await intent("cancel", id)), subject: "other" } });
console.log("forged cancel (should fail)", forged.status, forged.json.error);
if (mode === "cancel") {
  const c = await post(`/api/duels/${id}/cancel`, { intent: await intent("cancel", id) });
  console.log("cancel", c.status, c.json.duel?.status);
} else {
  console.log(`open ${BASE}/duel/${id}`);
}
