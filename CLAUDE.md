# CLAUDE.md — інструкції для Claude по проєкту Beykush Winery Dashboard

Прочитай це перед будь-якою зміною. Мета файлу: (1) швидко відновити контекст, (2) не робити повторно те, що вже є,
(3) тримати проєкт у стані «зрозуміло, де ми і що актуально».

## Що це

Статичний дашборд виноробні Beykush (HTML + vanilla JS + Chart.js, без збірки). Хостинг Vercel (`https://project-33ms4.vercel.app`),
автодеплой з гілки `main`. Дані читаються в браузері з Google Sheets (gviz CSV, книги «за посиланням») та з CSV-файлів у `data/`.
Власник працює з дашбордом епізодично — тому головні вимоги: **на сторінках має бути видно, які дані актуальні, що застаріло і що робити**.

Мова: інтерфейс — українська; власник пише російською — відповідай російською, коротко, по суті, без вигадок.
Якщо чогось не знаєш або не можеш перевірити (наприклад, вміст Google Sheets) — так і скажи.

## Перше, що робити в новій сесії

1. `STATUS.md` — де зупинились, що очікує від власника, план, журнал змін.
2. `reports/latest.md` — останній аналіз даних (якщо є).
3. Якщо власник просить «зроби X» — спочатку перевір **Індекс функціоналу** нижче: можливо, X вже є. Тоді покажи, де і як користуватись, замість того щоб робити заново.
4. Якщо власник просить проаналізувати дані/бізнес — розділ «Аналіз даних» нижче.

## Структура

```
index.html            каркас, вкладки, підключення скриптів (порядок важливий: config → version → data → md → health → help → drill → tabs → app → auth)
css/style.css         стилі (темна тема); класи .kpi .cc .tbl .row .flt .info .warn .sec .srcnote .task .hd
js/config.js          SID/SID2/SID3 книг, ролі та паролі (видно у браузері!), GOOGLE_CLIENT_ID
js/version.js         BUILD={date,note} — версія, показується у 📋 Статус. ОНОВЛЮЙ при кожному релізі
js/data.js            csvF (Sheets або локально ?src=local|test), parseCSV, csvLocal, pn/fm/ff/gv/toCur, srcP/srcN/srcI (примітки про джерела), exportCSV
js/md.js              mdToHtml / mdSection — рендер STATUS.md та reports/*.md
js/health.js          РЕЄСТР ДЖЕРЕЛ (healthSources), healthCompute → HEALTH, Sync_Log, MANIFEST, задачі (healthBuildTasks/healthBizTasks), hdot/healthChip/healthTasksHTML/healthTableHTML
js/help.js            TAB_HELP — довідка ⓘ по кожній вкладці (що є, джерела, обмеження). ДОДАВАЙ сюди нові фічі
js/drill.js           універсальний drill-down категорія → контрагенти → транзакції (drID/drillGo/drillPush)
js/app.js             константи (CHS, CSH, ZP, ACATS, MN), глобальні дані, load() у 2 фази, фільтри, render() ТІЛЬКИ активної вкладки, sw/goTab, модалки
js/auth.js            паролі/ролі/сесія (sessionStorage, 30 хв), Google Sign-In (вимкнено без CLIENT_ID)
js/tabs/*.js          одна вкладка = один файл, функція rXxx(); стан вкладки — у let-змінних файлу
tools/convert_1c.py   beykush_data.xlsx → data/1c_*.csv + data/manifest.json (дати вивантажень)
tools/pull_sheets.py  знімок усіх листів Google Sheets → data/sheets/*.csv (+ _pulled.json)
tools/analyze.py      аналіз даних → reports/latest.md і reports/<дата>.md
tests/make_fixtures.py, tests/smoke.js   синтетичні дані + Playwright-прогін усіх вкладок
sync.gs               Google Apps Script (живе в книзі BW_Looker_Data → Extensions → Apps Script). Ключі — Script Properties
data/1c_*.csv, data/lots.csv, data/manifest.json   файли з 1С та InnoVint
STATUS.md, DOCS.md, reports/             стан проєкту, документація для людей, звіти
```

Глобальні дані (app.js): `T` (Dashboard_Data, нетто в `t.nt`), `BL` баланси, `SK/SD` склад, `WO/WP` магазин, `GD` накладні 1С, `WN` workerNEW,
`CC_MAP`, `CRM_LEADS`, `C1` (1С: sales/partners/products/osv/bank/staff), `LOTS`, `UK`, `SP/IG/MA`, `PAYROLL/PAYROLL_ADJ`, `SETTINGS`, `FX`,
`SYNC_LOG`, `MANIFEST`, `HEALTH`, `LOAD_PHASE` (1 — базові дані, 2 — усе).

## Індекс функціоналу («це вже є»)

| Що | Де | Як користуватись / де в коді |
|---|---|---|
| Загальні активи, гроші ₴/€/$, вино, дебіторка, CAPEX, P&L YTD + прогноз | 💰 Баланс | `balance.js`; задачі оператору вгорі (`healthTasksHTML`) |
| Задачі «що зробити з даними» з інструкціями | Баланс (топ-6), 📋 Статус (усі) | `health.js` → `healthBuildTasks`, `healthBizTasks`; кожне джерело має `howto` |
| Стан кожного джерела (актуально/застаріло/помилка), дані до, остання синхронізація | крапки на кожній вкладці, чіп у шапці, таблиця у 📋 Статус і ⚙ | `healthSources()` — додати нове джерело = один обʼєкт у реєстр; `srcP(name,last,id)` |
| Sync_Log (чи працюють Apps Script синхронізації) | 📋 Статус | `loadSyncLog`, `healthParseSyncLog`, `syncInfo` |
| Стан проєкту / план / журнал змін на сторінці | 📋 Статус | `STATUS.md` → `status.js` (секції «Зараз», «Очікує», «Далі», «Відомі проблеми», «Журнал змін») |
| Останній аналітичний звіт на сторінці | 📋 Статус | `reports/latest.md` (генерує `tools/analyze.py`) |
| Довідка по вкладці | кнопка ⓘ довідка | `help.js` → `TAB_HELP[id]` |
| P&L по роках/місяцях, маржа, drill-down, експорт CSV | P&L | `pl.js`; глобальні фільтри рік/місяць/1Ф-2Ф/канал/гео/менеджер/валюта |
| Продажі по 8 каналах, партнери, менеджери, міста; період = останній місяць з даними | Продажі | `sales.js` (`_s` стан, `CHAN_MAP`); ФОП нетто через `getSettingValue("fop_tax")` |
| Витрати OPEX по категоріях, топ-5 помісячно, drill-down | Витрати | `exp.js` |
| Виплати ЗП по категоріях/особах/місяцях, % від виручки | 💼 ЗП → Аналітика | `salary.js` → `rSalAnalytics`; категорії у `ZP` (app.js) |
| Комісії менеджерів за місяць (по клієнтах, джерело ставки) + CSV | 💼 ЗП → Менеджери | `mgrCommissions(ym)`, `commRate(t)`; ставки: колонка commission → workerNEW «Коміссія Фінальна» → Payroll commission_pct → Settings mgr_commission_default |
| Відомість ЗП: оклад + комісія + бонуси − аванси vs факт, CSV | 💼 ЗП → Відомість | листи `Payroll`, `Payroll_Adj`; `rSalLedger`, `payrollRowFor` (версії по date_from) |
| Топ вин, вінтажі, швидкість продажу, склад і місяці запасу, сортування, пошук, CSV | Товари → Топ вина | `goods.js` → `gdWineStats(fd)`; склад зіставляється fuzzy по назві без року |
| ABC-аналіз вин і клієнтів, Парето | Товари → ABC | `rGdABC` |
| Клієнти з каналом/гео/останньою покупкою; тренди YoY | Товари → Клієнти / Тренди | `rGdCustomers`, `rGdTrends` |
| Маппінг клієнт → канал (експорт CSV, override) | Товари → «📋 Експорт маппінгу», лист `customer_channels` | `_chanLookup` (CC_MAP → WN alias/name/ЄДРПОУ → T → fuzzy) |
| Магазин: виручка, замовлення, чек, ФОП податки, клієнти LTV, воронка, міста | Магазин (4 підвкладки) | `shop.js`; дані з `WC_Orders`/`WC_Products` (sync.gs), line_items відсутні (є `items_detail`) |
| Склад: залишки, критичні/застряглі, 1С номенклатура, ОСВ 28/36/70 | Склад | `stock.js`; `Stock_Data` (новий формат) або `3_Stock` |
| Кеш-фло: баланси по рахунках, вхідні/вихідні, нетто, кумулятив, «дані до» по банках | Кеш-фло | `cash.js` |
| Маркетинг: timeline, AI-інсайти, email (open/click, кореляція), IG (ER, найкращий день), Meta Ads | Маркетинг | `mkt.js`; місячний звіт = останній місяць з даними |
| Партнери 1С: продано/оплачено/борг, прострочені, канали=склади, контакти (workerNEW), CRM-задачі, ліди | Партнери | `partners.js`; борги лише для «Бейкуш Вайнери» (є банк) |
| Ліди (воронка) | Партнери → Ліди | лист `CRM_Leads`; демо-даних немає — порожній стан з інструкцією |
| UK: замовлення/товари Metorik | 🇬🇧 UK | `uk.js`, листи `UK_Orders/UK_Products` |
| Виробництво: лоти InnoVint, стадії, прогноз доходу, готові до розливу, звʼязка з продажами, врожайність | 🍷 Виробн. | `production.js`, `data/lots.csv` |
| Нерозпізнані операції + CSV | ⚠️ | `unrec.js` |
| Ролі/доступ/паролі/користувачі/Settings з історією/курси/джерела/сесія | ⚙ | `settings.js`; постійні зміни — в `config.js` |
| Drill-down з будь-якої таблиці | всюди | `drill.js`: `onclick="drillGo(${drID({tp,cat,yr,mm,acc...})})"` |
| Експорт CSV | P&L, Товари, Партнери, ⚠️, ЗП | `exportCSV(name, headers, rows)` |
| Локальний/тестовий режим даних | `index.html?src=local` / `?src=test` | `csvF` читає `data/sheets/` або `tests/fixtures/sheets/` |

## Джерела даних і як їх оновлюють (коротко; повний реєстр — `healthSources()` у health.js, інструкції — DOCS.md)

- Вручну в Google Sheets: `Dashboard_Data` (виписки, щомісяця), `PRIVAT_BALANCES`, `3_Stock`/`Stock_Data`, `FINAL_sales_detail`, `workerNEW`, `customer_channels`, `CRM_Leads`, `Payroll`, `Settings`.
- Автоматично `sync.gs` (Apps Script, тригери щодня/щогодини): `WC_Orders`, `WC_Products`, `SP_*`, `IG_Posts`, `FB_Posts`, `Meta_Ads`, `UK_*`, журнал `Sync_Log`.
- Файли в репо (коміт): `data/1c_*.csv` (`tools/convert_1c.py` з `beykush_data.xlsx`), `data/lots.csv` (InnoVint), `data/manifest.json` (дати).
- Онлайн: курси НБУ.

## Правила для кожної зміни

1. **STATUS.md**: запис у «Журнал змін» (дата, що зроблено) + оновити «Зараз працює» / «Далі» / «Очікує від власника», якщо змінилось.
2. **js/version.js**: `BUILD.date` = дата релізу, `BUILD.note` = коротко що нового.
3. **index.html**: підняти `?v=N` у всіх `<script>`/`<link>` (кеш-бастинг; Vercel також віддає js/css/data з `no-cache`).
4. Нова вкладка → `TAB_IDS` (app.js), `RENDERERS` (app.js), `OWN_FILTER_TABS` якщо свої фільтри, `ROLES` (config.js), `ALL_TABS` + `resetPerms` (settings.js), `TAB_HELP` (help.js), кнопка + `<div id="t-…">` в index.html.
5. Нове джерело даних → обʼєкт у `healthSources()` (label, where, link, rows, last, warn/stale, howto) і `srcP(..., id)` на вкладках, що його використовують.
6. Нова фіча → рядок в «Індекс функціоналу» тут і пункт у `TAB_HELP`.
7. **Ніяких секретів у репо** (репозиторій публічний): ключі — лише Script Properties в Apps Script. Не додавай токени в код, документи чи коміти.
8. **Ніяких демо/вигаданих даних** у вкладках: немає даних → порожній стан з інструкцією, як їх додати.
9. Періоди за замовчуванням — **останній місяць/рік, за який є дані** (`lastYM()`, `aY().pop()`), не календарні. Якщо дані відстають — показати це.
10. Усі рендери — через `render()` (рендерить лише активну вкладку). Стан вкладки — у let-змінних її файлу. Поля вводу з пошуком мають `id` і викликають `dbRender()`, щоб не втрачати фокус.
11. UI — українською; назви місяців з `MN`; числа через `ff()`/`fm()`; HTML з даних — через `esc()`.
12. Перед пушем: `node --check js/**/*.js`, `python3 tests/make_fixtures.py && node tests/smoke.js` (Chromium: `PW_CHROMIUM=/opt/pw-browsers/chromium`, playwright-core через npm).
13. Коміти — в гілку, яку вказано в задачі; деплой на прод — merge у `main`.

## Аналіз даних (коли власник просить «подивись, що не так у бізнесі»)

1. Потрібен знімок таблиць: `data/sheets/*.csv` (`_pulled.json` каже, коли зроблено). Якщо його немає або він старий:
   - у середовищі є доступ до `docs.google.com` → `python3 tools/pull_sheets.py`;
   - немає (типово: мережа середовища блокує Google) → попросити власника дозволити хост `docs.google.com` у налаштуваннях середовища або запустити `pull_sheets.py` локально і закомітити `data/sheets/`.
2. `python3 tools/analyze.py` → `reports/latest.md` (закомітити: звіт показується у 📋 Статус).
3. Прочитати звіт, перевірити цифри в сирих CSV, дати власнику **конкретні знахідки з діями** (хто не платить, який канал просів, які вина закінчуються, де дірки в даних). Не вигадувати — якщо даних немає, сказати, яких.
4. Нові корисні перевірки — додавати в `tools/analyze.py` (і, якщо їх треба бачити на сторінці, у `healthBizTasks`).

## Технічні нотатки / пастки

- `gv(row,"prefix")` шукає колонку за початком назви без урахування регістру: «month» ≠ «money», але «date» знайде «date_created». Дивись порядок колонок.
- gviz CSV повертає дати як текст у форматі локалі книги; `parseAnyDate` розуміє `YYYY-MM-DD`, `DD.MM.YYYY`, `M/D/YYYY`, `YYYY-MM`.
- `csvF` повертає `[]` для відсутнього листа (HTML замість CSV) і кидає помилку лише при мережевих збоях (тоді — кеш localStorage).
- Дані 1С у `data/1c_*.csv` мають дати `DD.MM.YYYY HH:MM:SS`; `C1.sales.date` вже ISO (`d2iso`), `C1.bank.date` — сирий рядок.
- Нетто-логіка ПДВ у `net()` (app.js): PRIVAT/VOSTOK ÷ 1.2 крім експорту та ЗП/податків/банку.
- Комісія за операцію: `t.com` (колонка commission) має пріоритет; ставка workerNEW може бути «5%», «5» або «0.05» (`_rateFromStr`).
- Chart.js інстанси зберігаються в `CH` і знищуються через `dc(id)` перед перерендером.
- `auth.js` підключається ПІСЛЯ `app.js` (автологін викликає `load()`).
