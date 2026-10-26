"use client";
import { useEffect, useState } from "react";
import type { DuelView } from "@/engine/view";

export interface Lobby {
  open: DuelView[];
  live: DuelView[];
  recent: DuelView[];
}

export function useLobby(intervalMs = 4000) {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/duels")
        .then((r) => r.json())
        .then((j) => alive && (setLobby(j), setError(null)))
        .catch((e) => alive && setError(e.message));
    load();
    const t = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [intervalMs]);
  return { lobby, error };
}
