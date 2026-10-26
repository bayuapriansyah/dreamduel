// Wallet-signed intents. Shared by the browser (builds the message) and the server (verifies it).

export type AuthAction = "create" | "accept" | "cancel";

export interface SignedIntent {
  address: `0x${string}`;
  action: AuthAction;
  /** Duel id for accept/cancel, or the serialized duel terms for create. */
  subject: string;
  issuedAt: number;
  signature: `0x${string}`;
}

/** Signatures older than this are refused. */
export const INTENT_MAX_AGE_MS = 5 * 60 * 1000;

export function intentMessage(i: Omit<SignedIntent, "signature">): string {
  return [
    "DreamDuel",
    `Action: ${i.action}`,
    `Subject: ${i.subject}`,
    `Address: ${i.address.toLowerCase()}`,
    `Issued: ${new Date(i.issuedAt).toISOString()}`,
    "This signature sends no transaction and costs no gas.",
  ].join("\n");
}

export function createTerms(market: string, durationMin: number, capUsd: number, vsBot: boolean): string {
  return `${market}|${durationMin}m|$${capUsd}|${vsBot ? "bot" : "pvp"}`;
}
