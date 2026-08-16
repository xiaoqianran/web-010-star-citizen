#!/usr/bin/env node
/**
 * Third combinatorial sweep of public RSI ARK Starmap find/routes/celestial APIs.
 * Does not download official 3D models, audio, or JS bundles.
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
  "Renatus",
  "LZ",
  "Port Renatus",
  "The ARK",
  "The Ark",
  "Fair",
  "Fair Chance",
  "Delamar",
  "Aaron Halo",
  "Yela",
  "Ring of Yela",
  "Warn",
  "POI",
  "Lagrange",
  "ARC-L2",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
  "neutron",
  "pulsar",
  "black hole",
  "Tamsa",
  "Broken Moon",
  "Kellog",
  "JusticeStar",
  "Croshaw",
  "Baker",
  "Xi'an",
  "XIAN",
  "uee",
  "UEE",
];

const S_TUNNEL_PICKS = [
  ["TERRA", "PYRO"],
  ["NUL", "CROSHAW"],
  ["CATHCART", "KILIAN"],
  ["BANSHEE", "YULIN"],
];

const DISTANT_PAIRS = [
  ["SOL", "NYX"],
  ["PYRO", "TAMSA"],
  ["VEGA", "TAMSA"],
  ["TRISE", "SOL"],
  ["CROSHAW", "SOL"],
  ["KILIAN", "PYRO"],
  ["TERRA", "NYX"],
  ["STANTON", "TAMSA"],
];

const CELESTIAL_CODES = [
  "TAMSA.STAR.TAMSA",
  "TAYAC.STATION.THEARK",
  "STANTON.STATION.PORTOLISAR",
  "STANTON.MOONS.CELLIN",
  "VEGA.POI.WARN01",
  "SOL.PLANETS.LUNA",
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
  return cleaned || "empty";
}

function objectLabel(obj) {
  return obj?.name || obj?.designation || obj?.code || null;
}

function segmentKey(seg) {
  return [
    seg?.segment_type ?? "",
    seg?.system_code ?? "",
    seg?.object_code ?? "",
    seg?.id ?? "",
  ].join("|");
}

function segmentCodes(route) {
  return (route?.segments ?? []).map((seg) => seg.system_code || seg.object_code || seg.id);
}

function routesDiffer(shortest, least) {
  if (!shortest && !least) return { jumpsDiffer: false, segmentsDiffer: false, differ: false };
  if (!shortest || !least) return { jumpsDiffer: true, segmentsDiffer: true, differ: true };
  const jumpsDiffer = shortest.jumps !== least.jumps;
  const a = (shortest.segments ?? []).map(segmentKey).join(">");
  const b = (least.segments ?? []).map(segmentKey).join(">");
  const segmentsDiffer = a !== b;
  return { jumpsDiffer, segmentsDiffer, differ: jumpsDiffer || segmentsDiffer };
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
  const sample = [...systems, ...objects].slice(0, 8).map((item) => ({
    name: objectLabel(item),
    code: item.code ?? null,
    type: item.type ?? "SYSTEM",
  }));
  return {
    query,
    status,
    success: data?.success ?? 0,
    systems: systems.length,
    objects: objects.length,
    objectTypes,
    sample,
    code: data?.code ?? null,
    msg: data?.msg ?? null,
  };
}

function summarizeRoute(pair, size, status, data, extra = {}) {
  if (data?._nonJson) {
    return { pair, size: size ?? null, status, error: "non-json", preview: data._text, ...extra };
  }
  const shortest = data?.data?.shortest ?? null;
  const least = data?.data?.leastjumps ?? null;
  const diff = routesDiffer(shortest, least);
  const row = {
    pair,
    size: size ?? null,
    status,
    success: data?.success ?? 0,
    code: data?.code ?? null,
    msg: data?.msg ?? null,
    ...extra,
  };
  if (data?.success === 1) {
    row.shortest = {
      jumps: shortest?.jumps ?? null,
      label: shortest?.label ?? null,
      name: shortest?.name ?? null,
      first_jump: shortest?.first_jump ?? null,
      systems: segmentCodes(shortest),
    };
    row.leastjumps = {
      jumps: least?.jumps ?? null,
      label: least?.label ?? null,
      name: least?.name ?? null,
      first_jump: least?.first_jump ?? null,
      systems: segmentCodes(least),
    };
    row.jumpsDiffer = diff.jumpsDiffer;
    row.segmentsDiffer = diff.segmentsDiffer;
    row.shortestVsLeastjumpsDiffer = diff.differ;
  } else {
    row.error = data?.msg || data?.code || "failed";
    if (data?.data != null) row.detail = data.data;
    row.jumpsDiffer = false;
    row.segmentsDiffer = false;
    row.shortestVsLeastjumpsDiffer = false;
  }
  return row;
}

function summarizeCelestial(code, status, data) {
  const obj = data?.data?.resultset?.[0] ?? null;
  return {
    code,
    status,
    success: data?.success ?? 0,
    apiCode: data?.code ?? null,
    type: obj?.type ?? null,
    name: objectLabel(obj),
    designation: obj?.designation ?? null,
    parent_id: obj?.parent_id ?? null,
    fairchanceact: obj?.fairchanceact ?? null,
    habitable: obj?.habitable ?? null,
    appearance: obj?.appearance ?? null,
    subtype: obj?.subtype?.name ?? obj?.subtype ?? null,
    hasShader: Boolean(obj?.shader_data),
    shaderKeys: obj?.shader_data ? Object.keys(obj.shader_data) : [],
  };
}

function loadSTunnels(boot) {
  const systems = boot?.data?.systems?.resultset ?? [];
  const idToCode = Object.fromEntries(systems.map((s) => [s.id, s.code]));
  const tunnels = (boot?.data?.tunnels?.resultset ?? []).filter((t) => t.size === "S");
  return tunnels.map((t) => ({
    id: t.id,
    entry_system_id: t.entry?.star_system_id,
    exit_system_id: t.exit?.star_system_id,
    entry_code: idToCode[t.entry?.star_system_id] ?? null,
    exit_code: idToCode[t.exit?.star_system_id] ?? null,
    entry_object: t.entry?.code ?? null,
    exit_object: t.exit?.code ?? null,
  }));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(CELESTIAL_OUT, { recursive: true });

  const boot = JSON.parse(await readFile(BOOTUP, "utf8"));
  const sTunnels = loadSTunnels(boot);
  const picked = S_TUNNEL_PICKS.map(([a, b]) => {
    const match = sTunnels.find(
      (t) =>
        (t.entry_code === a && t.exit_code === b) || (t.entry_code === b && t.exit_code === a),
    );
    return { departure: a, destination: b, tunnel: match ?? null };
  });

  const find = [];
  const routes = [];
  const celestialObjects = [];

  for (const query of FIND_QUERIES) {
    process.stdout.write(`find ${JSON.stringify(query)} … `);
    const res = await request("/api/starmap/find", { query });
    const file = `find-${safeName(query)}.json`;
    await save(OUT, file, res.data);
    const row = summarizeFind(query, res.status, res.data);
    row.file = file;
    find.push(row);
    console.log(
      `${res.status} success=${row.success} sys=${row.systems} obj=${row.objects} -> ${file}`,
    );
    await sleep(80);
  }

  for (const { departure, destination, tunnel } of picked) {
    for (const size of ["L", "S"]) {
      const pair = `${departure}-${destination}`;
      process.stdout.write(`route ${pair} size=${size} … `);
      const res = await request("/api/starmap/routes/find", { departure, destination, size });
      const file = `route-${safeName(departure)}-${safeName(destination)}-${size}.json`;
      await save(OUT, file, res.data);
      const row = summarizeRoute(pair, size, res.status, res.data, {
        kind: "s-tunnel",
        sTunnel: tunnel,
        file,
      });
      routes.push(row);
      console.log(
        `${res.status} success=${row.success} jumps=${row.shortest?.jumps ?? "-"} differ=${row.shortestVsLeastjumpsDiffer} -> ${file}`,
      );
      await sleep(80);
    }
  }

  for (const [departure, destination] of DISTANT_PAIRS) {
    const pair = `${departure}-${destination}`;
    process.stdout.write(`route ${pair} … `);
    const res = await request("/api/starmap/routes/find", { departure, destination });
    const file = `route-${safeName(departure)}-${safeName(destination)}.json`;
    await save(OUT, file, res.data);
    const row = summarizeRoute(pair, null, res.status, res.data, {
      kind: "distant",
      file,
    });
    routes.push(row);
    console.log(
      `${res.status} success=${row.success} jumps=${row.shortest?.jumps ?? "-"} differ=${row.shortestVsLeastjumpsDiffer} -> ${file}`,
    );
    await sleep(80);
  }

  for (const code of CELESTIAL_CODES) {
    process.stdout.write(`celestial ${code} … `);
    const res = await request(`/api/starmap/celestial-objects/${encodeURIComponent(code)}`);
    await save(CELESTIAL_OUT, `${code}.json`, res.data);
    const row = summarizeCelestial(code, res.status, res.data);
    row.file = `api/celestial-objects/${code}.json`;
    celestialObjects.push(row);
    console.log(`${res.status} success=${row.success} type=${row.type} name=${row.name}`);
    await sleep(80);
  }

  const sizeCompare = [];
  for (const { departure, destination } of picked) {
    const pair = `${departure}-${destination}`;
    const s = routes.find((r) => r.pair === pair && r.size === "S");
    const l = routes.find((r) => r.pair === pair && r.size === "L");
    const sJ = s?.shortest?.jumps ?? null;
    const lJ = l?.shortest?.jumps ?? null;
    const sSeg = (s?.shortest?.systems ?? []).join(">");
    const lSeg = (l?.shortest?.systems ?? []).join(">");
    sizeCompare.push({
      pair,
      sJumps: sJ,
      lJumps: lJ,
      jumpsDiffer: sJ !== lJ,
      segmentsDiffer: sSeg !== lSeg,
      sLabel: s?.shortest?.label ?? null,
      lLabel: l?.shortest?.label ?? null,
    });
  }

  const summary = {
    capturedAt: new Date().toISOString(),
    source: BASE,
    notes: {
      headers: {
        Accept: "application/json",
        Origin: BASE,
        Referer: `${BASE}/en/starmap/`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
      },
      sTunnelCount: sTunnels.length,
      sTunnelPicks: picked,
      distantPairs: DISTANT_PAIRS.map(([a, b]) => `${a}-${b}`),
      banuSystemsPresent: ["KINS", "BACCHUS", "GLIESE", "GEDDON", "TRISE", "YULIN"],
      noBanuSystemCode: true,
    },
    find,
    routes,
    sizeCompare,
    celestialObjects,
    highlights: {
      findHits: find.filter((f) => f.success === 1 && (f.systems > 0 || f.objects > 0)),
      findEmptyOk: find.filter((f) => f.success === 1 && f.systems === 0 && f.objects === 0),
      findFailed: find.filter((f) => f.success !== 1),
      routesWhereShortestDiffersLeastjumps: routes.filter((r) => r.shortestVsLeastjumpsDiffer),
      sVsLDiffer: sizeCompare.filter((r) => r.jumpsDiffer || r.segmentsDiffer),
    },
  };

  await save(OUT, "SUMMARY3.json", summary);
  console.log(
    `done. find=${find.length} routes=${routes.length} celestial=${celestialObjects.length} differ=${summary.highlights.routesWhereShortestDiffersLeastjumps.length} sVsL=${summary.highlights.sVsLDiffer.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
