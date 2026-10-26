"use client";
// MetaMask (or any injected EIP-1193 wallet) on Somnia Tokyo testnet.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createWalletClient, custom, type EIP1193Provider, type WalletClient } from "viem";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { intentMessage, type AuthAction, type SignedIntent } from "@/lib/auth";

const CHAIN_HEX = `0x${hidekiTestnet.id.toString(16)}`;

declare global {
  interface Window {
    ethereum?: EIP1193Provider & { on?: (e: string, f: (...a: any[]) => void) => void; removeListener?: (e: string, f: (...a: any[]) => void) => void };
  }
}

interface WalletState {
  address: `0x${string}` | null;
  hasWallet: boolean;
  onRightChain: boolean;
  connecting: boolean;
  connect: () => Promise<`0x${string}` | null>;
  switchChain: () => Promise<void>;
  signIntent: (action: AuthAction, subject: string) => Promise<SignedIntent>;
  /** Browser SomniaMarkets bound to the wallet. Loaded on first use. */
  getExchange: () => Promise<SomniaMarkets>;
}

const Ctx = createContext<WalletState | null>(null);

let exchangePromise: Promise<SomniaMarkets> | null = null;
function loadExchange(): Promise<SomniaMarkets> {
  exchangePromise ??= import("./exchange").then((m) => m.browserExchange());
  return exchangePromise;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const clientRef = useRef<WalletClient | null>(null);
  const connectingRef = useRef(false);
  const switchingRef = useRef(false);

  const bind = useCallback(async (addr: `0x${string}` | null) => {
    setAddress(addr);
    const eth = window.ethereum;
    if (!addr || !eth) {
      clientRef.current = null;
      return;
    }
    const wc = createWalletClient({ account: addr, chain: hidekiTestnet, transport: custom(eth) });
    clientRef.current = wc;
    const ex = await loadExchange();
    ex.setSigner({ walletClient: wc as any });
  }, []);

  useEffect(() => {
    const eth = window.ethereum;
    setHasWallet(!!eth);
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then((a) => bind(((a as string[])[0] as `0x${string}`) ?? null));
    eth.request({ method: "eth_chainId" }).then((c) => setChainId(parseInt(c as string, 16)));
    const onAccounts = (a: string[]) => bind((a[0] as `0x${string}`) ?? null);
    const onChain = (c: string) => setChainId(parseInt(c, 16));
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [bind]);

  const switchChain = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) throw new Error("No wallet found. Install MetaMask.");
    if (switchingRef.current) return;
    switchingRef.current = true;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
    } catch (e: any) {
      if (e?.code !== 4902 && e?.data?.originalError?.code !== 4902) throw e;
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_HEX,
            chainName: "Somnia Tokyo Testnet",
            nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
            rpcUrls: [hidekiTestnet.rpcUrls.default.http[0]],
            blockExplorerUrls: ["https://explorer.testnet.somnia.network/tokyo"],
          },
        ],
      });
    } finally {
      switchingRef.current = false;
    }
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) throw new Error("No wallet found. Install MetaMask.");
    if (connectingRef.current) return null;
    connectingRef.current = true;
    setConnecting(true);
    try {
      // One wallet prompt at a time. Chaining a network switch right after the connect
      // prompt can leave MetaMask's popup without a request origin and crash its UI, so
      // the switch is a separate, user-initiated step ("Switch to Tokyo" in the nav).
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      const addr = (accounts[0] as `0x${string}`) ?? null;
      await bind(addr);
      return addr;
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  }, [bind]);

  const signIntent = useCallback(
    async (action: AuthAction, subject: string): Promise<SignedIntent> => {
      const addr = address ?? (await connect());
      if (!addr || !clientRef.current) throw new Error("Connect your wallet first");
      const issuedAt = Date.now();
      const signature = await clientRef.current.signMessage({
        account: addr,
        message: intentMessage({ address: addr, action, subject, issuedAt }),
      });
      return { address: addr, action, subject, issuedAt, signature };
    },
    [address, connect],
  );

  const value = useMemo<WalletState>(
    () => ({
      address,
      hasWallet,
      onRightChain: chainId === hidekiTestnet.id,
      connecting,
      connect,
      switchChain,
      signIntent,
      getExchange: loadExchange,
    }),
    [address, hasWallet, chainId, connecting, connect, switchChain, signIntent],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet outside WalletProvider");
  return v;
}

export function shortAddr(a: string | null | undefined): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}
