"use client";
import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useWallet } from "./wallet";

export interface MarginState {
  loading: boolean;
  /** Perps total equity in the MarginBank (USDso). */
  margin: number | null;
  /** USDso sitting in the wallet, ready to deposit. */
  walletUsdso: number | null;
  stt: number | null;
  refresh: () => void;
}

/** Balances that decide whether the connected wallet can duel. */
export function useMargin(): MarginState {
  const w = useWallet();
  const [state, setState] = useState<Omit<MarginState, "refresh">>({ loading: false, margin: null, walletUsdso: null, stt: null });
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!w.address) return setState({ loading: false, margin: null, walletUsdso: null, stt: null });
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      const ex = await w.getExchange();
      const btc: any = ex.markets["BTC/USDso:USDso"];
      const [eq, bal] = await Promise.all([
        ex.client.getAccountEquity(w.address!, { scope: "perps", marginBank: btc.info.marginBank }).catch(() => null),
        ex.fetchBalance().catch(() => null),
      ]);
      if (!alive) return;
      setState({
        loading: false,
        margin: eq ? Number(formatUnits(eq.totalEquity, 18)) : null,
        walletUsdso: bal?.USDso?.total ?? null,
        stt: bal?.STT?.total ?? null,
      });
    })().catch(() => alive && setState((s) => ({ ...s, loading: false })));
    return () => {
      alive = false;
    };
  }, [w, w.address, tick]);

  return { ...state, refresh };
}
