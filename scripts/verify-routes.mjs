#!/usr/bin/env node
/**
 * Compare local shortest/leastjumps reconstruction against captured official routes.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const boot = JSON.parse(await readFile(join(ROOT, "research/capture/api/bootup.json"), "utf8"));
const jumps = JSON.parse(await readFile(join(ROOT, "research/capture/index/jump-points.json"), "utf8"));

const systems = boot.data.systems.resultset;
const byId = new Map(systems.map((s) => [s.id, s]));
const byCode = new Map(systems.map((s) => [s.code, s]));

function jpCart(code) {
  const j = jumps[code];
  if (!j) return { x: 0, y: 0, z: 0 };
  const la = (j.latitude * Math.PI) / 180;
  const lo = (j.longitude * Math.PI) / 180;
  const d = j.distance;
  return {
    x: d * Math.cos(la) * Math.cos(lo),
    y: d * Math.sin(la),
    z: d * Math.cos(la) * Math.sin(lo),
  };
}

function flightBetween(a, b) {
  if (!a || !b) return 0;
  const pa = jpCart(a);
  const pb = jpCart(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z);
}

const graph = new Map();
for (const t of boot.data.tunnels.resultset) {
  const a = byId.get(t.entry.star_system_id);
  const b = byId.get(t.exit.star_system_id);
  if (!a || !b) continue;
  const push = (from, to, name, jumpCode, arriveName, arriveCode, size) => {
    const list = graph.get(from) ?? [];
    list.push({ to, name, jumpCode, arriveName, arriveCode, size });
    graph.set(from, list);
  };
  const ab = t.entry.designation || `${a.name} - ${b.name}`;
  const ba = t.exit.designation || `${b.name} - ${a.name}`;
  push(a.code, b.code, ab, t.entry.code, ba, t.exit.code, t.size);
  push(b.code, a.code, ba, t.exit.code, ab, t.entry.code, t.size);
}

function walkGraph(from, to, mode, ship) {
  const keyOf = (sys, via) => `${sys}\0${via ?? ""}`;
  const better = (a, b) =>
    mode === "leastjumps"
      ? a.hops < b.hops || (a.hops === b.hops && a.cost < b.cost)
      : a.cost < b.cost || (a.cost === b.cost && a.hops < b.hops);
  const best = new Map();
  const prev = new Map();
  const q = [{ sys: from, via: null, cost: 0, hops: 0 }];
  best.set(keyOf(from, null), { cost: 0, hops: 0 });
  let destKey = null;
  let destScore = { cost: Infinity, hops: Infinity };

  while (q.length) {
    let idx = 0;
    for (let i = 1; i < q.length; i++) if (better(q[i], q[idx])) idx = i;
    const cur = q.splice(idx, 1)[0];
    const ck = keyOf(cur.sys, cur.via);
    const known = best.get(ck);
    if (!known || cur.cost !== known.cost || cur.hops !== known.hops) continue;
    if (cur.sys === to && cur.via) {
      if (better(cur, destScore)) {
        destScore = { cost: cur.cost, hops: cur.hops };
        destKey = ck;
      }
      continue;
    }
    for (const edge of graph.get(cur.sys) ?? []) {
      if (ship && ({ S: 1, M: 2, L: 3 }[edge.size] < { S: 1, M: 2, L: 3 }[ship])) continue;
      const extra = cur.via ? flightBetween(cur.via, edge.jumpCode) : 0;
      const next = { sys: edge.to, via: edge.arriveCode, cost: cur.cost + extra, hops: cur.hops + 1 };
      const nk = keyOf(next.sys, next.via);
      const held = best.get(nk);
      if (held && !better(next, held)) continue;
      best.set(nk, { cost: next.cost, hops: next.hops });
      prev.set(nk, { pk: ck, edge });
      q.push(next);
    }
  }
  if (!destKey) return null;
  const edges = [];
  const path = [to];
  let cursor = destKey;
  while (prev.has(cursor)) {
    const step = prev.get(cursor);
    edges.unshift(step.edge);
    path.unshift(step.pk.split("\0")[0]);
    cursor = step.pk;
  }
  return { path, edges, cost: destScore.cost, hops: destScore.hops, first: edges[0]?.name, through: byCode.get(path[1])?.name };
}

function uniqueSystems(route) {
  const out = [];
  for (const seg of route?.segments ?? []) {
    const code = seg.system_code;
    if (code && out[out.length - 1] !== code) out.push(code);
  }
  return out;
}

const pairs = [
  ["SOL", "NYX"],
  ["STANTON", "TAMSA"],
  ["KILIAN", "PYRO"],
  ["GOSS", "TERRA"],
  ["GOSS", "SOL"],
  ["TAMSA", "SOL"],
  ["TRISE", "SOL"],
  ["VEGA", "TAMSA"],
  ["PYRO", "TAMSA"],
  ["GOSS", "TAMSA"],
  ["HELIOS", "SOL"],
  ["KAYFA", "TERRA"],
  ["VIRGIL", "SOL"],
  ["EEALUS", "SOL"],
];

const files = {
  "SOL-NYX": "route-SOL-NYX.json",
  "STANTON-TAMSA": "route-STANTON-TAMSA.json",
  "KILIAN-PYRO": "route-KILIAN-PYRO.json",
  "GOSS-TERRA": "route-GOSS-TERRA-M.json",
  "GOSS-SOL": "route-GOSS-SOL-S.json",
  "TAMSA-SOL": "route-TAMSA-SOL.json",
  "TRISE-SOL": "route-TRISE-SOL.json",
  "VEGA-TAMSA": "route-VEGA-TAMSA.json",
  "PYRO-TAMSA": "route-PYRO-TAMSA.json",
  "GOSS-TAMSA": "route-GOSS-TAMSA.json",
  "HELIOS-SOL": "route-HELIOS-SOL.json",
  "KAYFA-TERRA": "route-KAYFA-TERRA.json",
  "VIRGIL-SOL": "route-VIRGIL-SOL.json",
  "EEALUS-SOL": "route-EEALUS-SOL.json",
};

let fail = 0;
for (const [from, to] of pairs) {
  const file = files[`${from}-${to}`];
  const official = JSON.parse(await readFile(join(ROOT, "research/capture/combos", file), "utf8"));
  const short = walkGraph(from, to, "shortest");
  const least = walkGraph(from, to, "leastjumps");
  const oS = official.data.shortest;
  const oL = official.data.leastjumps;
  const checks = [
    ["short.jumps", short?.hops, oS.jumps],
    ["least.jumps", least?.hops, oL.jumps],
    ["short.first", short?.first, oS.first_jump],
    ["least.first", least?.first, oL.first_jump],
    ["short.path", short?.path.join(">"), uniqueSystems(oS).join(">")],
    ["least.path", least?.path.join(">"), uniqueSystems(oL).join(">")],
    ["short.dist", Number(short?.cost.toFixed(8)), Number(Number(oS.flight_distance).toFixed(8))],
    ["least.dist", Number(least?.cost.toFixed(8)), Number(Number(oL.flight_distance).toFixed(8))],
  ];
  const bad = checks.filter(([, a, b]) => a !== b);
  if (bad.length) {
    fail += 1;
    console.log(`FAIL ${from}-${to}`);
    for (const [name, a, b] of bad) console.log(`  ${name}: local=${a} official=${b}`);
  } else {
    console.log(`OK   ${from}-${to} short=${short.hops}/${short.cost.toFixed(3)} least=${least.hops}/${least.cost.toFixed(3)}`);
  }
}

const sized = JSON.parse(await readFile(join(ROOT, "research/capture/probe/routes-size.json"), "utf8"));
let sizeChecked = 0;
for (const [key, official] of Object.entries(sized)) {
  const parsed = key.match(/^([A-Z0-9.]+)-([A-Z0-9.]+)-(\{.*\})$/);
  if (!parsed) continue;
  const extra = JSON.parse(parsed[3]);
  const ship = extra.ship_size;
  if (!ship || !["S", "M", "L"].includes(ship)) continue;
  // Object-code endpoints add intra-system AU on the official API; local graph is system-to-system.
  if (parsed[1].includes(".") || parsed[2].includes(".")) continue;
  const from = parsed[1];
  const to = parsed[2];
  const short = walkGraph(from, to, "shortest", ship);
  const least = walkGraph(from, to, "leastjumps", ship);
  if (!official.shortest && !official.leastjumps) {
    if (!short && !least) {
      sizeChecked += 1;
      console.log(`OK   ${from}-${to} ship=${ship} no-route (${official.code})`);
      continue;
    }
    fail += 1;
    console.log(`FAIL ${from}-${to} ship=${ship} local found a route, official ${official.code}`);
    continue;
  }
  const checks = [
    ["short.jumps", short?.hops, official.shortest?.jumps],
    ["least.jumps", least?.hops, official.leastjumps?.jumps],
    ["short.dist", Number(short?.cost.toFixed(8)), Number(Number(official.shortest?.flight_distance).toFixed(8))],
    ["least.dist", Number(least?.cost.toFixed(8)), Number(Number(official.leastjumps?.flight_distance).toFixed(8))],
  ];
  const bad = checks.filter(([, a, b]) => a !== b);
  sizeChecked += 1;
  if (bad.length) {
    fail += 1;
    console.log(`FAIL ${from}-${to} ship=${ship}`);
    for (const [name, a, b] of bad) console.log(`  ${name}: local=${a} official=${b}`);
  } else {
    console.log(`OK   ${from}-${to} ship=${ship} short=${short.hops}/${short.cost.toFixed(3)}`);
  }
}

if (fail) {
  console.error(`mismatched ${fail} official pairs`);
  process.exit(1);
}
console.log(`all ${pairs.length} official pairs match, plus ${sizeChecked} ship_size checks`);
