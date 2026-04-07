# Beykush Winery Dashboard — Документація

## Загальний опис

Дашборд для виноробні Бейкуш — веб-додаток для моніторингу фінансів, продажів, складу, маркетингу та партнерів. Працює як статичний сайт на Vercel, дані читає з Google Sheets та локальних CSV файлів.

**URL**: https://project-33ms4.vercel.app
**Репозиторій**: https://github.com/shneyderis/BW
**Деплой**: автоматичний через Vercel при push в main

---

## Авторизація

### Пароль (завжди працює)
| Роль | Пароль | Доступ |
|---|---|---|
| **owner** | `beykush2024` | Всі вкладки |
| **manager** | `sales2024` | Продажі, Магазин, Склад, Маркетинг, Партнери |
| **accountant** | `acc2024` | P&L, Витрати, Осн.фонди, Кеш-фло, Партнери, Нерозпізнані |

### Google Sign-In (підготовлено, не активовано)
Потребує `GOOGLE_CLIENT_ID` в `js/config.js`. Для налаштування:
1. `console.cloud.google.com` → APIs → Credentials → OAuth 2.0 Client ID
2. Authorized origins: `https://project-33ms4.vercel.app`
3. Вставити Client ID в config.js → `GOOGLE_CLIENT_ID`
4. Додати користувачів в лист "Users" в Google Sheets

### Сесія
- Таймаут: 30 хвилин неактивності
- Скидається при будь-якій дії (клік, скрол, клавіша)
- Зберігається в sessionStorage

---

## Архітектура

### Файли проекту
```
index.html              — HTML каркас, підключення скриптів
css/style.css           — Стилі (темна тема)
js/config.js            — Sheet IDs, паролі, ролі, Google OAuth
js/data.js              — CSV завантажувач, НБУ курси, Settings
js/app.js               — Авторизація, load(), фільтри, render(), модалки
js/tabs/pl.js           — P&L
js/tabs/sales.js        — Продажі (канали, drill-down, менеджери)
js/tabs/exp.js          — Витрати
js/tabs/assets.js       — Основні фонди
js/tabs/shop.js         — Магазин (4 підвкладки: продажі, продукти, клієнти, замовлення)
js/tabs/stock.js        — Склад (залишки + 1С номенклатура)
js/tabs/cash.js         — Кеш-фло
js/tabs/mkt.js          — Маркетинг (Email + Instagram + Meta Ads)
js/tabs/partners.js     — Партнери (огляд, канали, борги, контакти, CRM)
js/tabs/unrec.js        — Нерозпізнані транзакції
js/tabs/settings.js     — Налаштування, ролі, користувачі, джерела даних
js/tabs/uk.js           — Wines of Ukraine UK (підготовлено)
vercel.json             — Vercel конфігурація (Cache-Control)
sync.gs                 — Google Apps Script для синхронізації даних
data/1c_*.csv           — CSV дані з 1С бухгалтерії
beykush_data.xlsx       — Вихідний xlsx файл з 1С
```

### Джерела даних

#### 1. Google Sheets — основна таблиця (SID)
**ID**: `1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ`

| Лист | Що містить | Як оновлюється |
|---|---|---|
| Dashboard_Data | 5950 транзакцій (доходи/витрати) | Вручну |
| 3_Stock | Залишки вин (старий формат) | Вручну |
| Stock_Data | Залишки вин (новий формат) | Вручну |
| Settings | Налаштування (fop_tax, vat_rate) | Вручну |
| SP_Lists | SendPulse списки розсилок | sync.gs → syncAll() |
| SP_Campaigns | SendPulse кампанії зі статистикою | sync.gs → syncAll() |
| WC_Orders | WooCommerce замовлення | sync.gs → syncAll() |
| WC_Products | WooCommerce товари | sync.gs → syncAll() |
| IG_Posts | Instagram пости з engagement | sync.gs → syncIGPosts() |
| Meta_Ads | Meta рекламні кампанії | sync.gs → syncMetaAds() |
| FB_Posts | Facebook пости | sync.gs → syncFBPosts() |
| Sync_Log | Лог синхронізацій | Автоматично |
| Users | Користувачі для Google Auth | Вручну |

#### 2. Google Sheets — баланси (SID2)
**ID**: `1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w`

| Лист | Що містить |
|---|---|
| PRIVAT_BALANCES | Баланси рахунків (₴, €, $) |

#### 3. 1С Бухгалтерія — CSV файли (data/)
Вигрузка з 1С "Бухгалтерія для України". Конвертовано з xlsx в CSV.

| Файл | Записів | Що містить |
|---|---|---|
| 1c_sales.csv | 11 885 | Реалізації (дата, сума, контрагент, склад) |
| 1c_partners.csv | 670 | Контрагенти (назва, ЄДРПОУ, тип) |
| 1c_products.csv | 630 | Номенклатура (назва, артикул, од. виміру) |
| 1c_bank.csv | 4 781 | Банківські операції (оплати від покупців) |
| 1c_osv.csv | 14 | Оборотно-сальдова відомість |
| 1c_contracts.csv | 1 519 | Договори |
| 1c_warehouses.csv | 9 | Склади |
| 1c_orgs.csv | 4 | Організації |
| 1c_staff.csv | 37 | Співробітники |
| 1c_assets.csv | 116 | Основні засоби |

#### 4. Зовнішні API (через sync.gs)
| API | Що дає | Ключ/Токен |
|---|---|---|
| НБУ | Курси EUR/USD | Публічний API |
| SendPulse | Розсилки, кампанії | Bearer token в sync.gs |
| WooCommerce | Замовлення, товари | ck/cs ключі в sync.gs |
| Meta Graph API | IG пости, FB пости, Ads | OAuth token в sync.gs |

---

## Вкладки дашборду

### P&L (Profit & Loss)
- KPI: виручка, OPEX, осн.фонди, прибуток, маржа, баланс
- Графіки: по роках / по місяцях з порівнянням з минулим роком
- Таблиці: доходи по каналах, витрати по категоріях
- Drill-down: при виборі конкретного місяця показує деталі

### Продажі
- **Свої фільтри**: рік + місяць (не глобальні)
- 8 каналів: Сети, HoReCa, Дистрибьютори, Експорт, Інтернет-магазин, Корп.клієнти, Каса БВ, Продажі на виноробні
- Клік на канал → drill-down (клієнти, міста, помісячно)
- Інтернет-магазин: нетто = сума × (1 - fop_tax% - fop_bank%)
- Менеджери: продажі, комісія, клік → модалка з деталями
- Графік: поточний рік vs попередній

### Витрати
- OPEX без осн.фондів
- Горизонтальний бар по категоріях
- Топ-5 категорій помісячно (stacked bar)
- Порівняння з минулим роком

### Основні фонди
- 3 категорії: виноробня, виноградник, транспорт
- Інвестиції по роках (stacked bar)

### Магазин (WooCommerce з Google Sheets)
Підвкладки:
- **Продажі**: виручка, замовлення, ср.чек, ФОП податки, помісячно, по тижнях, оплати, UTM
- **Продукти**: каталог з WC_Products (якщо line_items немає в Sheets)
- **Клієнти**: LTV, повторні, географія, фільтр по місту
- **Замовлення**: воронка, статуси, по містах, останні замовлення

### Склад
Підвкладки:
- **Залишки**: 3_Stock або Stock_Data (пляшки, критичні, застрявші)
- **1С Номенклатура**: 35 вин зі штрих-кодом, ОСВ (рах.28, 36, 70)

### Кеш-фло
- Баланси в 3 валютах (₴, €, $)
- Таблиця рахунків з DPD
- Вхідні vs вихідні помісячно
- Нетто та кумулятивний графік

### Маркетинг
3 секції:

**📧 Email (SendPulse)**:
- KPI: підписники, кампанії, open rate, click rate
- Графік розсилок помісячно (opened vs not opened)
- Списки, кампанії по роках, останні кампанії
- Кореляція розсилки → замовлення (±3 дні)

**📸 Instagram**:
- KPI: engagement rate, сер. лайків/reach, всього лайків/reach
- Типи контенту з порівнянням ER% (VIDEO vs CAROUSEL vs IMAGE)
- Топ-5 по лайках, Топ-5 по reach
- Engagement графік по постах
- Останні пости

**📢 Meta Ads**:
- Список кампаній з назвами, статусами, датами
- Якщо є витрати: spend, ROAS, CTR, покупки

### Партнери (1С дані)
Підвкладки:
- **Огляд**: KPI (продано/оплачено/борг), прострочені >30д, по роках, канали
- **Канали**: склади → клік → список партнерів каналу
- **Борги**: прострочені, всі боржники, сплячі, графік боргів
- **Контакти**: повна назва, ЄДРПОУ, тип, канали
- **CRM**: пошук партнера, "потрібно зателефонувати", останні оплати

Фільтр по організації: Бейкуш Вайнери / Бейкуш Ф2 / Всі
⚠ Банківські операції є тільки для Бейкуш Вайнери

### ⚠ Нерозпізнані
- Транзакції з категорією "???" або порожньою
- Експорт CSV

### ⚙ Налаштування
- ФОП ставки (єдиний податок, банк комісія)
- Ролі та доступ (матриця вкладок × ролей з чекбоксами)
- Паролі (тільки для owner)
- Користувачі
- Налаштування з Google Sheet (з історією змін)
- Курси НБУ
- Джерела даних зі статусами
- Інформація про сесію

---

## sync.gs — Синхронізація даних

### Розташування
Google Sheet (SID) → Extensions → Apps Script

### Конфігурація
Всі ключі в об'єкті `CONFIG` на початку файлу:
- SendPulse API key
- WooCommerce ck/cs
- Meta token, Page ID, IG Account ID, Ad Account ID

### Функції

| Функція | Що робить | Тригер |
|---|---|---|
| `syncAll()` | Повна синхронізація всього | Щоденно 6:00-7:00 |
| `syncWCOrdersIncremental()` | WC замовлення за 2 дні | Кожну годину |
| `syncSendPulse()` | Тільки SP (lists + campaigns) | За потреби |
| `syncWooCommerce()` | Тільки WC (orders + products) | За потреби |
| `syncAllMarketing()` | IG + FB + Meta Ads | Щоденно |
| `syncIGPosts()` | Instagram пости (100 останніх) | Щоденно |
| `syncFBPosts()` | Facebook пости (100 останніх) | Щоденно |
| `syncMetaAds()` | Meta рекламні кампанії | Щоденно |
| `discoverMetaIds()` | Показує Page/IG/Ad IDs | Одноразово |

### Налаштування тригерів
Apps Script → Triggers → Add Trigger:
1. `syncAll` → Time-driven → Day timer → 6am-7am
2. `syncWCOrdersIncremental` → Time-driven → Hour timer → Every hour
3. `syncAllMarketing` → Time-driven → Day timer → 7am-8am

---

## Оновлення даних з 1С

1. Вивантажити xlsx з 1С (Бухгалтерія для України)
2. Завантажити в GitHub репо (замінити `beykush_data.xlsx`)
3. Запустити конвертацію:
```bash
python3 -c "
import openpyxl, csv, os
wb = openpyxl.load_workbook('beykush_data.xlsx', read_only=True, data_only=True)
sheets = {'Продажи':'sales','Контрагенты':'partners','Номенклатура':'products',
          'ОСВ':'osv','Банк':'bank','Склады':'warehouses','Договоры':'contracts',
          'Организации':'orgs','Сотрудники':'staff','ОС':'assets'}
for name,eng in sheets.items():
    ws = wb[name]
    rows = list(ws.iter_rows(values_only=True))
    hdr_idx = 3 if name == 'ОСВ' else 2
    headers = [str(c).strip() if c else f'col{i}' for i,c in enumerate(rows[hdr_idx])]
    fname = f'data/1c_{eng}.csv'
    with open(fname,'w',newline='',encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(headers)
        for r in rows[hdr_idx+1:]:
            if any(c for c in r): w.writerow([str(c) if c else '' for c in r])
    print(f'{name} → {fname}')
"
```
4. Commit + push → Vercel автодеплой

---

## Оновлення Meta токену

Meta токен живе ~60 днів. Для оновлення:
1. https://developers.facebook.com/tools/explorer/
2. Вибрати додаток Beykush
3. Додати permissions: pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights
4. Generate Access Token
5. Оновити в sync.gs → CONFIG.META_TOKEN
6. Запустити syncAll() для перевірки

---

## Технічні деталі

### НДС логіка
- PRIVAT/VOSTOK доходи Україна: /1.2 (крім Експорт)
- PRIVAT/VOSTOK витрати: /1.2 (крім ЗП, Податки, Банківська)
- Експорт і 2Ф — без змін

### Кеш
- `csvF()` кешує дані в localStorage (offline fallback)
- Таймаут fetch: 8 секунд
- Якщо Google Sheets недоступний — показує закешовані дані

### Безпека
- XSS захист: `esc()` для HTML в модалках
- Сесія: 30 хв таймаут
- Паролі в config.js (видимі через View Source — обмеження static site)

### CSS конвенції
- Темна тема: bg `#0c0e13`, карточки `#151821`, border `#232738`
- Акценти: `#10b981` зелений, `#ef4444` червоний, `#f59e0b` жовтий, `#3b82f6` синій, `#9f1239` бренд
- Класи: `.kpi`, `.cc`, `.tbl`, `.row`, `.flt`, `.info`, `.warn`, `.sec`

---

## Контакти та доступи

| Ресурс | URL |
|---|---|
| Дашборд | https://project-33ms4.vercel.app |
| GitHub | https://github.com/shneyderis/BW |
| Google Sheet (основна) | SID: 1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ |
| Google Sheet (баланси) | SID2: 1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w |
| Apps Script | В основній таблиці → Extensions → Apps Script |
| Meta Developers | https://developers.facebook.com/apps/ |
| Vercel | https://vercel.com (автодеплой з GitHub) |
