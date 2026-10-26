import { NextResponse } from "next/server";
import { createTerms } from "@/lib/auth";
import { verifyIntent } from "@/lib/auth-server";
import { createDuel, listDuels, listDuelsFor } from "@/lib/duels";
import { DUEL_CAPS_USD, DUEL_DURATIONS_MIN, isDuelMarket } from "@/lib/rules";
import { engine } from "@/engine/engine";
import { bad, handle } from "../_util";

export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request) => {
  const e = engine();
  const player = new URL(req.url).searchParams.get("player");
  if (player) return NextResponse.json({ duels: listDuelsFor(player, 30).map((d) => e.view(d)) });
  return NextResponse.json({
    open: listDuels(["open"], 30).map((d) => e.view(d)),
    live: listDuels(["starting", "live", "settling"], 30).map((d) => e.view(d)),
    recent: listDuels(["settled"], 12).map((d) => e.view(d)),
  });
});

export const POST = handle(async (req: Request) => {
  const body = await req.json();
  const { market, durationMin, capUsd, vsBot, intent } = body ?? {};
  if (!isDuelMarket(market)) return bad("Unsupported market");
  if (!(DUEL_DURATIONS_MIN as readonly number[]).includes(durationMin)) return bad("Unsupported duration");
  if (!(DUEL_CAPS_USD as readonly number[]).includes(capUsd)) return bad("Unsupported cap");
  const e = engine();
  if (vsBot && !e.bot) return bad("Sparring Bot is offline");
  const creator = await verifyIntent(intent, "create", createTerms(market, durationMin, capUsd, !!vsBot));
  if (creator === e.bot?.address) return bad("That wallet belongs to the Sparring Bot");
  const busy = listDuels(["open", "starting", "live", "settling"], 200).some(
    (d) => d.creator === creator || d.opponent === creator,
  );
  if (busy) return bad("You already have a duel in progress. Finish or cancel it first.", 409);
  await e.assertMargin(creator, market, capUsd);
  const d = createDuel({ market, durationMin, capUsd, creator, vsBot: !!vsBot });
  e.publish(d.id);
  return NextResponse.json({ duel: e.view(d) }, { status: 201 });
});
