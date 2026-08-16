#!/usr/bin/env node
/**
 * Exhaustive human-like pass on the clone: every leftover input, toggle, key, route.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const BASE = process.env.CLONE_URL || "http://127.0.0.1:4173/";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "research", "capture", "clone-human");
const CHROME = process.env.CHROME || "/usr/bin/google-chrome-stable";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEARCHES = [
  "a",
  "UE",
  "jump",
  "GOSS.STARS.GOSSA",
  "star",
  "planet",
  "moon",
  "belt",
  "station",
  "the",
  "halo",
  "flotilla",
  "ring",
  "cluster",
  "protoplanetary",
  "Levski",
  "Lorville",
  "Area18",
  "Orison",
  "Port Renatus",
  "Goss A",
  "Cassel",
  "Tamsa",
  "ARK",
  "Banu",
  "Vanduul",
  "Kayfa",
  "Terra",
  "Fair",
  "Warn",
];

const ROUTES = [
  ["SOL", "NYX"],
  ["STANTON", "TAMSA"],
  ["KILIAN", "PYRO"],
  ["GOSS", "TERRA"],
  ["GOSS", "GOSS"],
  ["Cassel", "Terra"],
  ["BANU", "SOL"],
  ["Goss A", "TERRA"],
  ["GOSS.STARS.GOSSA", "TERRA"],
];

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
    console.log(step, extra.focus ?? extra.count ?? extra.jumps ?? extra.cam ?? extra.text ?? extra.after ?? "");
  };

  const click = async (sel) => {
    const ok = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      el.click();
      return true;
    }, sel);
    await sleep(140);
    return ok;
  };
  const setInput = async (sel, value) => {
    await page.evaluate(
      (s, v) => {
        const i = document.querySelector(s);
        if (!i) return;
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        proto.set.call(i, v);
        i.dispatchEvent(new Event("input", { bubbles: true }));
      },
      sel,
      value,
    );
    await sleep(50);
  };
  const openTab = async (id) => {
    await page.evaluate((t) => document.querySelector(`[data-tab="${t}"]`)?.click(), id);
    await sleep(160);
  };
  const rows = () =>
    page.$$eval(".panel tbody tr", (trs) =>
      trs.map((tr) => ({
        name: tr.children[0]?.textContent.trim(),
        type: tr.children[1]?.textContent.trim(),
        info: tr.children[2]?.textContent.trim(),
      })),
    );
  const found = () =>
    page.evaluate(() => {
      const el = document.querySelector("[data-found]");
      return el ? Number(el.getAttribute("data-found")) : document.querySelectorAll(".panel tbody tr").length;
    });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem("skipAcknowledgment", "1");
    localStorage.setItem("skipInfo", "1");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await sleep(700);
  await click(".window-link");
  await click(".cta");
  await click(".cta");
  await sleep(800);

  await openTab("search");
  const searchTable = [];
  for (const q of SEARCHES) {
    await setInput("[data-search]", q);
    await page.focus("[data-search]").catch(() => {});
    await page.keyboard.press("Enter");
    await sleep(50);
    const list = await rows();
    const count = await found();
    searchTable.push({ q, count, sample: list.slice(0, 5) });
    note(`search:${q}`, { count });
  }

  const visits = [];
  for (const [q, name] of [
    ["Cassel", "Cassel"],
    ["Goss A", "Goss A"],
    ["Levski", "Levski"],
    ["Area18", "Area18"],
  ]) {
    await openTab("search");
    await setInput("[data-search]", q);
    const hit = await page.evaluate((want) => {
      const tr = [...document.querySelectorAll(".panel tbody tr")].find((r) =>
        r.children[0]?.textContent.toLowerCase().includes(want.toLowerCase()),
      );
      tr?.click();
      return !!tr;
    }, name);
    await sleep(400);
    const focus = await page.$eval(".focus", (el) => el.textContent.trim()).catch(() => "");
    const disc = await page.evaluate(() => ({
      pages: [...document.querySelectorAll("[data-page]")].map((b) => b.textContent.trim()),
      actions: [...document.querySelectorAll("[data-action]")].map((b) => b.textContent.trim()),
      side: [...document.querySelectorAll(".disc-meta, .disc-side")].map((b) => b.textContent.trim()),
    }));
    visits.push({ q, name, hit, focus, disc });
    note(`visit:${name}`, { focus });
    await page.screenshot({ path: join(OUT, `visit-${name.replace(/\s+/g, "-")}.png`), captureBeyondViewport: false }).catch(() => {});
    await click('[data-page="routing"]');
    await click('[data-page="bookmark"]');
    await click('[data-page="information"]');
    if (await click('[data-action="jump"]')) note("disc-jump", { focus });
  }

  await openTab("bookmarks");
  const bookmarkEmpty = await page.$eval(".panel", (el) => el.innerText.replace(/\s+/g, " ").trim());
  note("bookmarks", { text: bookmarkEmpty.slice(0, 120) });

  await openTab("routes");
  const routeLog = [];
  for (const [from, to] of ROUTES) {
    await setInput(".fields input:nth-of-type(1)", from);
    await setInput(".fields input:nth-of-type(2)", to);
    await click(".panel .cta");
    const empty = await page.$eval(".panel .empty", (el) => el.textContent.trim()).catch(() => null);
    const short = await page
      .evaluate(() => {
        document.querySelector('[data-route-mode="shortest"]')?.click();
      })
      .then(() => sleep(80))
      .then(() =>
        page.$eval(".route-meta", (el) => ({
          text: el.textContent.trim(),
          mode: el.getAttribute("data-route-shown"),
          jumps: el.getAttribute("data-jumps"),
        })),
      )
      .catch(() => null);
    const least = await page
      .evaluate(() => {
        document.querySelector('[data-route-mode="leastjumps"]')?.click();
      })
      .then(() => sleep(80))
      .then(() =>
        page.$eval(".route-meta", (el) => ({
          text: el.textContent.trim(),
          mode: el.getAttribute("data-route-shown"),
          jumps: el.getAttribute("data-jumps"),
        })),
      )
      .catch(() => null);
    routeLog.push({ from, to, empty, short, least, differ: short?.jumps !== least?.jumps });
    note(`route:${from}-${to}`, { text: empty || `${short?.jumps}/${least?.jumps}` });
  }

  await click('[data-level="galaxy"]');
  await openTab("display");
  const displaySel = ".display-bar input, .display-grid input";
  const displayBefore = await page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].map((el) => ({
      key: el.getAttribute("data-affil") || el.getAttribute("data-tunnel") || el.getAttribute("data-scan"),
      checked: el.checked,
    }));
  }, displaySel);
  const displayToggles = [];
  const n = await page.$$eval(displaySel, (els) => els.length);
  for (let i = 0; i < n; i++) {
    const row = await page.evaluate((idx, sel) => {
      const el = document.querySelectorAll(sel)[idx];
      const label = el.closest("label")?.innerText.trim();
      el.click();
      return {
        label,
        key: el.getAttribute("data-affil") || el.getAttribute("data-tunnel") || el.getAttribute("data-scan"),
        checked: el.checked,
        scanTag: document.querySelector(".scan-tag")?.textContent.trim() || null,
      };
    }, i, displaySel);
    displayToggles.push(row);
    note(`display:${row.label}`, { text: `${row.checked} ${row.scanTag || ""}` });
    await page.screenshot({ path: join(OUT, `display-${i}.png`), captureBeyondViewport: false }).catch(() => {});
    await page.evaluate((idx, sel) => {
      const el = document.querySelectorAll(sel)[idx];
      if (el && !el.checked && !el.getAttribute("data-scan")) el.click();
    }, i, displaySel);
  }

  await click('[data-level="system"]');
  await page.mouse.click(800, 360);
  await sleep(120);
  const keys = ["w", "a", "s", "d", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-", "2", "3", "Escape", " "];
  const keyLog = [];
  for (const key of keys) {
    const before = new URL(page.url()).searchParams.get("camera");
    await page.keyboard.press(key);
    await sleep(180);
    const after = new URL(page.url()).searchParams.get("camera");
    keyLog.push({ key, before, after, changed: before !== after, view: new URL(page.url()).searchParams.get("view") });
    if (before !== after) note(`key:${key}`, { cam: `${before} -> ${after}` });
  }

  const beforeCompass = new URL(page.url()).searchParams.get("camera");
  await click("[data-action=compass]");
  await sleep(250);
  const afterCompass = new URL(page.url()).searchParams.get("camera");
  note("compass", { cam: `${beforeCompass} -> ${afterCompass}` });

  await click('[data-view="2d"]');
  const view2d = new URL(page.url()).searchParams.get("view");
  await click('[data-view="3d"]');
  const view3d = new URL(page.url()).searchParams.get("view");
  note("view", { text: `${view2d} -> ${view3d || "3d-default"}` });

  const report = {
    searchTable,
    visits,
    bookmarkEmpty,
    routeLog,
    displayBefore,
    displayToggles,
    keyLog,
    compass: { before: beforeCompass, after: afterCompass },
    log,
  };
  await writeFile(join(OUT, "REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  console.log("wrote", join(OUT, "REPORT.json"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
