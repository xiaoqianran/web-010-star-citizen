#!/usr/bin/env node
/**
 * Official HUD pass for remaining restore gaps:
 * search STAR SYSTEM camera, galaxy-view CALCULATE table, empty-click parent.
 * Clicks real HUD only. Does not save official binaries. PNGs are gitignored.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "research", "capture", "official-restore");
const CHROME = process.env.CHROME || "/usr/bin/google-chrome-stable";
const START = process.env.OFFICIAL_URL || "https://robertsspaceindustries.com/en/starmap";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-blink-features=AutomationControlled",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--window-size=1920,1080",
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  );
  const log = [];
  const note = (step, extra = {}) => {
    const row = { t: new Date().toISOString(), step, url: page.url(), ...extra };
    log.push(row);
    console.log(step, extra.text || extra.cam || extra.found || "");
  };

  const clickText = async (needles) => {
    return page.evaluate((list) => {
      const nodes = [...document.querySelectorAll("button, a, label, span, div")];
      for (const needle of list) {
        const hit = nodes.find((el) => (el.innerText || "").trim().toLowerCase() === needle.toLowerCase());
        if (hit) {
          hit.click();
          return hit.innerText.trim();
        }
      }
      return null;
    }, needles);
  };
  const clickClass = async (cls) => {
    return page.evaluate((name) => {
      const el = document.querySelector(`.${name}`);
      if (!el) return false;
      el.click();
      return true;
    }, cls);
  };
  const dumpHud = async () =>
    page.evaluate(() => {
      const items = [...document.querySelectorAll("th, td, .sm-jumps, .sm-distance, .sm-label, .sm-list-region, .sm-table-container, .sm-routes-tab")].map(
        (el) => ({
          tag: el.tagName.toLowerCase(),
          cls: el.className,
          vis: el.getClientRects().length > 0,
          text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 180),
          box: (() => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          })(),
        }),
      );
      return {
        href: location.href,
        camera: new URL(location.href).searchParams.get("camera"),
        location: new URL(location.href).searchParams.get("location"),
        selection: new URL(location.href).searchParams.get("selection"),
        bodyText: document.body.innerText.replace(/\s+/g, " ").slice(0, 900),
        items,
      };
    });

  await page.goto(START, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.evaluate(() => {
    try {
      localStorage.setItem("skipAcknowledgment", "1");
      localStorage.setItem("skipInfo", "1");
    } catch {
      /* ignore */
    }
  });
  await sleep(2500);
  const win = (await clickClass("launch")) || (await clickText(["or enter in window mode", "enter in window mode"]));
  note("intro:window", { text: String(win) });
  await sleep(8000);

  const glx = (await clickText(["glx"])) || (await clickText(["galaxy"]));
  note("glx", { text: String(glx) });
  await sleep(800);

  const search = (await clickClass("sm-search-tab")) || (await clickText(["search"]));
  note("search-tab", { text: String(search) });
  await sleep(400);
  await page.evaluate(() => {
    const input = document.querySelector('input[type="search"], input[name="query"], input');
    if (!input) return;
    input.focus();
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    proto.set.call(input, "Terra");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.keyboard.press("Enter");
  await sleep(1200);
  const terraRow = await page.evaluate(() => {
    const tr = [...document.querySelectorAll("tr")].find((r) => /terra/i.test(r.innerText) && /star system/i.test(r.innerText));
    tr?.click();
    return tr ? tr.innerText.replace(/\s+/g, " ").trim() : null;
  });
  await sleep(2000);
  const afterSearch = await dumpHud();
  note("search-terra-system", { text: terraRow || "none", cam: afterSearch.camera, location: afterSearch.location });
  await writeFile(join(OUT, "dump-search-terra.json"), JSON.stringify(afterSearch, null, 2) + "\n");
  await page.screenshot({ path: join(OUT, "01-search-terra.png") }).catch(() => undefined);

  await page.mouse.click(200, 420);
  await sleep(800);
  const afterEmpty = await dumpHud();
  note("empty-click-system", { cam: afterEmpty.camera, location: afterEmpty.location });
  await writeFile(join(OUT, "dump-empty-click.json"), JSON.stringify(afterEmpty, null, 2) + "\n");

  const glx2 = await clickText(["glx"]);
  note("glx-again", { text: String(glx2) });
  await sleep(600);
  const routes = (await clickClass("sm-routes-tab")) || (await clickText(["routes"]));
  note("routes-tab", { text: String(routes) });
  await sleep(500);
  await page.evaluate(() => {
    const inputs = [...document.querySelectorAll("input")].filter((i) => i.type !== "checkbox" && i.type !== "radio" && i.type !== "search");
    const set = (el, v) => {
      if (!el) return;
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      proto.set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set(inputs[0], "GOSS");
    set(inputs[1], "TERRA");
  });
  const calc = (await clickText(["calculate"])) || (await clickClass("sm-go"));
  note("calculate", { text: String(calc) });
  await sleep(4000);
  const afterCalc = await dumpHud();
  note("calculate-galaxy", {
    found: afterCalc.items.filter((i) => i.vis && i.text).map((i) => `${i.cls}:${i.text}`).slice(0, 12).join(" | "),
  });
  await writeFile(join(OUT, "dump-calculate.json"), JSON.stringify(afterCalc, null, 2) + "\n");
  await page.screenshot({ path: join(OUT, "02-calculate.png") }).catch(() => undefined);

  const large = (await clickText(["large"])) || (await clickText(["l"]));
  note("ship-size-l", { text: String(large) });
  await sleep(3500);
  const afterL = await dumpHud();
  note("calculate-l", {
    found: afterL.items.filter((i) => i.vis && i.text).map((i) => `${i.cls}:${i.text}`).slice(0, 12).join(" | "),
  });
  await writeFile(join(OUT, "dump-calculate-l.json"), JSON.stringify(afterL, null, 2) + "\n");
  await page.screenshot({ path: join(OUT, "03-calculate-l.png") }).catch(() => undefined);

  const summary = {
    capturedAt: new Date().toISOString(),
    searchTerra: { row: terraRow, camera: afterSearch.camera, location: afterSearch.location, selection: afterSearch.selection },
    emptyClick: { camera: afterEmpty.camera, location: afterEmpty.location },
    calculate: {
      camera: afterCalc.camera,
      jumps: (afterCalc.bodyText.match(/(\d+)\s+JUMP/i) || [])[1] || null,
      through: (afterCalc.bodyText.match(/THROUGH [A-Z][A-Za-z' ]+/) || [])[0] || null,
      visibleTh: afterCalc.items.filter((i) => i.tag === "th" && i.vis).map((i) => ({ cls: i.cls, text: i.text, box: i.box })),
    },
    calculateL: {
      camera: afterL.camera,
      jumps: (afterL.bodyText.match(/(\d+)\s+JUMP/i) || [])[1] || null,
      through: (afterL.bodyText.match(/THROUGH [A-Z][A-Za-z' ]+/) || [])[0] || null,
    },
    log,
  };
  await writeFile(join(OUT, "SUMMARY.json"), JSON.stringify(summary, null, 2) + "\n");
  await writeFile(
    join(OUT, "SUMMARY.md"),
    `# Official restore pass\n\nCaptured: ${summary.capturedAt}\n\n- Search Terra STAR SYSTEM → location=${summary.searchTerra.location} camera=${summary.searchTerra.camera}\n- Empty click after that → location=${summary.emptyClick.location} camera=${summary.emptyClick.camera}\n- Galaxy CALCULATE JUMP=${summary.calculate.jumps} ${summary.calculate.through || ""}\n- Galaxy CALCULATE ship LARGE JUMP=${summary.calculateL.jumps} ${summary.calculateL.through || ""}\n`,
  );
  await browser.close();
  console.log("wrote", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
