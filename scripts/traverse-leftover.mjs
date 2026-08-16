#!/usr/bin/env node
/**
 * Human-like leftover pass: official-aligned search, dual routes, LZ, compass.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const BASE = process.env.CLONE_URL || "http://127.0.0.1:4173/";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "research", "capture", "clone-leftover");
const CHROME = process.env.CHROME || "/usr/bin/google-chrome-stable";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--window-size=1600,1000"],
    defaultViewport: { width: 1600, height: 1000 },
  });
  const page = await browser.newPage();
  const log = [];
  const note = (step, extra = {}) => {
    log.push({ t: new Date().toISOString(), step, url: page.url(), ...extra });
    console.log(step, extra.focus ?? extra.count ?? extra.jumps ?? extra.cam ?? extra.text ?? "");
  };

  const setInput = async (sel, value) => {
    await page.evaluate(
      (s, v) => {
        const i = document.querySelector(s);
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        proto.set.call(i, v);
        i.dispatchEvent(new Event("input", { bubbles: true }));
      },
      sel,
      value,
    );
    await sleep(60);
  };
  const openTab = async (id) => {
    await page.evaluate((t) => {
      const btn = document.querySelector(`[data-tab="${t}"]`);
      if (btn && !btn.classList.contains("on")) btn.click();
    }, id);
    await sleep(160);
  };
  const rows = () =>
    page.$$eval(".panel tbody tr", (trs) =>
      trs.map((tr) => ({ name: tr.children[0]?.textContent.trim(), type: tr.children[1]?.textContent.trim() })),
    );
  const clickRow = async (name) =>
    page.evaluate((want) => {
      const tr = [...document.querySelectorAll(".panel tbody tr")].find((r) =>
        r.children[0]?.textContent.trim().toLowerCase().includes(want.toLowerCase()),
      );
      tr?.click();
      return !!tr;
    }, name);

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem("skipAcknowledgment", "1");
    localStorage.setItem("skipInfo", "1");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await sleep(900);
  await page.evaluate(() => document.querySelector(".window-link")?.click());
  await sleep(200);
  await page.evaluate(() => document.querySelector(".cta")?.click());
  await sleep(200);
  await page.evaluate(() => document.querySelector(".cta")?.click());
  await sleep(900);

  await openTab("search");
  const searches = [
    "a",
    "UE",
    "jump",
    "GOSS.STARS.GOSSA",
    "star",
    "Levski",
    "Lorville",
    "Area18",
    "Orison",
    "Port Renatus",
    "the",
    "halo",
    "flotilla",
    "Goss A",
    "Cassel",
  ];
  const searchTable = [];
  for (const q of searches) {
    await setInput("[data-search]", q);
    const list = await rows();
    searchTable.push({ q, count: list.length, sample: list.slice(0, 4) });
    note(`search:${q}`, { count: list.length });
  }

  const visits = [
    ["Levski", "Levski"],
    ["Area18", "Area18"],
    ["Orison", "Orison"],
  ];
  const visitLog = [];
  for (const [q, name] of visits) {
    await openTab("search");
    await setInput("[data-search]", q);
    const hit = await clickRow(name);
    const focus = await page.$eval(".focus", (el) => el.textContent.trim());
    visitLog.push({ q, name, hit, focus });
    note(`visit:${name}`, { focus });
    await page.screenshot({ path: join(OUT, `${name.replace(/\s+/g, "-")}.png`), captureBeyondViewport: false }).catch(() => {});
  }

  await openTab("routes");
  const click = async (sel) => {
    const ok = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      el.click();
      return true;
    }, sel);
    if (!ok) throw new Error("missing " + sel);
    await sleep(120);
  };
  const routePairs = [
    ["SOL", "NYX"],
    ["STANTON", "TAMSA"],
    ["KILIAN", "PYRO"],
    ["GOSS", "TERRA"],
  ];
  const routeLog = [];
  for (const [from, to] of routePairs) {
    await setInput(".fields input:nth-of-type(1)", from);
    await setInput(".fields input:nth-of-type(2)", to);
    await click(".panel .cta");
    await click('[data-route-mode="shortest"]');
    const short = await page.$eval(".route-meta", (el) => ({
      text: el.textContent.trim(),
      mode: el.getAttribute("data-route-shown"),
      jumps: el.getAttribute("data-jumps"),
    }));
    await click('[data-route-mode="leastjumps"]');
    const least = await page.$eval(".route-meta", (el) => ({
      text: el.textContent.trim(),
      mode: el.getAttribute("data-route-shown"),
      jumps: el.getAttribute("data-jumps"),
    }));
    routeLog.push({ from, to, short, least, differ: short.jumps !== least.jumps });
    note(`route:${from}-${to}`, { text: `${short.jumps}/${short.mode} || ${least.jumps}/${least.mode}` });
  }

  const before = new URL(page.url()).searchParams.get("camera");
  await page.click("[data-action=compass]");
  await sleep(200);
  const after = new URL(page.url()).searchParams.get("camera");
  note("compass", { cam: `${before} -> ${after}` });

  const report = { searchTable, visitLog, routeLog, compass: { before, after } };
  await writeFile(join(OUT, "REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  console.log("wrote", join(OUT, "REPORT.json"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
