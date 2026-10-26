import { NextResponse } from "next/server";
import { verifyIntent } from "@/lib/auth-server";
import { addEvent, getDuel, transition } from "@/lib/duels";
import { engine } from "@/engine/engine";
import { bad, handle } from "../../../_util";

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const d = getDuel(id);
  if (!d) return bad("Duel not found", 404);
  const { intent } = await req.json();
  const who = await verifyIntent(intent, "cancel", id);
  if (who !== d.creator) return bad("Only the challenger can cancel", 403);
  if (!transition(id, "open", "cancelled")) return bad("Only open challenges can be cancelled", 409);
  addEvent(id, "cancelled", "A", "Challenge withdrawn");
  engine().publish(id);
  return NextResponse.json({ duel: engine().view(getDuel(id)!) });
});
