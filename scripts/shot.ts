// Screenshot pages with the system Edge via puppeteer-core, printing console output and page errors.
import puppeteer from "puppeteer-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const [, , url, out, width = "1440", height = "1400", wait = "4000"] = process.argv;
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: Number(width), height: Number(height) });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: process.env.SCHEME ?? "dark" }]);
page.on("console", (m) => console.log(`[console.${m.type()}]`, m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("requestfailed", (r) => console.log("[requestfailed]", r.url(), r.failure()?.errorText));
await page.goto(url!, { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, Number(wait)));
if (out) await page.screenshot({ path: out, fullPage: true });
await browser.close();
