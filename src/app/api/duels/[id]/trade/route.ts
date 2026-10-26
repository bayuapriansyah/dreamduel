import { NextResponse } from "next/server";
import { addEvent, getDuel } from "@/lib/duels";
import { marketLabel } from "@/lib/rules";
import { engine } from "@/engine/engine";
import { bad, handle } from "../../../_util";

// A duelist's browser reports the hash of an order it just sent. It is logged only after the
// chain confirms the tx came from that duelist and touched the duel market's pool.
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const d = getDuel(id);
  if (!d || d.status !== "live") return bad("Duel is not live", 409);
  const { txHash, side, qty } = await req.json();
  if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) return bad("Bad tx hash");
  const e = engine();
  const receipt = await e.exchange.client.getViemClient().getTransactionReceipt({ hash: txHash as `0x${string}` });
  const from = receipt.from.toLowerCase();
  const who = from === d.creator ? "A" : from === d.opponent ? "B" : null;
  if (!who) return bad("Transaction is not from a duelist", 403);
  const pool = e.market(d.market).pool.toLowerCase();
  if (!receipt.logs.some((l) => l.address.toLowerCase() === pool)) return bad("Transaction did not touch the duel market");
  const verb = side === "buy" ? "bought" : "sold";
  const amount = Number(qty) > 0 ? ` ${Number(qty)}` : "";
  addEvent(id, "trade", who, `${who} ${verb}${amount} ${marketLabel(d.market).split("-")[0]}`, txHash);
  e.publish(id);
  return NextResponse.json({ ok: true });
});
