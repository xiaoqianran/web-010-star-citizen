#!/usr/bin/env node
/**
 * Human-like leftover pass on the official ARK Starmap.
 * Clicks real HUD, types in real inputs, dumps DOM. Does not save official binaries.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "research", "capture", "official-leftover");
const CHROME = process.env.CHROME || "/usr/bin/google-chrome-stable";
const START = process.env.OFFICIAL_URL || "https://robertsspaceindustries.com/en/starmap";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEARCHES = [
  "Terra",
  "Cassel",
  "Goss",
  "Goss A",
  "Stanton",
  "Sol",
  "Tamsa",
  "ARK",
  "Levski",
  "Area18",
  "Orison",
  "Lorville",
  "Port Renatus",
  "jump",
  "star",
  "the",
  "halo",
  "flotilla",
  "Kayfa",
  "Banu",
  "Vanduul",
  "a",
  "UE",
  "GOSS.STARS.GOSSA",
];

const ROUTE_PAIRS = [
  ["GOSS", "TERRA"],
  ["SOL", "NYX"],
  ["STANTON", "TAMSA"],
  ["KILIAN", "PYRO"],
  ["GOSS", "GOSS"],
  ["Cassel", "Terra"],
  ["BANU", "SOL"],
  ["Goss A", "TERRA"],
];

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
  const network = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("/api/starmap/")) return;
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    network.push({
      url,
      status: res.status(),
      method: res.request().method(),
      post: res.request().postData() || null,
      success: body?.success ?? null,
      code: body?.code ?? null,
      msg: body?.msg ?? null,
      shortest: body?.data?.shortest
        ? { jumps: body.data.shortest.jumps, label: body.data.shortest.label, first_jump: body.data.shortest.first_jump }
        : null,
      leastjumps: body?.data?.leastjumps
        ? { jumps: body.data.leastjumps.jumps, label: body.data.leastjumps.label, first_jump: body.data.leastjumps.first_jump }
        : null,
      find: body?.data?.objects || body?.data?.systems
        ? {
            systems: body.data.systems?.resultset?.length ?? 0,
            objects: body.data.objects?.resultset?.length ?? 0,
          }
        : null,
    });
  });

  const log = [];
  const note = (step, extra = {}) => {
    const row = { t: new Date().toISOString(), step, url: page.url(), ...extra };
    log.push(row);
    console.log(step, extra.text || extra.count || extra.cam || extra.found || extra.error || "");
  };

  const shot = async (name) => {
    const file = join(OUT, `${name}.png`);
    await page.screenshot({ path: file, captureBeyondViewport: false }).catch(() => {});
    return file;
  };

  const dump = async () =>
    page.evaluate(() => {
      const vis = (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
      };
      const textOf = (el) => (el.innerText || el.value || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
      const nodes = [...document.querySelectorAll("button, a, input, label, select, [role=button], [class*='sm-']")];
      const items = [];
      for (const el of nodes) {
        const text = textOf(el).slice(0, 160);
        const cls = typeof el.className === "string" ? el.className : "";
        if (!text && !cls.includes("sm-") && !cls.includes("disc")) continue;
        items.push({
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute("type"),
          checked: el.checked ?? null,
          text,
          cls: cls.slice(0, 180),
          vis: vis(el),
          box: (() => {
            const r = el.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          })(),
        });
      }
      const checks = [...document.querySelectorAll("input[type=checkbox], input[type=radio]")].map((el) => ({
        text: textOf(el.closest("label") || el.parentElement || el).slice(0, 120),
        checked: el.checked,
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 120),
        vis: vis(el),
      }));
      return {
        title: document.title,
        bodyText: (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 4000),
        inputs: [...document.querySelectorAll("input, textarea")].map((el) => ({
          type: el.type,
          name: el.name,
          placeholder: el.placeholder,
          value: el.value,
          vis: vis(el),
          cls: (typeof el.className === "string" ? el.className : "").slice(0, 120),
        })),
        checks,
        items: items.slice(0, 400),
        classesPresent: [
          "sm-galaxy-display-tab",
          "sm-system-display-tab",
          "sm-search-tab",
          "sm-bookmarks-tab",
          "sm-routes-tab",
          "sm-affiliations",
          "sm-scanners",
          "sm-settings",
          "sm-camera-views",
          "sm-departure-region",
          "sm-destination-region",
          "sm-ship-size",
          "sm-lz-open",
          "sm-search-autocomplete",
          "starmap-disc",
          "disc-root__menu",
        ].filter((c) => document.getElementsByClassName(c).length),
      };
    });

  const clickText = async (needles, { exact = false } = {}) => {
    const hit = await page.evaluate((list, exactMatch) => {
      const want = list.map((s) => s.toLowerCase());
      const nodes = [...document.querySelectorAll("button, a, label, [role=button], .launch, .launch-fullscreen")];
      const vis = (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 1 && r.height > 1;
      };
      const hits = [];
      for (const el of nodes) {
        const t = (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
        if (!t || t.length > 80 || !vis(el)) continue;
        const low = t.toLowerCase();
        if (want.some((w) => (exactMatch ? low === w : low === w || low.includes(w)))) {
          hits.push({ el, t, n: t.length });
        }
      }
      hits.sort((a, b) => a.n - b.n);
      if (!hits[0]) return null;
      hits[0].el.click();
      return hits[0].t;
    }, needles, exact);
    await sleep(400);
    return hit;
  };

  const clickClass = async (cls) => {
    const ok = await page.evaluate((c) => {
      const el = document.getElementsByClassName(c)[0];
      if (!el) return false;
      el.click();
      return true;
    }, cls);
    await sleep(400);
    return ok;
  };

  const typeInto = async (value, prefer = []) => {
    let typed = false;
    try {
    typed = await page.evaluate((v, prefs) => {
      const vis = (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 2 && r.height > 2;
      };
      const inputs = [...document.querySelectorAll("input[type=text], input:not([type]), input[type=search], textarea")];
      let el =
        inputs.find((i) => vis(i) && prefs.some((p) => (i.className + i.name + i.placeholder).toLowerCase().includes(p))) ||
        inputs.find((i) => vis(i)) ||
        inputs[0];
      if (!el) return false;
      el.focus();
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      proto.set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "a" }));
      return { cls: el.className, placeholder: el.placeholder, value: el.value };
    }, value, prefer);
    } catch (err) {
      note(`type-fail:${value}`, { error: String(err.message || err) });
      await sleep(800);
    }
    await sleep(500);
    return typed;
  };

  const fillPair = async (from, to) => {
    await page.evaluate(
      (a, b) => {
        const vis = (el) => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.display !== "none" && r.width > 2 && r.height > 2;
        };
        const inputs = [...document.querySelectorAll("input")].filter((i) => i.type !== "checkbox" && i.type !== "radio");
        const shown = inputs.filter(vis);
        const dep =
          shown.find((i) => /depart/i.test(i.className + i.name + i.placeholder + (i.closest("[class*='depart']")?.className || ""))) ||
          shown[0];
        const dest =
          shown.find((i) => i !== dep && /dest/i.test(i.className + i.name + i.placeholder + (i.closest("[class*='dest']")?.className || ""))) ||
          shown[1];
        const set = (el, v) => {
          if (!el) return;
          el.focus();
          const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
          proto.set.call(el, v);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        };
        set(dep, a);
        set(dest, b);
        return { dep: dep?.value, dest: dest?.value, n: shown.length };
      },
      from,
      to,
    );
    await sleep(200);
  };

  await page.goto(START, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(2500);
  await clickText(["allow all", "accept all", "i agree", "got it"]);
  await page.evaluate(() => {
    try {
      localStorage.setItem("skipAcknowledgment", "1");
      localStorage.setItem("skipInfo", "1");
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(2500);
  await clickText(["allow all", "accept all"]);
  const windowHit =
    (await clickClass("launch")) ||
    (await clickText(["or enter in window mode", "enter in window mode"]));
  note("intro:window", { text: String(windowHit) });
  await sleep(1200);
  for (const label of ["acknowledge & continue", "acknowledge", "explore starmap", "don't show this screen next time"]) {
    const hit = await clickText([label]);
    if (hit) note(`intro:${label}`, { text: hit });
    await sleep(700);
  }
  // skip boxes then confirm
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(".sm-acknowledgment-scene input[type=checkbox], .sm-info-scene input[type=checkbox]")) {
      if (!el.checked) el.click();
    }
  });
  await clickText(["acknowledge & continue", "acknowledge"]);
  await sleep(700);
  await clickText(["explore starmap", "explore"]);
  await page
    .waitForFunction(
      () =>
        !!document.querySelector(".sm-search-tab, .sm-tabs, .launch") === false &&
        /SEARCH|ROUTES|DISPLAY/i.test(document.body.innerText),
      { timeout: 45000 },
    )
    .catch(() => {});
  await sleep(1500);
  await shot("01-after-intro");
  const firstDump = await dump();
  await writeFile(join(OUT, "dump-after-intro.json"), JSON.stringify(firstDump, null, 2) + "\n");
  note("intro-dump", { found: firstDump.classesPresent.join(",") || "none", text: firstDump.bodyText.slice(0, 180) });

  // Galaxy first — DISPLAY checkboxes live on sm-galaxy-display-tab.
  const glx = (await clickText(["glx", "galaxy"], { exact: false })) || (await clickClass("sm-back"));
  note("click-galaxy", { text: String(glx) });
  await sleep(800);
  await shot("02-galaxy");

  const displayHit =
    (await clickClass("sm-galaxy-display-tab")) ||
    (await clickText(["display"])) ||
    (await clickClass("sm-system-display-tab"));
  note("click-display", { text: String(displayHit) });
  await sleep(800);
  await shot("03-display");
  const displayDump = await dump();
  await writeFile(join(OUT, "dump-display.json"), JSON.stringify(displayDump, null, 2) + "\n");
  note("display-dump", {
    found: `${displayDump.checks.length} checks; classes=${displayDump.classesPresent.join(",")}`,
    text: displayDump.checks.map((c) => `${c.text}:${c.checked}`).join(" | ").slice(0, 300),
  });

  const checkToggles = [];
  const CHECK_SEL =
    "#starmap-application input[type=checkbox], .sm-starmap input[type=checkbox], .sm-galaxy-display-tab input[type=checkbox], .sm-system-display-tab input[type=checkbox], .sm-affiliations input, .sm-scanners input";
  const checkCount = await page.evaluate((sel) => document.querySelectorAll(sel).length, CHECK_SEL);
  for (let i = 0; i < checkCount; i++) {
    const before = await page.evaluate((idx, sel) => {
      const el = document.querySelectorAll(sel)[idx];
      if (!el) return null;
      const label = (el.closest("label")?.innerText || el.parentElement?.innerText || "").replace(/\s+/g, " ").trim();
      return { label, checked: el.checked };
    }, i, CHECK_SEL);
    await page.evaluate((idx, sel) => {
      document.querySelectorAll(sel)[idx]?.click();
    }, i, CHECK_SEL);
    await sleep(350);
    const after = await page.evaluate((idx, sel) => document.querySelectorAll(sel)[idx]?.checked ?? null, i, CHECK_SEL);
    if (before) {
      checkToggles.push({ ...before, after });
      note(`display-toggle:${before.label}`, { text: `${before.checked} -> ${after}` });
    }
    await shot(`04-display-${i}`);
    await page.evaluate((idx, sel) => {
      const el = document.querySelectorAll(sel)[idx];
      if (el && el.checked !== true) el.click();
    }, i, CHECK_SEL);
    await sleep(150);
  }

  const searchHit = (await clickClass("sm-search-tab")) || (await clickText(["search"]));
  note("click-search", { text: String(searchHit) });
  await sleep(500);
  const searchTable = [];
  for (const q of SEARCHES) {
    const typed = await typeInto(q, ["search", "filter", "query"]);
    await sleep(700);
    const table = await page.evaluate(() => {
      const found = (document.body.innerText.match(/(\d+)\s+ITEMS FOUND/i) || [])[1] || null;
      const rows = [...document.querySelectorAll("tr")].slice(1, 8).map((tr) =>
        [...tr.children].map((td) => td.innerText.replace(/\s+/g, " ").trim()).filter(Boolean),
      );
      return { found, rows, bodySlice: document.body.innerText.replace(/\s+/g, " ").slice(0, 500) };
    });
    searchTable.push({ q, typed, ...table });
    note(`search:${q}`, { count: table.found || table.rows.length });
  }
  await shot("05-search-last");

  const terraRow = await page.evaluate(() => {
    const tr = [...document.querySelectorAll("tr")].find((r) => /terra/i.test(r.innerText) && /star system/i.test(r.innerText));
    tr?.click();
    return tr ? tr.innerText.replace(/\s+/g, " ").trim() : null;
  });
  note("click-terra-system", { text: terraRow || "none" });
  await sleep(1200);
  await shot("06-terra-system");

  await typeInto("Cassel", ["search"]);
  await sleep(700);
  const cassel = await page.evaluate(() => {
    const tr = [...document.querySelectorAll("tr")].find((r) => /cassel/i.test(r.innerText));
    tr?.click();
    return tr ? tr.innerText.replace(/\s+/g, " ").trim() : null;
  });
  note("click-cassel", { text: cassel || "none" });
  await sleep(1000);
  await shot("07-cassel-disc");
  const discDump = await dump();
  await writeFile(join(OUT, "dump-disc.json"), JSON.stringify(discDump, null, 2) + "\n");

  for (const pageName of ["information", "routing", "bookmark", "man-made", "voice-overs", "set as departure", "set as destination", "open", "jump"]) {
    const hit = await clickText([pageName]);
    if (hit) note(`disc:${pageName}`, { text: hit });
  }
  await shot("08-disc-pages");

  const routesHit = (await clickClass("sm-routes-tab")) || (await clickText(["routes"]));
  note("click-routes", { text: String(routesHit) });
  await sleep(500);
  await shot("09-routes");
  const routeLog = [];
  for (const [from, to] of ROUTE_PAIRS) {
    await fillPair(from, to);
    const calc = (await clickText(["calculate"])) || (await clickClass("sm-go"));
    await sleep(900);
    const ui = await page.evaluate(() => {
      const text = document.body.innerText.replace(/\s+/g, " ");
      const jumps = text.match(/(\d+)\s+JUMP/i);
      const through = text.match(/THROUGH [A-Z][A-Za-z' ]+/);
      const err = text.match(/invalid object|no route|no routes found[^.]*/i);
      return {
        jumps: jumps?.[1] || null,
        through: through?.[0] || null,
        err: err?.[0] || null,
        hasShortest: /shortest|least jump/i.test(text),
        slice: text.slice(0, 700),
      };
    });
    routeLog.push({ from, to, calc, ui });
    note(`route:${from}-${to}`, { text: ui.through || ui.err || ui.jumps || "no-ui" });
    await shot(`10-route-${from}-${to}`.replace(/\s+/g, ""));
    if (from === "SOL" && to === "NYX") {
      for (const mode of ["shortest", "least jumps", "leastjumps"]) {
        const hit = await clickText([mode]);
        if (hit) {
          await sleep(400);
          const after = await page.evaluate(() => document.body.innerText.match(/(\d+)\s+JUMP/i)?.[1] || null);
          note(`route-mode:${mode}`, { text: after });
        }
      }
      for (const sz of ["small", "medium", "large", "s", "m", "l"]) {
        await clickText([sz], { exact: sz.length === 1 });
      }
    }
  }

  const marks = (await clickClass("sm-bookmarks-tab")) || (await clickText(["bookmarks"]));
  note("click-bookmarks", { text: String(marks) });
  await sleep(400);
  const bookmarkText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 800));
  await shot("11-bookmarks");

  await page.mouse.click(960, 420);
  await sleep(200);
  const keys = ["w", "a", "s", "d", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-", "Escape", "f", "2", "3", "q", "e", " ", "Tab", "Enter", "r"];
  const keyLog = [];
  for (const key of keys) {
    const before = new URL(page.url()).searchParams.get("camera");
    await page.keyboard.press(key);
    await sleep(250);
    const after = new URL(page.url()).searchParams.get("camera");
    keyLog.push({ key, before, after, changed: before !== after, url: page.url() });
    if (before !== after) note(`key:${key}`, { cam: `${before} -> ${after}` });
  }
  await page.mouse.click(1100, 400, { button: "right" });
  await sleep(200);
  await page.mouse.click(1100, 400, { button: "middle" });
  await sleep(200);
  const beforeDrag = new URL(page.url()).searchParams.get("camera");
  await page.mouse.move(900, 400);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(1040, 430, { steps: 8 });
  await page.mouse.up();
  await sleep(400);
  const afterDrag = new URL(page.url()).searchParams.get("camera");
  note("left-drag", { cam: `${beforeDrag} -> ${afterDrag}` });

  for (const label of ["2d", "3d", "sensors", "camera", "star citizen"]) {
    const hit = await clickText([label]);
    if (hit) {
      note(`hud:${label}`, { text: hit, cam: new URL(page.url()).searchParams.get("camera") });
      await shot(`12-${label}`);
    }
  }
  await clickClass("sm-camera-views");
  await sleep(300);
  await shot("13-camera-views");

  const lastDump = await dump();
  await writeFile(join(OUT, "dump-final.json"), JSON.stringify(lastDump, null, 2) + "\n");
  const report = {
    capturedAt: new Date().toISOString(),
    start: START,
    log,
    searchTable,
    routeLog,
    checkToggles,
    keyLog,
    bookmarkText: bookmarkText.slice(0, 500),
    classesAfterIntro: firstDump.classesPresent,
    classesDisplay: displayDump.classesPresent,
    classesFinal: lastDump.classesPresent,
    network,
  };
  await writeFile(join(OUT, "REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  console.log("wrote", join(OUT, "REPORT.json"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
