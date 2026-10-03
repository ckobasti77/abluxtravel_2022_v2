// Shared helpers for local maintenance scripts. They only ever target the
// Convex DEV deployment from .env.local and never print secret values.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
const CONVEX_MAIN = path.join(ROOT, "node_modules", "convex", "bin", "main.js");
export const SECRETS_PATH = path.join(ROOT, "night-run", "SECRETS.local.md");
const ENV_LOCAL = path.join(ROOT, ".env.local");

// Runs the Convex CLI through Node directly (no shell, so no Windows quoting issues).
export function convex(args, { input } = {}) {
  return spawnSync(process.execPath, [CONVEX_MAIN, ...args], {
    cwd: ROOT,
    input,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

export function readEnvLocal() {
  if (!existsSync(ENV_LOCAL)) return {};
  const values = {};
  for (const line of readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/\s+#.*$/, "").trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

export function upsertEnvLocal(name, value, comment = "Shared secret between the Next.js server and Convex (checkout).") {
  const current = existsSync(ENV_LOCAL) ? readFileSync(ENV_LOCAL, "utf8") : "";
  const lines = current.split(/\r?\n/);
  const index = lines.findIndex((line) => line.startsWith(`${name}=`));
  if (index >= 0) lines[index] = `${name}=${value}`;
  else {
    if (lines.length && lines[lines.length - 1] !== "") lines.push("");
    lines.push(`# ${comment}`);
    lines.push(`${name}=${value}`, "");
  }
  writeFileSync(ENV_LOCAL, lines.join("\n"));
}

// Refuses to run against anything but the DEV deployment.
export function assertDevDeployment() {
  if (process.argv.some((arg) => /prod/i.test(arg))) {
    console.error("Odbijeno: skripta radi samo nad DEV deploymentom.");
    process.exit(1);
  }
  const deployment = readEnvLocal().CONVEX_DEPLOYMENT ?? "";
  if (!deployment.startsWith("dev:")) {
    console.error("Odbijeno: CONVEX_DEPLOYMENT u .env.local nije dev deployment.");
    process.exit(1);
  }
}

export function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

// ---- night-run/SECRETS.local.md (gitignored) --------------------------------

const SECRETS_HEADER = `# ABLux — lokalne tajne (ne ide u git)

Ne deliti i ne kopirati u izveštaje. Fajl je u .gitignore.
`;

function readSecretsFile() {
  return existsSync(SECRETS_PATH) ? readFileSync(SECRETS_PATH, "utf8") : SECRETS_HEADER;
}

function splitSections(text) {
  const parts = text.split(/\n(?=## )/);
  return { head: parts[0], sections: parts.slice(1) };
}

export function upsertSecretSection(email, label, lines) {
  const { head, sections } = splitSections(readSecretsFile());
  const body = `## ${label} — ${email}\n${lines.map((line) => `- ${line}`).join("\n")}\n`;
  const index = sections.findIndex((section) => section.split("\n")[0].endsWith(`— ${email}`));
  if (index >= 0) sections[index] = body;
  else sections.push(body);
  const text = [head.trimEnd() + "\n", ...sections.map((section) => section.trimEnd() + "\n")].join("\n");
  writeFileSync(SECRETS_PATH, text);
}

export function readSecret(email) {
  if (!existsSync(SECRETS_PATH)) return null;
  const { sections } = splitSections(readFileSync(SECRETS_PATH, "utf8"));
  const section = sections.find((item) => item.split("\n")[0].endsWith(`— ${email}`));
  const match = section?.match(/- Lozinka: `([^`]+)`/);
  return match ? match[1] : null;
}
