import type { Metadata } from "next";
import { getDuel } from "@/lib/duels";
import { marketLabel } from "@/lib/rules";
import { DuelRoom } from "@/components/DuelRoom";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = getDuel(id);
  if (!d) return { title: "Duel not found | DreamDuel" };
  const title =
    d.status === "settled"
      ? `${d.outcome === "draw" ? "Draw" : `${d.outcome} wins`}: ${marketLabel(d.market)} duel | DreamDuel`
      : `${marketLabel(d.market)} duel, ${d.durationMin} min, $${d.capUsd} cap | DreamDuel`;
  return {
    title,
    description: "A timed perps duel on dreamDEX, scored on-chain on Somnia.",
    twitter: { card: "summary_large_image" },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DuelRoom id={id} />;
}
