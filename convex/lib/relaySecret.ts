// Shared secret for the Partner Sync relay CLI (HTTP actions /sync/relay/*).
// SYNC_RELAY_SECRET lives in Convex env (DEV) and .env.local; never logged.

/** Constant-time comparison (no early exit on the first differing character). */
export function safeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** True only for "Authorization: Bearer <SYNC_RELAY_SECRET>" with a configured secret of ≥ 32 characters. */
export function isRelayAuthorized(authorization: string | null, secret = process.env.SYNC_RELAY_SECRET ?? ""): boolean {
  if (secret.length < 32) return false;
  const token = authorization?.match(/^Bearer\s+(\S+)$/)?.[1] ?? "";
  return safeEqual(token, secret);
}
