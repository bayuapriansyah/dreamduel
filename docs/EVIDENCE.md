# On-chain evidence (Somnia Tokyo testnet, chain 50383)

Explorer: https://explorer.testnet.somnia.network/tokyo

| Date (UTC) | Action | Market | Size | Tx hash |
|---|---|---|---|---|
| 2026-10-26 | Deposit 50 USDso margin | — | — | `0xc7dc1fc01c232e693794a4d5cfaf63af0f4409dc8623a3eb7c994f97fcbfe42b` |
| 2026-10-26 | Market buy (open long), entry 80037.4 | BTC/USDso:USDso | 0.00013 | `0x6efff070b29d7ca7a2d68a6e07fe024d97a4db14c6d7774479d9cb1399e13052` |
| 2026-10-26 | Market sell (close) | BTC/USDso:USDso | 0.00013 | `0xdfc0118da098cb1a820a9bab8dc73a86cd151f573fee313b40dbe773a84e28fb` |

Wallet: `0xc930D1fa176AEBD05030435Df3998244939844f0` (dedicated bot EOA, faucet-funded, not a Perps Arena account)

## Duel `24589e62d4`: player vs Sparring Bot, BTC-PERP, 5 min, $100 cap (2026-10-26)

Opening bell block `33762806`, closing bell block `33765804`. 13 perps orders inside the window. Result: draw (A +0.002%, B +0.004%, within the 0.01 pp draw band).

| Time (UTC) | Side | Order | Tx hash |
|---|---|---|---|
| 15:27:25 | B (bot) | buy 0.00082 BTC | `0x0bcb3978f83c67c4849f8f6c239ec1c07a680ec358569a9b412e74124232d4dc` |
| 15:27:33 | A | buy 0.00074 BTC | `0x3ac1cbb30d122d23342ea9c95606e7ae14585fbd98071091645c92bbcf9ce1b3` |
| 15:27:56 | B (bot) | sell 0.00082 BTC | `0xff7cb72c1d6f4f6ff54a43482edeecddd887ac72e04567ee208fe81829a1d97b` |
| 15:28:22 | B (bot) | sell 0.00097 BTC | `0xc51b37479c571f72f5bcb9af986470b7b62cc251bf3f3fa851e1668b11ba1671` |
| 15:28:49 | B (bot) | buy 0.0002 BTC | `0x08fdbb9b20e92835a7e6753f1637896110858a2e1f539703a3d9bf37ea1283e8` |
| 15:29:11 | B (bot) | buy 0.00077 BTC | `0x1070315ebe6976c58d280933087815e2ed2dd35273926befb99dcbbf3a10c0fc` |
| 15:29:34 | A | sell 0.00148 BTC (flip short) | `0x37e6735642fe8b62b1bcf3fcea687eb733a90b5def6d5f5f0b034da67cb637d8` |
| 15:29:36 | B (bot) | sell 0.00052 BTC | `0x391c59720bd2ad7770ceb4577cbf378d52bb924d1076ddb2f574eb13c1c2a89d` |
| 15:30:15 | B (bot) | buy 0.00052 BTC | `0x2da6ad181624054293bcd19c5d9901f54455d055cfca907fd792a0b9f765e4b1` |
| 15:30:51 | B (bot) | sell 0.00095 BTC | `0x5926ba940308db119edd064289a0a33e0cf9d81ccbc4b6ae1bd39e5be36143a0` |
| 15:31:15 | A | buy 0.00074 BTC (close) | `0x9b6f52678bf9e5f91df20add9234b0e8874633c9210a434603152d9f4a15814a` |
| 15:31:29 | B (bot) | buy 0.00148 BTC (flip long) | `0x7021c83211e012bd8e9cecd72e0511d06e2212e72e6d3c219f9a791ec80200ef` |
| 15:32:06 | B (bot) | sell 0.00053 BTC (flatten) | `0x876270af77605fbf011f3f86eb880ccdf40f66d829af6881098cf6b653edb4e0` |

Wallets: A `0xc930D1fa176AEBD05030435Df3998244939844f0`, B (Sparring Bot) `0xb9622b4953D3337E9e4642b3c904320e48a4FFa7`.
