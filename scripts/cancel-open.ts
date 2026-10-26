// Withdraw every open challenge posted by DUEL_PRIVATE_KEY.
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { intentMessage } from "../src/lib/auth";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const k = process.env.DUEL_PRIVATE_KEY!;
const acct = privateKeyToAccount((k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`);
const { open } = await (await fetch(`${BASE}/api/duels`)).json();
for (const d of open.filter((x: any) => x.a.address === acct.address.toLowerCase())) {
  const issuedAt = Date.now();
  const signature = await acct.signMessage({ message: intentMessage({ address: acct.address, action: "cancel", subject: d.id, issuedAt }) });
  const r = await fetch(`${BASE}/api/duels/${d.id}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ intent: { address: acct.address, action: "cancel", subject: d.id, issuedAt, signature } }),
  });
  console.log("cancel", d.id, r.status);
}
