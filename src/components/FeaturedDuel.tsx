"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DuelView } from "@/engine/view";
import type { Sample } from "@/client/useDuel";
import { fmtClock, fmtPct, toneOf } from "@/client/format";
import { marketLabel } from "@/lib/rules";
import { RaceChart } from "./RaceChart";

// A clearly labelled sample, shown only until the arena has a real duel to feature.
function sampleReplay(): { samples: Sample[]; startAt: number; endAt: number } {
  const startAt = 0;
  const endAt = 15 * 60_000;
  const samples: Sample[] = [];
  let a = 0;
  let b = 0;
  for (let t = 10_000; t <= endAt; t += 10_000) {
    const k = t / endAt;
    a = 2.4 * Math.sin(k * 5.1) + k * 3.1 + Math.sin(k * 23) * 0.35;
    b = 1.9 * Math.sin(k * 3.3 + 0.8) + k * 1.2 - Math.cos(k * 17) * 0.3;
    samples.push({ ts: t, a, b });
  }
  return { samples, startAt, endAt };
}

export function FeaturedDuel({ duel, now }: { duel: DuelView | null; now: number }) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const demo = useMemo(sampleReplay, []);
  useEffect(() => {
    if (!duel) return;
    let alive = true;
    const load = () =>
      fetch(`/api/duels/${duel.id}`)
        .then((r) => r.json())
        .then((j) => alive && setSamples(j.samples ?? []));
    load();
    const t = duel.status === "live" ? setInterval(load, 5000) : undefined;
    return () => {
      alive = false;
      if (t) clearInterval(t);
    };
  }, [duel?.id, duel?.status]);

  const real = !!duel && duel.startAt != null;
  const chartSamples = real ? samples : demo.samples;
  const last = chartSamples.at(-1);
  const ra = real ? duel!.a.score?.returnPct : last?.a;
  const rb = real ? duel!.b.score?.returnPct : last?.b;
  const status = !real
    ? "Sample replay"
    : duel!.status === "live"
      ? `Live, ${duel!.endAt ? fmtClock(duel!.endAt - now) : ""} left`
      : duel!.status === "settled"
        ? duel!.outcome === "draw"
          ? "Final, draw"
          : `Final, ${duel!.outcome} won`
        : "Starting";

  const body = (
    <div className="flex flex-col gap-5 rounded-[var(--radius-panel)] border border-line bg-surface p-5 shadow-[0_30px_80px_-40px_color-mix(in_srgb,var(--accent)_45%,transparent)] md:p-6">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{real ? marketLabel(duel!.market) : "BTC-PERP"} duel</span>
        <span className={real && duel!.status === "live" ? "text-accent" : "text-muted"}>{status}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-muted">Side A</div>
          <div className={`tnum text-4xl font-semibold tracking-tight ${toneOf(ra)}`}>{fmtPct(ra)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Side B</div>
          <div className={`tnum text-4xl font-semibold tracking-tight ${toneOf(rb)}`}>{fmtPct(rb)}</div>
        </div>
      </div>
      <RaceChart
        samples={chartSamples}
        startAt={real ? duel!.startAt : demo.startAt}
        endAt={real ? duel!.endAt : demo.endAt}
        height={200}
        labels={real ? ["A", "B"] : ["A (sample)", "B (sample)"]}
      />
    </div>
  );
  return real ? (
    <Link href={`/duel/${duel!.id}`} className="block transition-transform hover:-translate-y-0.5">
      {body}
    </Link>
  ) : (
    body
  );
}
