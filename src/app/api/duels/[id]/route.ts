import { NextResponse } from "next/server";
import { getDuel, listEvents, listSamples } from "@/lib/duels";
import { engine } from "@/engine/engine";
import { bad, handle } from "../../_util";

export const dynamic = "force-dynamic";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const d = getDuel(id);
  if (!d) return bad("Duel not found", 404);
  return NextResponse.json({ duel: engine().view(d), events: listEvents(id), samples: listSamples(id) });
});
