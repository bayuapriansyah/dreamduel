# DreamDuel

**Call out a trader. Settle it on-chain.**

DreamDuel turns dreamDEX perps into timed 1v1 duels. You post a challenge (market, 5 to 60 minutes, notional cap) and send the link to a rival. You both trade the same market from your own wallets. When the bell rings, the referee reads both accounts' equity on-chain, and the better return on the cap wins. Then you share the result card on X and call a rematch.

Built for the dreamDEX Perps Builder Bounty, MVP track. Runs on Somnia Tokyo testnet (chain 50383) and places real perps orders on dreamDEX.

## Who it is for

- **Traders who already use perps** and want a reason to come back tomorrow: rivalry, a weekly Elo ladder, streaks.
- **Friends who have never traded perps.** "Take the other seat" is an easier first step than an order book.
- **dreamDEX**, which needs new traders, real order flow and retention. Every shared challenge recruits a new trader, and every duel produces at least four on-chain perps orders.

## Why it is fair

| Rule | How it is enforced |
|---|---|
| Same market, clock and cap | Set by the challenge and signed by the creator |
| Score is return on the cap, not raw PnL | A bigger wallet buys no edge |
| Knockout at -20% of the cap | The duel ends on the spot |
| Foul above the cap | Total perps notional over the cap disqualifies the player |
| No-show | A player who never opens a position loses |
| Deposits do not count as profit | Net flows (deposits, credits, withdrawals) inside the window are removed at settlement |
| Settlement is on-chain | Final equity is read from the MarginBank at one pinned block, recorded with the result |

DreamDuel is **non-custodial**. Players sign every order in MetaMask, and the server never holds a key that can move player funds. The referee only reads the chain.

## How it uses Somnia

- **Somnia Reactivity (`somnia_watch`).** For each live duel the engine subscribes to every log the market's PerpPool emits. It has the node run `MarginBank.getAccountHealth` for both duelists in the same block (`ethCalls`). Each push carries fresh equity, so the scoreboard moves with the chain (about 15 pushes per second on Tokyo, filtered with `onlyPushChanges`) instead of with a polling timer. A 2-second poll of `getAccountEquity` and positions backs it up and catches fouls.
- **Somnia Markets SDK (`@somnia-chain/markets-sdk` 0.32.1).** Orders (`createOrder` IOC market), margin (`depositMargin`), scoring reads (`getAccountEquity`, `listPerpPositionAnalytics`), flows (`getMarginEvents`), all on the `hidekiTestnet` preset.
- **Sub-second finality.** Orders confirm fast enough that a 5-minute duel feels live.

## Architecture

```
Browser (Next.js, MetaMask)                     Server (Next.js + duel engine, one Node process)
 ├─ signs intents (create/accept/cancel) ──────▶ API routes ─▶ SQLite (duels, events, samples)
 ├─ places orders via markets-sdk ──▶ dreamDEX PerpPool (Somnia Tokyo)
 ├─ reports tx hash ─────────────────▶ /trade  (verifies receipt.from + pool log before logging)
 └─ SSE /stream ◀────────────────────── engine.publish ◀─ Reactivity push (pool logs + ethCalls)
                                                       ◀─ 2s poll: equity, positions, fouls, KO
                                         Sparring Bot (own EOA) ─▶ IOC orders on the duel market
```

| Path | Role |
|---|---|
| `src/engine/engine.ts` | Referee: countdown, opening bell snapshot, Reactivity watch, polling, KO and foul detection, settlement |
| `src/engine/sparring.ts` | House opponent so nobody waits. Momentum strategy on its own faucet-funded EOA, one duel at a time |
| `src/lib/scoring.ts` | Pure scoring, verdicts and Elo, with tests in `scoring.test.ts` |
| `src/lib/auth*.ts` | Wallet-signed intents (EIP-191), 5 minute expiry |
| `src/app/api/*` | REST plus an SSE stream per duel |
| `src/app/duel/[id]/opengraph-image.tsx` | Result card for X |

## Run it

Requirements: Node 22+, a wallet with Somnia Tokyo testnet STT (gas) and USDso (margin).

```bash
npm install
cp .env.example .env     # set SPARRING_PRIVATE_KEY (and DUEL_PRIVATE_KEY for the scripts)
npm run dev              # http://localhost:3000
```

1. Open **Setup**: connect MetaMask, switch to Somnia Tokyo (chain 50383), deposit USDso as perps margin.
2. Open **New duel**: pick "Sparring Bot" for an instant match, or "Anyone with the link" and share it.
3. Trade from the duel room with Long, Short and Close. Every order shows up in the Ringside feed with its tx hash.

Useful scripts:

| Command | What it does |
|---|---|
| `npm test` | Scoring and Elo unit tests |
| `npx tsx scripts/probe.ts` | Lists live perp markets and marks on Tokyo |
| `npx tsx scripts/first-order.ts --deposit 50 --trade` | Deposits margin, opens and closes a tiny BTC long |
| `npx tsx scripts/play-duel.ts 5` | Plays a full 5-minute duel against the Sparring Bot from the command line |
| `npx tsx scripts/spike-reactivity.ts` | Shows Reactivity pushes with equity from `ethCalls` |

## Evidence

Live orders, deposits and settled duels on Somnia Tokyo testnet are listed in [`docs/EVIDENCE.md`](docs/EVIDENCE.md) with tx hashes and blocks.

## X posts

<!-- Add 2 or 3 links to posts that tag @DreamDEXSomnia -->
- _coming soon_

## Mainnet path

Network config is one preset (`hidekiTestnet` to `somniaMainnet`) once perps launch on mainnet. Orders already go through the SDK's builder-aware `createOrder`, so a builder fee can be switched on with `approveBuilder` without touching the duel engine.

## Known limits

- Scoring uses the whole perps account. A player who trades other markets during a duel carries that PnL into the score, and a fresh account is recommended.
- The Sparring Bot plays one duel at a time so its equity is never shared between scoreboards.
- Testnet only. USDso here is paper money from the bounty faucet.
