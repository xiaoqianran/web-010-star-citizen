#!/usr/bin/env node
/**
 * Build jump-point coordinates from captured star-system payloads.
 * Used to recreate official flight_distance (in-system JP Euclidean).
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SYS_DIR = join(ROOT, "research", "capture", "api", "star-systems");
const BOOT = join(ROOT, "research", "capture", "api", "bootup.json");
const OUT = join(ROOT, "research", "capture", "index", "jump-points.json");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function main() {
  const boot = JSON.parse(await readFile(BOOT, "utf8"));
  const files = (await readdir(SYS_DIR)).filter((f) => f.endsWith(".json"));
  const points = {};

  for (const file of files) {
    const raw = JSON.parse(await readFile(join(SYS_DIR, file), "utf8"));
    const row = raw?.data?.resultset?.[0];
    const bodies = row?.celestial_objects ?? [];
    for (const body of bodies) {
      if (body?.type !== "JUMPPOINT" || !body.code) continue;
      points[body.code] = {
        id: body.id ?? null,
        system: (body.code.split(".")[0] || row?.code || "").toUpperCase(),
        code: body.code,
        designation: body.designation ?? body.name ?? null,
        distance: num(body.distance),
        latitude: num(body.latitude),
        longitude: num(body.longitude),
      };
    }
  }

  const tunnels = boot?.data?.tunnels?.resultset ?? [];
  let missing = 0;
  for (const t of tunnels) {
    for (const side of [t.entry, t.exit]) {
      const code = side?.code;
      if (!code) continue;
      if (points[code]) continue;
      missing += 1;
      points[code] = {
        id: side.id ?? null,
        system: (code.split(".")[0] || "").toUpperCase(),
        code,
        designation: side.designation ?? null,
        distance: 0,
        latitude: 0,
        longitude: 0,
        inferred: true,
      };
    }
  }

  await writeFile(OUT, JSON.stringify(points, null, 2) + "\n", "utf8");
  console.log(`jump-points ${Object.keys(points).length} missingFromSystems=${missing} -> ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
