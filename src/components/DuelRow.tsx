"use client";
import Link from "next/link";
import { ArrowRight, Robot } from "@phosphor-icons/react";
import type { DuelView } from "@/engine/view";
import { fmtClock, fmtPct, timeAgo, toneOf } from "@/client/format";
import { shortAddr } from "@/client/wallet";
import { marketLabel } from "@/lib/rules";

const who = (s: DuelView["a"]) => (s.isBot ? "Sparring Bot" : s.address ? shortAddr(s.address) : "Open seat");

export function DuelRow({ d, now }: { d: DuelView; now: number }) {
  let right: React.ReactNode;
  if (d.status === "open") right = <span className="text-sm text-muted">posted {timeAgo(d.createdAt)}</span>;
  else if (d.status === "starting") right = <span className="num text-sm text-accent">bell in {d.startAt ? fmtClock(d.startAt - now) : "--"}</span>;
  else if (d.status === "live" || d.status === "settling")
    right = (
      <span className="num text-sm">
        <span className={toneOf(d.a.score?.returnPct)}>{fmtPct(d.a.score?.returnPct)}</span>
        <span className="text-muted"> vs </span>
        <span className={toneOf(d.b.score?.returnPct)}>{fmtPct(d.b.score?.returnPct)}</span>
        <span className="ml-3 text-muted">{d.endAt ? fmtClock(d.endAt - now) : ""}</span>
      </span>
    );
  else
    right = (
      <span className="text-sm">
        <span className="font-medium">{d.outcome === "draw" ? "Draw" : `${d.outcome} won`}</span>
        <span className="num ml-2 text-muted">
          {fmtPct(d.a.score?.returnPct)} / {fmtPct(d.b.score?.returnPct)}
        </span>
      </span>
    );

  return (
    <Link
      href={`/duel/${d.id}`}
      className="group grid grid-cols-[1fr_auto] items-center gap-3 rounded-[var(--radius-control)] px-3 py-3 transition-colors hover:bg-surface-2"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-medium">
          {marketLabel(d.market)}
          <span className="num text-sm font-normal text-muted">
            {d.durationMin}m, ${d.capUsd}
          </span>
        </span>
        <span className="flex items-center gap-1.5 truncate text-sm text-muted">
          <span className="text-accent">{who(d.a)}</span> vs{" "}
          {d.vsBot || d.b.isBot ? <Robot size={14} /> : null}
          <span className="text-side-b">{d.vsBot && !d.b.address ? "Sparring Bot" : who(d.b)}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        {right}
        <ArrowRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
