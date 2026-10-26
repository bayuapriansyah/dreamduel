import { getDuel, listEvents } from "@/lib/duels";
import { engine } from "@/engine/engine";
import type { DuelView } from "@/engine/view";

export const dynamic = "force-dynamic";

// Server-Sent Events: the engine publishes on every Reactivity push and every poll.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const e = engine();
  const d = getDuel(id);
  if (!d) return new Response("Not found", { status: 404 });
  const enc = new TextEncoder();
  let lastEventId = listEvents(id, 1)[0]?.id ?? 0;
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (type: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
      const push = (view: DuelView) => {
        try {
          send("duel", view);
          const fresh = listEvents(id, 20)
            .filter((ev) => ev.id > lastEventId)
            .reverse();
          if (fresh.length) {
            lastEventId = fresh[fresh.length - 1]!.id;
            send("events", fresh);
          }
        } catch {
          cleanup();
        }
      };
      push(e.view(d));
      e.bus.on(`duel:${id}`, push);
      const ping = setInterval(() => {
        try {
          controller.enqueue(enc.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);
      cleanup = () => {
        clearInterval(ping);
        e.bus.off(`duel:${id}`, push);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
