import { createExchange } from "../src/lib/exchange";

const exchange = createExchange();
const markets = await exchange.loadMarkets();
if (exchange.registryReadError) console.warn("indexer error:", exchange.registryReadError.message);
const perps = Object.values(markets).filter((m: any) => m.type === "swap" || m.swap || m.info?.marketType === "perp");
console.log(`perp markets: ${perps.length}`);
for (const sym of ["BTC/USDso:USDso", "ETH/USDso:USDso"]) {
  try {
    const t = await exchange.fetchTicker(sym);
    console.log(sym, { mark: t.markPrice, index: t.indexPrice, last: t.last, funding8h: t.fundingRate, oi: t.openInterest });
  } catch (e: any) { console.log(sym, "ERR", e.message); }
}
console.log(perps.map((m: any) => m.symbol).join(", "));
process.exit(0);
