import { formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createExchange } from "../src/lib/exchange";

const ex = createExchange();
const markets = await ex.loadMarkets();
const bank = (markets["BTC/USDso:USDso"] as any).info.marginBank;
const keys = { player: process.env.DUEL_PRIVATE_KEY, sparring: process.env.SPARRING_PRIVATE_KEY };
for (const [name, k] of Object.entries(keys)) {
  if (!k) continue;
  const addr = privateKeyToAccount((k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`).address;
  const stt = await ex.client.getNativeBalance(addr);
  const eq = await ex.client.getAccountEquity(addr, { scope: "perps", marginBank: bank });
  console.log(name.padEnd(9), addr, "STT", Number(formatUnits(stt, 18)).toFixed(3), "margin", Number(formatUnits(eq.totalEquity, 18)).toFixed(3));
}
await ex.close();
