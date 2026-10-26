"use client";
import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ArrowSquareOut, X } from "@phosphor-icons/react";
import type { DuelView } from "@/engine/view";
import { useWallet } from "@/client/wallet";
import { fmtUsd, txUrl } from "@/client/format";
import { marketLabel } from "@/lib/rules";

const SHARES = [0.25, 0.5, 0.75, 1] as const;

/** Order ticket for the connected duelist. Orders are IOC market orders signed in the wallet. */
export function TradePanel({ duel, side }: { duel: DuelView; side: "A" | "B" }) {
  const w = useWallet();
  const me = side === "A" ? duel.a : duel.b;
  const [share, setShare] = useState<(typeof SHARES)[number]>(0.5);
  const [lot, setLot] = useState<{ min: number; decimals: number } | null>(null);
  const [busy, setBusy] = useState<"buy" | "sell" | "close" | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const base = marketLabel(duel.market).split("-")[0];
  const mark = duel.markPrice;
  const live = duel.status === "live";
  const room = Math.max(0, duel.capUsd - me.notional);
  const notional = duel.capUsd * share;

  useEffect(() => {
    w.getExchange().then((ex) => {
      const m: any = ex.markets[duel.market];
      setLot({ min: m?.limits?.amount?.min ?? 0, decimals: m?.precision?.amount ?? 4 });
    });
  }, [w, duel.market]);

  const roundQty = (q: number) => {
    const step = 10 ** (lot?.decimals ?? 4);
    return Math.floor(q * step) / step;
  };

  async function send(kind: "buy" | "sell" | "close") {
    setErr(null);
    if (!mark) return setErr("Waiting for the mark price");
    if (!w.onRightChain) return w.switchChain().catch((e) => setErr(e.message));
    let sideOut: "buy" | "sell";
    let qty: number;
    if (kind === "close") {
      if (me.position === 0) return;
      sideOut = me.position > 0 ? "sell" : "buy";
      qty = roundQty(Math.abs(me.position) * 1.0001);
    } else {
      sideOut = kind;
      const increasing = me.position === 0 || Math.sign(me.position) === (kind === "buy" ? 1 : -1);
      const usd = increasing ? Math.min(notional, room) : notional;
      qty = roundQty(usd / mark);
    }
    if (lot && qty < lot.min) return setErr(`Below the minimum size of ${lot.min} ${base}. Raise the size or the cap.`);
    setBusy(kind);
    try {
      const ex = await w.getExchange();
      const order = await ex.createOrder(duel.market, "market", sideOut, qty);
      const hash = (order.info as any)?.hash as string | undefined;
      if (hash) {
        setLastTx(hash);
        fetch(`/api/duels/${duel.id}/trade`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ txHash: hash, side: sideOut, qty }),
        }).catch(() => {});
      }
    } catch (e: any) {
      const name = e?.errorName as string | undefined;
      setErr(name ? `${name}: ${e.shortMessage ?? e.message}` : (e?.shortMessage ?? e?.message ?? "Order failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-[var(--radius-panel)] border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Your ticket</h2>
        <span className="num text-sm text-muted">mark {mark ? fmtUsd(mark, 1) : "--"}</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Size, share of the {fmtUsd(duel.capUsd, 0)} cap</span>
        <div className="grid grid-cols-4 gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1">
          {SHARES.map((s) => (
            <button
              key={s}
              onClick={() => setShare(s)}
              className={`tnum rounded-[8px] py-1.5 text-sm transition ${share === s ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}
            >
              {Math.round(s * 100)}%
            </button>
          ))}
        </div>
        <span className="num text-xs text-muted">
          {fmtUsd(Math.min(notional, duel.capUsd), 0)} ≈ {mark ? roundQty(notional / mark) : "--"} {base} · room left {fmtUsd(room, 0)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={!live || !!busy}
          onClick={() => send("buy")}
          className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-up py-3 font-semibold text-bg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
        >
          <ArrowUpRight size={18} weight="bold" /> {busy === "buy" ? "Signing" : "Long"}
        </button>
        <button
          disabled={!live || !!busy}
          onClick={() => send("sell")}
          className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-down py-3 font-semibold text-bg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
        >
          <ArrowDownRight size={18} weight="bold" /> {busy === "sell" ? "Signing" : "Short"}
        </button>
      </div>
      <button
        disabled={!live || !!busy || me.position === 0}
        onClick={() => send("close")}
        className="flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-line py-2.5 text-sm font-medium transition hover:bg-surface-2 active:scale-[0.98] disabled:opacity-40"
      >
        <X size={16} /> {busy === "close" ? "Signing" : "Close position"}
      </button>

      {!live ? (
        <p className="text-sm text-muted">
          {duel.status === "starting" ? "Trading opens at the bell." : "Trading is closed for this duel."}
        </p>
      ) : null}
      {err ? (
        <p role="alert" className="rounded-[var(--radius-control)] border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">
          {err}
        </p>
      ) : null}
      {lastTx ? (
        <a href={txUrl(lastTx)} target="_blank" rel="noreferrer" className="num flex items-center gap-1 text-xs text-muted hover:text-text">
          Last order {lastTx.slice(0, 10)}… <ArrowSquareOut size={12} />
        </a>
      ) : null}
    </section>
  );
}
