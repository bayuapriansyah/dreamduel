import { NextResponse } from "next/server";
import { engine } from "@/engine/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const e = engine();
  return NextResponse.json({
    markets: e.markets.size,
    live: e.live.size,
    reactivity: e.reactivityOk,
    bot: e.bot?.address ?? null,
  });
}
