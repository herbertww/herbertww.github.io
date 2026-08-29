import { chromium } from "playwright-core";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const url = pathToFileURL(resolve(new URL("public/index.html", import.meta.url).pathname)).href;
const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
let fails = 0;
const check = (name, ok, extra="") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra?"  "+extra:""}`); if(!ok) fails++; };

for (const scheme of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, colorScheme: scheme, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  const netFails=[]; page.on("requestfailed", r => netFails.push(r.url()));
  await page.goto(url, { waitUntil: "load" });

  check(`[${scheme}] no script exceptions`, errors.length===0, errors.join(" | "));
  check(`[${scheme}] fonts applied (not fallback)`,
    await page.evaluate(() => document.fonts.check('700 40px Archivo')));

  // body must paint an explicit ground, never transparent
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check(`[${scheme}] body has explicit background`, bg !== "rgba(0, 0, 0, 0)", bg);

  // no horizontal page scroll
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`[${scheme}] no horizontal body scroll`, overflow <= 1, `overflow=${overflow}px`);

  // ---- the demo ----
  await page.locator("#run").scrollIntoViewIfNeeded();
  await page.locator("#run").click();
  await page.waitForTimeout(600);
  const midCount = await page.locator("#log .ln").count();
  check(`[${scheme}] checks stream in progressively`, midCount > 0 && midCount < 26, `${midCount} rendered mid-run`);

  await page.locator("#skip").click();
  await page.waitForTimeout(250);
  const score   = await page.locator("#score").innerText();
  const verdict = await page.locator("#verdict").innerText();
  const lines   = await page.locator("#log .ln").count();
  const failed  = await page.locator("#log .ln.fail").count();
  const findings= await page.locator(".finding").count();
  const fixShown= await page.locator("#fixblock").isVisible();
  const progress= await page.locator("#progress").innerText();

  check(`[${scheme}] all 27 checks render`, lines === 27, `${lines}`);
  check(`[${scheme}] 5 hard failures highlighted`, failed === 5, `${failed}`);
  check(`[${scheme}] final score = 612`, score.trim() === "612", score.trim());
  check(`[${scheme}] verdict = NOT CERTIFIED`, verdict.includes("NOT CERTIFIED"), verdict);
  check(`[${scheme}] 4 reason-coded findings`, findings === 4, `${findings}`);
  check(`[${scheme}] verdict matches failed-check count`, verdict.includes(String(failed)), verdict);
  check(`[${scheme}] remediation diff revealed`, fixShown);
  check(`[${scheme}] progress counter completes`, progress.includes("27 / 27"), progress);
  if(netFails.length) console.log(`      note: ${netFails.length} network fetch(es) blocked by this sandbox (${netFails[0].split("/")[2]}) — not a page defect`);

  if (scheme === "light") await page.locator(".demo").screenshot({ path: new URL("../demo-light.png", import.meta.url).pathname });
  if (scheme === "dark")  await page.locator(".demo").screenshot({ path: new URL("../demo-dark.png", import.meta.url).pathname });

  // reset returns to idle
  await page.locator("#reset").click();
  await page.waitForTimeout(150);
  check(`[${scheme}] reset returns to idle`,
    (await page.locator("#score").innerText()).trim() === "—" && (await page.locator("#log .ln").count()) === 0);

  await ctx.close();
}
await browser.close();
console.log(fails ? `\n${fails} FAILING` : "\nall checks passed");
process.exit(fails ? 1 : 0);
