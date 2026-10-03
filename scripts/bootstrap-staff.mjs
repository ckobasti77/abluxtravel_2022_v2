// Creates or updates a staff/QA account on the Convex DEV deployment with a
// freshly generated password. The password is written only to
// night-run/SECRETS.local.md (gitignored) and never printed.
//
// Usage: node scripts/bootstrap-staff.mjs --email <email> --role owner|editor|customer --label "<text>"
import { randomInt } from "node:crypto";
import {
  assertDevDeployment,
  convex,
  getArg,
  upsertSecretSection,
} from "./lib/convex-cli.mjs";

assertDevDeployment();

const email = (getArg("email") ?? "").trim().toLowerCase();
const role = getArg("role");
const label = getArg("label") ?? role;
if (!email || !["owner", "editor", "customer"].includes(role ?? "")) {
  console.error("Upotreba: --email <email> --role owner|editor|customer --label \"<tekst>\"");
  process.exit(1);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const groups = Array.from({ length: 4 }, () =>
  Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")
);
const password = groups.join("-");

const result = convex([
  "run",
  "users:bootstrapStaffAccount",
  JSON.stringify({ email, role, password }),
]);
if (result.status !== 0) {
  const stderr = `${result.stderr ?? ""}${result.stdout ?? ""}`.split(password).join("***");
  console.error(`Bootstrap nije uspeo za ${email}:\n${stderr.trim()}`);
  process.exit(1);
}

const lines = [`Email: ${email}`, `Uloga: ${role}`, `Lozinka: \`${password}\``];
if (role === "owner") {
  lines.push("Prijavi se na /auth i odmah promeni lozinku u Admin → Podešavanja → Korisnici.");
}
upsertSecretSection(email, label, lines);

console.log(`OK: ${email} (${role}) — lozinka je u night-run/SECRETS.local.md`);
