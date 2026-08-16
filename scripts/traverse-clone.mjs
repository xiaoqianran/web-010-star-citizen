#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const BASE = process.env.CLONE_URL || "http://127.0.0.1:4173/";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "research", "capture", "clone-pass");
const CHROME = process.env.CHROME || "/usr/bin/google-chrome-stable";
const shot = (name) => join(OUT, name);

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
      "--window-size=1440,900",
    ],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const log = [];
  const note = (step, extra = {}) => {
    log.push({ t: new Date().toISOString(), step, url: page.url(), ...extra });
    console.log(step, extra.n ?? extra.text ?? extra.count ?? "");
  };
  const snap = async (name) => {
    await page.screenshot({ path: shot(name), timeout: 8000, captureBeyondViewport: false }).catch(() => {});
  };

  await page.goto(BASE, { waitUntil: "networkidle0", timeout: 60000 });
  await snap("01-boot.png");
  note("boot");

  const windowBtn = await page.$(".window-link");
  if (windowBtn) {
    await windowBtn.click();
    await sleep(400);
  }
  await snap("02-ack.png");
  note("ack");

  const ack = await page.$(".cta");
  if (ack) {
    await ack.click();
    await sleep(400);
  }
  await snap("03-lore.png");
  note("lore");

  const explore = await page.$(".cta");
  if (explore) {
    await explore.click();
    await sleep(1200);
  }
  await snap("04-map.png");
  note("map", { text: await page.$eval(".focus", (el) => el.textContent.trim()).catch(() => "") });

  const canvas = await page.$(".canvas-host canvas");
  if (canvas) {
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2 + 40, { steps: 12 });
    await page.mouse.up();
    await sleep(300);
    for (let i = 0; i < 6; i++) await page.mouse.wheel({ deltaY: -120 });
    await sleep(200);
    note("drag-zoom", { camera: new URL(page.url()).searchParams.get("camera") });
  }

  const clickTab = async (label) => {
    await page.evaluate((want) => {
      const t = [...document.querySelectorAll(".tab")].find((el) => el.textContent.includes(want));
      t?.click();
    }, label);
    await sleep(300);
  };

  await clickTab("搜索");
  await page.waitForSelector(".search-box input", { timeout: 8000 });
  const searches = [
    "Terra",
    "Stanton",
    "Sol",
    "Cassel",
    "Tamsa",
    "ARK",
    "Olisar",
    "Cellin",
    "Goss A",
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
    "Vanduul",
    "Banu",
    "Port Olisar",
    "microTech",
    "",
  ];
  const searchRows = [];
  const typeQuery = async (q) => {
    await page.evaluate((value) => {
      const i = document.querySelector(".search-box input");
      if (!i) throw new Error("no search input");
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      proto.set.call(i, value);
      i.dispatchEvent(new Event("input", { bubbles: true }));
    }, q);
    await sleep(80);
  };

  for (const q of searches) {
    await typeQuery(q);
    const rows = await page.$$eval(".panel tbody tr", (trs) =>
      trs.map((tr) => ({ name: tr.children[0]?.textContent.trim(), type: tr.children[1]?.textContent.trim() })),
    );
    searchRows.push({ q, count: rows.length, sample: rows.slice(0, 6) });
    note(`search:${q || "(empty)"}`, { count: rows.length });
  }
  await snap("05-search.png");

  await typeQuery("Cassel");
  const cassel = await page.$(".panel tbody tr");
  await page.evaluate(() => document.querySelector(".panel tbody tr")?.click());
  await sleep(800);
  await snap("06-cassel.png");
  note("click-cassel", { text: await page.$eval(".focus", (el) => el.textContent.trim()).catch(() => "") });

  await clickTab("航线");
  const routePairs = [
    ["GOSS", "TERRA"],
    ["GOSS", "SOL"],
    ["GOSS", "GOSS"],
    ["foo", "bar"],
    ["Cassel", "Terra"],
    ["", ""],
  ];
  const routeRows = [];
  for (const [a, b] of routePairs) {
    await page.evaluate((from, to) => {
      const inputs = document.querySelectorAll(".fields input");
      const set = (el, value) => {
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        proto.set.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      if (inputs[0]) set(inputs[0], from);
      if (inputs[1]) set(inputs[1], to);
    }, a, b);
    await page.evaluate(() => document.querySelector(".fields .cta")?.click());
    await sleep(250);
    const meta = await page.$eval(".route-meta", (el) => el.textContent.trim()).catch(() => "");
    const empty = await page.$eval(".panel .empty", (el) => el.textContent.trim()).catch(() => "");
    const segs = await page.$$eval(".panel tbody tr", (trs) => trs.map((tr) => tr.textContent.trim()));
    routeRows.push({ pair: `${a}->${b}`, meta, empty, segs: segs.slice(0, 8) });
    note(`route:${a}->${b}`, { text: meta || empty });
  }
  await snap("07-routes.png");

  await clickTab("显示");
  const boxCount = await page.$$eval(".display-grid input[type=checkbox]", (els) => {
    els.forEach((el) => el.click());
    return els.length;
  });
  await snap("08-display.png");
  note("display-toggles", { n: boxCount });

  await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".tools button")];
    btns.find((b) => b.textContent.includes("2D"))?.click();
  });
  await sleep(400);
  await snap("09-2d.png");
  note("2d", { view: new URL(page.url()).searchParams.get("view") });

  await page.keyboard.press("3");
  await page.keyboard.press("KeyA");
  await page.keyboard.press("KeyD");
  await page.keyboard.press("Equal");
  await page.keyboard.press("Escape");
  await sleep(200);
  note("keyboard", { url: page.url() });

  await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".levels button")];
    btns.find((b) => b.textContent.includes("GLX"))?.click();
  });
  await sleep(700);
  await snap("10-galaxy.png");
  note("galaxy");

  await clickTab("搜索");
  await typeQuery("Tamsa");
  await page.evaluate(() => document.querySelector(".panel tbody tr")?.click());
  await sleep(1000);
  await snap("11-tamsa.png");
  note("tamsa", { text: await page.$eval(".focus", (el) => el.textContent.trim()).catch(() => "") });

  await clickTab("搜索");
  await typeQuery("Stanton");
  await page.evaluate(() => document.querySelector(".panel tbody tr")?.click());
  await sleep(1000);
  await snap("12-stanton.png");
  note("stanton", { text: await page.$eval(".focus", (el) => el.textContent.trim()).catch(() => "") });

  const report = { base: BASE, log, searchRows, routeRows, finalUrl: page.url() };
  await writeFile(join(OUT, "REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  console.log("done", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
