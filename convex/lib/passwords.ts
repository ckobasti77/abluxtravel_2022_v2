import { ConvexError } from "convex/values";
import { Scrypt } from "lucia";
import { LEGACY_AUTH_SALT } from "./constants";

// Same algorithm Convex Auth's Password provider uses by default.
export const hashPassword = (password: string) => new Scrypt().hash(password);
export const verifyPassword = (password: string, hash: string) =>
  new Scrypt().verify(hash, password);

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
}

// Reproduces the legacy hash (the old code trimmed passwords before hashing).
export const legacyPasswordHash = (password: string) =>
  sha256Hex(`${LEGACY_AUTH_SALT}:${password.trim()}`);

export function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export function validateNewPassword(password: string) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new ConvexError("WEAK_PASSWORD");
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const isValidEmail = (value: string) =>
  value.length > 0 && value.length <= 160 && EMAIL_PATTERN.test(value);

export const normalizeName = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const capitalize = (value: string) =>
  value ? value.slice(0, 1).toUpperCase() + value.slice(1).toLowerCase() : value;

export function deriveNameFromEmail(email: string) {
  const local = normalizeEmail(email).split("@")[0] ?? "";
  const tokens = local
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return { firstName: "Korisnik", lastName: "" };
  return {
    firstName: capitalize(tokens[0]),
    lastName: tokens.slice(1).map(capitalize).join(" "),
  };
}
