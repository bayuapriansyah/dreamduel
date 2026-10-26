"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import type { DuelEvent } from "@/lib/duels";
import { txUrl } from "@/client/format";

export function EventFeed({ events }: { events: DuelEvent[] }) {
  const reduce = useReducedMotion();
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-5">
      <h2 className="font-semibold">Ringside</h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted">Nothing yet. Every order, foul and bell lands here.</p>
      ) : (
        <ol className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <motion.li
                key={e.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className="grid grid-cols-[auto_1fr] gap-x-3 text-sm"
              >
                <span
                  className={`num mt-0.5 w-5 text-center text-xs font-semibold ${
                    e.side === "A" ? "text-accent" : e.side === "B" ? "text-side-b" : "text-muted"
                  }`}
                >
                  {e.side ?? "•"}
                </span>
                <div className="flex flex-col">
                  <span className={e.kind === "settled" || e.kind === "ko" ? "font-medium" : ""}>{e.text}</span>
                  <span className="num flex items-center gap-2 text-xs text-muted">
                    {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    {e.txHash ? (
                      <a href={txUrl(e.txHash)} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-text">
                        {e.txHash.slice(0, 10)}… <ArrowSquareOut size={11} />
                      </a>
                    ) : null}
                  </span>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </section>
  );
}
