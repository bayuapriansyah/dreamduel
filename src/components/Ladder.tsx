"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Crown, Fire, Robot } from "@phosphor-icons/react";
import type { LadderRow } from "@/lib/scoring";
import { shortAddr, useWallet } from "@/client/wallet";
import { addrUrl } from "@/client/format";

export function Ladder() {
  const w = useWallet();
  const [data, setData] = useState<{ ladder: LadderRow[]; bot: string | null; games: number } | null>(null);
  useEffect(() => {
    fetch("/api/ladder")
      .then((r) => r.json())
      .then(setData);
  }, []);
  const me = w.address?.toLowerCase();

  return (
    <div className="flex flex-col gap-8 pt-10">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">The ladder.</h1>
        <p className="mt-3 max-w-[56ch] text-muted">
          Elo from every settled duel. Everyone starts at 1200 and beating a stronger rival moves you further.
          {data ? <span className="num"> {data.games} duels settled so far.</span> : null}
        </p>
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-line bg-surface">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="px-5 py-3 font-medium">Rank</th>
              <th className="px-5 py-3 font-medium">Trader</th>
              <th className="px-5 py-3 text-right font-medium">Rating</th>
              <th className="px-5 py-3 text-right font-medium">W / L / D</th>
              <th className="px-5 py-3 text-right font-medium">Streak</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted">
                  Loading the ladder
                </td>
              </tr>
            ) : data.ladder.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <p className="text-muted">No settled duels yet.</p>
                  <Link href="/new" className="mt-2 inline-block font-medium text-accent">
                    Be the first on the board
                  </Link>
                </td>
              </tr>
            ) : (
              data.ladder.map((r, i) => {
                const bot = r.address === data.bot;
                return (
                  <tr key={r.address} className={`border-t border-line ${r.address === me ? "bg-accent/5" : ""}`}>
                    <td className="num px-5 py-3">
                      {i === 0 ? <Crown size={16} weight="fill" className="inline text-accent" /> : i + 1}
                    </td>
                    <td className="px-5 py-3">
                      <a href={addrUrl(r.address)} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline">
                        {bot ? <Robot size={16} /> : null}
                        <span className={bot ? "" : "num"}>{bot ? "Sparring Bot" : shortAddr(r.address)}</span>
                        {r.address === me ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">you</span> : null}
                      </a>
                    </td>
                    <td className="num px-5 py-3 text-right font-semibold">{Math.round(r.rating)}</td>
                    <td className="num px-5 py-3 text-right text-muted">
                      {r.wins} / {r.losses} / {r.draws}
                    </td>
                    <td className="num px-5 py-3 text-right">
                      {r.streak >= 2 ? (
                        <span className="inline-flex items-center gap-1 text-accent">
                          <Fire size={14} weight="fill" /> {r.streak}W
                        </span>
                      ) : r.streak > 0 ? (
                        <span>1W</span>
                      ) : r.streak < 0 ? (
                        <span className="text-muted">{-r.streak}L</span>
                      ) : (
                        <span className="text-muted">--</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
