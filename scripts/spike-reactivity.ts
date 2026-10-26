import { createReactivity, unwrap } from "@somnia-chain/markets-sdk/reactivity";
import { encodeFunctionData, decodeFunctionResult, parseAbi } from "viem";
import { createExchange } from "../src/lib/exchange";

const abi = parseAbi(["function getAccountHealth(address) view returns (int256,uint256,uint256,uint256)"]);
const exchange = createExchange();
const markets = await exchange.loadMarkets();
const btc: any = markets["BTC/USDso:USDso"];
const pool = btc.id as `0x${string}`;
const marginBank = btc.info.marginBank as `0x${string}`;
const me = "0xc930D1fa176AEBD05030435Df3998244939844f0";
console.log({ pool, marginBank });

const eq = await exchange.client.getAccountEquity(me, { scope: "perps", marginBank });
console.log("equity", eq);
const rows = await exchange.client.listPerpPositionAnalytics({ marginBank, account: me });
console.log("analytics rows", rows.length, JSON.stringify(rows[0] ?? null, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

const reactivity = createReactivity(exchange.client);
let n = 0;
const t0 = Date.now();
const sub = unwrap(await reactivity.watch({
  eventContractSources: [pool],
  ethCalls: [{ to: marginBank, data: encodeFunctionData({ abi, functionName: "getAccountHealth", args: [me] }) }],
  onData: (note: any) => {
    n++;
    const raw = note.result.simulationResults[0];
    const [equity] = decodeFunctionResult({ abi, functionName: "getAccountHealth", data: raw }) as readonly bigint[];
    if (n <= 3) console.log(`push #${n} +${Date.now() - t0}ms topic0=${note.result.topics[0].slice(0, 10)} equity=${equity}`);
  },
} as any));
await new Promise((r) => setTimeout(r, 20000));
console.log(`reactivity pushes in 20s: ${n}`);
await sub.unsubscribe();
await exchange.close();
process.exit(0);
