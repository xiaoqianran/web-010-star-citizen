#!/usr/bin/env node
/**
 * Fifth combo sweep: leftover route endpoints (object names), find pagination,
 * rare celestial types, and HUD words that might be searchable.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "research", "capture", "combos");
const CELESTIAL_OUT = join(ROOT, "research", "capture", "api", "celestial-objects");
const INDEX = join(ROOT, "research", "capture", "index", "celestial-objects.json");
const BASE = "https://robertsspaceindustries.com";
const UA = "Mozilla/5.0 (compatible; web-010-star-citizen-study/0.1)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FIND_QUERIES = [
  "Goss A",
  "GOSS A",
  "OPEN",
  "voice",
  "manmade",
  "man-made",
  "scanner",
  "population",
  "economy",
  "crime",
  "lifeforms",
  "display",
  "bookmark",
  "route",
  "Kayfa",
  "Eealus",
  "Hadur",
  "Virtus",
  "Khabari",
  "Markahil",
  "Delamar",
  "Luna",
  "Cellin",
  "Yela",
  "Daymar",
  "Aberdeen",
  "Arial",
  "Ita",
  "Magda",
  "Wala",
  "Calliope",
  "Clio",
  "Euterpe",
  "Lyria",
  "Wala",
];

const ROUTE_FORMS = [
  { departure: "Goss A", destination: "TERRA" },
  { departure: "GOSS A", destination: "TERRA" },
  { departure: "GOSS.STARS.GOSSA", destination: "TERRA" },
  { departure: "Cassel", destination: "Terra" },
  { departure: "Cassel", destination: "TERRA" },
  { departure: "GOSS", destination: "Terra" },
  { departure: "Goss", destination: "Terra" },
  { departure: "Levski", destination: "SOL" },
  { departure: "Area18", destination: "PYRO" },
  { departure: "The ARK", destination: "SOL" },
  { departure: "TAMSA", destination: "SOL" },
  { departure: "KAYFA", destination: "KINS" },
  { departure: "VIRGIL", destination: "TAMSA" },
  { departure: "CALIBAN", destination: "NYX" },
  { departure: "PYRO", destination: "TAMSA" },
  { departure: "VEGA", destination: "TAMSA" },
  { departure: "TRISE", destination: "SOL" },
];

const FIND_EXTRAS = [
  { query: "Terra", page: "2" },
  { query: "Terra", offset: "20" },
  { query: "Terra", start: "20" },
  { query: "Terra", limit: "5" },
  { query: "Terra", count: "5" },
  { query: "Terra", max: "5" },
];

function safeName(value) {
  if (value === "") return "empty";
  const cleaned = String(value)
    .replace(/['’]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `lit-${Buffer.from(String(value)).toString("hex")}`;
}

async function request(path, form = {}) {
  const headers = {
    Accept: "application/json",
    Origin: BASE,
    Referer: `${BASE}/en/starmap/`,
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
  };
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: new URLSearchParams(form).toString() });
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

function objectLabel(obj) {
  return obj?.name || obj?.designation || obj?.code || null;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(CELESTIAL_OUT, { recursive: true });
  const index = JSON.parse(await readFile(INDEX, "utf8"));
  const rare = index.filter((o) => ["POI", "BLACKHOLE", "LZ", "MANMADE"].includes(o.type));
  const rareCodes = [...new Map(rare.map((o) => [o.code, o])).values()].map((o) => o.code);

  const find = [];
  for (const query of [...new Set(FIND_QUERIES)]) {
    process.stdout.write(`find ${JSON.stringify(query)} … `);
    const res = await request("/api/starmap/find", { query });
    const file = `find5-${safeName(query)}.json`;
    await save(OUT, file, res.data);
    const systems = res.data?.data?.systems?.resultset ?? [];
    const objects = res.data?.data?.objects?.resultset ?? [];
    const row = {
      query,
      status: res.status,
      success: res.data?.success ?? 0,
      systems: systems.length,
      objects: objects.length,
      sample: [...systems, ...objects].slice(0, 6).map((item) => ({
        name: objectLabel(item),
        code: item.code ?? null,
        type: item.type ?? "SYSTEM",
      })),
      code: res.data?.code ?? null,
      msg: res.data?.msg ?? null,
      file,
    };
    find.push(row);
    console.log(`${res.status} success=${row.success} sys=${row.systems} obj=${row.objects}`);
    await sleep(60);
  }

  const findExtras = [];
  for (const form of FIND_EXTRAS) {
    process.stdout.write(`find extra ${JSON.stringify(form)} … `);
    const res = await request("/api/starmap/find", form);
    const file = `find5-extra-${safeName(JSON.stringify(form))}.json`;
    await save(OUT, file, res.data);
    const objects = res.data?.data?.objects?.resultset ?? [];
    const names = objects.map((o) => objectLabel(o));
    findExtras.push({
      form,
      status: res.status,
      success: res.data?.success ?? 0,
      objects: objects.length,
      names,
      sameAsPlainTerra: null,
      file,
    });
    console.log(`${res.status} objects=${objects.length}`);
    await sleep(60);
  }
  const plainTerra = find.find((f) => f.query === "Terra") || findExtras[0];
  const terraFile = JSON.parse(await readFile(join(OUT, "find-Terra.json"), "utf8").catch(() => "{}"));
  const terraNames = (terraFile?.data?.objects?.resultset ?? []).map((o) => objectLabel(o));
  for (const row of findExtras) {
    row.sameAsPlainTerra = JSON.stringify(row.names) === JSON.stringify(terraNames.slice(0, row.names.length)) || JSON.stringify(row.names) === JSON.stringify(terraNames);
  }

  const routes = [];
  for (const form of ROUTE_FORMS) {
    process.stdout.write(`route ${form.departure} -> ${form.destination} … `);
    const res = await request("/api/starmap/routes/find", form);
    const file = `route5-${safeName(form.departure)}-${safeName(form.destination)}.json`;
    await save(OUT, file, res.data);
    const shortest = res.data?.data?.shortest ?? null;
    const least = res.data?.data?.leastjumps ?? null;
    const row = {
      form,
      status: res.status,
      success: res.data?.success ?? 0,
      code: res.data?.code ?? null,
      msg: res.data?.msg ?? null,
      shortest: shortest ? { jumps: shortest.jumps, label: shortest.label, first_jump: shortest.first_jump, flight_distance: shortest.flight_distance } : null,
      leastjumps: least ? { jumps: least.jumps, label: least.label, first_jump: least.first_jump, flight_distance: least.flight_distance } : null,
      differ: (shortest?.jumps ?? null) !== (least?.jumps ?? null) || (shortest?.label ?? null) !== (least?.label ?? null),
      file,
    };
    routes.push(row);
    console.log(`${res.status} ${row.code} short=${row.shortest?.jumps ?? "-"} least=${row.leastjumps?.jumps ?? "-"}`);
    await sleep(60);
  }

  const celestialObjects = [];
  for (const code of rareCodes) {
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
      parent_id: obj?.parent_id ?? null,
      shaderKeys: obj?.shader_data ? Object.keys(obj.shader_data) : [],
    });
    console.log(`${res.status} type=${obj?.type ?? "none"}`);
    await sleep(50);
  }

  const summary = {
    capturedAt: new Date().toISOString(),
    source: BASE,
    find,
    findExtras,
    routes,
    celestialObjects,
    highlights: {
      objectNameRoutes: routes.filter((r) => /goss a|cassel|levski|area18|ark/i.test(r.form.departure)),
      routesWhereShortestDiffersLeastjumps: routes.filter((r) => r.differ && r.success === 1),
      findHits: find.filter((f) => f.success === 1 && (f.systems > 0 || f.objects > 0)),
      paginationChanges: findExtras.filter((f) => f.sameAsPlainTerra === false),
    },
  };
  await save(OUT, "SUMMARY5.json", summary);
  console.log(
    `done. find=${find.length} extras=${findExtras.length} routes=${routes.length} celestial=${celestialObjects.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
