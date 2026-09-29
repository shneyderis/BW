# Beykush Winery Dashboard — Документація

Стан проєкту, план і журнал змін — у **STATUS.md** (і у вкладці 📋 Статус). Інструкції для Claude — **CLAUDE.md**.
Цей файл — довідник для людей: як влаштовано, звідки дані, як їх оновлювати.

**URL**: https://project-33ms4.vercel.app · **Репозиторій**: https://github.com/shneyderis/BW · **Деплой**: автоматично через Vercel при push у `main`

---

## Як користуватись

- **Шапка**: чіп «● N задач / дані актуальні» → клік відкриває 📋 Статус. Підзаголовок: кількість операцій, до якого місяця є виписки, курси.
- **На кожній вкладці** зверху — рядок джерел: кольорова крапка (● актуально · ● застаріває · ● застаріло/помилка), назва книги → листа (клікабельно), «дані до …».
- **💰 Баланс** (головна): угорі блок «Що потрібно зробити» — задачі по даних і бізнесу з інструкцією «Як зробити» і посиланням на таблицю.
- **📋 Статус**: усі задачі, таблиця джерел (тип, рядків, дані до, синхронізація, стан), Sync_Log, стан проєкту (STATUS.md), останній аналіз даних (reports/latest.md), версія.
- **ⓘ довідка** (праворуч від вкладок): що є на поточній вкладці, її джерела, обмеження.

## Авторизація

| Роль | Доступ |
|---|---|
| **owner** | усі вкладки |
| **manager** | Продажі, Товари, Магазин, Склад, Маркетинг, Партнери, Статус |
| **accountant** | Баланс, P&L, Товари, Витрати, ЗП, Кеш-фло, Партнери, Нерозпізнані, Статус |

Паролі — у `js/config.js` (ROLES). ⚠ Це статичний сайт: паролі видно у вихідному коді. Google Sign-In підготовлено (потрібен `GOOGLE_CLIENT_ID`).
Сесія: sessionStorage, 30 хв неактивності.

---

## Архітектура

```
index.html              каркас, вкладки, скрипти
css/style.css           стилі (темна тема)
js/config.js            ID книг Google Sheets, ролі, паролі
js/version.js           версія дашборду (BUILD)
js/data.js              завантаження CSV (Sheets або локально), утиліти, примітки про джерела
js/md.js                Markdown → HTML (STATUS.md, звіти)
js/health.js            стан даних: реєстр джерел, свіжість, Sync_Log, задачі оператору
js/help.js              довідка ⓘ по вкладках
js/drill.js             drill-down категорія → контрагенти → транзакції
js/app.js               константи, глобальні дані, load(), фільтри, render()
js/auth.js              авторизація, сесія
js/tabs/balance.js      💰 Баланс + задачі
js/tabs/pl.js           P&L
js/tabs/sales.js        Продажі (канали, партнери, менеджери, періоди)
js/tabs/exp.js          Витрати
js/tabs/salary.js       💼 ЗП: аналітика виплат, комісії менеджерів, відомість
js/tabs/goods.js        Товари (накладні 1С: топ вин, ABC, клієнти, тренди, склад)
js/tabs/shop.js         Магазин (WooCommerce)
js/tabs/stock.js        Склад
js/tabs/cash.js         Кеш-фло
js/tabs/mkt.js          Маркетинг (Email, Instagram, Meta Ads, timeline, інсайти)
js/tabs/partners.js     Партнери (1С: борги, канали, контакти, CRM, ліди)
js/tabs/uk.js           🇬🇧 UK (Metorik/Shopify)
js/tabs/production.js   🍷 Виробництво (лоти InnoVint)
js/tabs/unrec.js        ⚠️ Нерозпізнані
js/tabs/status.js       📋 Статус
js/tabs/settings.js     ⚙ Налаштування
tools/convert_1c.py     1С xlsx → data/1c_*.csv + data/manifest.json
tools/pull_sheets.py    знімок Google Sheets → data/sheets/*.csv
tools/analyze.py        аналіз даних → reports/latest.md
tests/                  синтетичні дані + smoke-тест (Playwright)
sync.gs                 Google Apps Script — синхронізація API → Sheets
data/                   1С CSV, lots.csv, manifest.json, (sheets/ — знімок)
reports/                звіти аналізу
```

Дані завантажуються у 2 фази: спочатку Dashboard_Data, баланси, склад (сторінка вже показується), потім паралельно все інше
(магазин, накладні, workerNEW, 1С, лоти, UK, маркетинг, Payroll, Sync_Log, manifest). Після 2-ї фази рахується стан даних (`healthCompute`).

---

## Джерела даних

### 1. Google Sheets — BW_Looker_Data (SID `1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ`)

| Лист | Що містить | Як оновлюється | Очікувана частота |
|---|---|---|---|
| Dashboard_Data | банківські виписки: month, money, name, alias, category, geo, менеджер, sum_uah, commission, sum_money, source | вручну | щомісяця |
| 3_Stock / Stock_Data | залишки вин (старий / новий формат: wine, date, type=balance\|bottling, qty) | вручну | раз на 1–1.5 міс |
| FINAL_sales_detail | накладні з 1С по пляшках: date, document, customer, warehouse, product, product code, quantity, price, sum, vat | вручну | щомісяця |
| Settings | setting_key, value, date_from, description (fop_tax, fop_bank, vat_rate, mgr_commission_default) | вручну | за потреби |
| customer_channels | customer, channel, alias — ручне перекриття каналу клієнта | вручну | за потреби |
| CRM_Leads / CRM_Contacts | ліди (company, contact, phone, email, stage, source, date, value, next, notes) / контакти | вручну | за потреби |
| Payroll / Payroll_Adj | оклади та ставки / бонуси-аванси (схема нижче) | вручну | при змінах / щомісяця |
| Users | email, name, role, tabs, phone, active (для Google Sign-In) | вручну | — |
| WC_Orders, WC_Products | WooCommerce | sync.gs (щогодини / щодня) | автоматично |
| SP_Lists, SP_Campaigns | SendPulse | sync.gs (щодня) | автоматично |
| IG_Posts, FB_Posts, Meta_Ads, ADD1 | Instagram / Facebook / реклама (ADD1 — ручний експорт Ads Manager) | sync.gs / вручну | автоматично / за потреби |
| UK_Orders, UK_Products | Wines of Ukraine (Metorik) | sync.gs → syncUK | автоматично |
| Sync_Log | source, result, timestamp — журнал синхронізацій | sync.gs | автоматично |

### 2. Google Sheets — BW_accounts (SID2 `1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w`)

| Лист | Що містить |
|---|---|
| PRIVAT_BALANCES | рахунок, валюта, баланс, dpd (дата) |
| workerNEW | довідник клієнтів: F (назва в 1С), ALIAS, CATEGORY (канал), GEO, Менеджер, Контактное лицо, Tel, EDRPOU, ЗНИЖКА, Коміссія Фінальна |

### 3. Файли в репозиторії (data/)

| Файл | Що містить | Оновлення |
|---|---|---|
| 1c_sales.csv, 1c_bank.csv, 1c_partners.csv, 1c_products.csv, 1c_osv.csv, 1c_contracts.csv, 1c_warehouses.csv, 1c_orgs.csv, 1c_staff.csv, 1c_assets.csv | вивантаження з 1С «Бухгалтерія для України» | `tools/convert_1c.py` з `beykush_data.xlsx` |
| lots.csv | лоти InnoVint | експорт CSV з InnoVint |
| manifest.json | дати вивантажень і кількість рядків (читає дашборд) | генерує `convert_1c.py` |
| sheets/*.csv | знімок Google Sheets для офлайн-аналізу / режиму `?src=local` | `tools/pull_sheets.py` |

### 4. Онлайн

- НБУ: курси EUR/USD (`bank.gov.ua`), без ключа.

---

## Як оновлювати дані

### Виписки (Dashboard_Data)
1. Книга BW_Looker_Data → лист Dashboard_Data → додати операції за місяць (month = YYYYMM, category з існуючого списку, sum_uah зі знаком, source = PRIVAT/VOSTOK/2fMK/2fKiev, менеджер для продажів).
2. Перевірити вкладку ⚠️ (категорії «???»).
3. Оновити сторінку. Чіп у шапці та крапки мають позеленіти.

### 1С
1. Вивантажити з 1С `beykush_data.xlsx` (аркуші Продажи, Контрагенты, Номенклатура, ОСВ, Банк, Склады, Договоры, Организации, Сотрудники, ОС).
2. Покласти файл у корінь репозиторію, виконати `python3 tools/convert_1c.py` (потрібен `pip install openpyxl`).
3. `git add data beykush_data.xlsx && git commit -m "Update 1C data" && git push` — Vercel задеплоїть.
   (Без git: GitHub → data → Add file → Upload files; `manifest.json` тоді оновити командою `python3 tools/convert_1c.py --manifest` при нагоді.)

### Лоти InnoVint
1. InnoVint → Lots → Export CSV → замінити `data/lots.csv`.
2. `python3 tools/convert_1c.py --lots-only` (оновить дату в manifest) → commit → push.

### Автосинхронізації (sync.gs)
- Книга BW_Looker_Data → Extensions → Apps Script → файл з кодом `sync.gs`.
- **Ключі** — Project Settings → Script Properties: `SP_APIKEY`, `WC_KEY`, `WC_SECRET`, `META_TOKEN`, `META_PAGE_TOKEN` (опційно), `METORIK_UK_TOKEN`. Перевірка: Run → `checkConfig` → Logs.
- Тригери (Triggers → Add): `syncPart1` щодня 6–7, `syncPart2` щодня 7–8, `syncWCOrdersIncremental` щогодини, `syncUK` щодня.
- Результати — лист Sync_Log; дашборд показує їх у 📋 Статус і робить задачу при помилці.

| Функція | Що робить |
|---|---|
| `syncAll()` = `syncPart1()` + `syncPart2()` | SP + WC, потім IG + FB + Ads |
| `syncWCOrdersIncremental()` | замовлення WC за 2 дні |
| `syncSendPulse()`, `syncWooCommerce()`, `syncAllMarketing()`, `syncIGPosts()`, `syncFBPosts()`, `syncMetaAds()`, `syncUK()` | окремі джерела |
| `discoverMetaIds()` | показує Page/IG/Ad IDs |
| `checkConfig()` | перевірка Script Properties |

### Meta токен
System User token (безстроковий): business.facebook.com → Settings → System Users → Generate token (pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights, ads_read) → зберегти у Script Properties `META_TOKEN` → Run `syncIGPosts`.

---

## 💼 ЗП — схема листів

**Payroll** (один рядок на співробітника; зміна окладу = новий рядок з новою `date_from`):

```
employee,role,manager_name,base,currency,commission_pct,zp_category,date_from,active,notes
Світлана,manager,Света,20000,UAH,5,BW Света,2026-01-01,true,менеджер HoReCa
Іван Петренко,staff,,18000,UAH,,ЗП Виноробня,2025-06-01,true,
```
- `role`: manager (рахується комісія) / staff · `manager_name`: як у колонці «менеджер» Dashboard_Data · `commission_pct`: ставка менеджера, якщо у клієнта немає своєї у workerNEW · `zp_category`: категорія виплат у Dashboard_Data (для порівняння з фактом) · `currency`: UAH/EUR/USD.

**Payroll_Adj** (опційно): `employee,month,type,amount,note`, де `type` = bonus (+) | advance (−) | deduction (−), `month` = YYYY-MM.

Комісія по операції = колонка `commission` у Dashboard_Data, якщо заповнена; інакше нетто × ставка: клієнта (workerNEW «Коміссія Фінальна»: «5%», «5» або «0.05») → менеджера (Payroll) → `mgr_commission_default` (Settings).

---

## Розробка і тести

- Локально: `python3 -m http.server 8765` → `http://127.0.0.1:8765/index.html` (реальні Sheets) або `?src=local` (знімок `data/sheets/`) або `?src=test` (синтетика).
- Синтетичні дані: `python3 tests/make_fixtures.py`. Smoke-тест усіх вкладок: `node tests/smoke.js` (потрібні `playwright-core` і Chromium; `PW_CHROMIUM=/шлях/до/chromium`).
- Перевірка синтаксису: `for f in js/*.js js/tabs/*.js; do node --check $f; done`.
- Аналіз даних: `python3 tools/pull_sheets.py && python3 tools/analyze.py` → `reports/latest.md`.
- Після змін: оновити `STATUS.md`, `js/version.js`, підняти `?v=` в `index.html` (див. CLAUDE.md).

## Технічні деталі

- ПДВ: доходи PRIVAT/VOSTOK (крім Експорт) ÷ 1.2; витрати PRIVAT/VOSTOK ÷ 1.2 (крім ЗП, Податки, Банківська); Експорт і 2Ф — без змін.
- Кеш: `csvF()` зберігає останні дані в localStorage (офлайн-фолбек); таймаут 8 с.
- Рендер — лише активна вкладка; фокус у полях пошуку зберігається.
- Свіжість: пороги по кожному джерелу — у `healthSources()` (`warn`/`stale` днів від дати даних, `syncWarn`/`syncStale` — від останньої синхронізації).
- CSS: фон `#0c0e13`, картки `#151821`, бордер `#232738`; акценти `#10b981` зелений, `#ef4444` червоний, `#f59e0b` жовтий, `#3b82f6` синій, `#8b5cf6` фіолет, `#9f1239` бренд.

## Безпека

- Репозиторій публічний → у ньому не може бути ключів. Усі ключі — Script Properties в Apps Script. Якщо ключ потрапив у git — перевипустити його.
- Паролі ролей у `config.js` видно всім, хто відкриє сайт. Для реального захисту — Google Sign-In або серверний middleware (у плані).
- Книги Google Sheets відкриті «за посиланням» — це необхідно для роботи дашборду, але означає, що ID книг = доступ до даних.
