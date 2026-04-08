# Beykush Winery Dashboard — Документация

## Общее описание

Дашборд для винодельни Бейкуш — веб-приложение для мониторинга финансов, продаж, склада, маркетинга и партнёров. Работает как статический сайт на Vercel, данные читает из Google Sheets и локальных CSV файлов.

**URL**: https://project-33ms4.vercel.app
**Репозиторий**: https://github.com/shneyderis/BW
**Деплой**: автоматический через Vercel при push в main

---

## Авторизация

### Пароль (всегда работает)
| Роль | Пароль | Доступ |
|---|---|---|
| **owner** | `beykush2024` | Все вкладки |
| **manager** | `sales2024` | Продажи, Магазин, Склад, Маркетинг, Партнёры |
| **accountant** | `acc2024` | P&L, Расходы, Осн.фонды, Кеш-фло, Партнёры, Нераспознанные |

### Google Sign-In (подготовлено, не активировано)
Требует `GOOGLE_CLIENT_ID` в `js/config.js`. Для настройки:
1. `console.cloud.google.com` → APIs → Credentials → OAuth 2.0 Client ID
2. Authorized origins: `https://project-33ms4.vercel.app`
3. Вставить Client ID в config.js → `GOOGLE_CLIENT_ID`
4. Добавить пользователей в лист "Users" в Google Sheets

### Сессия
- Таймаут: 30 минут неактивности
- Сбрасывается при любом действии (клик, скролл, клавиша)
- Хранится в sessionStorage

---

## Архитектура

### Файлы проекта
```
index.html              — HTML каркас, подключение скриптов
css/style.css           — Стили (тёмная тема)
js/config.js            — Sheet IDs, пароли, роли, Google OAuth
js/data.js              — CSV загрузчик, НБУ курсы, Settings
js/app.js               — Авторизация, load(), фильтры, render(), модалки
js/tabs/pl.js           — P&L
js/tabs/sales.js        — Продажи (каналы, drill-down, менеджеры)
js/tabs/exp.js          — Расходы
js/tabs/assets.js       — Основные фонды
js/tabs/shop.js         — Магазин (4 подвкладки: продажи, продукты, клиенты, заказы)
js/tabs/stock.js        — Склад (остатки + 1С номенклатура)
js/tabs/cash.js         — Кеш-фло
js/tabs/mkt.js          — Маркетинг (Email + Instagram + Meta Ads)
js/tabs/partners.js     — Партнёры (обзор, каналы, долги, контакты, CRM)
js/tabs/unrec.js        — Нераспознанные транзакции
js/tabs/settings.js     — Настройки, роли, пользователи, источники данных
js/tabs/uk.js           — Wines of Ukraine UK (подготовлено)
vercel.json             — Vercel конфигурация (Cache-Control)
sync.gs                 — Google Apps Script для синхронизации данных
data/1c_*.csv           — CSV данные из 1С бухгалтерии
beykush_data.xlsx       — Исходный xlsx файл из 1С
```

### Источники данных

#### 1. Google Sheets — основная таблица (SID)
**ID**: `1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ`

| Лист | Что содержит | Как обновляется |
|---|---|---|
| Dashboard_Data | 5950 транзакций (доходы/расходы) | Вручную |
| 3_Stock | Остатки вин (старый формат) | Вручную |
| Stock_Data | Остатки вин (новый формат) | Вручную |
| Settings | Настройки (fop_tax, vat_rate) | Вручную |
| SP_Lists | SendPulse списки рассылок | sync.gs → syncAll() |
| SP_Campaigns | SendPulse кампании со статистикой | sync.gs → syncAll() |
| WC_Orders | WooCommerce заказы | sync.gs → syncAll() |
| WC_Products | WooCommerce товары | sync.gs → syncAll() |
| IG_Posts | Instagram посты с engagement | sync.gs → syncIGPosts() |
| Meta_Ads | Meta рекламные кампании | sync.gs → syncMetaAds() |
| FB_Posts | Facebook посты | sync.gs → syncFBPosts() |
| Sync_Log | Лог синхронизаций | Автоматически |
| Users | Пользователи для Google Auth | Вручную |

#### 2. Google Sheets — балансы (SID2)
**ID**: `1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w`

| Лист | Что содержит |
|---|---|
| PRIVAT_BALANCES | Балансы счетов (₴, €, $) |

#### 3. 1С Бухгалтерия — CSV файлы (data/)
Выгрузка из 1С "Бухгалтерия для Украины". Сконвертировано из xlsx в CSV.

| Файл | Записей | Что содержит |
|---|---|---|
| 1c_sales.csv | 11 885 | Реализации (дата, сумма, контрагент, склад) |
| 1c_partners.csv | 670 | Контрагенты (название, ЕДРПОУ, тип) |
| 1c_products.csv | 630 | Номенклатура (название, артикул, ед. измерения) |
| 1c_bank.csv | 4 781 | Банковские операции (оплаты от покупателей) |
| 1c_osv.csv | 14 | Оборотно-сальдовая ведомость |
| 1c_contracts.csv | 1 519 | Договоры |
| 1c_warehouses.csv | 9 | Склады |
| 1c_orgs.csv | 4 | Организации |
| 1c_staff.csv | 37 | Сотрудники |
| 1c_assets.csv | 116 | Основные средства |

#### 4. Внешние API (через sync.gs)
| API | Что даёт | Ключ/Токен |
|---|---|---|
| НБУ | Курсы EUR/USD | Публичный API |
| SendPulse | Рассылки, кампании | Bearer token в sync.gs |
| WooCommerce | Заказы, товары | ck/cs ключи в sync.gs |
| Meta Graph API | IG посты, FB посты, Ads | OAuth token в sync.gs |

---

## Вкладки дашборда

### P&L (Profit & Loss)
- KPI: выручка, OPEX, осн.фонды, прибыль, маржа, баланс
- Графики: по годам / по месяцам с сравнением с прошлым годом
- Таблицы: доходы по каналам, расходы по категориям
- Drill-down: при выборе конкретного месяца показывает детали

### Продажи
- **Свои фильтры**: год + месяц (не глобальные)
- 8 каналов: Сети, HoReCa, Дистрибьюторы, Экспорт, Интернет-магазин, Корп.клиенты, Касса БВ, Продажи на винодельне
- Клик на канал → drill-down (клиенты, города, помесячно)
- Интернет-магазин: нетто = сумма × (1 - fop_tax% - fop_bank%)
- Менеджеры: продажи, комиссия, клик → модалка с деталями
- График: текущий год vs предыдущий

### Расходы
- OPEX без осн.фондов
- Горизонтальный бар по категориям
- Топ-5 категорий помесячно (stacked bar)
- Сравнение с прошлым годом

### Основные фонды
- 3 категории: винодельня, виноградник, транспорт
- Инвестиции по годам (stacked bar)

### Магазин (WooCommerce из Google Sheets)
Подвкладки:
- **Продажи**: выручка, заказы, ср.чек, ФОП налоги, помесячно, по неделям, оплаты, UTM
- **Продукты**: каталог из WC_Products (если line_items нет в Sheets)
- **Клиенты**: LTV, повторные, география, фильтр по городу
- **Заказы**: воронка, статусы, по городам, последние заказы

### Склад
Подвкладки:
- **Остатки**: 3_Stock или Stock_Data (бутылки, критические, застрявшие)
- **1С Номенклатура**: 35 вин со штрих-кодом, ОСВ (сч.28, 36, 70)

### Кеш-фло
- Балансы в 3 валютах (₴, €, $)
- Таблица счетов с DPD
- Входящие vs исходящие помесячно
- Нетто и кумулятивный график

### Маркетинг
3 секции:

**📧 Email (SendPulse)**:
- KPI: подписчики, кампании, open rate, click rate
- График рассылок помесячно (opened vs not opened)
- Списки, кампании по годам, последние кампании
- Корреляция рассылки → заказы (±3 дня)

**📸 Instagram**:
- KPI: engagement rate, ср. лайков/reach, всего лайков/reach
- Типы контента с сравнением ER% (VIDEO vs CAROUSEL vs IMAGE)
- Топ-5 по лайкам, Топ-5 по reach
- Engagement график по постам
- Последние посты

**📢 Meta Ads**:
- Список кампаний с названиями, статусами, датами
- Если есть расходы: spend, ROAS, CTR, покупки

### Партнёры (данные 1С)
Подвкладки:
- **Обзор**: KPI (продано/оплачено/долг), просроченные >30д, по годам, каналы
- **Каналы**: склады → клик → список партнёров канала
- **Долги**: просроченные, все должники, спящие, график долгов
- **Контакты**: полное название, ЕДРПОУ, тип, каналы
- **CRM**: поиск партнёра, "нужно позвонить", последние оплаты

Фильтр по организации: Бейкуш Вайнери / Бейкуш Ф2 / Все
⚠ Банковские операции есть только для Бейкуш Вайнери

### ⚠ Нераспознанные
- Транзакции с категорией "???" или пустой
- Экспорт CSV

### ⚙ Настройки
- ФОП ставки (единый налог, банковская комиссия)
- Роли и доступ (матрица вкладок × ролей с чекбоксами)
- Пароли (только для owner)
- Пользователи
- Настройки из Google Sheet (с историей изменений)
- Курсы НБУ
- Источники данных со статусами
- Информация о сессии

---

## sync.gs — Синхронизация данных

### Расположение
Google Sheet (SID) → Extensions → Apps Script

### Конфигурация
Все ключи в объекте `CONFIG` в начале файла:
- SendPulse API key
- WooCommerce ck/cs
- Meta token, Page ID, IG Account ID, Ad Account ID

### Функции

| Функция | Что делает | Триггер |
|---|---|---|
| `syncAll()` | Полная синхронизация всего | Ежедневно 6:00-7:00 |
| `syncWCOrdersIncremental()` | WC заказы за 2 дня | Каждый час |
| `syncSendPulse()` | Только SP (lists + campaigns) | По необходимости |
| `syncWooCommerce()` | Только WC (orders + products) | По необходимости |
| `syncAllMarketing()` | IG + FB + Meta Ads | Ежедневно |
| `syncIGPosts()` | Instagram посты (100 последних) | Ежедневно |
| `syncFBPosts()` | Facebook посты (100 последних) | Ежедневно |
| `syncMetaAds()` | Meta рекламные кампании | Ежедневно |
| `discoverMetaIds()` | Показывает Page/IG/Ad IDs | Однократно |

### Настройка триггеров
Apps Script → Triggers → Add Trigger:
1. `syncAll` → Time-driven → Day timer → 6am-7am
2. `syncWCOrdersIncremental` → Time-driven → Hour timer → Every hour
3. `syncAllMarketing` → Time-driven → Day timer → 7am-8am

---

## Обновление данных из 1С

1. Выгрузить xlsx из 1С (Бухгалтерия для Украины)
2. Загрузить в GitHub репо (заменить `beykush_data.xlsx`)
3. Запустить конвертацию:
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

## Обновление Meta токена

Meta токен живёт ~60 дней. Для обновления:
1. https://developers.facebook.com/tools/explorer/
2. Выбрать приложение Beykush
3. Добавить permissions: pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights
4. Generate Access Token
5. Обновить в sync.gs → CONFIG.META_TOKEN
6. Запустить syncAll() для проверки

---

## Технические детали

### НДС логика
- PRIVAT/VOSTOK доходы Украина: /1.2 (кроме Экспорт)
- PRIVAT/VOSTOK расходы: /1.2 (кроме ЗП, Налоги, Банковская)
- Экспорт и 2Ф — без изменений

### Кеш
- `csvF()` кеширует данные в localStorage (offline fallback)
- Таймаут fetch: 8 секунд
- Если Google Sheets недоступен — показывает закешированные данные

### Безопасность
- XSS защита: `esc()` для HTML в модалках
- Сессия: 30 мин таймаут
- Пароли в config.js (видимы через View Source — ограничение static site)

### CSS конвенции
- Тёмная тема: bg `#0c0e13`, карточки `#151821`, border `#232738`
- Акценты: `#10b981` зелёный, `#ef4444` красный, `#f59e0b` жёлтый, `#3b82f6` синий, `#9f1239` бренд
- Классы: `.kpi`, `.cc`, `.tbl`, `.row`, `.flt`, `.info`, `.warn`, `.sec`

---

## Контакты и доступы

| Ресурс | URL |
|---|---|
| Дашборд | https://project-33ms4.vercel.app |
| GitHub | https://github.com/shneyderis/BW |
| Google Sheet (основная) | SID: 1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ |
| Google Sheet (балансы) | SID2: 1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w |
| Apps Script | В основной таблице → Extensions → Apps Script |
| Meta Developers | https://developers.facebook.com/apps/ |
| Vercel | https://vercel.com (автодеплой из GitHub) |
