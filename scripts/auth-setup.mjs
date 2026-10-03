// Sets the Convex Auth environment on the DEV deployment (idempotent).
// Usage: node scripts/auth-setup.mjs [--rotate]
// Never prints secret values.
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { assertDevDeployment, convex, readEnvLocal, upsertEnvLocal } from "./lib/convex-cli.mjs";

assertDevDeployment();

const list = convex(["env", "list"]);
if (list.status !== 0) {
  console.error("convex env list nije uspeo.");
  process.exit(1);
}
const existing = new Set(
  list.stdout
    .split(/\r?\n/)
    .map((line) => line.split("=")[0]?.trim())
    .filter(Boolean)
);

function setEnv(name, value) {
  let result = convex(["env", "set", name], { input: value });
  if (result.status !== 0) {
    // Fallback: single NAME=value argument (still no shell, never echoed).
    result = convex(["env", "set", `${name}=${value}`]);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr ?? "").split(value).join("***");
    console.error(`convex env set ${name} nije uspeo: ${stderr.trim()}`);
    process.exit(1);
  }
}

const rotate = process.argv.includes("--rotate");
if (rotate || !existing.has("JWT_PRIVATE_KEY") || !existing.has("JWKS")) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString().trimEnd().replace(/\n/g, " ");
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey.export({ format: "jwk" }) }] });
  setEnv("JWT_PRIVATE_KEY", pem);
  setEnv("JWKS", jwks);
}

if (!existing.has("SITE_URL")) {
  setEnv("SITE_URL", "http://localhost:3000");
}

const localSecret = readEnvLocal().ABLUX_SERVER_SECRET;
if (!existing.has("ABLUX_SERVER_SECRET") || !localSecret) {
  const secret = randomBytes(32).toString("base64url");
  setEnv("ABLUX_SERVER_SECRET", secret);
  upsertEnvLocal("ABLUX_SERVER_SECRET", secret);
}

console.log("OK: JWT_PRIVATE_KEY, JWKS, SITE_URL, ABLUX_SERVER_SECRET (DEV)");
