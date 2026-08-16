#!/usr/bin/env node
/**
 * Second combinatorial sweep of public RSI ARK Starmap find/routes APIs.
 * Does not download official 3D models, audio, or JS bundles.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "research", "capture", "combos");
const SYS_OUT = join(ROOT, "research", "capture", "api", "star-systems");
const BASE = "https://robertsspaceindustries.com";
const UA = "Mozilla/5.0 (compatible; web-010-star-citizen-study/0.1)";

const FIND_QUERIES = [
  "Tamsa",
  "Vega",
  "Nyx",
  "Tayac",
  "ARK",
  "Olisar",
  "Luna",
  "Io",
  "Cellin",
  "Daymar",
  "Yela",
  "Port",
  "blackhole",
  "neutron",
  "binary",
  "Goss A",
  "Olympus",
  "Vanduul",
  "Banu",
  "Xi'an",
  "Developing",
  "Unclaimed",
  "Justice",
  "Ruin",
  "Aaron",
  "Glaciem",
  "Baker",
  "Magnus",
  "Davien",
  "Cano",
  "Croshaw",
  "",
  "  ",
  "GOSS.STARS.GOSSA",
  "microTech",
  "Port Olisar",
  "THEARK",
  "Broken Moon",
];

const ROUTES = [
  { departure: "TAYAC", destination: "GOSS" },
  { departure: "OSIRIS", destination: "TYROL" },
  { departure: "NYX", destination: "STANTON" },
  { departure: "TAMSA", destination: "SOL" },
  { departure: "VEGA", destination: "TERRA" },
  { departure: "TERRA", destination: "GOSS" },
  { departure: "Cassel", destination: "Terra" },
  { departure: "", destination: "" },
  { departure: "GOSS", destination: "TERRA", size: "S" },
  { departure: "GOSS", destination: "TERRA", size: "M" },
  { departure: "GOSS", destination: "TERRA", size: "L" },
  { departure: "GOSS", destination: "SOL", size: "S" },
  { departure: "MAGNUS", destination: "STANTON" },
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

async function request(path, form) {
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

async function save(rel, value) {
  const file = join(OUT, rel);
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
  const sample = [...systems, ...objects].slice(0, 5).map((item) => ({
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

function summarizeRoute(pair, size, status, data) {
  if (data?._nonJson) {
    return { pair, size: size ?? null, status, error: "non-json", preview: data._text };
  }
  const shortest = data?.data?.shortest ?? null;
  const row = {
    pair,
    size: size ?? null,
    status,
    success: data?.success ?? 0,
    code: data?.code ?? null,
    msg: data?.msg ?? null,
  };
  if (data?.success === 1) {
    row.jumps = shortest?.jumps ?? null;
    row.label = shortest?.label ?? null;
    row.name = shortest?.name ?? null;
    row.first_jump = shortest?.first_jump ?? null;
    const least = data?.data?.leastjumps;
    if (least && least.jumps != null && least.jumps !== shortest?.jumps) {
      row.leastjumps = least.jumps;
      row.leastjumps_label = least.label ?? null;
    }
  } else {
    row.error = data?.msg || data?.code || "failed";
    if (data?.data != null && typeof data.data !== "object") row.detail = data.data;
    if (data?.data && typeof data.data === "object" && !shortest) {
      row.detail = data.data;
    }
  }
  return row;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const find = [];
  const routes = [];
  const starSystems = [];

  for (const query of FIND_QUERIES) {
    const label = query === "" ? "(empty)" : query === "  " ? "(spaces)" : query;
    process.stdout.write(`find ${JSON.stringify(query)} … `);
    const res = await request("/api/starmap/find", { query });
    const file = `find-${safeName(query)}.json`;
    await save(file, res.data);
    const row = summarizeFind(query, res.status, res.data);
    find.push(row);
    console.log(
      `${res.status} success=${row.success} sys=${row.systems} obj=${row.objects} -> ${file}`,
    );
    await sleep(80);
  }

  for (const route of ROUTES) {
    const { departure, destination, size } = route;
    const pair = `${departure || "(empty)"}-${destination || "(empty)"}`;
    process.stdout.write(`route ${pair}${size ? ` size=${size}` : ""} … `);
    const form = { departure, destination };
    if (size) form.size = size;
    const res = await request("/api/starmap/routes/find", form);
    const file = size
      ? `route-${safeName(departure || "empty")}-${safeName(destination || "empty")}-${size}.json`
      : `route-${safeName(departure || "empty")}-${safeName(destination || "empty")}.json`;
    await save(file, res.data);
    const row = summarizeRoute(pair, size, res.status, res.data);
    routes.push(row);
    console.log(
      `${res.status} success=${row.success} code=${row.code} jumps=${row.jumps ?? "-"} -> ${file}`,
    );
    await sleep(80);
  }

  for (const code of ["TAMSA", "VEGA"]) {
    const dest = join(SYS_OUT, `${code}.json`);
    if (await exists(dest)) {
      starSystems.push({ code, action: "skipped", reason: "already saved" });
      console.log(`star-systems/${code} skipped (already saved)`);
      continue;
    }
    process.stdout.write(`star-systems/${code} … `);
    const headers = {
      Accept: "application/json",
      Origin: BASE,
      Referer: `${BASE}/en/starmap/`,
      "Content-Type": "application/json",
      "User-Agent": UA,
    };
    const res = await fetch(`${BASE}/api/starmap/star-systems/${encodeURIComponent(code)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const data = JSON.parse(await res.text());
    await mkdir(SYS_OUT, { recursive: true });
    await writeFile(dest, JSON.stringify(data, null, 2) + "\n", "utf8");
    starSystems.push({ code, action: "saved", status: res.status, success: data.success });
    console.log(`${res.status} success=${data.success}`);
    await sleep(80);
  }

  const summary = {
    capturedAt: new Date().toISOString(),
    source: BASE,
    find,
    routes,
    starSystems,
  };
  await save("SUMMARY2.json", summary);
  console.log(`done. find=${find.length} routes=${routes.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
