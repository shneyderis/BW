# Beykush Winery Dashboard — Контекст проекта v2

## Статус: Модульная архитектура, всё работает на проде

## Репо и деплой
- GitHub: github.com/shneyderis/BW
- Деплой: Vercel — project-33ms4.vercel.app
- Структура: модульная (14 файлов)

## Структура файлов
```
index.html          — HTML + подключение скриптов (65 строк)
css/style.css       — все стили (32 строки)
js/data.js          — CSV загрузчик, WC fetch, NBU, Settings, утилиты (pn, fm, ff, gv, toCur, cs)
js/app.js           — auth, load(), filters, render(), modals, глобальные переменные
js/tabs/pl.js       — P&L
js/tabs/sales.js    — Продажи v3 (каналы, drill-down, FOP из Settings)
js/tabs/exp.js      — Расходы
js/tabs/assets.js   — Осн.фонды
js/tabs/shop.js     — Магазин (4 подвкладки: sales, products, customers, orders)
js/tabs/stock.js    — Склад (Stock_Data + 3_Stock fallback)
js/tabs/cash.js     — Кэш-фло
js/tabs/mkt.js      — Маркетинг v2 (читает из Google Sheets, не из API)
js/tabs/unrec.js    — Нераспознанные
js/tabs/settings.js — Настройки
vercel.json         — proxy rewrites для WC, SP, Meta
```

## Источники данных

### Google Sheets (основная таблица)
- **SID**: `1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ`
- `Dashboard_Data` — все транзакции (5946 операций, до 2026-04)
- `3_Stock` — склад старый формат
- `Stock_Data` — склад новый формат (пока пуст)
- `Settings` — настройки с date_from (fop_tax, fop_bank, vat_rate, nds_divisor)
- `SP_Lists` — 11 списков SendPulse (9099 подписчиков)
- `SP_Campaigns` — 148 кампаний со статистикой (open rate ~30%, click ~5%)
- `WC_Orders` — 2190 заказов WooCommerce
- `WC_Products` — 48 товаров
- `Sync_Log` — лог синхронизаций

### BW_Accounts (балансы)
- **SID2**: `1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w`
- `PRIVAT_BALANCES` — балансы (₴939K, €93K, $44K)
- Расшарена публично — работает

### Google Apps Script (sync.gs v3)
- Расположен в основной таблице → Extensions → Apps Script
- `syncAll()` — полная синхронизация (триггер: ежедневно 6:00-7:00)
- `syncWCOrdersIncremental()` — инкрементальная WC (триггер: каждый час)
- `syncSendPulse()` — только SP
- SendPulse: Bearer token auth, API key: `sp_apikey_d946cffb25603f31e60a035793c33da83a21328418b2d5d63a4bb5056022a70c`
- Статистика кампаний: поля `statistics.opening` и `statistics.link_redirected`

### WooCommerce REST API
- Через Vercel proxy: `/api/wc/:path*` → `beykush.com/wp-json/wc/v3/:path*`
- Ключи: `ck_5b87215529858139d17b602945170ae4d9c8adbd` / `cs_3ad054a505185162e849a92bf019979e6c037c93`
- Загрузка: ~957 заказов за год, пагинация по 100
- localStorage кэш с TTL 15 мин

### НБУ API
- `bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json`
- Курсы EUR (~50.32), USD (~43.58) к UAH

### Metorik
- API token: `mtk_zzh4swqgn281dl57sr7fojgnue1klerihsj1196sezd4vdco`
- Store: BW_UASHOP2
- API: `app.metorik.com/api/v1/store/` (products, categories, reports)
- Пока не интегрирован, можно использовать для агрегированных отчётов

## vercel.json
```json
{
  "rewrites": [
    { "source": "/api/wc/:path*", "destination": "https://beykush.com/wp-json/wc/v3/:path*" },
    { "source": "/api/sp/:path*", "destination": "https://api.sendpulse.com/:path*" },
    { "source": "/api/meta/:path*", "destination": "https://graph.facebook.com/v19.0/:path*" }
  ]
}
```

## Авторизация
- owner: `beykush2024` — все вкладки
- manager: `sales2024` — Продажи, Магазин, Склад, Маркетинг
- accountant: `acc2024` — P&L, Расходы, Осн.фонды, Кэш-фло
- sessionStorage для сессии

## Продажи (sales.js v3) — текущая реализация
- Свои фильтры: год + месяц (по умолчанию текущие)
- Каналы: Сети, HoReCa, Дистрибьюторы, Экспорт, Інтернет-магазин, Корп.клієнти, Каса БВ, Продажі на виноробні
- Маппинг категорий → каналов в CHAN_MAP
- Клик на канал → drill-down (клиенты + города для HoReCa и Інтернет-магазин)
- Інтернет-магазин: нетто = сумма × (1 - fop_tax% - fop_bank%), ставки из Settings с date_from
- График: бар текущий год + пунктир предыдущего, высота 220px

## Маркетинг (mkt.js v2) — текущая реализация
- Читает из Sheets (SP_Lists, SP_Campaigns), не из API
- Мгновенная загрузка
- KPI: подписчики, кампании, open rate, click rate
- Таблица по годам: кампаний, отправлено, открыто, open%
- Последние кампании с детальной статистикой
- Корреляция рассылки → WC заказы (±3 дня)

## НДС логика
- PRIVAT/VOSTOK доходы Украина: /1.2 (кроме Экспорт)
- PRIVAT/VOSTOK расходы: /1.2 (кроме ЗП, Податки, Банківська)
- Экспорт и 2Ф — без изменений

## Глобальные переменные (js/app.js)
```
T[]        — транзакции из Dashboard_Data
SK[]       — старый склад из 3_Stock
SD[]       — новый склад из Stock_Data
BL[]       — балансы из PRIVAT_BALANCES
WO[]       — WC заказы (из API, с localStorage кэшем)
WP[]       — WC продукты
WCU[]      — WC клиенты
FX{EUR,USD}— курсы НБУ
CH{}       — Chart.js инстансы
SETS{fopTax,fopBank,dispCur} — настройки UI
SETTINGS[] — настройки из листа Settings (setting_key, value, date_from)
SP{}       — SendPulse данные (lists, campaigns, totalSubs)
META{}     — Meta/IG данные (пока пусто)
wcLoaded, wcError, mktLoaded, mktError — флаги загрузки
```

## CSS-конвенции
- Тёмная тема: bg `#0c0e13`, карточки `#151821`, border `#232738`, текст `#e4e5ea`, secondary `#7d8196`
- Акценты: `#10b981` зелёный, `#ef4444` красный, `#f59e0b` жёлтый, `#3b82f6` синий, `#8b5cf6` фиолет, `#9f1239` бренд
- Классы: `.kpi`, `.cc`, `.tbl`, `.row`, `.flt`, `.info`, `.warn`, `.sec`

## 10 вкладок
P&L | Продажи | Расходы | Осн.фонды | Магазин (4 подвкладки) | Склад | Кэш-фло | Маркетинг | ⚠ Нераспознанные | ⚙ Настройки

## Что сделано (v2)
1. ✅ Модульная архитектура — 14 файлов вместо монолита
2. ✅ Google Apps Script sync.gs v3 — SP + WC в Sheets
3. ✅ SendPulse — правильный API key, статистика open/click работает
4. ✅ Settings лист с date_from для версионирования ставок
5. ✅ Балансы починены (новый SID2)
6. ✅ Маркетинг из Sheets (мгновенная загрузка)
7. ✅ Продажи v3 — каналы, drill-down, города, FOP нетто
8. ✅ Триггеры — ежедневный syncAll + почасовой WC incremental

## Что НЕ сделано / TODO
1. Meta/Instagram — токен без нужных permissions, нужно перегенерировать
2. WC в Магазине — всё ещё грузится из API (не из Sheets), медленно
3. Корреляция рассылки → заказы — WC заказы нужно брать из Sheets
4. Stock_Data пуст — новый формат склада не заполнен
5. Настройки — веб-редактирование (запись обратно в Sheet через Apps Script doPost)
6. Claude Code — не установлен, нужно начать использовать для мелких правок
7. Дизайн — можно улучшить (единообразие, анимации)
8. Глобальные фильтры vs локальные — Продажи имеют свои фильтры, остальные табы используют глобальные
