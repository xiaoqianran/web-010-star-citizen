#!/usr/bin/env node
/**
 * Assert official captured JSON keys that community scrapers get wrong.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const fail = (msg) => {
  console.error("FAIL", msg);
  process.exitCode = 1;
};

const boot = JSON.parse(await readFile(join(ROOT, "research/capture/api/bootup.json"), "utf8"));
const goss = JSON.parse(await readFile(join(ROOT, "research/capture/api/star-systems/GOSS.json"), "utf8"));
const cassel = JSON.parse(
  await readFile(join(ROOT, "research/capture/api/celestial-objects/GOSS.PLANETS.GOSSIICASSEL.json"), "utf8"),
);
const route = JSON.parse(await readFile(join(ROOT, "research/capture/api/routes/GOSS-TERRA.json"), "utf8"));
const find = JSON.parse(await readFile(join(ROOT, "research/capture/api/find/Cassel.json"), "utf8"));

const sys = boot.data.systems.resultset[0];
if (!("position_x" in sys) || "x" in sys) fail("bootup systems use position_x/y/z, not {x,y,z}");
if (!Array.isArray(sys.affiliation) || !sys.affiliation[0]?.color) fail("affiliation is an array with color");

const tunnel = boot.data.tunnels.resultset[0];
if (!tunnel.entry?.code || !tunnel.entry?.designation) fail("tunnel.entry needs code + designation");
if ("celestial_object_id" in tunnel.entry) fail("official tunnel.entry has no celestial_object_id");

const aff = boot.data.affiliations.resultset;
const want = {
  uee: "#48bbd4",
  BANU: "#ffce17",
  VNCL: "#bd002d",
  XIAN: "#52c231",
  DEV: "#ca922d",
  UNC: "#f6851f",
};
for (const [code, color] of Object.entries(want)) {
  const row = aff.find((a) => a.code === code);
  if (!row || row.color !== color) fail(`affiliation ${code} color ${row?.color} != ${color}`);
}

const lrs = boot.data.config.longRangeScanner;
if (lrs.colorD1 !== "#9be80d" || lrs.colorL1 !== "#efc22f" || lrs.colorC1 !== "#ed7346") {
  fail(`LRS colors drifted: ${lrs.colorD1} ${lrs.colorL1} ${lrs.colorC1}`);
}

const row = goss.data.resultset[0];
if (row.frost_line == null || row.habitable_zone_inner == null || !row.shader_data?.lightColor) {
  fail("GOSS star-systems row missing frost/habitable/shader_data.lightColor");
}

const body = cassel.data.resultset[0];
if (Array.isArray(body.subtype)) fail("subtype is an object, not an array");
if (body.subtype?.name !== "Terrestrial Rocky") fail("Cassel subtype");
if (body.orbit_period !== 378.12) fail("Cassel orbit_period");

const obj = find.data.objects.resultset[0];
if (obj.star_system?.code !== "GOSS") fail("find objects carry star_system.code");

const seg = route.data.shortest.segments[1];
if (seg.object_code !== "GOSS.JUMPPOINTS.TERRA" || seg.segment_type !== "J") {
  fail("route segment official keys");
}

if (!process.exitCode) console.log("mapping ok", { systems: boot.data.systems.resultset.length, tunnels: boot.data.tunnels.resultset.length, affiliations: aff.length });
process.exit(process.exitCode || 0);
