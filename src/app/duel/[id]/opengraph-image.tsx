import { ImageResponse } from "next/og";
import { getDuel } from "@/lib/duels";
import { marketLabel } from "@/lib/rules";
import { scorePlayer } from "@/lib/scoring";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DreamDuel result card";

const BG = "#0a0a0b";
const TEXT = "#ececee";
const MUTED = "#8c8c96";
const ACCENT = "#ff6a2b";
const SIDE_B = "#c9d3e3";
const UP = "#3fd896";
const DOWN = "#ff5b67";

const pct = (v: number | null) => (v == null ? "--" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
const short = (a: string | null) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "Open seat");

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = getDuel(id);
  const label = d ? marketLabel(d.market) : "Duel";
  const ret = (start: number | null, end: number | null, flows: number) =>
    d && start != null && end != null
      ? scorePlayer({ startEquity: start, endEquity: end, netFlows: flows, traded: true, fouled: false }, d.capUsd).returnPct
      : null;
  const ra = d ? ret(d.startEqA, d.endEqA, d.flowsA) : null;
  const rb = d ? ret(d.startEqB, d.endEqB, d.flowsB) : null;
  const headline =
    !d ? "Duel not found" : d.status === "settled" ? (d.outcome === "draw" ? "Dead even." : `Side ${d.outcome} takes it.`) : "Seat B is open.";
  const tone = (v: number | null) => (v == null || Math.abs(v) < 0.005 ? MUTED : v > 0 ? UP : DOWN);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: BG, color: TEXT, display: "flex", flexDirection: "column", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: MUTED }}>
          <span style={{ color: ACCENT, fontWeight: 700 }}>DreamDuel</span>
          <span>
            {label} {d ? `· ${d.durationMin} min · $${d.capUsd} cap` : ""}
          </span>
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, marginTop: 56, letterSpacing: -2 }}>{headline}</div>
        <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, color: ACCENT }}>A {short(d?.creator ?? null)}</span>
            <span style={{ fontSize: 96, fontWeight: 700, color: tone(ra) }}>{pct(ra)}</span>
          </div>
          <span style={{ fontSize: 40, color: MUTED, marginBottom: 28 }}>vs</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: 28, color: SIDE_B }}>B {short(d?.opponent ?? null)}</span>
            <span style={{ fontSize: 96, fontWeight: 700, color: tone(rb) }}>{pct(rb)}</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: MUTED, marginTop: 24 }}>
          Scored on-chain on Somnia. Perps on dreamDEX. @DreamDEXSomnia
        </div>
      </div>
    ),
    size,
  );
}
