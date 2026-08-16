#!/usr/bin/env node
/**
 * Official /api/starmap/find counts from the 2026-08-16 combo pass.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const boot = JSON.parse(await readFile(join(ROOT, "research/capture/api/bootup.json"), "utf8"));
const objects = JSON.parse(await readFile(join(ROOT, "research/capture/index/celestial-objects.json"), "utf8"));
const extras = [
  { name: "Port Renatus", designation: "Port Renatus", type: "LZ", system: "SOL", code: "SOL.LZS.PORTRETANUS" },
  { name: "Levski", designation: "Levski", type: "LZ", system: "NYX", code: "NYX.LZS.LEVSKI" },
  { name: "Lorville", designation: "Lorville", type: "LZ", system: "STANTON", code: "STANTON.LZS.LORVILLE" },
  { name: "Area18", designation: "Area18", type: "LZ", system: "STANTON", code: "STANTON.LZS.AREA18" },
  { name: "Orison", designation: "Orison", type: "LZ", system: "STANTON", code: "STANTON.LZS.ORISON" },
];
const objs = [...objects, ...extras];
const systems = boot.data.systems.resultset;

function search(raw) {
  const q = raw.trim().toLowerCase();
  if (q.length < 3) return [];
  const sys = systems.filter((s) => {
    const name = s.name.toLowerCase();
    return name === q || name.startsWith(q);
  });
  const obj = objs.filter(
    (o) =>
      (o.name && o.name.toLowerCase().includes(q)) ||
      (o.designation && o.designation.toLowerCase().includes(q)),
  );
  return [...sys.map((s) => ({ type: "STAR_SYSTEM", name: s.name })), ...obj];
}

const expect = {
  Terra: { n: 26, system: true },
  Cassel: { n: 1, system: false },
  jump: { n: 0, system: false },
  "Goss A": { n: 1, system: false },
  ARK: { n: 2, system: false },
  a: { n: 0, system: false },
  Kayfa: { n: 9, system: false },
  Levski: { n: 1, system: false },
};

let failed = 0;
for (const [q, want] of Object.entries(expect)) {
  const hits = search(q);
  const hasSys = hits.some((h) => h.type === "STAR_SYSTEM");
  const ok = hits.length === want.n && hasSys === want.system;
  console.log(`${ok ? "OK  " : "FAIL"} ${q} n=${hits.length} system=${hasSys}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error("search mapping mismatches", failed);
  process.exit(1);
}
console.log("search ok");
