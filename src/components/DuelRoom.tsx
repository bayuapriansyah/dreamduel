"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowsClockwise, Check, Copy, Lightning, XLogo } from "@phosphor-icons/react";
import { useDuel, useServerNow } from "@/client/useDuel";
import { useWallet } from "@/client/wallet";
import { postJson, type DuelResponse } from "@/client/api";
import { fmtPct } from "@/client/format";
import { createTerms } from "@/lib/auth";
import { marketLabel } from "@/lib/rules";
import { Scoreboard } from "./Scoreboard";
import { RaceChart } from "./RaceChart";
import { EventFeed } from "./EventFeed";
import { TradePanel } from "./TradePanel";

export function DuelRoom({ id }: { id: string }) {
  const { duel, events, samples, error } = useDuel(id);
  const now = useServerNow(duel?.serverNow);
  const w = useWallet();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (error) {
    return (
      <div className="py-24">
        <h1 className="text-2xl font-semibold">Duel not found</h1>
        <p className="mt-2 text-muted">The link may be wrong, or the challenge was removed.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-5 py-2 font-medium text-accent-ink">
          Back to the arena
        </Link>
      </div>
    );
  }
  if (!duel) return <RoomSkeleton />;

  const me = w.address?.toLowerCase();
  const mySide = me && duel.a.address === me ? "A" : me && duel.b.address === me ? "B" : null;
  const label = marketLabel(duel.market);
  const url = typeof window !== "undefined" ? window.location.href : "";

  async function act(fn: () => Promise<void>) {
    setActionErr(null);
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      setActionErr(e?.shortMessage ?? e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const accept = () =>
    act(async () => {
      const intent = await w.signIntent("accept", id);
      await postJson(`/api/duels/${id}/accept`, { intent });
    });
  const cancel = () =>
    act(async () => {
      const intent = await w.signIntent("cancel", id);
      await postJson(`/api/duels/${id}/cancel`, { intent });
    });
  const rematch = () =>
    act(async () => {
      const vsBot = duel.b.isBot;
      const intent = await w.signIntent("create", createTerms(duel.market, duel.durationMin, duel.capUsd, vsBot));
      const r = await postJson<DuelResponse>("/api/duels", { market: duel.market, durationMin: duel.durationMin, capUsd: duel.capUsd, vsBot, intent });
      router.push(`/duel/${r.duel.id}`);
    });

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareText =
    duel.status === "settled"
      ? `${duel.outcome === "draw" ? "Dead even" : `Side ${duel.outcome} took it`} in a ${duel.durationMin}-min ${label} duel on @DreamDEXSomnia: ${fmtPct(duel.a.score?.returnPct)} vs ${fmtPct(duel.b.score?.returnPct)}. Scored on-chain on Somnia.`
      : `I'm calling out anyone: ${duel.durationMin}-min ${label} duel, $${duel.capUsd} cap, on @DreamDEXSomnia perps. Take the other seat:`;
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-col gap-6 pt-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{label} duel</h1>
          <p className="mt-1 text-muted">
            {duel.durationMin} minutes, ${duel.capUsd} notional cap. Best return on the cap wins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={copy} className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:bg-surface-2 active:scale-[0.98]">
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy link"}
          </button>
          <a href={xHref} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:bg-surface-2">
            <XLogo size={16} /> Post
          </a>
        </div>
      </header>

      {duel.status === "open" ? (
        <OpenSeat
          isCreator={mySide === "A"}
          vsBot={duel.vsBot}
          busy={busy}
          onAccept={accept}
          onCancel={cancel}
          connected={!!w.address}
        />
      ) : null}

      {actionErr ? (
        <p role="alert" className="rounded-[var(--radius-control)] border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">
          {actionErr}
        </p>
      ) : null}

      <Scoreboard duel={duel} now={now} you={w.address} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-[var(--radius-panel)] border border-line bg-surface p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold">Return on cap</h2>
              {duel.status === "live" ? (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Lightning size={12} weight="fill" className="text-accent" /> pushed by Somnia Reactivity
                </span>
              ) : null}
            </div>
            <RaceChart samples={samples} startAt={duel.startAt} endAt={duel.endAt} />
          </section>
          {duel.status === "settled" ? (
            <section className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">{duel.outcome === "draw" ? "A draw." : `${duel.outcome} takes the duel.`}</h2>
                <p className="mt-1 text-sm text-muted">
                  Settled from on-chain equity at block <span className="num">{duel.endBlock}</span>, net of deposits.
                </p>
              </div>
              {mySide ? (
                <button
                  onClick={rematch}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-2.5 font-medium text-accent-ink hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  <ArrowsClockwise size={16} weight="bold" /> Rematch
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
        <div className="flex flex-col gap-6">
          {mySide && (duel.status === "starting" || duel.status === "live") ? <TradePanel duel={duel} side={mySide} /> : null}
          <EventFeed events={events} />
        </div>
      </div>
    </div>
  );
}

function OpenSeat(p: {
  isCreator: boolean;
  vsBot: boolean;
  busy: boolean;
  connected: boolean;
  onAccept: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-accent/40 bg-accent/5 p-5 md:flex-row md:items-center md:justify-between">
      {p.vsBot && !p.isCreator ? (
        <div>
          <h2 className="font-semibold">Reserved for the Sparring Bot.</h2>
          <p className="mt-1 text-sm text-muted">The house bot takes this seat as soon as it is free.</p>
        </div>
      ) : p.isCreator ? (
        <>
          <div>
            <h2 className="font-semibold">Your challenge is up.</h2>
            <p className="mt-1 text-sm text-muted">
              {p.vsBot ? "The Sparring Bot is taking the other seat." : "Send the link to a rival. The bell rings 15 seconds after they accept."}
            </p>
          </div>
          <button
            onClick={p.onCancel}
            disabled={p.busy}
            className="rounded-full border border-line px-5 py-2 text-sm hover:bg-surface-2 active:scale-[0.98] disabled:opacity-50"
          >
            Withdraw challenge
          </button>
        </>
      ) : (
        <>
          <div>
            <h2 className="font-semibold">The B seat is open.</h2>
            <p className="mt-1 text-sm text-muted">
              Accepting signs a message, no gas. You trade from your own wallet once the bell rings.
            </p>
          </div>
          <button
            onClick={p.onAccept}
            disabled={p.busy}
            className="rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {p.busy ? "Waiting for wallet" : p.connected ? "Take the seat" : "Connect and accept"}
          </button>
        </>
      )}
    </section>
  );
}

function RoomSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6 pt-8">
      <div className="h-10 w-64 rounded-[var(--radius-control)] bg-surface-2" />
      <div className="h-52 rounded-[var(--radius-panel)] bg-surface" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="h-72 rounded-[var(--radius-panel)] bg-surface" />
        <div className="h-72 rounded-[var(--radius-panel)] bg-surface" />
      </div>
    </div>
  );
}
