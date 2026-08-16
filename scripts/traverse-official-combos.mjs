#!/usr/bin/env node
/**
 * Re-record official ARK Starmap button combinations that earlier
 * leftover / window-mode passes missed. Clicks real HUD only.
 * Does not download official binaries.
 *
 * Covers: right-click INSPECT menu, search+Enter, Calculate wait,
 * system DISPLAY, canvas-focused keys, compass/2D, disc pages.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "research", "capture", "official-combos");
const CHROME = process.env.CHROME || "/usr/bin/google-chrome-stable";
const START = process.env.OFFICIAL_URL || "https://robertsspaceindustries.com/en/starmap";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEARCH_ENTER = ["Terra", "Cassel", "jump", "Goss A", "ARK", "a", "Kayfa", "Levski"];
const ROUTE_PAIRS = [
  ["GOSS", "TERRA"],
  ["SOL", "NYX"],
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
    console.log(step, extra.text || extra.cam || extra.found || extra.error || extra.count || "");
  };

  const shot = async (name) => {
    const file = join(OUT, `${name}.png`);
    await page.screenshot({ path: file, captureBeyondViewport: false }).catch(() => {});
    return file;
  };

  const cam = () => new URL(page.url()).searchParams.get("camera");
  const loc = () => new URL(page.url()).searchParams.get("location");

  const dump = async () => {
    try {
      return await page.evaluate(() => {
      const vis = (el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 1 && Number(s.opacity || 1) > 0.05;
      };
      const textOf = (el) => (el.innerText || el.value || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
      const nodes = [...document.querySelectorAll("button, a, input, label, select, [role=button], [class*='sm-'], [class*='disc']")];
      const items = [];
      for (const el of nodes) {
        const text = textOf(el).slice(0, 160);
        const cls = typeof el.className === "string" ? el.className : "";
        if (!text && !/sm-|disc/.test(cls)) continue;
        const r = el.getBoundingClientRect();
        items.push({
          tag: el.tagName.toLowerCase(),
          text,
          cls: cls.slice(0, 160),
          vis: vis(el),
          opacity: getComputedStyle(el).opacity,
          box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        });
      }
      const menuWords = ["INSPECT", "INFORMATION", "ROUTING", "BOOKMARK", "SET AS", "AVOID", "CONTROL DISC"];
      const menu = items.filter((i) => i.vis && menuWords.some((w) => i.text.toUpperCase().includes(w)));
      return {
        title: document.title,
        bodyText: (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 3500),
        href: location.href,
        menu,
        items: items.filter((i) => i.vis).slice(0, 280),
        classesPresent: [
          "sm-galaxy-display-tab",
          "sm-system-display-tab",
          "sm-search-tab",
          "sm-bookmarks-tab",
          "sm-routes-tab",
          "sm-affiliations",
          "sm-scanners",
          "sm-search-autocomplete",
          "sm-lz-open",
          "sm-next-segment",
          "sm-go",
          "starmap-disc",
          "disc-root__menu",
        ].filter((c) => document.getElementsByClassName(c).length),
      };
      });
    } catch (err) {
      return {
        title: "",
        bodyText: "",
        href: page.url(),
        menu: [],
        items: [],
        classesPresent: [],
        error: String(err.message || err),
      };
    }
  };

  const clickText = async (needles, { exact = false } = {}) => {
    const hit = await page.evaluate(
      (list, exactMatch) => {
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
      },
      needles,
      exact,
    );
    await sleep(350);
    return hit;
  };

  const clickClass = async (cls) => {
    const ok = await page.evaluate((c) => {
      const el = document.getElementsByClassName(c)[0];
      if (!el) return false;
      el.click();
      return true;
    }, cls);
    await sleep(350);
    return ok;
  };

  const closeTabs = async () => {
    await page.evaluate(() => {
      const on = document.querySelector(".sm-tabs .sm-active a, .sm-tabs li.sm-active a, .tab.on");
      if (on) on.click();
    });
    await sleep(200);
  };

  const typeInto = async (value, prefer = []) => {
    const typed = await page
      .evaluate((v, prefs) => {
        const vis = (el) => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.display !== "none" && s.visibility !== "hidden" && r.width > 2 && r.height > 2;
        };
        const inputs = [...document.querySelectorAll("input[type=text], input:not([type]), input[type=search], textarea")];
        const el =
          inputs.find((i) => vis(i) && prefs.some((p) => (i.className + i.name + i.placeholder).toLowerCase().includes(p))) ||
          inputs.find((i) => vis(i));
        if (!el) return null;
        el.focus();
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        proto.set.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return { cls: el.className, placeholder: el.placeholder, value: el.value };
      }, value, prefer)
      .catch(() => null);
    await sleep(250);
    return typed;
  };

  const fillPair = async (from, to) => {
    await page.evaluate((a, b) => {
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
    }, from, to);
    await sleep(200);
  };

  const menuSnapshot = async () => {
    const d = await dump();
    return {
      href: d.href,
      cam: cam(),
      loc: loc(),
      classes: d.classesPresent,
      menu: d.menu,
      bodySlice: d.bodyText.slice(0, 500),
    };
  };

  await page.goto(START, { waitUntil: "domcontentloaded", timeout: 90000 });
  await sleep(2200);
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
  await sleep(2200);
  await clickText(["allow all", "accept all"]);
  await page.click("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll", { delay: 40 }).catch(() => {});
  await page.click("button.CybotCookiebotBannerCloseButton", { delay: 40 }).catch(() => {});
  await sleep(300);
  let windowHit = false;
  try {
    await page.click("button.launch", { delay: 50 });
    windowHit = "button.launch";
  } catch {
    windowHit = (await clickClass("launch")) || (await clickText(["or enter in window mode", "enter in window mode"]));
  }
  note("intro:window", { text: String(windowHit) });
  await sleep(1000);
  for (const label of ["acknowledge & continue", "acknowledge", "explore starmap", "don't show this screen next time"]) {
    const hit = await clickText([label]);
    if (hit) note(`intro:${label}`, { text: hit });
    await sleep(500);
  }
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(".sm-acknowledgment-scene input[type=checkbox], .sm-info-scene input[type=checkbox]")) {
      if (!el.checked) el.click();
    }
  });
  await clickText(["acknowledge & continue", "acknowledge"]);
  await sleep(500);
  await clickText(["explore starmap", "explore"]);
  await page
    .waitForFunction(() => /SEARCH|ROUTES|DISPLAY/i.test(document.body.innerText), { timeout: 45000 })
    .catch(() => {});
  await sleep(1200);
  await shot("01-after-intro");
  const afterIntro = await menuSnapshot();
  await writeFile(join(OUT, "dump-after-intro.json"), JSON.stringify(await dump(), null, 2) + "\n");
  note("intro-menu", { found: afterIntro.menu.map((m) => m.text).join(" | ") || "none", cam: afterIntro.cam });

  // Stay in galaxy. Close leftover DISPLAY if it opened by default.
  const glx = (await clickText(["glx"], { exact: false })) || (await clickClass("sm-back"));
  note("click-galaxy", { text: String(glx), cam: cam() });
  await closeTabs();
  await sleep(400);
  await shot("02-galaxy-plain");

  // Right-click grid: empty space + likely system nodes.
  const rightClicks = [];
  const points = [
    [960, 420, "center"],
    [700, 380, "left-mid"],
    [1180, 400, "right-mid"],
    [960, 300, "above-center"],
    [860, 460, "sol-ish"],
    [1100, 480, "lower-right"],
    [400, 240, "inspect-dom-slot"],
  ];
  for (const [x, y, label] of points) {
    await page.mouse.click(x, y, { button: "right" });
    await sleep(450);
    const snap = await menuSnapshot();
    rightClicks.push({ label, x, y, ...snap });
    note(`right:${label}`, { text: snap.menu.map((m) => m.text).join(" | ") || "no-menu", cam: snap.cam });
    await shot(`03-right-${label}`);
    const inspect = await clickText(["inspect"], { exact: true });
    if (inspect) {
      await sleep(900);
      note(`right:${label}:inspect`, { text: inspect, cam: cam(), found: loc() });
      await shot(`04-inspect-after-${label}`);
    }
    await page.mouse.click(80, 200, { button: "left" });
    await sleep(200);
  }

  // Left-click then look for CONTROL DISC / INSPECT.
  await page.mouse.click(860, 460, { button: "left" });
  await sleep(600);
  const afterLeft = await menuSnapshot();
  note("left-sol-ish", { text: afterLeft.menu.map((m) => m.text).join(" | ") || "no-menu", cam: afterLeft.cam });
  await shot("05-left-click");
  for (const name of ["inspect", "information", "routing", "bookmark", "set as departure", "set as destination", "avoid", "man-made", "voice-overs", "open"]) {
    const hit = await clickText([name]);
    if (hit) note(`disc:${name}`, { text: hit, cam: cam() });
  }
  await shot("06-disc-pages");
  await writeFile(join(OUT, "dump-disc.json"), JSON.stringify(await dump(), null, 2) + "\n");

  // Search + Enter (official table often needs submit).
  const searchHit = (await clickClass("sm-search-tab")) || (await clickText(["search"]));
  note("click-search", { text: String(searchHit) });
  await sleep(400);
  const searchLog = [];
  for (const q of SEARCH_ENTER) {
    const typed = await typeInto(q, ["search", "filter", "query"]);
    await page.keyboard.press("Enter");
    await sleep(900);
    const table = await page.evaluate(() => {
      const text = document.body.innerText.replace(/\s+/g, " ");
      const found = (text.match(/(\d+)\s+ITEMS FOUND/i) || [])[1] || null;
      const empty = /NO OBJECTS FOUND WITH FILTERS/i.test(text);
      const auto = [...document.querySelectorAll(".sm-search-autocomplete li, .sm-search-autocomplete a")].map((el) =>
        el.innerText.replace(/\s+/g, " ").trim(),
      );
      const rows = [...document.querySelectorAll("tr")]
        .slice(1, 8)
        .map((tr) => [...tr.children].map((td) => td.innerText.replace(/\s+/g, " ").trim()).filter(Boolean));
      return { found, empty, auto, rows, slice: text.slice(0, 420) };
    });
    searchLog.push({ q, typed, ...table });
    note(`search-enter:${q}`, { count: table.found || (table.empty ? "empty" : table.rows.length) });
    await shot(`07-search-${q.replace(/\s+/g, "")}`);
  }

  // Empty field autocomplete.
  await typeInto("", ["search"]);
  await page.keyboard.press("Backspace");
  await sleep(400);
  const autoEmpty = await page.evaluate(() =>
    [...document.querySelectorAll(".sm-search-autocomplete li, .sm-search-autocomplete a, [class*='auto'] li")].map((el) =>
      el.innerText.replace(/\s+/g, " ").trim(),
    ),
  );
  note("search-autocomplete-empty", { text: autoEmpty.join(" | ") || "none" });
  await shot("08-search-empty-auto");

  await typeInto("Terra", ["search"]);
  await page.keyboard.press("Enter");
  await sleep(800);
  const terra = await page.evaluate(() => {
    const tr = [...document.querySelectorAll("tr")].find((r) => /terra/i.test(r.innerText) && /star system/i.test(r.innerText));
    tr?.click();
    return tr ? tr.innerText.replace(/\s+/g, " ").trim() : null;
  });
  note("enter-terra-system", { text: terra || "none", cam: cam(), found: loc() });
  await sleep(1400);
  await shot("09-terra-system");

  // System-view DISPLAY (different class from galaxy bar).
  await closeTabs();
  const sysDisplay =
    (await clickClass("sm-system-display-tab")) || (await clickText(["display"])) || (await clickClass("sm-galaxy-display-tab"));
  note("system-display", { text: String(sysDisplay), found: loc() });
  await sleep(700);
  const sysDisplayDump = await dump();
  await writeFile(join(OUT, "dump-system-display.json"), JSON.stringify(sysDisplayDump, null, 2) + "\n");
  note("system-display-dump", {
    found: sysDisplayDump.classesPresent.join(","),
    text: sysDisplayDump.bodyText.slice(0, 280),
  });
  await shot("10-system-display");

  // Right-click inside system view.
  await closeTabs();
  await page.mouse.click(960, 420, { button: "right" });
  await sleep(500);
  const sysRight = await menuSnapshot();
  note("right-system-view", { text: sysRight.menu.map((m) => m.text).join(" | ") || "no-menu", cam: sysRight.cam });
  await shot("11-right-system");
  const sysInspect = await clickText(["inspect"], { exact: true });
  if (sysInspect) {
    await sleep(900);
    note("right-system-inspect", { text: sysInspect, cam: cam(), found: loc() });
    await shot("12-system-inspect");
  }

  // Double-click a likely jump / body.
  const beforeDbl = { cam: cam(), loc: loc() };
  await page.mouse.click(1000, 440, { button: "left", clickCount: 2 });
  await sleep(800);
  note("double-click-system", { cam: `${beforeDbl.cam} -> ${cam()}`, found: `${beforeDbl.loc} -> ${loc()}` });
  await shot("13-double-click");

  // Routes: Calculate and wait for the result table.
  const routesHit = (await clickClass("sm-routes-tab")) || (await clickText(["routes"]));
  note("click-routes", { text: String(routesHit) });
  await sleep(400);
  const routeLog = [];
  for (const [from, to] of ROUTE_PAIRS) {
    await fillPair(from, to);
    const calc = (await clickText(["calculate"])) || (await clickClass("sm-go"));
    await sleep(3200);
    const ui = await page.evaluate(() => {
      const text = document.body.innerText.replace(/\s+/g, " ");
      return {
        jumps: (text.match(/(\d+)\s+JUMP/i) || [])[1] || null,
        through: (text.match(/THROUGH [A-Z][A-Za-z' ]+/) || [])[0] || null,
        err: (text.match(/invalid object|no route|no routes found[^.]*/i) || [])[0] || null,
        hasShortest: /shortest|least jump/i.test(text),
        hasView: /view route|next segment|previous segment/i.test(text),
        slice: text.slice(0, 800),
      };
    });
    routeLog.push({ from, to, calc, ui, cam: cam() });
    note(`route:${from}-${to}`, { text: ui.through || ui.err || ui.jumps || (ui.hasShortest ? "modes" : "no-ui") });
    await shot(`14-route-${from}-${to}`.replace(/\s+/g, ""));
    if (from === "GOSS" && to === "TERRA") {
      for (const mode of ["shortest", "least jumps", "leastjumps", "view route"]) {
        const hit = await clickText([mode]);
        if (hit) {
          await sleep(400);
          note(`route-mode:${mode}`, { text: hit, cam: cam() });
        }
      }
      for (const sz of ["small", "medium", "large"]) {
        await clickText([sz]);
        const recalc = (await clickText(["calculate"])) || (await clickClass("sm-go"));
        await sleep(1600);
        note(`route-size:${sz}`, { text: String(recalc) });
      }
      await shot("15-route-goss-terra-modes");
    }
  }
  await writeFile(join(OUT, "dump-routes.json"), JSON.stringify(await dump(), null, 2) + "\n");

  // Compass / 2D / 3D with tabs closed so keys hit the canvas.
  await closeTabs();
  await clickText(["glx"]);
  await sleep(400);
  await closeTabs();
  await page.mouse.click(960, 400);
  await sleep(200);
  const beforeCompass = cam();
  const compass = (await clickText(["star citizen"])) || (await clickClass("sm-compass"));
  await sleep(500);
  note("compass-galaxy", { text: String(compass), cam: `${beforeCompass} -> ${cam()}` });
  await shot("16-compass-galaxy");

  const view2d = await clickText(["2d"], { exact: true });
  await sleep(500);
  note("view-2d", { text: String(view2d), cam: cam() });
  await shot("17-2d");
  const view3d = await clickText(["3d"], { exact: true });
  await sleep(400);
  note("view-3d", { text: String(view3d), cam: cam() });

  // Keyboard only after focusing the WebGL canvas.
  await closeTabs();
  await page.evaluate(() => {
    const c = document.querySelector("#starmap-application canvas, canvas");
    c?.focus();
    c?.click();
  });
  await page.mouse.click(960, 390);
  await sleep(200);
  const keyLog = [];
  for (const key of ["w", "a", "s", "d", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "-", "Escape", "2", "3", "f"]) {
    const before = cam();
    await page.keyboard.press(key);
    await sleep(280);
    const after = cam();
    keyLog.push({ key, before, after, changed: before !== after, loc: loc() });
    if (before !== after) note(`key:${key}`, { cam: `${before} -> ${after}` });
  }
  await shot("18-after-keys");

  await page.mouse.click(1000, 400, { button: "middle" });
  await sleep(200);
  const beforeDrag = cam();
  await page.mouse.move(900, 380);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(1040, 420, { steps: 8 });
  await page.mouse.up();
  await sleep(400);
  note("left-drag", { cam: `${beforeDrag} -> ${cam()}` });

  const last = await dump();
  await writeFile(join(OUT, "dump-final.json"), JSON.stringify(last, null, 2) + "\n");
  const report = {
    capturedAt: new Date().toISOString(),
    start: START,
    method: "official-combos-untested",
    log,
    afterIntro,
    rightClicks,
    afterLeft,
    searchLog,
    autoEmpty,
    sysRight,
    routeLog,
    keyLog,
    classesFinal: last.classesPresent,
    network,
  };
  await writeFile(join(OUT, "REPORT.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(join(OUT, "SUMMARY.md"), summarize(report));
  await browser.close();
  console.log("wrote", join(OUT, "REPORT.json"));
}

function summarize(report) {
  const lines = [
    "# Official untested-combo pass",
    "",
    `Captured: ${report.capturedAt}`,
    "",
    "## Right-click menus",
    "",
  ];
  for (const row of report.rightClicks || []) {
    lines.push(`- ${row.label} (${row.x},${row.y}): ${row.menu.map((m) => m.text).join(" / ") || "no visible menu"} cam=${row.cam}`);
  }
  lines.push("", "## Search + Enter", "");
  for (const row of report.searchLog || []) {
    lines.push(`- \`${row.q}\`: found=${row.found || (row.empty ? "NO OBJECTS FOUND WITH FILTERS" : "?")} auto=${(row.auto || []).join(",")}`);
  }
  lines.push("", "## Routes after 3s", "");
  for (const row of report.routeLog || []) {
    lines.push(`- ${row.from}→${row.to}: ${row.ui.through || row.ui.err || row.ui.jumps || "no-ui"} shortest=${row.ui.hasShortest} view=${row.ui.hasView}`);
  }
  const changed = (report.keyLog || []).filter((k) => k.changed);
  lines.push("", "## Canvas keys that changed camera", "");
  lines.push(changed.length ? changed.map((k) => `${k.key}: ${k.before} → ${k.after}`).join("\n") : "(none)");
  lines.push("");
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
