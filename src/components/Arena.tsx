"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Lightning, Robot, ShieldCheck, Scales, Skull } from "@phosphor-icons/react";
import { useLobby } from "@/client/useLobby";
import { useServerNow } from "@/client/useDuel";
import { DuelRow } from "./DuelRow";
import { FeaturedDuel } from "./FeaturedDuel";

const ease = [0.16, 1, 0.3, 1] as const;

export function Arena() {
  const { lobby } = useLobby();
  const now = useServerNow(undefined, 1000);
  const reduce = useReducedMotion();
  const featured = lobby?.live.find((d) => d.status === "live") ?? lobby?.recent[0] ?? null;
  const rise = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: i * 0.08, ease } };

  return (
    <div className="flex flex-col gap-24">
      <section className="grid grid-cols-1 items-center gap-10 pt-12 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <motion.h1 {...rise(0)} className="text-5xl font-semibold leading-[1.02] tracking-tighter md:text-6xl lg:text-7xl">
            Call out a trader.
            <br />
            <span className="text-accent">Settle it on-chain.</span>
          </motion.h1>
          <motion.p {...rise(1)} className="max-w-[46ch] text-lg leading-relaxed text-muted">
            Timed perps duels on dreamDEX. Same market, same cap, best return wins, scored from Somnia chain state.
          </motion.p>
          <motion.div {...rise(2)} className="flex flex-wrap gap-3">
            <Link
              href="/new"
              className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-ink transition hover:brightness-110 active:scale-[0.98]"
            >
              Start a duel
            </Link>
            <Link
              href="/new?bot=1"
              className="flex items-center gap-2 rounded-full border border-line px-6 py-3 font-medium transition hover:bg-surface-2 active:scale-[0.98]"
            >
              <Robot size={18} /> Spar the bot
            </Link>
          </motion.div>
        </div>
        <motion.div {...rise(3)}>
          <FeaturedDuel duel={featured} now={now} />
        </motion.div>
      </section>

      <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">Open challenges</h2>
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-2">
            {!lobby ? (
              <ListSkeleton />
            ) : lobby.open.length === 0 ? (
              <Empty text="No open challenges right now." cta="Post the first one" href="/new" />
            ) : (
              lobby.open.map((d) => <DuelRow key={d.id} d={d} now={now} />)
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">In the ring</h2>
          <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-2">
            {!lobby ? (
              <ListSkeleton />
            ) : lobby.live.length === 0 ? (
              <Empty text="Nobody is fighting yet." cta="Spar the bot" href="/new?bot=1" />
            ) : (
              lobby.live.map((d) => <DuelRow key={d.id} d={d} now={now} />)
            )}
          </div>
          {lobby && lobby.recent.length > 0 ? (
            <>
              <h3 className="mt-4 font-semibold">Latest results</h3>
              <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-2">
                {lobby.recent.slice(0, 5).map((d) => (
                  <DuelRow key={d.id} d={d} now={now} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-10">
        <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tight md:text-4xl">A fair fight, by construction.</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
          <Rule
            className="md:col-span-4 bg-accent text-accent-ink"
            icon={<Scales size={28} weight="duotone" />}
            title="Same cap, same clock"
            body="Both duelists get the same market, window and notional cap. Score is return on the cap, so a bigger wallet buys no edge."
            dark
          />
          <Rule
            className="md:col-span-2"
            icon={<Skull size={28} weight="duotone" />}
            title="KO at minus 20%"
            body="Lose a fifth of the cap and the fight ends on the spot."
          />
          <Rule
            className="md:col-span-2"
            icon={<ShieldCheck size={28} weight="duotone" />}
            title="Your keys, your orders"
            body="You trade from your own wallet. The referee only reads the chain."
          />
          <Rule
            className="md:col-span-4 bg-surface-2"
            icon={<Lightning size={28} weight="duotone" className="text-accent" />}
            title="Scored in the same block"
            body="Somnia Reactivity pushes both accounts' equity with every market event, so the scoreboard moves with the chain. Final scores read on-chain equity at the closing block, net of deposits."
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 border-t border-line pt-12 md:grid-cols-4">
        {[
          ["Challenge", "Pick BTC or ETH, a 5 to 60 minute window and a cap. Sign once, no gas."],
          ["Accept", "Your rival opens the link and takes the B seat. The bell rings 15 seconds later."],
          ["Trade", "Long, short, close. Real IOC orders on dreamDEX perps, every fill has a tx hash."],
          ["Settle", "Closing bell reads both accounts on-chain. Post the result, call a rematch."],
        ].map(([t, b]) => (
          <div key={t} className="flex flex-col gap-2 border-l-2 border-accent/60 pl-4">
            <h3 className="text-lg font-semibold">{t}</h3>
            <p className="text-sm leading-relaxed text-muted">{b}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Rule(p: { className?: string; icon: React.ReactNode; title: string; body: string; dark?: boolean }) {
  return (
    <div className={`flex min-h-[200px] flex-col justify-between gap-6 rounded-[var(--radius-panel)] border border-line p-6 ${p.className ?? "bg-surface"}`}>
      {p.icon}
      <div>
        <h3 className="text-xl font-semibold tracking-tight">{p.title}</h3>
        <p className={`mt-2 max-w-[52ch] text-sm leading-relaxed ${p.dark ? "opacity-80" : "text-muted"}`}>{p.body}</p>
      </div>
    </div>
  );
}

function Empty({ text, cta, href }: { text: string; cta: string; href: string }) {
  return (
    <div className="flex flex-col items-start gap-3 px-3 py-6">
      <p className="text-muted">{text}</p>
      <Link href={href} className="text-sm font-medium text-accent underline-offset-4 hover:underline">
        {cta}
      </Link>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2 p-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 rounded-[var(--radius-control)] bg-surface-2" />
      ))}
    </div>
  );
}
