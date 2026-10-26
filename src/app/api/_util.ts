import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth-server";
import { MarginError } from "@/engine/engine";

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wrap a handler so auth and input errors become clean JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof AuthError) return bad(e.message, 401);
      if (e instanceof MarginError) return bad(e.message, 412);
      console.error("[api]", e);
      return bad(e instanceof Error ? e.message : "Unexpected error", 500);
    }
  };
}
