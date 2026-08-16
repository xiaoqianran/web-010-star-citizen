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
  if (!(await page.$("[data-search]"))) fail("search input missing");
  await setInput("[data-search]", "Terra");
  await sleep(80);
  const found = await page.$eval("[data-found]", (el) => Number(el.getAttribute("data-found")));
  if (!(found > 0)) fail(`search Terra found ${found}`);

  await page.mouse.click(200, 360);
  await sleep(60);
  const afterBlur = await page.evaluate(() => document.activeElement?.tagName);
  if (afterBlur === "INPUT") fail("canvas click did not blur search");

  if (!(await click('[data-level="galaxy"]'))) fail("GLX");
  await sleep(200);
  if (!(await click('[data-level="system"]'))) fail("SYS");
  if (!(await click('[data-view="2d"]'))) fail("2D");
  const view = await page.evaluate(() => new URL(location.href).searchParams.get("view"));
  if (view !== "2d") fail(`2D did not write view= ${view}`);
  if (!(await click('[data-view="3d"]'))) fail("3D");

  if (!(await click('[data-tab="routes"]'))) fail("routes tab");
  await setInput(".fields input:nth-of-type(1)", "Cassel");
  await setInput(".fields input:nth-of-type(2)", "Terra");
  if (!(await click(".panel .cta"))) fail("calculate");
  await sleep(80);
  const route = await page.$eval(".route-meta", (el) => el.textContent.trim()).catch(() => "");
  if (!route) fail("Cassel → Terra calculate produced no route");

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
