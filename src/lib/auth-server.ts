import { verifyMessage } from "viem";
import { INTENT_MAX_AGE_MS, intentMessage, type AuthAction, type SignedIntent } from "./auth";

export class AuthError extends Error {}

export async function verifyIntent(raw: unknown, action: AuthAction, subject: string): Promise<`0x${string}`> {
  const i = raw as Partial<SignedIntent> | null;
  if (!i || typeof i !== "object") throw new AuthError("Missing signature");
  if (i.action !== action || i.subject !== subject) throw new AuthError("Signature is for a different action");
  if (typeof i.issuedAt !== "number" || Math.abs(Date.now() - i.issuedAt) > INTENT_MAX_AGE_MS) {
    throw new AuthError("Signature expired, sign again");
  }
  if (!i.address || !/^0x[0-9a-fA-F]{40}$/.test(i.address) || !i.signature) throw new AuthError("Malformed signature");
  const ok = await verifyMessage({
    address: i.address,
    message: intentMessage({ address: i.address, action, subject, issuedAt: i.issuedAt }),
    signature: i.signature,
  });
  if (!ok) throw new AuthError("Signature does not match address");
  return i.address.toLowerCase() as `0x${string}`;
}
