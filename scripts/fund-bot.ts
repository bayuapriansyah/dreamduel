// Move test STT + USDso from the player EOA to the Sparring Bot EOA (both testing wallets, neither is a Perps Arena account).
import "dotenv/config";
import { createWalletClient, erc20Abi, http, parseUnits, createPublicClient, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

const USDSO = "0xed7993A74dAe1e6656B704A424DcD8711aAf4F72";
const norm = (k: string) => (k.startsWith("0x") ? k : `0x${k}`) as `0x${string}`;
const from = privateKeyToAccount(norm(process.env.DUEL_PRIVATE_KEY!));
const to = privateKeyToAccount(norm(process.env.SPARRING_PRIVATE_KEY!)).address;
const [stt, usdso] = [process.argv[2] ?? "15", process.argv[3] ?? "40"];
const wallet = createWalletClient({ account: from, chain: hidekiTestnet, transport: http() });
const pub = createPublicClient({ chain: hidekiTestnet, transport: http() });

const h1 = await wallet.sendTransaction({ to, value: parseUnits(stt, 18) });
await pub.waitForTransactionReceipt({ hash: h1 });
console.log(`STT ${stt} -> ${to}: ${h1}`);
const h2 = await wallet.writeContract({ address: USDSO, abi: erc20Abi, functionName: "transfer", args: [to, parseUnits(usdso, 18)] });
await pub.waitForTransactionReceipt({ hash: h2 });
console.log(`USDso ${usdso} -> ${to}: ${h2}`);
const bal = await pub.readContract({ address: USDSO, abi: erc20Abi, functionName: "balanceOf", args: [to] });
console.log("bot USDso wallet:", formatUnits(bal, 18));
