#!/usr/bin/env node
/**
 * Re-probe public POST /api/starmap/* without downloading official binaries.
 * Writes JSON under research/capture/probe/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "research", "capture", "probe");
const BASE = "https://robertsspaceindustries.com/api/starmap";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function post(path, body, { json = false, ua = UA } = {}) {
  const headers = { "User-Agent": ua, Accept: "application/json" };
  let payload = body;
  if (json) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body ?? {});
  } else if (body && typeof body === "object") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(body).toString();
  } else {
    headers["Content-Type"] = "application/json";
    payload = "{}";
  }
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: payload });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text().catch(() => "") };
  }
  return { status: res.status, data };
}

function slimFind(data) {
  const objects = data?.data?.objects?.resultset ?? [];
  const systems = data?.data?.systems?.resultset ?? [];
  return {
    success: data?.success,
    code: data?.code,
    msg: data?.msg,
    systems: systems.map((s) => ({ code: s.code, name: s.name, type: "STAR_SYSTEM" })),
    objects: objects.map((o) => ({
      code: o.code,
      name: o.name,
      designation: o.designation,
      type: o.type,
      system: o.star_system?.code ?? o.star_system_id,
    })),
  };
}

function slimRoute(data) {
  const pack = (leg) =>
    leg
      ? {
          name: leg.name,
          label: leg.label,
          jumps: leg.jumps,
          first_jump: leg.first_jump,
          flight_distance: leg.flight_distance,
        }
      : null;
  return {
    success: data?.success,
    code: data?.code,
    msg: data?.msg,
    shortest: pack(data?.data?.shortest),
    leastjumps: pack(data?.data?.leastjumps),
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { capturedAt: new Date().toISOString(), notes: [] };

  const noUa = await post("/bootup", {}, { json: true, ua: "" });
  report.bootupNoUa = { status: noUa.status, code: noUa.data?.code, success: noUa.data?.success };
  report.notes.push(`bootup without User-Agent → HTTP ${noUa.status} code=${noUa.data?.code ?? "?"}`);

  const boot = await post("/bootup", {}, { json: true });
  report.bootup = {
    status: boot.status,
    success: boot.data?.success,
    systems: boot.data?.data?.systems?.resultset?.length ?? 0,
    tunnels: boot.data?.data?.tunnels?.resultset?.length ?? 0,
    starfieldCount: boot.data?.data?.config?.starfield?.count ?? null,
  };

  const finds = {};
  for (const q of [
    "New Babbage",
    "Grim HEX",
    "Port Olisar",
    "Baijini",
    "Everus",
    "Tressler",
    "Seraphim",
    "Astera",
    "Lorville",
    "Area18",
    "Orison",
    "Levski",
    "Port Renatus",
  ]) {
    const hit = await post("/find", { query: q });
    finds[q] = slimFind(hit.data);
  }
  await writeFile(join(OUT, "find-lz.json"), JSON.stringify(finds, null, 2) + "\n");
  report.findLz = Object.fromEntries(
    Object.entries(finds).map(([q, v]) => [q, { n: v.objects.length + v.systems.length, types: [...new Set(v.objects.map((o) => o.type))] }]),
  );

  const routes = {};
  const pairs = [
    { departure: "GOSS", destination: "TERRA", extra: { size: "S" } },
    { departure: "GOSS", destination: "TERRA", extra: { size: "L" } },
    { departure: "GOSS", destination: "TERRA", extra: { ship_size: "S" } },
    { departure: "GOSS", destination: "TERRA", extra: { ship_size: "L" } },
    { departure: "SOL", destination: "NYX", extra: { size: "S" } },
    { departure: "SOL", destination: "NYX", extra: { size: "L" } },
    { departure: "SOL", destination: "NYX", extra: { ship_size: "S" } },
    { departure: "SOL", destination: "NYX", extra: { ship_size: "L" } },
    { departure: "STANTON", destination: "PYRO", extra: { size: "S" } },
    { departure: "STANTON", destination: "PYRO", extra: { size: "L" } },
  ];
  for (const row of pairs) {
    const key = `${row.departure}-${row.destination}-${JSON.stringify(row.extra)}`;
    const hit = await post("/routes/find", { departure: row.departure, destination: row.destination, ...row.extra });
    routes[key] = slimRoute(hit.data);
  }
  await writeFile(join(OUT, "routes-size.json"), JSON.stringify(routes, null, 2) + "\n");
  report.routesSize = routes;

  const solNyxS = routes['SOL-NYX-{"size":"S"}']?.shortest;
  const solNyxL = routes['SOL-NYX-{"size":"L"}']?.shortest;
  const solNyxShipS = routes['SOL-NYX-{"ship_size":"S"}']?.shortest;
  report.notes.push(
    `SOL→NYX size S/L jumps ${solNyxS?.jumps}/${solNyxL?.jumps} dist ${solNyxS?.flight_distance}/${solNyxL?.flight_distance}`,
  );
  report.notes.push(`SOL→NYX ship_size S jumps ${solNyxShipS?.jumps} (community scrapers send this key)`);

  await writeFile(join(OUT, "REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
