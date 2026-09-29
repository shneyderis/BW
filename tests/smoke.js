// tests/smoke.js — офлайн smoke-тест дашборду на синтетичних даних (tests/fixtures/sheets).
// Запуск: python3 tests/make_fixtures.py && node tests/smoke.js
// Потрібно: node + playwright-core (npm i -g playwright-core або локально) + Chromium.
// Змінні: BW_URL (за замовчуванням http://127.0.0.1:8765/index.html?src=test), PW_CHROMIUM (шлях до chromium), SHOTS (папка для скріншотів)
const path = require("path");
const { spawn } = require("child_process");
let pw;
try { pw = require("playwright-core"); } catch (e) { try { pw = require("playwright"); } catch (e2) { console.error("npm i playwright-core"); process.exit(2); } }

const ROOT = path.resolve(__dirname, "..");
const PORT = 8765;
const URL = process.env.BW_URL || `http://127.0.0.1:${PORT}/index.html?src=test`;
const SHOTS = process.env.SHOTS || path.join(__dirname, "shots");
const TABS = ["balance", "pl", "sales", "exp", "salary", "goods", "shop", "stock", "cash", "mkt", "partners", "uk", "production", "unrec", "status", "settings"];

(async () => {
  const server = process.env.BW_URL ? null : spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  await new Promise(r => setTimeout(r, 800));
  const launch = { headless: true, args: ["--no-sandbox"] };
  if (process.env.PW_CHROMIUM) launch.executablePath = process.env.PW_CHROMIUM;
  const browser = await pw.chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [], warnings = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console.error: " + m.text()); if (m.type() === "warning") warnings.push(m.text()); });
  page.on("requestfailed", r => { if (!/gsi\/client|fonts\.g/.test(r.url())) errors.push("requestfailed: " + r.url()); });
  require("fs").mkdirSync(SHOTS, { recursive: true });
  const fails = [];
  const check = (cond, msg) => { if (!cond) { fails.push(msg); console.log("  ✗ " + msg); } else console.log("  ✓ " + msg); };

  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.fill("#login-pass", "beykush2024");
  await page.click("#login-screen button");
  await page.waitForFunction(() => typeof LOAD_PHASE !== "undefined" && LOAD_PHASE === 2, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  const sub = await page.textContent("#subtitle");
  check(/опер/.test(sub), "subtitle loaded: " + sub.trim().substring(0, 90));
  const chip = await page.textContent("#hchip");
  check(/задач|актуальн/.test(chip), "health chip: " + chip.trim());

  for (const id of TABS) {
    const before = errors.length;
    await page.click(`.tab[onclick*="'${id}'"]`);
    await page.waitForTimeout(id === "status" ? 900 : 350);
    const html = await page.$eval("#t-" + id, el => el.innerHTML);
    check(html.length > 200 && !/Помилка відображення/.test(html), `tab ${id} rendered (${html.length} chars)`);
    check(errors.length === before, `tab ${id} no new errors`);
    await page.screenshot({ path: path.join(SHOTS, `${id}.png`), fullPage: true });
  }

  // Головна: задачі оператору
  await page.click(`.tab[onclick*="'balance'"]`); await page.waitForTimeout(300);
  const tasks = await page.$$eval("#t-balance .task", els => els.map(e => e.querySelector(".task-t").textContent.trim()));
  check(tasks.length > 0, "balance shows operator tasks: " + tasks.slice(0, 4).join(" | "));
  const dots = await page.$$eval("#t-balance .srcnote .hd", els => els.length);
  check(dots >= 2, `source dots on balance: ${dots}`);

  // Продажі: період = останній місяць з даними (2026-08 → «Сер 2026»)
  await page.click(`.tab[onclick*="'sales'"]`); await page.waitForTimeout(300);
  const salesKpi = await page.$eval("#t-sales .kpi .l", el => el.textContent);
  check(/Сер 2026/.test(salesKpi), "sales default period is last month with data: " + salesKpi.trim());
  await page.click("#t-sales button:has-text('Квартал')"); await page.waitForTimeout(300);
  check(/Q3 2026/.test(await page.$eval("#t-sales .kpi .l", el => el.textContent)), "sales quarter period Q3 2026");

  // Товари: пошук зберігає фокус
  await page.click(`.tab[onclick*="'goods'"]`); await page.waitForTimeout(400);
  await page.click("#gdSearch"); await page.keyboard.type("Art", { delay: 60 }); await page.waitForTimeout(500);
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
  const val = await page.$eval("#gdSearch", el => el.value);
  check(focused === "gdSearch" && val === "Art", `goods search keeps focus (focus=${focused}, value=${val})`);
  const rowsAfter = await page.$$eval("#t-goods table.tbl tr", els => els.length);
  check(rowsAfter > 1, `goods filtered rows: ${rowsAfter}`);

  // ЗП: під-вкладки
  await page.click(`.tab[onclick*="'salary'"]`); await page.waitForTimeout(300);
  await page.click("#t-salary .sh-tab:has-text('Менеджери')"); await page.waitForTimeout(400);
  const mgrRows = await page.$$eval("#t-salary table.tbl tr.click", els => els.map(e => e.textContent.trim().substring(0, 60)));
  check(mgrRows.length >= 2, "manager commissions table: " + mgrRows.slice(0, 3).join(" | "));
  await page.click("#t-salary table.tbl tr.click"); await page.waitForTimeout(300);
  check(/По клієнтах/.test(await page.$eval("#t-salary", el => el.textContent)), "manager drill-down by customers");
  await page.click("#t-salary .sh-tab:has-text('Відомість')"); await page.waitForTimeout(400);
  const ledger = await page.$eval("#t-salary", el => el.textContent);
  check(/До виплати/.test(ledger) && /Світлана/.test(ledger) && !/Колишній/.test(ledger), "payroll ledger renders active employees only");
  await page.screenshot({ path: path.join(SHOTS, `salary-ledger.png`), fullPage: true });

  // Довідка
  await page.click(".tab.help"); await page.waitForTimeout(200);
  check(/довідка/.test(await page.$eval("#modal", el => el.textContent)), "help modal opens for active tab");
  await page.keyboard.press("Escape");
  check(await page.$eval("#modal", el => el.classList.contains("hidden")), "modal closes on Escape");

  // Статус: таблиця джерел, Sync_Log, STATUS.md
  await page.click(`.tab[onclick*="'status'"]`); await page.waitForTimeout(900);
  const st = await page.$eval("#t-status", el => el.textContent);
  check(/Джерела даних/.test(st) && /Sync_Log/.test(st), "status tab has sources table + sync log");
  check(/Стан проєкту/.test(st) && /Далі/.test(st), "status tab renders STATUS.md sections");
  check(/FB Posts/.test(st), "sync errors surfaced (FB Posts)");
  await page.screenshot({ path: path.join(SHOTS, `status.png`), fullPage: true });

  // Ліди без демо-даних? У fixtures є CRM_Leads → воронка
  await page.click(`.tab[onclick*="'partners'"]`); await page.waitForTimeout(300);
  await page.click("#t-partners .sh-tab:has-text('Ліди')"); await page.waitForTimeout(300);
  check(/Воронка/.test(await page.$eval("#t-partners", el => el.textContent)), "leads funnel from CRM_Leads");

  console.log("\nerrors:", errors.length); errors.forEach(e => console.log("  ! " + e));
  console.log("warnings:", warnings.length);
  await browser.close(); if (server) server.kill();
  if (fails.length || errors.length) { console.log(`\nFAILED: ${fails.length} checks, ${errors.length} errors`); process.exit(1); }
  console.log("\nALL OK");
})().catch(e => { console.error(e); process.exit(1); });
