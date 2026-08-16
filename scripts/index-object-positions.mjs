#!/usr/bin/env node
/**
 * Compact [distance, latitude, longitude] for non-jump celestial objects.
 * Used so object-code departures can add official intra-system AU.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SYS_DIR = join(ROOT, "research", "capture", "api", "star-systems");
const OUT = join(ROOT, "research", "capture", "index", "object-positions.json");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const files = (await readdir(SYS_DIR)).filter((f) => f.endsWith(".json"));
  /** @type {Record<string, [number, number, number]>} */
  const points = {};
  for (const file of files) {
    const raw = JSON.parse(await readFile(join(SYS_DIR, file), "utf8"));
    for (const body of raw?.data?.resultset?.[0]?.celestial_objects ?? []) {
      if (!body?.code || body.type === "JUMPPOINT") continue;
      points[body.code] = [num(body.distance), num(body.latitude), num(body.longitude)];
    }
  }
  await writeFile(OUT, `${JSON.stringify(points)}\n`, "utf8");
  console.log(`object-positions ${Object.keys(points).length} -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
