import { NextResponse } from "next/server";
import { listSettledChronological } from "@/lib/duels";
import { buildLadder } from "@/lib/scoring";
import { engine } from "@/engine/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const games = listSettledChronological()
    .filter((d) => d.opponent && d.outcome)
    .map((d) => ({ a: d.creator, b: d.opponent!, outcome: d.outcome! }));
  return NextResponse.json({ ladder: buildLadder(games), bot: engine().bot?.address ?? null, games: games.length });
}
