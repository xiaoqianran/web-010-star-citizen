#!/usr/bin/env node
/**
 * Human-like deep pass of the clone: every leftover phenomenon.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const BASE = process.env.CLONE_URL || "http://127.0.0.1:4173/";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "research", "capture", "clone-deep");
const CHROME = process.env.CHROME || "/usr/bin/google-chrome-stable";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--window-size=1600,1000",
    ],
    defaultViewport: { width: 1600, height: 1000 },
  });
  const page = await browser.newPage();
  const log = [];
  const note = (step, extra = {}) => {
    log.push({ t: new Date().toISOString(), step, url: page.url(), ...extra });
    console.log(step, extra.focus ?? extra.text ?? extra.count ?? extra.n ?? extra.camera ?? "");
  };
  const snap = async (name) => {
    await page.screenshot({ path: join(OUT, name), timeout: 8000, captureBeyondViewport: false }).catch(() => {});
  };
  const state = async () =>
    page.evaluate(() => ({
      focus: document.querySelector(".focus")?.textContent.trim() || "",
      tip: document.querySelector(".hover-tip")?.textContent.trim() || "",
      disc: !!document.querySelector(".disc-wrap"),
      jump: !!document.querySelector("[data-action=jump]"),
      card: document.querySelector(".info-card")?.innerText.slice(0, 240) || "",
      tab: new URL(location.href).searchParams.get("tab"),
      loc: new URL(location.href).searchParams.get("location"),
      cam: new URL(location.href).searchParams.get("camera"),
      view: new URL(location.href).searchParams.get("view"),
      labels: [...document.querySelectorAll(".label3d")].map((el) => el.textContent.trim()).slice(0, 20),
    }));

  const setInput = async (sel, value) => {
    await page.evaluate(
      (s, v) => {
        const i = document.querySelector(s);
        if (!i) throw new Error("missing " + s);
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        proto.set.call(i, v);
        i.dispatchEvent(new Event("input", { bubbles: true }));
      },
      sel,
      value,
    );
    await sleep(80);
  };

  const openTab = async (id) => {
    await page.evaluate((t) => document.querySelector(`[data-tab="${t}"]`)?.click(), id);
    await sleep(200);
  };

  const clickRow = async (name) => {
    const ok = await page.evaluate((want) => {
      const tr = [...document.querySelectorAll(".panel tbody tr")].find((r) =>
        r.children[0]?.textContent.trim().toLowerCase().includes(want.toLowerCase()),
      );
      tr?.click();
      return !!tr;
    }, name);
    await sleep(900);
    return ok;
  };

  const rows = async () =>
    page.$$eval(".panel tbody tr", (trs) =>
      trs.map((tr) => ({ name: tr.children[0]?.textContent.trim(), type: tr.children[1]?.textContent.trim() })),
    );

  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(() => document.querySelector(".window-link")?.click());
  await sleep(250);
  await page.evaluate(() => document.querySelector(".cta")?.click());
  await sleep(250);
  await page.evaluate(() => document.querySelector(".cta")?.click());
  await sleep(1100);
  note("map", await state());
  await snap("01-goss.png");

  // hover: move around canvas
  const box = await page.$eval(".canvas-host canvas", (c) => {
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  for (const [dx, dy] of [
    [0.5, 0.48],
    [0.52, 0.5],
    [0.48, 0.52],
    [0.62, 0.4],
    [0.38, 0.6],
  ]) {
    await page.mouse.move(box.x + box.w * dx, box.y + box.h * dy);
    await sleep(120);
  }
  note("hover", await state());
  await snap("02-hover.png");

  // search combos + named clicks
  await openTab("search");
  const searches = [
    "Terra",
    "Stanton",
    "Sol",
    "Pyro",
    "Cassel",
    "Tamsa",
    "ARK",
    "The ARK",
    "Olisar",
    "Cellin",
    "Daymar",
    "Yela",
    "Aaron",
    "Goss A",
    "Vanduul",
    "Banu",
    "Luna",
    "microTech",
    "Hurston",
    "ArcCorp",
    "Crusader",
    "Port Renatus",
    "Broken Moon",
    "jump",
    "star",
    "planet",
    "moon",
    "station",
    "belt",
    "black",
    "a",
    "UE",
    "xxxnomatch",
  ];
  const searchTable = [];
  for (const q of searches) {
    await setInput("[data-search]", q);
    const list = await rows();
    searchTable.push({ q, count: list.length, sample: list.slice(0, 5) });
    note(`search:${q}`, { count: list.length });
  }
  await snap("03-search.png");

  const visits = [
    ["Tamsa", "Tamsa", "04-tamsa.png"],
    ["Stanton", "Stanton", "05-stanton.png"],
    ["ARK", "The ARK", "06-ark.png"],
    ["Olisar", "Port Olisar", "07-olisar.png"],
    ["Cellin", "Cellin", "08-cellin.png"],
    ["Aaron", "Aaron Halo", "09-aaron.png"],
    ["Cassel", "Cassel", "10-cassel.png"],
    ["Vanduul", "Vanduul", "11-vanduul.png"],
  ];
  const visitLog = [];
  for (const [q, name, file] of visits) {
    await openTab("search");
    await setInput("[data-search]", q);
    const hit = await clickRow(name);
    const st = await state();
    visitLog.push({ q, name, hit, ...st });
    note(`visit:${name}`, st);
    await snap(file);
    await page.evaluate(() => document.querySelector("[data-level=system]")?.click());
    await sleep(400);
  }

  // disc: bookmark, avoid, departure, jump
  await openTab("search");
  await setInput("[data-search]", "Cassel");
  await clickRow("Cassel");
  await page.evaluate(() => document.querySelector("[data-page=bookmark]")?.click());
  await sleep(150);
  await page.evaluate(() => document.querySelector("[data-action=bookmark]")?.click());
  await sleep(150);
  await page.evaluate(() => document.querySelector("[data-page=routing]")?.click());
  await sleep(150);
  await page.evaluate(() => document.querySelector("[data-action=departure]")?.click());
  await sleep(250);
  note("disc-departure", await state());
  await snap("12-disc-route.png");

  await openTab("bookmarks");
  const marks = await rows();
  note("bookmarks", { count: marks.length, text: JSON.stringify(marks) });
  await snap("13-bookmarks.png");

  // jump Goss - Terra
  await openTab("search");
  await setInput("[data-search]", "Goss - Terra");
  await clickRow("Goss - Terra");
  await page.evaluate(() => document.querySelector("[data-page=routing]")?.click());
  await sleep(150);
  const canJump = await page.evaluate(() => {
    document.querySelector("[data-action=jump]")?.click();
    return !!document.querySelector("[data-action=jump]");
  });
  await sleep(1100);
  note("jump-terra", { ...(await state()), canJump });
  await snap("14-jump-terra.png");

  // routes combos with display reset
  await page.evaluate(() => document.querySelector("[data-level=galaxy]")?.click());
  await sleep(400);
  await openTab("routes");
  const pairs = [
    ["GOSS", "TERRA"],
    ["GOSS", "SOL"],
    ["GOSS", "STANTON"],
    ["TAYAC", "GOSS"],
    ["TAMSA", "SOL"],
    ["foo", "bar"],
    ["Cassel", "Terra"],
    ["", ""],
  ];
  const routeTable = [];
  for (const [a, b] of pairs) {
    await page.evaluate(
      (from, to) => {
        const inputs = document.querySelectorAll(".fields input");
        const set = (el, v) => {
          const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
          proto.set.call(el, v);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        };
        if (inputs[0]) set(inputs[0], from);
        if (inputs[1]) set(inputs[1], to);
        document.querySelector(".fields .cta")?.click();
      },
      a,
      b,
    );
    await sleep(280);
    const meta = await page.$eval(".route-meta", (el) => el.textContent.trim()).catch(() => "");
    const empty = await page.$eval(".panel .empty", (el) => el.textContent.trim()).catch(() => "");
    const segs = await page.$$eval(".panel tbody tr", (trs) => trs.map((tr) => tr.textContent.trim()));
    routeTable.push({ pair: `${a}->${b}`, meta, empty, segs: segs.slice(0, 10) });
    note(`route:${a}->${b}`, { text: meta || empty });
  }
  await snap("15-route-goss-sol.png");

  // DISPLAY one-by-one
  await openTab("display");
  await page.evaluate(() => document.querySelector("[data-level=galaxy]")?.click());
  await sleep(400);
  const displayLog = [];
  const resetDisplay = async () => {
    await page.evaluate(() => {
      document.querySelectorAll("[data-affil]").forEach((el) => {
        if (!el.checked) el.click();
      });
      document.querySelectorAll("[data-tunnel]").forEach((el) => {
        if (!el.checked) el.click();
      });
      document.querySelectorAll("[data-scan]").forEach((el) => {
        if (el.checked) el.click();
      });
    });
    await sleep(120);
  };
  await resetDisplay();
  await snap("16-galaxy-all.png");
  note("galaxy-all", await state());

  for (const code of ["uee", "BANU", "VNCL", "XIAN", "DEV", "UNC"]) {
    await resetDisplay();
    await page.evaluate((c) => document.querySelector(`[data-affil="${c}"]`)?.click(), code);
    await sleep(150);
    displayLog.push({ kind: "affil-off", code, ...(await state()) });
  }
  await resetDisplay();
  for (const sz of ["S", "M", "L"]) {
    await page.evaluate((c) => document.querySelector(`[data-tunnel="${c}"]`)?.click(), sz);
    await sleep(120);
    displayLog.push({ kind: "tunnel-off", sz, ...(await state()) });
    await page.evaluate((c) => document.querySelector(`[data-tunnel="${c}"]`)?.click(), sz);
  }
  for (const scan of ["lifeforms", "economy", "crime"]) {
    await resetDisplay();
    await page.evaluate((c) => document.querySelector(`[data-scan="${c}"]`)?.click(), scan);
    await sleep(200);
    displayLog.push({ kind: "scan", scan, ...(await state()) });
    await snap(`17-scan-${scan}.png`);
    note(`scan:${scan}`, await state());
  }

  await page.evaluate(() => document.querySelector("[data-view=2d]")?.click());
  await sleep(400);
  note("2d", await state());
  await snap("18-2d.png");
  await page.evaluate(() => document.querySelector("[data-view=3d]")?.click());
  await sleep(200);

  // keyboard
  await page.evaluate(() => document.body.click());
  for (const key of ["a", "d", "w", "s", "ArrowLeft", "Equal", "Minus", "2", "3", "Escape"]) {
    await page.keyboard.press(key);
    await sleep(60);
  }
  note("keyboard", await state());

  // hamburger + sound
  await page.evaluate(() => document.querySelector(".burger-hit")?.click());
  await sleep(150);
  const flyout = await page.$eval(".flyout", (el) => el.innerText).catch(() => "");
  note("hamburger", { text: flyout });
  await snap("19-menu.png");
  await page.evaluate(() => document.querySelector(".utils button")?.click());
  await sleep(80);

  // URL reload
  const deep = page.url();
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(400);
  // skip intro if shown
  if (await page.$(".window-link")) {
    await page.evaluate(() => document.querySelector(".window-link")?.click());
    await sleep(200);
    await page.evaluate(() => document.querySelector(".cta")?.click());
    await sleep(200);
    await page.evaluate(() => document.querySelector(".cta")?.click());
    await sleep(800);
  }
  note("reload", { text: deep, ...(await state()) });
  await snap("20-reload.png");

  const report = { base: BASE, log, searchTable, visitLog, routeTable, displayLog, finalUrl: page.url() };
  await writeFile(join(OUT, "REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  console.log("done", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
