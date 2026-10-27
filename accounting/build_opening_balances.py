#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Чернетка початкових залишків для переходу в нову бухпрограму (ТОВ «Бейкуш Вайнері»).
Запуск: python3 accounting/build_opening_balances.py
Джерела:
  data/book/privat_balances.csv — реальні залишки рахунків Привату (лист PRIVAT_BALANCES)
  accounting/export/bank_postings_daily.csv — журнал проводок (оцінка залишку Востоку, оплати покупців)
  data/1c_sales.csv + data/1c_partners.csv — накладні до 02.04.2026 (дебіторка)
  data/book/stock_data.csv — залишки складу (пляшки)
  data/lots.csv — вино в ємностях (літри)
Вихід: export/opening_balances_draft.csv, export/receivables_draft.csv
Це ЧЕРНЕТКА: суми з позначкою estimated/incomplete вимагають інвентаризації.
"""
import csv, re, os
from collections import defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
D = lambda *p: os.path.join(BASE, "..", *p)
OUT = D("accounting", "export") if False else os.path.join(BASE, "export")
ASOF = "2026-10-26"
VOSTOK_ACC = "UA193071230000026008010786313"

def num(s):
    s = (s or "").strip().replace("\xa0", "").replace(" ", "")
    s = s.replace(",", ".") if s.count(",") == 1 and s.count(".") == 0 else s.replace(",", "")
    try: return float(s)
    except ValueError: return 0.0

def norm_name(n):
    n = (n or "").lower().replace("i", "і").replace("ы", "и").replace("э", "е")
    n = re.sub(r'товариство з обмеженою відповідальніст[юі]|фізична ос[оі]ба[\s\-–]*підприємець', '', n)
    n = re.sub(r'\bтов\b|\bфоп\b|\bпп\b|\bпат\b', '', n)
    n = re.sub(r'[«»"""\'`’_,]', '', n)
    return re.sub(r'\s+', ' ', n).strip()

BANK_EDRPOU = {"14360570", "26237202"}  # ПриватБанк, Банк Восток (транзит/еквайринг)
SALES_FROM = "2020-07-01"  # накладні в 1С починаються з цієї дати — оплати раніше не зіставляються

def main():
    rows_out = []
    def add(section, item, value, unit, source, note=""):
        rows_out.append([section, item, value, unit, source, note])

    # --- 1. Гроші ---
    with open(D("data","book","privat_balances.csv"), encoding="utf-8") as f:
        bal = [r for r in csv.DictReader(f) if (r.get("Номер рахунку") or "").startswith("UA")]
    for b in bal:
        v = num(b["Баланс"])
        if v == 0: continue
        acc = "311" if b["Валюта"] == "UAH" else "312"
        add(f"Гроші (рах.{acc})", f'{b["Номер рахунку"]} ({b["Валюта"]})', f"{v:.2f}", b["Валюта"],
            "BW_accounts → PRIVAT_BALANCES", f'станом на {b.get("DPD","")[:10]}')
    # Восток: оцінка = сума всіх рухів журналу (рахунок відкрито в 2020 з нуля)
    vostok = 0.0
    with open(os.path.join(OUT, "bank_postings_daily.csv"), encoding="utf-8-sig") as f:
        journal = list(csv.DictReader(f))
    for r in journal:
        if r["bank_account"] == VOSTOK_ACC:
            vostok += float(r["amount_uah"]) * (1 if r["direction"] == "in" else -1)
    add("Гроші (рах.311)", f"{VOSTOK_ACC} (UAH, Банк Восток)", f"{vostok:.2f}", "UAH",
        "розрахунок із журналу проводок", "ОЦІНКА (рух з 2020) — звірити з випискою банку")

    # --- 2. Дебіторка покупців ---
    with open(D("data","1c_partners.csv"), encoding="utf-8-sig") as f:
        partners = list(csv.DictReader(f))
    name2edr = { (p.get("Наименование") or "").strip(): (p.get("Код по ЕДРПОУ") or "").strip() for p in partners }
    sold_e, sold_n = defaultdict(float), defaultdict(float)
    canon = {}
    with open(D("data","1c_sales.csv"), encoding="utf-8-sig") as f:
        for s in csv.DictReader(f):
            if (s.get("Организация") or "").strip() != "Бейкуш Вайнери": continue
            cp = (s.get("Контрагент") or "").strip()
            v = num(s.get("Сумма"))
            e = name2edr.get(cp, "")
            if e: sold_e[e] += v; canon.setdefault(e, cp)
            else: k = norm_name(cp); sold_n[k] += v; canon.setdefault(k, cp)
    paid_e, paid_n = defaultdict(float), defaultdict(float)
    transit = 0.0
    sold_keys = list(sold_n.keys())
    for r in journal:
        if r["direction"] != "in" or r["kt"] not in ("361", "362"): continue
        if r["date"] < SALES_FROM: continue
        v = float(r["amount_uah"])
        e = (r["edrpou"] or "").strip()
        name = r["counterparty"]
        if e in BANK_EDRPOU or "транзит" in name.lower():
            transit += v; continue
        # експортні зачислення йдуть із власним ЄДРПОУ — платника беремо з «From …» у призначенні
        if r["kt"] == "362" or e == "37992910":
            frm = re.match(r"\s*from\s+(.{3,40})", (r["purpose"] or "").lower())
            if frm:
                blob = norm_name(frm.group(1))
                hit = next((k for k in sold_keys if k.split() and len(k.split()[0]) > 4 and k.split()[0][:10] in blob), None)
                if hit: paid_n[hit] += v; continue
            transit += v; continue
        if e and (e in sold_e): paid_e[e] += v
        else:
            k = norm_name(name)
            if k in sold_n: paid_n[k] += v
            elif e: paid_e[e] += v; canon.setdefault(e, name)
            else: paid_n[k] += v; canon.setdefault(k, name)
    INTERNAL = ["інтернет", "интернет", "конечный", "кінцевий", "корпорат", "дегустац", "банк восток", "приватбанк"]
    recv = []
    for key in set(sold_e) | set(paid_e) | set(sold_n) | set(paid_n):
        sold = sold_e.get(key, 0) + sold_n.get(key, 0)
        paid = paid_e.get(key, 0) + paid_n.get(key, 0)
        name = canon.get(key, key)
        if any(x in name.lower() for x in INTERNAL): continue
        d = sold - paid
        if abs(d) < 1000: continue
        recv.append([name, key if re.match(r"^\d+$", str(key)) else "", f"{sold:.2f}", f"{paid:.2f}", f"{d:.2f}"])
    recv.sort(key=lambda r: -abs(float(r[4])))
    with open(os.path.join(OUT, "receivables_draft.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f); w.writerow(["counterparty","edrpou","sold_uah_to_2026-04","paid_uah_to_2026-10","balance_uah"])
        w.writerows(recv)
    debt = sum(float(r[4]) for r in recv if float(r[4]) > 0)
    over = -sum(float(r[4]) for r in recv if float(r[4]) < 0)
    add("Дебіторка (рах.361)", f"борги покупців ({sum(1 for r in recv if float(r[4])>0)} контрагентів)",
        f"{debt:.2f}", "UAH", "1c_sales (до 02.04.2026) − оплати журналу (до 26.10.2026)",
        "НЕПОВНА: накладні після 04.2026 відсутні; деталі в receivables_draft.csv")
    add("Аванси отримані (рах.681)", f"переплати покупців ({sum(1 for r in recv if float(r[4])<0)} контрагентів)",
        f"{over:.2f}", "UAH", "те саме", "оплат більше ніж накладних — непроведені продажі або аванси")
    add("Дебіторка (рах.361)", "еквайринг/транзит — надходження без контрагента",
        f"{transit:.2f}", "UAH", "журнал проводок (транзитні рахунки банків, нерозпізнані From)",
        "виручка, не рознесена по покупцях — каса/еквайринг/валютний транзит")

    # --- 3. Склад (пляшки) ---
    stock, last_d = defaultdict(float), ""
    with open(D("data","book","stock_data.csv"), encoding="utf-8") as f:
        srows = list(csv.DictReader(f))
    for r in srows:
        if (r.get("type") or "").lower() != "balance": continue
        d = (r.get("date") or "")[:10]
        w = (r.get("wine") or "").strip()
        if d >= (stock and "" or ""):
            pass
    # останній balance по кожному вину
    per = {}
    for r in srows:
        if (r.get("type") or "").lower() != "balance": continue
        w = (r.get("wine") or "").strip(); d = (r.get("date") or "")[:10]
        if w and (w not in per or d > per[w][0]): per[w] = (d, num(r.get("qty")))
    bottles = sum(q for _, q in per.values())
    last_d = max((d for d, _ in per.values()), default="")
    add("Готова продукція (рах.26/28)", f"пляшки на складі ({len(per)} позицій)", f"{bottles:.0f}", "пляшок",
        "BW_Looker_Data → Stock_Data", f"станом на {last_d}; ОЦІНИТИ в грн за собівартістю при інвентаризації")

    # --- 4. Вино в ємностях ---
    liters = 0.0
    with open(D("data","lots.csv"), encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            liters += num(r.get("Volume (liters)"))
    add("Незавершене виробництво (рах.23)", "вино в ємностях/бочках", f"{liters:.0f}", "літрів",
        "data/lots.csv (InnoVint)", f"~{liters/0.75:.0f} пляшок; оцінка собівартості — при інвентаризації")

    # --- 5. Основні засоби за фінзвітністю ---
    rf_path = D("data", "reported_financials.csv")
    if os.path.exists(rf_path):
        rf = {int(r["year"]): r for r in csv.DictReader(open(rf_path, encoding="utf-8-sig"))}
        last_y = max(rf)
        osv = float(rf[last_y]["fixed_assets_1010_kuah"]) * 1000
        add("Основні засоби (рах.10/13)", f"залишкова вартість за фінзвітом {last_y}", f"{osv:.2f}", "UAH",
            f"фінзвітність (ряд.1010 на 31.12.{last_y})", "стартова оцінка; пооб'єктний реєстр ОЗ все одно потрібен")

    # --- 6. Чого бракує ---
    for item, why in [
        ("Каса (рах.301)", "видачі готівки з банку відомі (див. журнал, flag cash_review), залишок каси — лише інвентаризацією"),
        ("Кредиторка постачальникам (рах.631)", "немає реєстру вхідних накладних — акти звірки з ключовими постачальниками"),
        ("Реєстр ОЗ пооб'єктно", "балансова вартість відома з фінзвіту; перелік об'єктів (трактор, обладнання, виноградник→рах.16) з датами і вартістю — скласти"),
        ("Кредити/позики (рах.60/68)", "у журналі є платежі 'кредит/відсотки' — звірити залишок боргу з договорами"),
        ("Статутний капітал (рах.40)", "взяти зі статуту"),
    ]:
        add("ВІДСУТНІ ДАНІ", item, "", "", "", why)

    with open(os.path.join(OUT, "opening_balances_draft.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["section","item","value","unit","source",f"note (станом на {ASOF})"])
        w.writerows(rows_out)
    print(f"opening_balances_draft.csv: {len(rows_out)} рядків; receivables_draft.csv: {len(recv)} контрагентів")
    print(f"Борги покупців: {debt:,.0f} грн · переплати: {over:,.0f} грн · пляшок: {bottles:.0f} · літрів: {liters:.0f}")

if __name__ == "__main__":
    main()
