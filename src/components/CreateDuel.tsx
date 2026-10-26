"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle, Circle, Robot, UsersThree } from "@phosphor-icons/react";
import { useWallet } from "@/client/wallet";
import { useMargin } from "@/client/useMargin";
import { postJson, type DuelResponse } from "@/client/api";
import { fmtUsd } from "@/client/format";
import { createTerms } from "@/lib/auth";
import { DUEL_CAPS_USD, DUEL_DURATIONS_MIN, DUEL_MARKETS, KO_LOSS_SHARE, marketLabel } from "@/lib/rules";

function Segmented<T extends string | number>(p: { label: string; value: T; options: readonly T[]; render: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{p.label}</legend>
      <div className="grid gap-1 rounded-[var(--radius-control)] bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${p.options.length}, minmax(0, 1fr))` }}>
        {p.options.map((o) => (
          <button
            type="button"
            key={String(o)}
            aria-pressed={p.value === o}
            onClick={() => p.onChange(o)}
            className={`tnum rounded-[8px] py-2.5 text-sm transition ${p.value === o ? "bg-surface font-semibold text-text shadow-sm" : "text-muted hover:text-text"}`}
          >
            {p.render(o)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CreateDuel() {
  const params = useSearchParams();
  const router = useRouter();
  const w = useWallet();
  const m = useMargin();
  const [market, setMarket] = useState<string>(DUEL_MARKETS[0]);
  const [duration, setDuration] = useState<number>(15);
  const [cap, setCap] = useState<number>(250);
  const [vsBot, setVsBot] = useState(params.get("bot") === "1");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const koBuffer = cap * KO_LOSS_SHARE;
  const checks = [
    { ok: !!w.address, label: "Wallet connected", fix: !w.address ? { text: "Connect", run: () => w.connect() } : null },
    { ok: !!w.address && w.onRightChain, label: "On Somnia Tokyo testnet", fix: w.address && !w.onRightChain ? { text: "Switch", run: () => w.switchChain() } : null },
    {
      ok: (m.margin ?? 0) >= koBuffer,
      label: m.margin == null ? "Perps margin" : `Perps margin ${fmtUsd(m.margin)} (needs ${fmtUsd(koBuffer, 0)}+)`,
      link: (m.margin ?? 0) < koBuffer ? "/setup" : null,
    },
  ];

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const intent = await w.signIntent("create", createTerms(market, duration, cap, vsBot));
      const r = await postJson<DuelResponse>("/api/duels", { market, durationMin: duration, capUsd: cap, vsBot, intent });
      router.push(`/duel/${r.duel.id}`);
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? "Could not post the challenge");
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[1fr_380px] lg:gap-16">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Set the terms.</h1>
          <p className="mt-3 max-w-[52ch] text-muted">Both sides play the same market, clock and cap. Return on the cap decides it.</p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Opponent</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { bot: false, icon: <UsersThree size={22} />, title: "Anyone with the link", body: "Post it, share it, wait for a taker." },
              { bot: true, icon: <Robot size={22} />, title: "Sparring Bot", body: "The house bot joins at once. Good for a warm-up." },
            ].map((o) => (
              <button
                type="button"
                key={o.title}
                aria-pressed={vsBot === o.bot}
                onClick={() => setVsBot(o.bot)}
                className={`flex flex-col gap-2 rounded-[var(--radius-panel)] border p-4 text-left transition ${
                  vsBot === o.bot ? "border-accent bg-accent/5" : "border-line bg-surface hover:bg-surface-2"
                }`}
              >
                <span className={vsBot === o.bot ? "text-accent" : "text-muted"}>{o.icon}</span>
                <span className="font-semibold">{o.title}</span>
                <span className="text-sm text-muted">{o.body}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <Segmented label="Market" value={market} options={DUEL_MARKETS} render={marketLabel} onChange={setMarket} />
        <Segmented label="Length" value={duration} options={DUEL_DURATIONS_MIN} render={(v) => `${v} min`} onChange={setDuration} />
        <Segmented label="Notional cap" value={cap} options={DUEL_CAPS_USD} render={(v) => `$${v}`} onChange={setCap} />
      </div>

      <aside className="flex flex-col gap-5 self-start rounded-[var(--radius-panel)] border border-line bg-surface p-6 lg:sticky lg:top-24">
        <h2 className="font-semibold">Ready check</h2>
        <ul className="flex flex-col gap-3">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                {c.ok ? <CheckCircle size={18} weight="fill" className="text-up" /> : <Circle size={18} className="text-muted" />}
                {c.label}
              </span>
              {"fix" in c && c.fix ? (
                <button onClick={() => c.fix!.run().catch((e: any) => setErr(e.message))} className="font-medium text-accent">
                  {c.fix.text}
                </button>
              ) : "link" in c && c.link ? (
                <Link href={c.link} className="font-medium text-accent">
                  Deposit
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-2 gap-y-2 border-t border-line pt-4 text-sm">
          <dt className="text-muted">Win by</dt>
          <dd className="text-right">Higher return on cap</dd>
          <dt className="text-muted">Knockout</dt>
          <dd className="num text-right">-{fmtUsd(koBuffer, 0)}</dd>
          <dt className="text-muted">Foul</dt>
          <dd className="num text-right">over {fmtUsd(cap, 0)} notional</dd>
        </dl>
        {err ? (
          <p role="alert" className="rounded-[var(--radius-control)] border border-down/40 bg-down/10 px-3 py-2 text-sm text-down">
            {err}
          </p>
        ) : null}
        <button
          onClick={submit}
          disabled={busy || !checks[0]!.ok || !checks[1]!.ok}
          className="rounded-full bg-accent py-3 font-semibold text-accent-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "Waiting for wallet" : vsBot ? "Start sparring" : "Post challenge"}
        </button>
        <p className="text-xs text-muted">Posting signs a message. It sends no transaction and costs no gas.</p>
      </aside>
    </div>
  );
}
