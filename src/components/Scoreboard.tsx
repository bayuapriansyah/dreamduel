"use client";
import { Crown, Robot, Skull, Prohibit } from "@phosphor-icons/react";
import type { DuelView, SideView } from "@/engine/view";
import { fmtClock, fmtPct, fmtSignedUsd, fmtUsd, toneOf } from "@/client/format";
import { shortAddr } from "@/client/wallet";
import { marketLabel } from "@/lib/rules";

function sideName(s: SideView, fallback: string) {
  if (s.isBot) return "Sparring Bot";
  return s.address ? shortAddr(s.address) : fallback;
}

function Side({ s, who, duel, you }: { s: SideView; who: "A" | "B"; duel: DuelView; you: boolean }) {
  const isWinner = duel.outcome === who;
  const isLeader = duel.status === "live" && duel.leader === who;
  const color = who === "A" ? "text-accent" : "text-side-b";
  const base = marketLabel(duel.market).split("-")[0];
  return (
    <div className={`flex flex-col gap-3 ${who === "B" ? "md:items-end md:text-right" : ""}`}>
      <div className={`flex items-center gap-2 text-sm ${who === "B" ? "md:flex-row-reverse" : ""}`}>
        <span className={`num font-semibold ${color}`}>{who}</span>
        <span className="flex items-center gap-1.5 text-text">
          {s.isBot ? <Robot size={16} /> : null}
          {sideName(s, who === "B" ? "Open seat" : "Challenger")}
        </span>
        {you ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">you</span> : null}
        {isWinner ? <Crown size={18} weight="fill" className="text-accent" aria-label="Winner" /> : null}
      </div>
      <div className={`tnum text-5xl font-semibold tracking-tight md:text-6xl ${toneOf(s.score?.returnPct)}`}>
        {fmtPct(s.score?.returnPct)}
      </div>
      <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted ${who === "B" ? "md:justify-end" : ""}`}>
        <span>
          PnL <span className={`num ${toneOf(s.score?.pnl)}`}>{fmtSignedUsd(s.score?.pnl)}</span>
        </span>
        <span>
          Equity <span className="num text-text">{fmtUsd(s.equity)}</span>
        </span>
      </div>
      <div className={`flex flex-wrap items-center gap-2 text-sm ${who === "B" ? "md:justify-end" : ""}`}>
        {s.position !== 0 ? (
          <span className={`num rounded-full border px-2.5 py-0.5 ${s.position > 0 ? "border-up/40 text-up" : "border-down/40 text-down"}`}>
            {s.position > 0 ? "Long" : "Short"} {Math.abs(s.position).toPrecision(3)} {base}
          </span>
        ) : (
          <span className="rounded-full border border-line px-2.5 py-0.5 text-muted">Flat</span>
        )}
        <span className="num text-muted">
          {fmtUsd(s.notional, 0)} of {fmtUsd(duel.capUsd, 0)} cap
        </span>
        {s.score?.ko ? (
          <span className="flex items-center gap-1 text-down">
            <Skull size={14} weight="fill" /> KO
          </span>
        ) : null}
        {s.fouled ? (
          <span className="flex items-center gap-1 text-down">
            <Prohibit size={14} /> Foul
          </span>
        ) : null}
        {isLeader ? <span className={`${color} font-medium`}>Leading</span> : null}
      </div>
    </div>
  );
}

export function Scoreboard({ duel, now, you }: { duel: DuelView; now: number; you?: string | null }) {
  const me = you?.toLowerCase();
  let center: React.ReactNode;
  if (duel.status === "open") center = <span className="text-muted">Waiting for a challenger</span>;
  else if (duel.status === "starting")
    center = (
      <>
        <span className="text-sm text-muted">Opening bell in</span>
        <span className="tnum text-4xl font-semibold text-accent">{duel.startAt ? fmtClock(duel.startAt - now) : "--:--"}</span>
      </>
    );
  else if (duel.status === "live" || duel.status === "settling")
    center = (
      <>
        <span className="text-sm text-muted">{duel.status === "settling" ? "Settling" : "Time left"}</span>
        <span className="tnum text-4xl font-semibold">{duel.endAt ? fmtClock(duel.endAt - now) : "--:--"}</span>
      </>
    );
  else if (duel.status === "settled")
    center = (
      <>
        <span className="text-sm text-muted">Final</span>
        <span className="text-2xl font-semibold">{duel.outcome === "draw" ? "Draw" : `${duel.outcome} wins`}</span>
      </>
    );
  else center = <span className="capitalize text-muted">{duel.status}</span>;

  return (
    <section className="grid grid-cols-1 gap-8 rounded-[var(--radius-panel)] border border-line bg-surface p-6 md:grid-cols-[1fr_auto_1fr] md:items-center md:p-8">
      <Side s={duel.a} who="A" duel={duel} you={!!me && duel.a.address === me} />
      <div className="flex flex-col items-center gap-1 border-y border-line py-4 text-center md:border-x md:border-y-0 md:px-10 md:py-0">
        {center}
        <span className="mt-1 text-xs text-muted">
          {marketLabel(duel.market)} · {duel.durationMin} min
        </span>
      </div>
      <Side s={duel.b} who="B" duel={duel} you={!!me && duel.b.address === me} />
    </section>
  );
}
