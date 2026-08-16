#!/usr/bin/env node
/**
 * Capture public RSI ARK Starmap API payloads for study/recreation.
 * Does not download official 3D models, audio, or the JS bundle.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "research", "capture");
const BASE = "https://robertsspaceindustries.com";
const UA =
  "Mozilla/5.0 (compatible; web-010-star-citizen-study/0.1; +https://github.com/xiaoqianran/web-010-star-citizen)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(method, path, { json, form } = {}) {
  const headers = {
    Accept: "application/json, text/plain, */*",
    Origin: BASE,
    Referer: `${BASE}/en/starmap/`,
    "User-Agent": UA,
  };
  let body;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form).toString();
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json ?? {});
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body });
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

async function main() {
  const index = {
    capturedAt: new Date().toISOString(),
    source: BASE,
    appVersionHint: "9.536.0",
    files: [],
    errors: [],
  };

  const record = (rel) => index.files.push(rel);

  console.log("bootup…");
  const bootup = await request("POST", "/api/starmap/bootup", { json: {} });
  await save("api/bootup.json", bootup.data);
  record("api/bootup.json");

  const systems = bootup.data?.data?.systems?.resultset ?? [];
  const codes = systems.map((s) => s.code).filter(Boolean);
  await save(
    "index/systems.json",
    systems.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      type: s.type,
      status: s.status,
      affiliation: (s.affiliation || []).map((a) => a.code),
      position: [s.position_x, s.position_y, s.position_z],
    })),
  );
  record("index/systems.json");

  await save("api/species.json", (await request("POST", "/api/starmap/species")).data);
  record("api/species.json");
  await save("api/affiliations.json", (await request("POST", "/api/starmap/affiliations")).data);
  record("api/affiliations.json");

  console.log(`star-systems × ${codes.length}…`);
  const objectIndex = [];
  for (const [i, code] of codes.entries()) {
    const path = `/api/starmap/star-systems/${encodeURIComponent(code)}`;
    const res = await request("POST", path, { json: {} });
    if (!res.ok || res.data?.success !== 1) {
      index.errors.push({ path, status: res.status, code: res.data?.code });
    }
    await save(`api/star-systems/${code}.json`, res.data);
    record(`api/star-systems/${code}.json`);
    const sys = res.data?.data?.resultset?.[0];
    for (const obj of sys?.celestial_objects ?? []) {
      objectIndex.push({
        system: code,
        id: obj.id,
        code: obj.code,
        name: obj.name,
        designation: obj.designation,
        type: obj.type,
        appearance: obj.appearance,
        subtype: obj.subtype?.name ?? null,
      });
    }
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${codes.length}`);
    await sleep(80);
  }
  await save("index/celestial-objects.json", objectIndex);
  record("index/celestial-objects.json");

  const detailCodes = objectIndex
    .filter((o) => o.system === "GOSS" || ["STAR", "PLANET", "SATELLITE"].includes(o.type))
    .filter((o) => o.system === "GOSS")
    .map((o) => o.code);

  console.log(`celestial-objects × ${detailCodes.length} (GOSS)…`);
  for (const code of detailCodes) {
    const path = `/api/starmap/celestial-objects/${encodeURIComponent(code)}`;
    const res = await request("POST", path, { json: {} });
    await save(`api/celestial-objects/${code}.json`, res.data);
    record(`api/celestial-objects/${code}.json`);
    await sleep(60);
  }

  const finds = ["GOSS", "Terra", "Stanton", "Sol", "Cassel", "Helios"];
  for (const query of finds) {
    const res = await request("POST", "/api/starmap/find", { form: { query } });
    await save(`api/find/${query}.json`, res.data);
    record(`api/find/${query}.json`);
    await sleep(60);
  }

  const routes = [
    ["GOSS", "TERRA"],
    ["GOSS", "HELIOS"],
    ["GOSS", "TYROL"],
    ["STANTON", "PYRO"],
    ["SOL", "TERRA"],
  ];
  for (const [departure, destination] of routes) {
    const res = await request("POST", "/api/starmap/routes/find", {
      form: { departure, destination },
    });
    await save(`api/routes/${departure}-${destination}.json`, res.data);
    record(`api/routes/${departure}-${destination}.json`);
    await sleep(60);
  }

  const bookmarks = await request("POST", "/api/starmap/bookmarks/find", { json: {} });
  await save("api/bookmarks-find.unauthenticated.json", bookmarks.data);
  record("api/bookmarks-find.unauthenticated.json");

  await save("index/manifest.json", index);
  console.log(`done. files=${index.files.length} errors=${index.errors.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
