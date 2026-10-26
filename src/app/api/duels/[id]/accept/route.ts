import { NextResponse } from "next/server";
import { verifyIntent } from "@/lib/auth-server";
import { addEvent, getDuel, listDuels, transition } from "@/lib/duels";
import { engine } from "@/engine/engine";
import { bad, handle } from "../../../_util";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const d = getDuel(id);
  if (!d) return bad("Duel not found", 404);
  if (d.status !== "open") return bad("This challenge is no longer open", 409);
  if (d.vsBot) return bad("This challenge is reserved for the Sparring Bot", 409);
  const { intent } = await req.json();
  const who = await verifyIntent(intent, "accept", id);
  if (who === d.creator) return bad("You cannot accept your own challenge");
  const busy = listDuels(["starting", "live", "settling"], 200).some((x) => x.creator === who || x.opponent === who);
  if (busy) return bad("You are already in a duel", 409);
  if (!transition(id, "open", "starting", { opponent: who })) return bad("Someone else got there first", 409);
  addEvent(id, "joined", "B", "Challenger accepted");
  engine().arm(id);
  return NextResponse.json({ duel: engine().view(getDuel(id)!) });
});
