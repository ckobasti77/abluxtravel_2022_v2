import { ConvexError } from "convex/values";

// Proves that a call comes from the ABLux Next.js server (e.g. IPS checkout).
export function requireServerSecret(provided: string) {
  const expected = process.env.ABLUX_SERVER_SECRET ?? "";
  if (expected.length < 32 || typeof provided !== "string" || provided.length !== expected.length) {
    throw new ConvexError("FORBIDDEN");
  }
  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }
  if (diff !== 0) throw new ConvexError("FORBIDDEN");
}
