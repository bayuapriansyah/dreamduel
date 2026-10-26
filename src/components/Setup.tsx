"use client";
import { useState } from "react";
import { ArrowSquareOut, CheckCircle, Circle } from "@phosphor-icons/react";
import { useWallet } from "@/client/wallet";
import { useMargin } from "@/client/useMargin";
import { fmtUsd, txUrl } from "@/client/format";

function Step(p: { done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-4 border-b border-line py-6 last:border-b-0">
      {p.done ? <CheckCircle size={24} weight="fill" className="mt-0.5 text-up" /> : <Circle size={24} className="mt-0.5 text-muted" />}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{p.title}</h2>
        {p.children}
      </div>
    </li>
  );
}

export function Setup() {
  const w = useWallet();
  const m = useMargin();
  const [amount, setAmount] = useState("50");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; tx?: string } | null>(null);

  async function deposit() {
    setMsg(null);
    const n = Number(amount);
    if (!(n > 0)) return setMsg({ ok: false, text: "Enter an amount above zero." });
    setBusy(true);
    try {
      if (!w.onRightChain) await w.switchChain();
      const ex = await w.getExchange();
      const r = await ex.depositMargin("BTC/USDso:USDso", n);
      setMsg({ ok: true, text: `Deposited ${n} USDso into your perps margin.`, tx: r.hash });
      m.refresh();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.errorName ?? e?.shortMessage ?? e?.message ?? "Deposit failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 pt-10">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Get duel-ready.</h1>
        <p className="mt-3 text-muted">Four checks, about two minutes. Everything runs on Somnia Tokyo testnet with test tokens.</p>
      </div>
      <ol className="rounded-[var(--radius-panel)] border border-line bg-surface px-6">
        <Step done={!!w.address} title="Connect a wallet">
          <p className="text-sm text-muted">MetaMask or any browser wallet. Use a fresh account just for testnet.</p>
          {!w.address ? (
            <button
              onClick={() => w.connect().catch((e) => setMsg({ ok: false, text: e.message }))}
              className="self-start rounded-full bg-accent px-5 py-2 font-medium text-accent-ink active:scale-[0.98]"
            >
              {w.hasWallet ? "Connect wallet" : "Install MetaMask first"}
            </button>
          ) : null}
        </Step>
        <Step done={!!w.address && w.onRightChain} title="Switch to Somnia Tokyo">
          <p className="num text-sm text-muted">Chain 50383, gas paid in STT.</p>
          {w.address && !w.onRightChain ? (
            <button onClick={() => w.switchChain()} className="self-start rounded-full bg-accent px-5 py-2 font-medium text-accent-ink active:scale-[0.98]">
              Add and switch network
            </button>
          ) : null}
        </Step>
        <Step done={(m.stt ?? 0) > 0.5 && ((m.walletUsdso ?? 0) > 0 || (m.margin ?? 0) > 0)} title="Get test STT and USDso">
          <p className="text-sm text-muted">
            Builders can claim from the faucet bot in the SomniaHacks Telegram builder group with{" "}
            <code className="num rounded bg-surface-2 px-1.5 py-0.5 text-text">/faucet {w.address ?? "0xYourAddress"}</code>. Everyone
            else can ask in the dreamDEX Discord.
          </p>
          <p className="text-sm text-muted">Keep faucet funds in this wallet. Do not move them into a Perps Arena account.</p>
          {w.address ? (
            <p className="num text-sm">
              STT {m.stt?.toFixed(3) ?? "--"} · USDso in wallet {fmtUsd(m.walletUsdso)}
            </p>
          ) : null}
        </Step>
        <Step done={(m.margin ?? 0) >= 20} title="Deposit USDso as perps margin">
          <p className="text-sm text-muted">Perps orders draw on your MarginBank balance, not on the wallet.</p>
          <p className="num text-sm">Margin now {m.loading ? "…" : fmtUsd(m.margin)}</p>
          <div className="flex flex-col gap-2">
            <label htmlFor="amt" className="text-sm font-medium">
              Amount (USDso)
            </label>
            <div className="flex gap-2">
              <input
                id="amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="num w-40 rounded-[var(--radius-control)] border border-line bg-bg px-3 py-2 outline-none focus:border-accent"
              />
              <button
                onClick={deposit}
                disabled={!w.address || busy}
                className="rounded-full bg-accent px-5 py-2 font-medium text-accent-ink active:scale-[0.98] disabled:opacity-40"
              >
                {busy ? "Confirm in wallet" : "Deposit"}
              </button>
            </div>
            <span className="text-xs text-muted">The first deposit asks for a token approval, then the deposit itself.</span>
          </div>
        </Step>
      </ol>
      {msg ? (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`flex items-center gap-2 rounded-[var(--radius-control)] border px-4 py-3 text-sm ${msg.ok ? "border-up/40 bg-up/10 text-up" : "border-down/40 bg-down/10 text-down"}`}
        >
          {msg.text}
          {msg.tx ? (
            <a href={txUrl(msg.tx)} target="_blank" rel="noreferrer" className="num flex items-center gap-1 underline-offset-4 hover:underline">
              view tx <ArrowSquareOut size={12} />
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
