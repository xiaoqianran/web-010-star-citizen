#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const BASE = process.env.CLONE_URL || "http://127.0.0.1:4173/?location=GOSS&camera=10,102.98,0.002,0,0";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "research", "capture", "clone-deep");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
  defaultViewport: { width: 1600, height: 1000 },
});
const page = await browser.newPage();
await mkdir(OUT, { recursive: true });
await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded", timeout: 20000 });
await page.evaluate(() => {
  localStorage.setItem("skipAcknowledgment", "1");
  localStorage.setItem("skipInfo", "1");
});
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 20000 });
await new Promise((r) => setTimeout(r, 800));
if (await page.$(".window-link")) {
  await page.evaluate(() => document.querySelector(".window-link")?.click());
  await sleep(200);
  await page.evaluate(() => document.querySelector(".cta")?.click());
  await sleep(200);
  await page.evaluate(() => document.querySelector(".cta")?.click());
  await sleep(800);
}
const log = [];
const note = (step, extra = {}) => {
  log.push({ step, url: page.url(), ...extra });
  console.log(step, extra.text || page.url());
};
await page.evaluate(() => document.querySelector('[data-level="galaxy"]')?.click());
await sleep(500);
await page.evaluate(() => document.querySelector('[data-view="2d"]')?.click());
await sleep(500);
await page.screenshot({ path: join(OUT, "18-2d.png"), timeout: 8000 }).catch(() => {});
note("2d", { text: new URL(page.url()).searchParams.get("view") });
await page.evaluate(() => document.querySelector('[data-view="3d"]')?.click());
await sleep(200);
for (const key of ["a", "d", "w", "s", "Equal", "Minus", "Escape"]) {
  await page.keyboard.press(key);
  await sleep(50);
}
note("keyboard");
await page.evaluate(() => document.querySelector(".burger-hit")?.click());
await sleep(150);
const fly = await page.$eval(".flyout", (el) => el.innerText).catch(() => "");
note("menu", { text: fly });
await page.screenshot({ path: join(OUT, "19-menu.png"), timeout: 8000 }).catch(() => {});
const before = page.url();
await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
await sleep(600);
if (await page.$(".window-link")) {
  await page.evaluate(() => document.querySelector(".window-link")?.click());
  await sleep(150);
  await page.evaluate(() => document.querySelector(".cta")?.click());
  await sleep(150);
  await page.evaluate(() => document.querySelector(".cta")?.click());
  await sleep(600);
}
note("reload", { text: before + " => " + page.url() });
await page.screenshot({ path: join(OUT, "20-reload.png"), timeout: 8000 }).catch(() => {});
await writeFile(join(OUT, "TAIL.json"), JSON.stringify(log, null, 2) + "\n");
await browser.close();
console.log("tail done");
