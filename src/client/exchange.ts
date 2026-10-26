// Browser-side SomniaMarkets for Tokyo testnet. Loaded lazily so the SDK never ships in
// server-rendered HTML; the wallet binds a signer with setSigner().
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

export const INDEXER_URL = "https://hideki-dev.smk.somnia.host/v1/graphql";

let instance: SomniaMarkets | null = null;

export async function browserExchange(): Promise<SomniaMarkets> {
  if (!instance) {
    instance = new SomniaMarkets({ indexerUrl: INDEXER_URL, chain: hidekiTestnet, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });
    await instance.loadMarkets();
  }
  return instance;
}
