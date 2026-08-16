#!/usr/bin/env node
/**
 * Fourth combinatorial sweep: leftover names, species, Banu/Xi'an/Vanduul
 * pairs, extra route fields, and celestial types not yet captured.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "research", "capture", "combos");
const CELESTIAL_OUT = join(ROOT, "research", "capture", "api", "celestial-objects");
const BOOTUP = join(ROOT, "research", "capture", "api", "bootup.json");
const BASE = "https://robertsspaceindustries.com";
const UA = "Mozilla/5.0 (compatible; web-010-star-citizen-study/0.1)";

const FIND_QUERIES = [
  "Earth",
  "Mars",
  "Venus",
  "Cestulus",
  "Angeli",
  "Xis",
  "Quarterdeck",
  "Levski",
  "Lorville",
  "Area18",
  "Orison",
  "Grim Hex",
  "GrimHex",
  "New Babbage",
  "protoplanetary",
  "cluster",
  "flotilla",
  "halo",
  "ring",
  "Human",
  "Tevarin",
  "Kr'Thak",
  "KrThak",
  "Claimed",
  "BLACKHOLE",
  "Jump",
  "JUMP",
  "Eealus",
  "Kins",
  "Bacchus",
  "Gliese",
  "Geddon",
  "Yulin",
  "Virgil",
  "Caliban",
  "Oberon",
  "Kayfa",
  "Rihlah",
  "Hadur",
  "Kilian",
  "Cathcart",
  "Banshee",
  "Nul",
  "Ellis",
  "Fora",
  "Odin",
  "Osiris",
  "Tyrol",
  "Hades",
  "Leir",
  "Garron",
  "Idris",
  "Ferron",
  "Elysium",
  "Centauri",
  "Castra",
  "Tohil",
  "Oya",
  "Trise",
  "Chronos",
  "Goss III",
  "Stanton IV",
  "Goss B",
  "Baker A",
  "Baker B",
  "Port Olisar",
  "JusticeStar Satellite",
  "Vanduul Attack",
  "Icarus",
  "Daedalus",
  "Olympus",
  "Glaciem",
  "Ruin Station",
  "ab",
  "xxx",
  "***",
  "123",
  "the",
];

const ROUTE_PAIRS = [
  ["KINS", "SOL"],
  ["BACCHUS", "TERRA"],
  ["GLIESE", "SOL"],
  ["GEDDON", "TRISE"],
  ["YULIN", "SOL"],
  ["EEALUS", "SOL"],
  ["KAYFA", "TERRA"],
  ["VIRGIL", "SOL"],
  ["CALIBAN", "TERRA"],
  ["GOSS", "TAMSA"],
  ["HELIOS", "SOL"],
  ["MAGNUS", "NYX"],
  ["OBERON", "TAMSA"],
  ["HADUR", "SOL"],
  ["RIHLAH", "GOSS"],
];

const ROUTE_EXTRAS = [
  { departure: "SOL", destination: "NYX", size: "M" },
  { departure: "SOL", destination: "NYX", size: "S" },
  { departure: "SOL", destination: "NYX", size: "L" },
  { departure: "STANTON", destination: "TAMSA", size: "S" },
  { departure: "GOSS", destination: "TERRA", avoid: "TERRA" },
  { departure: "SOL", destination: "NYX", avoid: "DAVIEN" },
  { departure: "SOL", destination: "NYX", mode: "shortest" },
  { departure: "SOL", destination: "NYX", mode: "leastjumps" },
  { departure: "SOL", destination: "NYX", type: "leastjumps" },
  { departure: "KINS", destination: "BANU" },
  { departure: "BANU", destination: "SOL" },
];

const CELESTIAL_CODES = [
  "SOL.LZS.PORTRETANUS",
  "NYX.ASTEROID.DELAMAR",
  "STANTON.BELTS.ALPHABELT",
  "STANTON.RINGS.RINGSOFYELA",
  "BAKER.STARS.BAKERA",
  "GOSS.STARS.GOSSA",
  "GOSS.STARS.GOSSB",
  "KELLOG.STATION.JUSTICESTARSATELLITE",
  "TARANIS.MOONS.BROKENMOON",
  "PYRO.MOON.FAIRO",
  "TRISE.STATION.TRISEFLOTILLA",
  "VEGA.POI.WARN01",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function safeName(value) {
  if (value === "") return "empty";
  if (typeof value === "string" && value.trim() === "") return "spaces";
  const cleaned = String(value)
    .replace(/['’]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `lit-${Buffer.from(String(value)).toString("hex")}`;
}

function objectLabel(obj) {
  return obj?.name || obj?.designation || obj?.code || null;
}

function segmentCodes(route) {
  return (route?.segments ?? []).map((seg) => seg.system_code || seg.object_code || seg.id);
}

function routesDiffer(shortest, least) {
  if (!shortest && !least) return { jumpsDiffer: false, segmentsDiffer: false, differ: false };
  if (!shortest || !least) return { jumpsDiffer: true, segmentsDiffer: true, differ: true };
  const jumpsDiffer = shortest.jumps !== least.jumps;
  const a = (shortest.segments ?? []).map((s) => `${s.system_code}|${s.object_code}|${s.segment_type}`).join(">");
  const b = (least.segments ?? []).map((s) => `${s.system_code}|${s.object_code}|${s.segment_type}`).join(">");
  return { jumpsDiffer, segmentsDiffer: a !== b, differ: jumpsDiffer || a !== b };
}

async function request(path, form = {}) {
  const headers = {
    Accept: "application/json",
    Origin: BASE,
    Referer: `${BASE}/en/starmap/`,
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
  };
  const body = new URLSearchParams(form).toString();
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _nonJson: true, _text: text.slice(0, 400) };
  }
  return { ok: res.ok, status: res.status, data };
}

async function save(dir, rel, value) {
  const file = join(dir, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8");
  return file;
}

function summarizeFind(query, status, data) {
  const systems = data?.data?.systems?.resultset ?? [];
  const objects = data?.data?.objects?.resultset ?? [];
  const objectTypes = {};
  for (const obj of objects) {
    const t = obj.type || "UNKNOWN";
    objectTypes[t] = (objectTypes[t] || 0) + 1;
  }
  return {
    query,
    status,
    success: data?.success ?? 0,
    systems: systems.length,
    objects: objects.length,
    objectTypes,
    sample: [...systems, ...objects].slice(0, 8).map((item) => ({
      name: objectLabel(item),
      code: item.code ?? null,
      type: item.type ?? "SYSTEM",
    })),
    code: data?.code ?? null,
    msg: data?.msg ?? null,
  };
}

function summarizeRoute(pair, form, status, data) {
  const shortest = data?.data?.shortest ?? null;
  const least = data?.data?.leastjumps ?? null;
  const diff = routesDiffer(shortest, least);
  const row = {
    pair,
    form,
    status,
    success: data?.success ?? 0,
    code: data?.code ?? null,
    msg: data?.msg ?? null,
  };
  if (data?.success === 1) {
    row.shortest = {
      jumps: shortest?.jumps ?? null,
      label: shortest?.label ?? null,
      first_jump: shortest?.first_jump ?? null,
      flight_distance: shortest?.flight_distance ?? null,
      systems: segmentCodes(shortest),
    };
    row.leastjumps = {
      jumps: least?.jumps ?? null,
      label: least?.label ?? null,
      first_jump: least?.first_jump ?? null,
      flight_distance: least?.flight_distance ?? null,
      systems: segmentCodes(least),
    };
    row.jumpsDiffer = diff.jumpsDiffer;
    row.shortestVsLeastjumpsDiffer = diff.differ;
  } else {
    row.error = data?.msg || data?.code || "failed";
    if (data?.data != null) row.detail = data.data;
  }
  return row;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(CELESTIAL_OUT, { recursive: true });
  const boot = JSON.parse(await readFile(BOOTUP, "utf8"));
  const systemNames = (boot?.data?.systems?.resultset ?? []).map((s) => s.name).filter(Boolean);

  const find = [];
  const routes = [];
  const celestialObjects = [];
  const queries = [...new Set([...FIND_QUERIES, ...systemNames])];

  for (const query of queries) {
    process.stdout.write(`find ${JSON.stringify(query)} … `);
    const res = await request("/api/starmap/find", { query });
    const file = `find-${safeName(query)}.json`;
    await save(OUT, file, res.data);
    const row = summarizeFind(query, res.status, res.data);
    row.file = file;
    find.push(row);
    console.log(`${res.status} success=${row.success} sys=${row.systems} obj=${row.objects}`);
    await sleep(70);
  }

  for (const [departure, destination] of ROUTE_PAIRS) {
    const pair = `${departure}-${destination}`;
    process.stdout.write(`route ${pair} … `);
    const res = await request("/api/starmap/routes/find", { departure, destination });
    const file = `route-${safeName(departure)}-${safeName(destination)}.json`;
    await save(OUT, file, res.data);
    const row = summarizeRoute(pair, { departure, destination }, res.status, res.data);
    row.file = file;
    routes.push(row);
    console.log(
      `${res.status} success=${row.success} short=${row.shortest?.jumps ?? "-"} least=${row.leastjumps?.jumps ?? "-"} differ=${row.shortestVsLeastjumpsDiffer}`,
    );
    await sleep(70);
  }

  for (const form of ROUTE_EXTRAS) {
    const pair = `${form.departure}-${form.destination}`;
    const tag = Object.entries(form)
      .filter(([k]) => k !== "departure" && k !== "destination")
      .map(([k, v]) => `${k}${v}`)
      .join("-");
    process.stdout.write(`route extra ${pair} ${tag} … `);
    const res = await request("/api/starmap/routes/find", form);
    const file = `route-${safeName(pair)}-${safeName(tag || "plain")}.json`;
    await save(OUT, file, res.data);
    const row = summarizeRoute(pair, form, res.status, res.data);
    row.file = file;
    routes.push(row);
    console.log(`${res.status} success=${row.success} code=${row.code} differ=${row.shortestVsLeastjumpsDiffer}`);
    await sleep(70);
  }

  for (const code of CELESTIAL_CODES) {
    process.stdout.write(`celestial ${code} … `);
    const res = await request(`/api/starmap/celestial-objects/${encodeURIComponent(code)}`);
    await save(CELESTIAL_OUT, `${code}.json`, res.data);
    const obj = res.data?.data?.resultset?.[0] ?? null;
    celestialObjects.push({
      code,
      status: res.status,
      success: res.data?.success ?? 0,
      type: obj?.type ?? null,
      name: objectLabel(obj),
      appearance: obj?.appearance ?? null,
      habitable: obj?.habitable ?? null,
      shaderKeys: obj?.shader_data ? Object.keys(obj.shader_data) : [],
    });
    console.log(`${res.status} type=${obj?.type ?? "none"} name=${objectLabel(obj)}`);
    await sleep(70);
  }

  const summary = {
    capturedAt: new Date().toISOString(),
    source: BASE,
    find,
    routes,
    celestialObjects,
    highlights: {
      findHits: find.filter((f) => f.success === 1 && (f.systems > 0 || f.objects > 0)),
      findEmptyOk: find.filter((f) => f.success === 1 && f.systems === 0 && f.objects === 0),
      findFailed: find.filter((f) => f.success !== 1),
      routesWhereShortestDiffersLeastjumps: routes.filter((r) => r.shortestVsLeastjumpsDiffer),
      extraFieldEffects: routes.filter((r) => r.form && Object.keys(r.form).length > 2),
    },
  };
  await save(OUT, "SUMMARY4.json", summary);
  console.log(
    `done. find=${find.length} routes=${routes.length} celestial=${celestialObjects.length} differ=${summary.highlights.routesWhereShortestDiffersLeastjumps.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
