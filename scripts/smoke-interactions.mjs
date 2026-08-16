#!/usr/bin/env node
/**
 * Fast interaction smoke: intro must not hang, HUD tabs/inputs/routes/camera must respond.
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.CLONE_URL || "http://127.0.0.1:4173/";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome-stable";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fail = (msg) => {
  console.error("FAIL", msg);
  process.exitCode = 1;
};

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--window-size=1400,900",
    ],
    defaultViewport: { width: 1400, height: 900 },
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  const click = async (sel) => {
    const ok = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      el.click();
      return true;
    }, sel);
    await sleep(80);
    return ok;
  };
  const setInput = async (sel, value) => {
    return page.evaluate((s, v) => {
      const i = document.querySelector(s);
      if (!i) return false;
      const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      proto.set.call(i, v);
      i.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }, sel, value);
  };

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  if (!(await click(".window-link"))) fail("window enter missing");
  if (!(await page.$(".quote"))) fail("ack screen missing after window enter");
  if (!(await click(".cta"))) fail("acknowledge missing");
  if (!(await page.$(".lore"))) fail("lore screen missing");
  if (!(await click(".cta"))) fail("explore missing");
  await page.waitForSelector(".hud[data-ready='1']", { timeout: 12000 });
  if (!(await page.$("canvas"))) fail("webgl canvas missing");

  if (!(await click('[data-tab="search"]'))) fail("search tab");
  if (!(await click('[data-tab="search"]'))) fail("search tab stay");
  if (!(await page.$("[data-search]"))) fail("search input missing after second tab click");
  await setInput("[data-search]", "Te");
  if (!(await page.$('[data-search-hint="short"]'))) fail("short search hint missing");
  await setInput("[data-search]", "Terra");
  await page.focus("[data-search]");
  await page.keyboard.press("Enter");
  await sleep(80);
  const found = await page.$eval("[data-found]", (el) => Number(el.getAttribute("data-found")));
  if (found !== 26) fail(`search Terra found ${found}, official is 26`);
  await setInput("[data-search]", "Kayfa");
  await page.focus("[data-search]");
  await page.keyboard.press("Enter");
  await sleep(80);
  const kayfa = await page.$eval("[data-found]", (el) => Number(el.getAttribute("data-found")));
  if (kayfa !== 9) fail(`search Kayfa found ${kayfa}, official is 9`);
  const kayfaSys = await page.evaluate(() =>
    [...document.querySelectorAll(".panel tbody tr")].some((tr) => tr.children[1]?.textContent.includes("星系")),
  );
  if (kayfaSys) fail("Kayfa must not include a STAR SYSTEM row");

  await page.mouse.click(200, 360);
  await sleep(60);
  const afterBlur = await page.evaluate(() => document.activeElement?.tagName);
  if (afterBlur === "INPUT") fail("canvas click did not blur search");

  if (!(await page.$("[data-search]")) && !(await click('[data-tab="search"]'))) fail("search tab reopen");
  await setInput("[data-search]", "Terra");
  await page.focus("[data-search]");
  await page.keyboard.press("Enter");
  await sleep(80);
  const terraRow = await page.evaluate(() => {
    const tr = [...document.querySelectorAll(".panel tbody tr")].find((row) =>
      row.children[1]?.textContent?.includes("星系"),
    );
    tr?.click();
    return tr?.children[0]?.textContent?.trim() || null;
  });
  if (terraRow !== "Terra") fail(`Terra STAR SYSTEM row was ${terraRow}`);
  await sleep(200);
  const terraCam = await page.evaluate(() => new URL(location.href).searchParams.get("camera"));
  if (!terraCam?.startsWith("60,0,0.002")) fail(`search Terra STAR SYSTEM camera ${terraCam}, official is 60,0,0.002`);

  if (!(await click('[data-level="galaxy"]'))) fail("GLX");
  await sleep(200);
  if (!(await click('[data-level="system"]'))) fail("SYS");
  await sleep(200);
  const sysCam = await page.evaluate(() => new URL(location.href).searchParams.get("camera"));
  if (!sysCam?.startsWith("10,102.98")) fail(`SYS from galaxy should enter last system home cam, got ${sysCam}`);
  if (!(await click('[data-view="2d"]'))) fail("2D");
  const view = await page.evaluate(() => new URL(location.href).searchParams.get("view"));
  if (view !== "2d") fail(`2D did not write view= ${view}`);
  if (!(await click('[data-view="3d"]'))) fail("3D");

  if (!(await click('[data-tab="routes"]'))) fail("routes tab");
  await setInput(".fields .field:nth-of-type(1) input", "GOSS");
  await setInput(".fields .field:nth-of-type(2) input", "TERRA");
  if (!(await click(".panel .cta"))) fail("calculate");
  await sleep(80);
  const route = await page.$eval(".route-meta", (el) => el.textContent.trim()).catch(() => "");
  if (!route) fail("GOSS → TERRA calculate produced no route");
  const jumpsM = await page.$eval("[data-jumps]", (el) => el.getAttribute("data-jumps")).catch(() => "");
  if (jumpsM !== "1") fail(`GOSS→TERRA default/M jumps ${jumpsM}, official is 1`);
  if (!(await click('[data-ship="L"]'))) fail("ship size L");
  await sleep(80);
  const jumpsL = await page.$eval("[data-jumps]", (el) => el.getAttribute("data-jumps")).catch(() => "");
  if (jumpsL !== "2") fail(`GOSS→TERRA ship_size=L jumps ${jumpsL}, official is 2 Through Tayac`);
  const routeTableH = await page.$eval("[data-route-table]", (el) => el.getBoundingClientRect().height).catch(() => 0);
  if (routeTableH < 40) fail(`route table clipped to ${routeTableH}px`);

  await click('[data-tab="display"]');
  const display = await page.$(".display-bar");
  if (!display) fail("display bar missing");

  const camBefore = await page.evaluate(() => new URL(location.href).searchParams.get("camera"));
  await page.keyboard.press("d");
  await sleep(220);
  const camAfter = await page.evaluate(() => new URL(location.href).searchParams.get("camera"));
  if (camBefore === camAfter) fail("WASD did not move camera");

  if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
  await browser.close();
  if (process.exitCode) {
    console.error("smoke failed");
    process.exit(process.exitCode);
  }
  console.log("smoke ok", { found, route, camBefore, camAfter });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
