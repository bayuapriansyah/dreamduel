// Boot the duel referee alongside the Next.js server (Node runtime only).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { engine } = await import("./engine/engine");
  engine()
    .start()
    .catch((e) => console.error("[engine] failed to start", e));
}
