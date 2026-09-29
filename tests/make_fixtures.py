#!/usr/bin/env python3
"""
Синтетичні дані для офлайн-тестів дашборду → tests/fixtures/sheets/*.csv
Це НЕ реальні дані. Колонки повторюють реальні листи Google Sheets (див. DOCS.md).
Запуск: python3 tests/make_fixtures.py ; відкрити index.html?src=test
"""
import csv, os, random, datetime

random.seed(7)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures", "sheets")
os.makedirs(OUT, exist_ok=True)
TODAY = datetime.date(2026, 9, 29)


def w(name, header, rows):
    with open(os.path.join(OUT, name + ".csv"), "w", newline="", encoding="utf-8") as f:
        c = csv.writer(f); c.writerow(header); c.writerows(rows)
    print(f"  {name}: {len(rows)}")


def months(y0, m0, y1, m1):
    y, m = y0, m0
    while (y, m) <= (y1, m1):
        yield y, m
        m += 1
        if m > 12:
            y, m = y + 1, 1


CUST = [  # (назва в 1С/банку, alias, канал Dashboard_Data, гео, менеджер, ставка комісії у workerNEW, ЄДРПОУ)
    ("Товариство з обмеженою відповідальністю \"ВИНО І ХЛІБ\"", "Вино і Хліб", "Продаж, Horeca & Shops", "Київ", "Света", "5%", "31111111"),
    ("ТОВ \"СІЛЬПО-ФУД\"", "Сільпо", "Продаж, Мережі", "Київ", "Наташа", "3", "32222222"),
    ("Фізична особа-підприємець Коваль Ігор", "Коваль ФОП", "Продаж, Horeca & Shops", "Одеса", "Света", "0.04", "33333333"),
    ("ТОВ \"ГУД ВАЙН\"", "Good Wine", "Продаж,  Дістрібʼютор Укр", "Київ", "Таня", "", "34444444"),
    ("Wine Import GmbH", "Wine Import DE", "Продаж, Експорт", "Berlin", "Таня", "2%", ""),
    ("ТОВ \"НОВУС УКРАЇНА\"", "Novus", "Продаж, Мережі", "Київ", "Наташа", "3%", "35555555"),
    ("ТОВ \"РЕСТОРАН ОДЕСА\"", "Ресторан Одеса", "Продаж, Horeca & Shops", "Одеса", "Света", "5%", "36666666"),
    ("ТОВ \"КОРПОРАТИВ ГІФТ\"", "Корп Гіфт", "Продаж, Корп клієнт", "Львів", "", "", "37777777"),
    ("ФОП Мельник Оксана", "Мельник ФОП", "Продаж, Horeca & Shops", "Львів", "Таня", "", "38888888"),
    ("ТОВ \"ВИННИЙ СИНДИКАТ\"", "Винний синдикат", "Продаж,  Дістрібʼютор Укр", "Дніпро", "Наташа", "4%", "39999999"),
]
WINES = ["Beykush Chardonnay 2023", "Beykush Chardonnay 2024", "Artania Red 2022", "Artania Rose 2024", "Kara Kermen Blanc 2021",
         "Beresagne Brut 2020", "Loca Deserta Riesling 2023", "Yafe Nagar Pinot 2022", "Beykush Timorasso 2023", "Artania White 2024"]
EXP_CATS = [("ЗП менеджерів", 60000), ("ЗП Виноробня", 90000), ("ЗП Виноградник", 70000), ("BW Света", 25000), ("BW Наташа", 24000), ("BW Таня", 22000),
            ("Податки", 80000), ("Банківська комісія", 4000), ("Маркетинг", 30000), ("Пляшки, етикетки, корки", 60000), ("Оренда", 20000),
            ("Логістика", 25000), ("Виноградник: агрохімія", 35000), ("Обладнання виноробні", 40000), ("Комунальні", 15000)]

# ---- Dashboard_Data (2024-01 .. 2026-08) ----
rows = []
for y, m in months(2024, 1, 2026, 8):
    season = 1 + 0.35 * (1 if m in (11, 12, 4, 5) else 0) - 0.2 * (1 if m in (1, 2) else 0)
    grow = 1 + (y - 2024) * 0.15
    for name, alias, cat, geo, mgr, rate, edr in CUST:
        n = random.randint(1, 3)
        for _ in range(n):
            amt = round(random.uniform(15000, 90000) * season * grow, 2)
            src = "PRIVAT" if cat != "Продаж, Експорт" else "2fMK"
            money = "EUR" if cat == "Продаж, Експорт" else "UAH"
            com = round(amt / 1.2 * 0.05, 2) if (mgr == "Света" and random.random() < 0.5) else ""
            rows.append([f"{y}{m:02d}", money, name, alias, cat, geo, mgr, amt, com, round(amt / 48.5, 2) if money == "EUR" else "", src])
    for _ in range(random.randint(25, 45)):   # інтернет-магазин ФОП + каса
        cat = random.choice(["Доход, ФОП", "Доход, каса БВ", "Продаж, Інтернет магазини"])
        rows.append([f"{y}{m:02d}", "UAH", "Покупець " + str(random.randint(1, 999)), "", cat, "Київ", "", round(random.uniform(800, 6000), 2), "", "", "PRIVAT" if cat != "Доход, ФОП" else "2fKiev"])
    for cat, base in EXP_CATS:
        if cat.startswith("Обладнання") and random.random() < 0.6:
            continue
        rows.append([f"{y}{m:02d}", "UAH", "Постачальник " + cat[:10], "", cat, "", "", -round(base * random.uniform(0.7, 1.3) * grow, 2), "", "", "PRIVAT"])
    if random.random() < 0.4:
        rows.append([f"{y}{m:02d}", "UAH", "НЕВІДОМИЙ КОНТРАГЕНТ " + str(random.randint(1, 9)), "", "???", "", "", round(random.uniform(-9000, 9000), 2), "", "", "PRIVAT"])
w("Dashboard_Data", ["month", "money", "name", "alias", "category", "geo", "менеджер", "sum_uah", "commission", "sum_money", "source"], rows)

# ---- PRIVAT_BALANCES ----
w("PRIVAT_BALANCES", ["рахунок", "валюта", "баланс", "dpd"], [["Приват ₴ основний", "UAH", 912345.5, "2026-09-28"], ["Приват € ", "EUR", 88000, "2026-09-28"], ["Приват $", "USD", 41000, "2026-09-28"], ["Восток ₴", "UAH", 120500, "2026-09-28"]])

# ---- 3_Stock (старий формат) ----
w("3_Stock", ["вино", "урожай", "остаток", "продано", "сред", "запас"],
  [["Beykush Chardonnay", "2024", 3200, 1800, 220, "14.5"], ["Artania Red", "2022", 260, 4100, 310, "0.8"], ["Artania Rose", "2024", 900, 2200, 400, "2.2"],
   ["Kara Kermen Blanc", "2021", 5400, 600, 40, "N/A"], ["Beresagne Brut", "2020", 700, 900, 60, "11.6"], ["Loca Deserta Riesling", "2023", 150, 1300, 120, "1.2"],
   ["Yafe Nagar Pinot", "2022", 2000, 800, 70, "28.5"], ["Beykush Timorasso", "2023", 400, 500, 55, "7.2"]])

# ---- Settings ----
w("Settings", ["setting_key", "value", "date_from", "description"],
  [["fop_tax", "5", "2024-01-01", "Єдиний податок ФОП %"], ["fop_bank", "2.5", "2024-01-01", "Банк процесинг ФОП %"], ["fop_tax", "6", "2026-01-01", "Єдиний податок ФОП % (з 2026)"],
   ["vat_rate", "20", "2024-01-01", "ПДВ %"], ["nds_divisor", "1.2", "2024-01-01", "Дільник ПДВ"], ["mgr_commission_default", "3", "2025-01-01", "Комісія менеджера за замовчуванням %"]])

# ---- WC_Orders / WC_Products ----
rows = []
oid = 5000
d = datetime.date(2025, 1, 3)
while d <= datetime.date(2026, 9, 27):
    for _ in range(random.randint(0, 4)):
        oid += 1
        st = random.choices(["completed", "processing", "cancelled", "refunded", "pending"], [70, 10, 12, 3, 5])[0]
        items = "; ".join(f"{random.choice(WINES)} x{random.randint(1, 4)}" for _ in range(random.randint(1, 3)))
        rows.append([oid, f"{d}T{random.randint(9, 21):02d}:{random.randint(0, 59):02d}:00", st, round(random.uniform(600, 5000), 2), "UAH", "liqpay", "LiqPay",
                     random.choice(["Олена", "Ігор", "Марія", "Андрій", "Ірина", "Тарас"]), random.choice(["К.", "П.", "Ш.", "М."]), f"user{random.randint(1, 260)}@example.com",
                     random.choice(["Київ", "Одеса", "Львів", "Дніпро", "Миколаїв", "Харків"]), "UA", "", "", "UA", random.choice(["direct", "instagram", "email", "google", ""]), items.count(";") + 1, items, "", ""])
    d += datetime.timedelta(days=1)
w("WC_Orders", ["id", "date_created", "status", "total", "currency", "payment_method", "payment_method_title", "billing_first_name", "billing_last_name", "billing_email", "billing_city", "billing_country", "billing_phone", "shipping_city", "shipping_country", "utm_source", "items_count", "items_detail", "coupon_codes", "customer_note"], rows)
w("WC_Products", ["id", "name", "sku", "status", "price", "regular_price", "sale_price", "stock_quantity", "stock_status", "categories", "total_sales"],
  [[100 + i, wn, f"SKU{i}", "publish", 450 + i * 40, 450 + i * 40, 0, random.choice([0, 3, 12, 40, 120]), random.choice(["instock", "instock", "instock", "outofstock"]), random.choice(["Біле", "Червоне", "Ігристе"]), random.randint(10, 900)] for i, wn in enumerate(WINES)])

# ---- SendPulse ----
w("SP_Lists", ["id", "name", "all_count", "active_count", "inactive_count", "created_at"], [[1, "Клієнти магазину", 6200, 5900, 300, "2021-03-01"], [2, "HoReCa", 800, 780, 20, "2022-05-10"], [3, "Дегустації", 2100, 2000, 100, "2023-01-15"]])
rows = []
for i, (y, m) in enumerate(months(2024, 1, 2026, 9)):
    for k in range(random.randint(1, 2)):
        sent = random.randint(5000, 8500); op = int(sent * random.uniform(0.18, 0.34)); cl = int(sent * random.uniform(0.02, 0.06))
        rows.append([1000 + i * 3 + k, f"Розсилка {MN if False else ''}{y}-{m:02d} #{k+1}", "sent", f"{y}-{m:02d}-{random.randint(3, 26):02d} 10:00:00", "Beykush", "hello@beykush.com", sent, sent, sent, op, cl, random.randint(2, 20), 0, random.randint(5, 40), round(op / sent * 100, 1), round(cl / sent * 100, 1)])
w("SP_Campaigns", ["id", "name", "status", "send_date", "sender_name", "sender_email", "all_count", "sent_count", "delivered", "opened", "clicked", "unsubscribed", "complained", "bounced", "open_rate", "click_rate"], rows)

# ---- IG_Posts ----
rows = []
d = datetime.date(2026, 3, 1)
i = 0
while d <= datetime.date(2026, 9, 20):
    if random.random() < 0.35:
        i += 1
        t = random.choice(["IMAGE", "CAROUSEL_ALBUM", "VIDEO"]); reach = random.randint(900, 9000); likes = int(reach * random.uniform(0.02, 0.09))
        rows.append([f"ig{i}", f"{d}T12:00:00+0000", f"Пост про {random.choice(['врожай', 'дегустацію', 'нове вино', 'подію', 'команду'])} #{i}", t, "https://instagram.com/p/x", likes, random.randint(0, 40), reach, random.randint(0, 60), likes + 10, ""])
    d += datetime.timedelta(days=1)
w("IG_Posts", ["id", "timestamp", "caption", "media_type", "permalink", "like_count", "comments_count", "reach", "saved", "engagement", "media_url"], rows)

# ---- FINAL_sales_detail (2024-01 .. 2026-08) ----
rows = []
doc = 1
for y, m in months(2024, 1, 2026, 8):
    for name, alias, cat, geo, mgr, rate, edr in CUST + [("Інтернет магазин", "", "", "", "", "", "")] * 2:
        for _ in range(random.randint(1, 3)):
            doc += 1
            day = random.randint(1, 28)
            for _ in range(random.randint(1, 4)):
                wn = random.choice(WINES); q = random.randint(6, 120); p = random.choice([290, 350, 420, 480, 650, 900])
                rows.append([f"{y}-{m:02d}-{day:02d}", f"БВ00-{doc:06d}", name, random.choice(["Склад Н", "Склад К", "Без акциза"]), wn, f"P{WINES.index(wn):03d}", q, p, q * p, round(q * p / 6, 2)])
w("FINAL_sales_detail", ["date", "document", "customer", "warehouse", "product", "product code", "quantity", "price", "sum", "vat"], rows)

# ---- workerNEW ----
w("workerNEW", ["F", "ALIAS", "CATEGORY", "GEO", "Менеджер", "Контактное лицо", "Tel", "EDRPOU", "ЗНИЖКА", "Коміссія Фінальна"],
  [[name, alias, {"Продаж, Horeca & Shops": "HoReCa", "Продаж, Мережі": "Мережі", "Продаж,  Дістрібʼютор Укр": "Дистр", "Продаж, Експорт": "Експорт", "Продаж, Корп клієнт": "Корп"}[cat], geo, mgr, f"Контакт {alias}", f"+38050{random.randint(1000000, 9999999)}", edr, "10%", rate] for name, alias, cat, geo, mgr, rate, edr in CUST])

# ---- Sync_Log ----
rows = []
for k in range(1, 12):
    dt = TODAY - datetime.timedelta(days=k)
    rows += [["SendPulse Lists", "3 lists", f"{dt} 06:05:11"], ["SendPulse Campaigns", "58 campaigns", f"{dt} 06:06:40"], ["WC Orders", "2211 orders", f"{dt} 06:09:02"], ["WC Products", "48 products", f"{dt} 06:09:30"], ["Settings", "OK", f"{dt} 06:09:31"],
             ["IG Posts", "50 posts", f"{dt} 07:02:00"], ["FB Posts", "ERROR: Page API 190: token expired", f"{dt} 07:02:30"], ["Meta Ads", "12 campaigns", f"{dt} 07:03:00"]]
rows += [["UK Orders", "37 UK orders", f"{TODAY - datetime.timedelta(days=9)} 07:10:00"], ["UK Products", "14 UK products", f"{TODAY - datetime.timedelta(days=9)} 07:10:20"]]
w("Sync_Log", ["source", "result", "timestamp"], rows)

# ---- UK ----
rows = []
for i in range(37):
    dt = datetime.date(2026, 4, 1) + datetime.timedelta(days=random.randint(0, 150))
    rows.append([9000 + i, f"{dt}T14:00:00", random.choice(["completed", "completed", "processing", "cancelled"]), round(random.uniform(30, 260), 2), "GBP", "John", "S.", f"uk{i}@example.co.uk", random.choice(["London", "Manchester", "Bristol"]), "GB", "Beykush Chardonnay x2", ""])
w("UK_Orders", ["id", "date_created", "status", "total", "currency", "billing_first_name", "billing_last_name", "billing_email", "billing_city", "billing_country", "items_detail", "utm_source"], rows)
w("UK_Products", ["id", "name", "sku", "price", "stock_quantity", "stock_status", "total_sales", "categories"], [[700 + i, wn, f"UK{i}", 18 + i, random.choice([0, 4, 30]), "instock", random.randint(1, 60), "Wine"] for i, wn in enumerate(WINES[:6])])

# ---- CRM_Leads ----
w("CRM_Leads", ["company", "contact", "phone", "email", "stage", "source", "date", "value", "next", "notes"],
  [["Ресторан «Тераса»", "Марія", "+380501112233", "", "new", "Instagram", "2026-09-05", 50000, "Надіслати прайс", "Цікавить Chardonnay"], ["Wine Bar Lviv", "Олексій", "+380671112233", "bar@example.com", "negotiate", "Виставка", "2026-08-20", 120000, "Дзвінок 30.09", ""],
   ["Готель Одеса", "Ігор", "", "", "won", "Рекомендація", "2026-07-10", 35000, "", "Перше замовлення"], ["Бар «Дрова»", "", "", "", "lost", "Instagram", "2026-06-01", 20000, "", "Обрали іншого"]])

# ---- Payroll / Payroll_Adj ----
w("Payroll", ["employee", "role", "manager_name", "base", "currency", "commission_pct", "zp_category", "date_from", "active", "notes"],
  [["Світлана", "manager", "Света", 18000, "UAH", 5, "BW Света", "2025-01-01", "true", "HoReCa"], ["Світлана", "manager", "Света", 20000, "UAH", 5, "BW Света", "2026-03-01", "true", "підвищення"],
   ["Наталія", "manager", "Наташа", 20000, "UAH", 3, "BW Наташа", "2025-01-01", "true", "мережі"], ["Тетяна", "manager", "Таня", 500, "EUR", 2, "BW Таня", "2025-01-01", "true", "експорт/дистр"],
   ["Виноробня (бригада)", "staff", "", 90000, "UAH", "", "ЗП Виноробня", "2025-01-01", "true", ""], ["Виноградник (бригада)", "staff", "", 70000, "UAH", "", "ЗП Виноградник", "2025-01-01", "true", ""], ["Колишній", "staff", "", 10000, "UAH", "", "", "2024-01-01", "false", "звільнений"]])
w("Payroll_Adj", ["employee", "month", "type", "amount", "note"], [["Світлана", "2026-08", "bonus", 3000, "план виконано"], ["Світлана", "2026-08", "advance", 5000, "аванс 15.08"], ["Наталія", "2026-08", "deduction", 1200, "лікарняний"]])

# ---- Users ----
w("Users", ["email", "name", "role", "tabs", "phone", "active"], [["owner@example.com", "Owner", "owner", "", "", "true"]])
print("fixtures →", OUT)
