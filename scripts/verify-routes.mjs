#!/usr/bin/env node
/**
 * Compare local shortest/leastjumps reconstruction against captured official routes.
 * Walks the same graph as src/data/catalog.ts (src/data/routeGraph.ts).
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTunnelGraph, walkGraph, withEndpointAu } from "../src/data/routeGraph.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const boot = JSON.parse(await readFile(join(ROOT, "research/capture/api/bootup.json"), "utf8"));
const jumps = JSON.parse(await readFile(join(ROOT, "research/capture/index/jump-points.json"), "utf8"));
const objectPos = JSON.parse(await readFile(join(ROOT, "research/capture/index/object-positions.json"), "utf8"));

const systems = boot.data.systems.resultset;
const byId = new Map(systems.map((s) => [s.id, s]));
const byCode = new Map(systems.map((s) => [s.code, s]));
const graph = buildTunnelGraph(boot.data.tunnels.resultset, byId);

function walk(fromSys, toSys, mode, ship, departure = fromSys, destination = toSys) {
  const result = withEndpointAu(
    walkGraph(graph, jumps, fromSys, toSys, mode, ship),
    objectPos,
    jumps,
    departure,
    destination,
  );
  if (!result) return null;
  return {
    ...result,
    first: result.edges[0]?.name,
    through: byCode.get(result.path[1])?.name,
  };
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
  const short = walk(from, to, "shortest");
  const least = walk(from, to, "leastjumps");
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
  const from = parsed[1];
  const to = parsed[2];
  const fromSys = from.includes(".") ? from.split(".")[0] : from;
  const toSys = to.includes(".") ? to.split(".")[0] : to;
  const short = walk(fromSys, toSys, "shortest", ship, from, to);
  const least = walk(fromSys, toSys, "leastjumps", ship, from, to);
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
