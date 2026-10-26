// Day-1 smoke test: deposit margin, open a tiny BTC long, close it, print tx hashes.
import { createExchange } from "../src/exchange.js";

const SYMBOL = "BTC/USDso:USDso";
const exchange = createExchange(process.env.DUEL_PRIVATE_KEY);
const json = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x), 2);

const markets = await exchange.loadMarkets();
const market = markets[SYMBOL]!;
console.log("trading as", exchange.walletAddress);
const bal = await exchange.fetchBalance();
console.log("wallet STT:", bal.STT?.total, "USDso:", bal.USDso?.total);
console.log("limits:", json(market.limits), "precision:", json(market.precision));

if (process.argv.includes("--deposit")) {
  const amount = Number(process.argv[process.argv.indexOf("--deposit") + 1] ?? 50);
  const dep = await exchange.depositMargin(SYMBOL, amount);
  console.log("deposit:", json(dep));
}

if (process.argv.includes("--trade")) {
  const qty = market.limits?.amount?.min ?? 0.001;
  const open = await exchange.createOrder(SYMBOL, "market", "buy", qty);
  console.log("OPEN:", open.id, open.status, json(open.info));
  console.log("positions:", json(await exchange.fetchPositions([SYMBOL])));
  const close = await exchange.createOrder(SYMBOL, "market", "sell", qty);
  console.log("CLOSE:", close.id, close.status, json(close.info));
}

await exchange.close();
