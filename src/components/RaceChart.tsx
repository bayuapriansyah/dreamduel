"use client";
import { useId } from "react";
import { fmtPct } from "@/client/format";
import type { Sample } from "@/client/useDuel";

/**
 * Two return lines racing against the clock. X is the duel window, so the unfinished
 * part of the duel stays visible as empty track ahead of the leaders.
 */
export function RaceChart({
  samples,
  startAt,
  endAt,
  height = 220,
  labels = ["A", "B"],
}: {
  samples: Sample[];
  startAt: number | null;
  endAt: number | null;
  height?: number;
  labels?: [string, string];
}) {
  const clip = useId();
  const W = 640;
  const H = height;
  const padY = 18;
  const t0 = startAt ?? samples[0]?.ts ?? 0;
  const t1 = endAt ?? samples.at(-1)?.ts ?? t0 + 1;
  const pts = [{ ts: t0, a: 0, b: 0 }, ...samples.filter((s) => s.ts >= t0)];
  const vals = pts.flatMap((p) => [p.a, p.b]);
  const span = Math.max(0.5, ...vals.map((v) => Math.abs(v))) * 1.25;
  const x = (ts: number) => ((ts - t0) / Math.max(1, t1 - t0)) * W;
  const y = (v: number) => H / 2 - (v / span) * (H / 2 - padY);
  const path = (k: "a" | "b") => pts.map((p, i) => `${i ? "L" : "M"}${x(p.ts).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const last = pts.at(-1)!;

  return (
    <figure className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label="Return of both duelists over time">
        <defs>
          <clipPath id={clip}>
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="var(--line)" strokeDasharray="4 6" />
        <text x="4" y={y(0) - 6} className="num" fontSize="11" fill="var(--muted)">
          0%
        </text>
        <text x="4" y={padY - 4} className="num" fontSize="11" fill="var(--muted)">
          {fmtPct(span, 1)}
        </text>
        <text x="4" y={H - 4} className="num" fontSize="11" fill="var(--muted)">
          {fmtPct(-span, 1)}
        </text>
        <g clipPath={`url(#${clip})`}>
          <path d={path("b")} fill="none" stroke="var(--side-b)" strokeWidth="2.25" strokeLinejoin="round" />
          <path d={path("a")} fill="none" stroke="var(--accent)" strokeWidth="2.75" strokeLinejoin="round" />
        </g>
        {pts.length > 1 ? (
          <>
            <circle cx={x(last.ts)} cy={y(last.b)} r="4.5" fill="var(--side-b)" />
            <circle cx={x(last.ts)} cy={y(last.a)} r="5" fill="var(--accent)" />
          </>
        ) : null}
      </svg>
      <figcaption className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-accent" /> {labels[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-side-b" /> {labels[1]}
        </span>
      </figcaption>
    </figure>
  );
}
