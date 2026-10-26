#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Конвертер сирих даних (data/1c_*.csv) у нормалізовану структуру для міграції
в майбутню бухгалтерську програму. Запуск з кореня репозиторію:
    python3 accounting/build_export.py
Результат: accounting/export/*.csv (UTF-8 BOM, роздільник кома, дати ISO 8601,
десятковий роздільник — крапка). Схема описана в accounting/README.md.
"""
import csv, re, os, sys
from collections import defaultdict, Counter

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, "..", "data")
OUT  = os.path.join(BASE, "export")
TODAY = "2026-10-26"

def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8-sig", errors="replace") as f:
        return list(csv.DictReader(f))

def save(name, header, rows):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f); w.writerow(header); w.writerows(rows)
    print(f"  {name}: {len(rows)} рядків")

def d2iso(d):
    d = (d or "").strip().split(" ")[0]
    m = re.match(r"(\d{2})\.(\d{2})\.(\d{4})", d)
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ""

def num(s):
    s = (s or "").strip().replace("\xa0", "").replace(" ", "").replace(",", ".")
    try: return float(s)
    except ValueError: return 0.0

def norm_name(n):
    n = (n or "").lower()
    n = re.sub(r'товариство з обмеженою відповідальніст[юі]|общество с ограниченной ответственностью', '', n)
    n = re.sub(r'фізична ос[оі]ба[\s\-–]*підприємець|физическое лицо[\s\-–]*предприниматель', '', n)
    n = re.sub(r'\bтов\b|\bфоп\b|\bпп\b|\bооо\b|\bфлп\b', '', n)
    n = re.sub(r'[«»"""\'`’ʼ]', '', n)
    return re.sub(r'\s+', ' ', n).strip()

def strip_vintage(n):
    return re.sub(r'\s*20[0-3]\d\s*', ' ', n or '').strip()

def vintage_of(n):
    m = re.search(r'\b(20[0-3]\d)\b', n or '')
    return m.group(1) if m else ""

# Контур обліку: official — юрособа ТОВ «Бейкуш Вайнері»; решта — внутрішні контури
CONTOUR = {"Бейкуш Вайнери": "official", "Бейкуш Ф2": "f2", "Интернет магазин": "shop", "Дегустации": "tasting"}

PLAN291 = {
 "10":("Основні засоби","відсутній в обліку — ЗАВЕСТИ: будівлі, обладнання виноробні, транспорт"),
 "13":("Знос (амортизація) необоротних активів","відсутній — амортизація не нараховувалась"),
 "20":("Виробничі запаси","відсутній — виноград, сировина, матеріали не обліковуються"),
 "23":("Виробництво","відсутній — собівартість виноробства не калькулюється"),
 "26":("Готова продукція","відсутній — вино власного виробництва має бути тут, а не на 28"),
 "28":("Товари","використовується"),
 "30":("Готівка (каса)","використовується"),
 "31":("Рахунки в банках","використовується; списання не проводились — сальдо фіктивне"),
 "36":("Розрахунки з покупцями та замовниками","використовується"),
 "37":("Розрахунки з різними дебіторами","відсутній"),
 "38":("Резерв сумнівних боргів","використовується"),
 "40":("Зареєстрований (статутний) капітал","відсутній — капітал не відображено"),
 "44":("Нерозподілені прибутки (непокриті збитки)","відсутній — фінрезультат нікуди не закривається"),
 "63":("Розрахунки з постачальниками","відсутній — кредиторка не ведеться"),
 "64":("Розрахунки за податками й платежами","використовується"),
 "65":("Розрахунки за страхуванням (ЄСВ)","відсутній — зарплатний облік не вівся"),
 "66":("Розрахунки за виплатами працівникам","відсутній — зарплатний облік не вівся"),
 "68":("Розрахунки за іншими операціями","використовується"),
 "70":("Доходи від реалізації","використовується; не закривається на 79"),
 "71":("Інший операційний дохід","використовується; не закривається на 79"),
 "79":("Фінансові результати","використовується; не закривається на 44"),
 "90":("Собівартість реалізації","використовується; не закривається на 79"),
 "92":("Адміністративні витрати","використовується; ВІД'ЄМНЕ сальдо — помилка"),
 "93":("Витрати на збут","відсутній"),
 "94":("Інші витрати операційної діяльності","відсутній"),
 "00":("Допоміжний рахунок вводу залишків","має бути нульовим; залишок = незавершений ввід"),
}

def main():
    partners = load("1c_partners.csv"); products = load("1c_products.csv")
    sales = load("1c_sales.csv"); bank = load("1c_bank.csv")
    osv = load("1c_osv.csv"); orgs = load("1c_orgs.csv")
    staff = load("1c_staff.csv"); warehouses = load("1c_warehouses.csv")
    contracts = load("1c_contracts.csv")
    print("Нормалізація даних → accounting/export/")

    # ---------- 1. Організації ----------
    save("organizations.csv",
        ["org_id","name","full_name","edrpou","kind","contour","note"],
        [[o["Код"], o["Наименование"], o.get("Полное наименование",""), o.get("ЕДРПОУ",""),
          "legal_entity" if (o.get("ЕДРПОУ") or "").strip() else "internal_contour",
          CONTOUR.get(o["Наименование"], "other"),
          "" if (o.get("ЕДРПОУ") or "").strip() else "не юрособа; в бухпрограму переносити як окремий контур/фірму або об'єднати з основною"]
         for o in orgs])

    # ---------- 2. Контрагенти (дедуплікація) ----------
    # Групуємо: за ЄДРПОУ (якщо назви схожі), інакше за нормалізованою назвою.
    groups = []           # list of dicts {names:set, edrpou, tax, kind}
    by_edr = defaultdict(list)
    for x in partners:
        by_edr[(x.get("Код по ЕДРПОУ") or "").strip()].append(x)
    used = set()
    conflicts = []
    for e, xs in by_edr.items():
        if not e: continue
        norms = {norm_name(x["Наименование"]) for x in xs}
        if len(xs) > 1 and len(norms) > 1:
            # один ЄДРПОУ — різні особи: ймовірна помилка вводу; не зливаємо
            sim = len(set.intersection(*[set(n.split()) for n in norms])) > 0
            if not sim:
                conflicts.append((e, [x["Наименование"] for x in xs]))
                for x in xs:
                    groups.append({"names":[x["Наименование"]], "edrpou":e, "flag":"edrpou_conflict",
                                   "kind":x.get("Вид",""), "tax":x.get("Схема налогообложения","")})
                    used.add(x["Наименование"])
                continue
        groups.append({"names":[x["Наименование"] for x in xs], "edrpou":e, "flag":"" if len(xs)==1 else "merged_by_edrpou",
                       "kind":xs[0].get("Вид",""), "tax":xs[0].get("Схема налогообложения","")})
        used.update(x["Наименование"] for x in xs)
    by_norm = defaultdict(list)
    for x in partners:
        if x["Наименование"] in used: continue
        by_norm[norm_name(x["Наименование"])].append(x)
    for k, xs in by_norm.items():
        groups.append({"names":[x["Наименование"] for x in xs], "edrpou":"", "flag":"" if len(xs)==1 else "merged_by_name",
                       "kind":xs[0].get("Вид",""), "tax":xs[0].get("Схема налогообложения","")})
    # Контрагенти, що зустрічаються лише в журналах (привиди)
    known = {n for g in groups for n in g["names"]}
    ghost = sorted({(s.get("Контрагент") or "").strip() for s in sales} |
                   {(b.get("Контрагент") or "").strip() for b in bank})
    ghost = [g for g in ghost if g and g not in known]
    gmap_extra = {}
    for g in ghost:
        gn = norm_name(g)
        hit = next((gr for gr in groups if any(norm_name(n)==gn for n in gr["names"])), None)
        if hit: hit["names"].append(g)
        else: gmap_extra[g] = {"names":[g], "edrpou":"", "flag":"auto_from_journal", "kind":"", "tax":""}
    groups += list(gmap_extra.values())

    name2id, rows = {}, []
    for i, g in enumerate(sorted(groups, key=lambda g: norm_name(g["names"][0])), 1):
        cid = f"K{g['edrpou']}" if g["edrpou"] and g["flag"]!="edrpou_conflict" else f"KN{i:05d}"
        canon = max(g["names"], key=len)
        for n in g["names"]: name2id[n.strip()] = cid
        rows.append([cid, canon, g["edrpou"], g["kind"], g["tax"], g["flag"],
                     " | ".join(sorted(set(n for n in g["names"] if n != canon)))])
    save("counterparties.csv",
         ["counterparty_id","name","edrpou","kind","tax_scheme","flag","alt_names"], rows)
    save("issues_edrpou_conflicts.csv", ["edrpou","names"],
         [[e, " | ".join(v)] for e, v in conflicts])

    # ---------- 3. Номенклатура ----------
    # Канонізація: вино (без вінтажу) + вінтаж окремим полем; групування за штрих-кодом.
    sku_groups = defaultdict(list)
    for x in products:
        key = (x.get("Артикул") or "").strip() or "~" + norm_name(strip_vintage(x["Наименование"]))
        sku_groups[key].append(x)
    prows = []
    for key, xs in sorted(sku_groups.items(), key=lambda kv: kv[0]):
        base = Counter(strip_vintage(x["Наименование"]) for x in xs).most_common(1)[0][0]
        for x in xs:
            prows.append([x.get("Код",""), x["Наименование"], base, vintage_of(x["Наименование"]),
                          (x.get("Артикул") or "").strip(), x.get("Ед.",""), x.get("% НДС",""),
                          x.get("Код для НН (по-умолч.)",""),
                          "dup_sku" if len(xs)>1 and (x.get("Артикул") or "").strip() else ""])
    save("products.csv",
         ["product_code_1c","name_1c","base_wine","vintage","barcode","unit","vat_rate","nn_code","flag"], prows)

    # ---------- 4. Журнал продажів ----------
    by_doc = Counter((s.get("Номер") or "").strip() for s in sales)
    srows = []
    for s in sales:
        d = d2iso(s["Дата"]); amt = num(s.get("Сумма"))
        org = (s.get("Организация") or "").strip()
        flags = []
        if not d: flags.append("no_date")
        if d > TODAY: flags.append("future_date")
        if amt <= 0: flags.append("zero_or_negative")
        if not (s.get("Контрагент") or "").strip(): flags.append("no_counterparty")
        if not (s.get("Склад") or "").strip(): flags.append("no_warehouse")
        if by_doc[(s.get("Номер") or "").strip()] > 1: flags.append("dup_doc_no")
        srows.append([d, (s.get("Номер") or "").strip(), org, CONTOUR.get(org,"other"),
                      name2id.get((s.get("Контрагент") or "").strip(),""),
                      (s.get("Контрагент") or "").strip(), (s.get("Склад") or "").strip(),
                      f"{amt:.2f}", (s.get("Валюта") or "грн").strip(),
                      "" if (s.get("Ответственный") or "")=="<Не указан>" else (s.get("Ответственный") or "").strip(),
                      (s.get("Комментарий") or "").strip(), ";".join(flags)])
    srows.sort(key=lambda r: (r[0], r[1]))
    save("sales_journal.csv",
         ["date","doc_no","org","contour","counterparty_id","counterparty_name","warehouse",
          "amount_uah","currency","manager","comment","flags"], srows)

    # ---------- 5. Журнал банку ----------
    brows = []
    for b in bank:
        d = d2iso(b["Дата"]); inc = num(b.get("Поступление")); out = num(b.get("Списание"))
        flags = []
        if not d: flags.append("no_date")
        if d > TODAY: flags.append("future_date")
        if not (b.get("Назначение платежа") or "").strip(): flags.append("no_purpose")
        if inc and out: flags.append("both_in_out")
        if not inc and not out: flags.append("no_amount")
        brows.append([d, "in" if inc else "out", f"{(inc or out):.2f}",
                      name2id.get((b.get("Контрагент") or "").strip(),""),
                      (b.get("Контрагент") or "").strip(),
                      (b.get("Вид операции") or "").strip(), (b.get("Назначение платежа") or "").strip(),
                      (b.get("Организация") or "").strip(), (b.get("Банковский счет") or "").strip(),
                      ";".join(flags)])
    brows.sort(key=lambda r: r[0])
    save("bank_journal.csv",
         ["date","direction","amount_uah","counterparty_id","counterparty_name","op_type",
          "purpose","org","bank_account","flags"], brows)

    # ---------- 6. План рахунків + ОСВ ----------
    used_acc = {(r.get("Счет") or "").strip() for r in osv} - {"", "Итого"}
    save("chart_of_accounts.csv", ["account","name_plan291","status"],
         [[a, PLAN291[a][0], ("використовується" if a in used_acc else "") or PLAN291[a][1]]
          if a in used_acc else [a, PLAN291[a][0], PLAN291[a][1]]
          for a in sorted(PLAN291)])
    trows = []
    for r in osv:
        a = (r.get("Счет") or "").strip()
        if not a or a == "Итого": continue
        trows.append([a, PLAN291.get(a, ("?",""))[0]] +
                     [f"{num(r.get(k)):.2f}" for k in ["Сальдо нач. Дт","Сальдо нач. Кт","Обороты Дт","Обороты Кт","Сальдо кон. Дт","Сальдо кон. Кт"]])
    save("trial_balance.csv",
         ["account","name","open_dt","open_kt","turnover_dt","turnover_kt","close_dt","close_kt"], trows)

    # ---------- 7. Склади / співробітники / договори ----------
    save("warehouses.csv", ["code","name","type"],
         [[w["Код"], w["Наименование"], w.get("Тип склада","")] for w in warehouses])
    save("staff.csv", ["code","full_name","active","archived"],
         [[s["Код"], s.get("ФИО",""), s.get("Актуален",""), s.get("В архиве","")] for s in staff])
    save("contracts.csv", ["name","code","currency","counterparty_id","counterparty_name","org","kind","number","date"],
         [[c.get("Наименование",""), c.get("Код",""), c.get("Валюта",""),
           name2id.get((c.get("Контрагент") or "").strip(),""), (c.get("Контрагент") or "").strip(),
           c.get("Организация",""), c.get("Вид договора",""), c.get("Номер",""), d2iso(c.get("Дата",""))] for c in contracts])

    print("Готово. Схема полів — accounting/README.md")

if __name__ == "__main__":
    main()
