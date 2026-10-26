"use client";
import { useEffect, useRef, useState } from "react";
import type { DuelView } from "@/engine/view";
import type { DuelEvent } from "@/lib/duels";

export interface Sample {
  ts: number;
  a: number;
  b: number;
}

/** A duel, kept live over SSE. Samples are extended client-side from each push. */
export function useDuel(id: string) {
  const [duel, setDuel] = useState<DuelView | null>(null);
  const [events, setEvents] = useState<DuelEvent[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [error, setError] = useState<string | null>(null);
  const lastSample = useRef(0);

  useEffect(() => {
    let alive = true;
    fetch(`/api/duels/${id}`)
      .then((r) => (r.ok ? r.json() : r.json().then((j) => Promise.reject(new Error(j.error)))))
      .then((j) => {
        if (!alive) return;
        setDuel(j.duel);
        setEvents(j.events);
        setSamples(j.samples);
        lastSample.current = j.samples.at(-1)?.ts ?? 0;
      })
      .catch((e) => alive && setError(e.message));

    const es = new EventSource(`/api/duels/${id}/stream`);
    es.addEventListener("duel", (m) => {
      const v = JSON.parse((m as MessageEvent).data) as DuelView;
      setDuel(v);
      const ra = v.a.score?.returnPct;
      const rb = v.b.score?.returnPct;
      const now = Date.now();
      if (v.status === "live" && ra != null && rb != null && now - lastSample.current > 1000) {
        lastSample.current = now;
        setSamples((s) => [...s, { ts: now, a: ra, b: rb }]);
      }
    });
    es.addEventListener("events", (m) => {
      const fresh = JSON.parse((m as MessageEvent).data) as DuelEvent[];
      setEvents((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...fresh.filter((e) => !seen.has(e.id)).reverse(), ...prev];
      });
    });
    return () => {
      alive = false;
      es.close();
    };
  }, [id]);

  return { duel, events, samples, error };
}

/** Wall clock aligned to the server's clock, ticking every `ms`. */
export function useServerNow(serverNow: number | undefined, ms = 250) {
  const offset = useRef(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (serverNow) offset.current = serverNow - Date.now();
  }, [serverNow]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset.current), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
