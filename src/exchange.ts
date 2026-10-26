import "dotenv/config";
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

export const INDEXER_URL = "https://hideki-dev.smk.somnia.host/v1/graphql";

/** Build a SomniaMarkets instance on Somnia Tokyo (Hideki) testnet, optionally with a signer. */
export function createExchange(privateKey?: string) {
  if (privateKey && !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("Private key must be a 0x-prefixed 32-byte hex string");
  }
  return new SomniaMarkets({
    indexerUrl: INDEXER_URL,
    chain: hidekiTestnet,
    addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
    ...(privateKey ? { privateKey: privateKey as `0x${string}` } : {}),
  });
}
