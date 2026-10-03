// Step 18 (DEV only): replace the screenshots stored as vehicle photos with the
// real fleet photos from public/home-swiper. Old storage files are kept; their ids
// are written to night-run/qa/18/vehicle-photos-previous.json.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const env = readFileSync(path.join(ROOT, ".env.local"), "utf8");
if (!/CONVEX_DEPLOYMENT=dev:/.test(env)) throw new Error("Refusing: .env.local is not a Convex DEV deployment.");

const PHOTOS = {
  bus: ["20260102_093541.avif", "20260102_093723.avif", "20251229_233453.avif", "IMG-ca1d565c079ed12d1b987e41ed5f2914-V.avif"],
  luxuryVan: ["20251120_160325.avif", "20251120_155602.avif"],
};

const run = (fn, args) =>
  execFileSync("npx", ["convex", "run", fn, args], { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" }).trim();
const quote = (value) => (process.platform === "win32" ? `"${JSON.stringify(value).replaceAll('"', '\\"')}"` : JSON.stringify(value));

const previous = [];
for (const [key, files] of Object.entries(PHOTOS)) {
  const ids = [];
  for (const file of files) {
    const url = JSON.parse(run("vehicleRentalImages:generateUploadUrlInternal", quote({})));
    const body = readFileSync(path.join(ROOT, "public", "home-swiper", file));
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "image/avif" }, body });
    if (!response.ok) throw new Error(`upload ${file}: ${response.status}`);
    ids.push((await response.json()).storageId);
  }
  const [storageId, ...additionalStorageIds] = ids;
  previous.push(JSON.parse(run("vehicleRentalImages:replaceInternal", quote({ key, storageId, additionalStorageIds }))));
  console.log(`${key}: ${files.length} photos`);
}
writeFileSync(path.join(ROOT, "night-run", "qa", "18", "vehicle-photos-previous.json"), JSON.stringify(previous, null, 2));
