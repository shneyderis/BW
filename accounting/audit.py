#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Аудит даних 1С (data/1c_*.csv) — якість ведення обліку.
Запуск: python3 accounting/audit.py   (з кореня репозиторію)
Друкує звіт у stdout; --csv <dir> додатково пише таблиці проблем.
"""
import csv, re, sys, os
from collections import defaultdict, Counter

DATA = os.path.join(os.path.dirname(__file__), "..", "data")
TODAY = "2026-10-26"

def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8-sig", errors="replace") as f:
        return list(csv.DictReader(f))

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
    n = re.sub(r'фізична особа[\s\-–]*підприємець|физическое лицо[\s\-–]*предприниматель', '', n)
    n = re.sub(r'\bтов\b|\bфоп\b|\bпп\b|\bтм\b|\bооо\b|\bфлп\b', '', n)
    n = re.sub(r'[«»"""\'`’]', '', n)
    return re.sub(r'\s+', ' ', n).strip()

# План рахунків (Інструкція Мінфіну №291 від 30.11.1999) — назви вживаних і обов'язкових рахунків
PLAN291 = {
 "00":"Допоміжний (позабалансовий ввід залишків)","10":"Основні засоби","11":"Інші необоротні матеріальні активи",
 "13":"Знос необоротних активів","20":"Виробничі запаси","22":"МШП","23":"Виробництво","26":"Готова продукція",
 "27":"Продукція с/г виробництва","28":"Товари","30":"Готівка (каса)","31":"Рахунки в банках","33":"Інші кошти",
 "36":"Розрахунки з покупцями","37":"Розрахунки з різними дебіторами","38":"Резерв сумнівних боргів",
 "39":"Витрати майбутніх періодів","40":"Зареєстрований капітал","44":"Нерозподілені прибутки (збитки)",
 "63":"Розрахунки з постачальниками","64":"Розрахунки за податками","65":"Розрахунки за страхуванням",
 "66":"Розрахунки за виплатами працівникам","68":"Розрахунки за іншими операціями","69":"Доходи майбутніх періодів",
 "70":"Доходи від реалізації","71":"Інший операційний дохід","79":"Фінансові результати",
 "90":"Собівартість реалізації","92":"Адміністративні витрати","93":"Витрати на збут","94":"Інші операційні витрати","95":"Фінансові витрати",
}
MUST_HAVE = ["10","13","20","23","26","63","66","65","40","44","93"]  # чого чекаємо від виноробні з 14 співробітниками

def main():
    out_dir = None
    if "--csv" in sys.argv:
        out_dir = sys.argv[sys.argv.index("--csv") + 1]
        os.makedirs(out_dir, exist_ok=True)
    issues_csv = {}

    partners = load("1c_partners.csv")
    products = load("1c_products.csv")
    sales    = load("1c_sales.csv")
    bank     = load("1c_bank.csv")
    osv      = load("1c_osv.csv")
    orgs     = load("1c_orgs.csv")
    staff    = load("1c_staff.csv")
    contracts= load("1c_contracts.csv")

    R = []  # report lines
    def h(t): R.append("\n" + "="*72); R.append(t); R.append("="*72)
    def p(t=""): R.append(t)

    h("1. ОРГАНІЗАЦІЇ (структура обліку)")
    legal = [o for o in orgs if (o.get("ЕДРПОУ") or "").strip()]
    pseudo = [o for o in orgs if not (o.get("ЕДРПОУ") or "").strip()]
    p(f"Юросіб з ЄДРПОУ: {len(legal)} — " + ", ".join(f"{o['Наименование']} ({o['ЕДРПОУ']})" for o in legal))
    p(f"«Організацій» без ЄДРПОУ: {len(pseudo)} — " + ", ".join(o['Наименование'] for o in pseudo))
    p("ПРОБЛЕМА: «Бейкуш Ф2», «Дегустации», «Интернет магазин» — не юрособи, а окремі контури обліку.")
    by_org_sales = Counter(); by_org_sum = Counter()
    for s in sales:
        o = s.get("Организация") or "(порожньо)"
        by_org_sales[o] += 1; by_org_sum[o] += num(s.get("Сумма"))
    p("Продажі по «організаціях»:")
    for o, c in by_org_sales.most_common():
        p(f"  {o:25s} {c:6d} док. на {by_org_sum[o]:>15,.0f}")

    h("2. КОНТРАГЕНТИ (довідник: %d карток)" % len(partners))
    no_edr = [x for x in partners if not (x.get("Код по ЕДРПОУ") or "").strip()]
    p(f"Без ЄДРПОУ: {len(no_edr)} з {len(partners)} ({len(no_edr)*100//max(1,len(partners))}%)")
    by_edr = defaultdict(list)
    for x in partners:
        e = (x.get("Код по ЕДРПОУ") or "").strip()
        if e: by_edr[e].append(x["Наименование"])
    dup_edr = {e: v for e, v in by_edr.items() if len(v) > 1}
    p(f"Дублі за ЄДРПОУ (один код — кілька карток): {len(dup_edr)}")
    for e, v in sorted(dup_edr.items())[:15]:
        p(f"  ЄДРПОУ {e}: " + " | ".join(v))
    by_nm = defaultdict(list)
    for x in partners: by_nm[norm_name(x["Наименование"])].append(x["Наименование"])
    dup_nm = {k: v for k, v in by_nm.items() if len(v) > 1 and k}
    p(f"Дублі за нормалізованою назвою: {len(dup_nm)}")
    for k, v in list(sorted(dup_nm.items()))[:15]:
        p("  " + " | ".join(v))
    no_tax = [x for x in partners if not (x.get("Схема налогообложения") or "").strip()]
    p(f"Без схеми оподаткування: {len(no_tax)}")
    pset = {x["Наименование"].strip() for x in partners}
    ghost_s = {s["Контрагент"].strip() for s in sales if (s.get("Контрагент") or "").strip() and s["Контрагент"].strip() not in pset}
    ghost_b = {b["Контрагент"].strip() for b in bank if (b.get("Контрагент") or "").strip() and b["Контрагент"].strip() not in pset}
    p(f"Контрагенти у продажах, відсутні в довіднику: {len(ghost_s)}")
    p(f"Контрагенти у банку, відсутні в довіднику: {len(ghost_b)}")
    issues_csv["dup_counterparties.csv"] = [("edrpou","names")] + [(e, " | ".join(v)) for e, v in sorted(dup_edr.items())] + [("~name~"," | ".join(v)) for k,v in sorted(dup_nm.items())]

    h("3. НОМЕНКЛАТУРА (довідник: %d позицій)" % len(products))
    by_sku = defaultdict(list)
    for x in products:
        a = (x.get("Артикул") or "").strip()
        if a: by_sku[a].append(x["Наименование"])
    dup_sku = {a: v for a, v in by_sku.items() if len(v) > 1}
    p(f"Зі штрих-кодом: {sum(len(v) for v in by_sku.values())}; без штрих-коду: {len(products)-sum(len(v) for v in by_sku.values())}")
    p(f"Дублі за штрих-кодом (одна й та сама позиція заведена кілька разів): {len(dup_sku)}")
    extra_cards = sum(len(v)-1 for v in dup_sku.values())
    p(f"Зайвих карток через дублі: {extra_cards}")
    for a, v in list(sorted(dup_sku.items(), key=lambda x:-len(x[1])))[:10]:
        p(f"  {a}: {len(v)} карток — " + " | ".join(sorted(set(v))[:3]) + ("…" if len(set(v))>3 else ""))
    no_vat = [x for x in products if not (x.get("% НДС") or "").strip()]
    p(f"Без ставки ПДВ: {len(no_vat)}")
    issues_csv["dup_products.csv"] = [("sku","cards","names")] + [(a, str(len(v)), " | ".join(sorted(set(v)))) for a, v in sorted(dup_sku.items(), key=lambda x:-len(x[1]))]

    h("4. ПРОДАЖІ (журнал: %d документів)" % len(sales))
    dates = [d2iso(s["Дата"]) for s in sales]
    ok_dates = [d for d in dates if d]
    p(f"Період: {min(ok_dates)} → {max(ok_dates)}; без дати: {len(dates)-len(ok_dates)}")
    fut = [(d2iso(s['Дата']), s['Номер'], s['Контрагент']) for s in sales if d2iso(s['Дата']) > TODAY]
    p(f"Документи з майбутньою датою: {len(fut)}")
    zero = [s for s in sales if num(s.get("Сумма")) <= 0]
    p(f"З нульовою/від'ємною сумою: {len(zero)}")
    no_p = [s for s in sales if not (s.get("Контрагент") or "").strip()]
    no_w = [s for s in sales if not (s.get("Склад") or "").strip()]
    p(f"Без контрагента: {len(no_p)}; без складу: {len(no_w)}")
    no_mgr = [s for s in sales if (s.get("Ответственный") or "").strip() in ("", "<Не указан>")]
    p(f"Без відповідального: {len(no_mgr)} ({len(no_mgr)*100//max(1,len(sales))}%)")
    by_doc = defaultdict(list)
    for s in sales: by_doc[(s.get("Номер") or "").strip()].append(s)
    dup_doc = {n: v for n, v in by_doc.items() if n and len(v) > 1}
    p(f"Повторювані номери документів: {len(dup_doc)} номерів, {sum(len(v) for v in dup_doc.values())} документів")
    ops = Counter((s.get("Вид операции") or "").strip() for s in sales)
    p("Види операцій: " + "; ".join(f"{k}: {c}" for k, c in ops.most_common()))
    curr = Counter((s.get("Валюта") or "").strip() for s in sales)
    p("Валюти: " + "; ".join(f"{k or '(порожньо)'}: {c}" for k, c in curr.most_common()))

    h("5. БАНК (журнал: %d операцій)" % len(bank))
    bdates = [d2iso(b["Дата"]) for b in bank]
    ok_b = [d for d in bdates if d]
    p(f"Період: {min(ok_b)} → {max(ok_b)}; без дати: {len(bdates)-len(ok_b)}")
    futb = [(d2iso(b['Дата']), b.get('Контрагент',''), num(b.get('Поступление')) or -num(b.get('Списание'))) for b in bank if d2iso(b['Дата']) > TODAY]
    p(f"Операції з майбутньою датою: {len(futb)} — " + "; ".join(f"{d} {n[:30]} {v:,.0f}" for d, n, v in futb[:5]))
    tin  = sum(num(b.get("Поступление")) for b in bank)
    tout = sum(num(b.get("Списание")) for b in bank)
    p(f"Разом поступлень: {tin:,.0f} грн; списань: {tout:,.0f} грн")
    p(f"СПІВВІДНОШЕННЯ: списання = {tout/max(tin,1)*100:.1f}% від поступлень — видаткова частина явно не ведеться повністю" if tout < tin*0.5 else "")
    both = [b for b in bank if num(b.get("Поступление")) and num(b.get("Списание"))]
    none_ = [b for b in bank if not num(b.get("Поступление")) and not num(b.get("Списание"))]
    p(f"Рядки і з поступленням, і зі списанням: {len(both)}; без сум узагалі: {len(none_)}")
    no_pp = [b for b in bank if not (b.get("Назначение платежа") or "").strip()]
    p(f"Без призначення платежу: {len(no_pp)} ({len(no_pp)*100//max(1,len(bank))}%)")
    no_kp = [b for b in bank if not (b.get("Контрагент") or "").strip()]
    p(f"Без контрагента: {len(no_kp)}")

    h("6. ЗВІРКА: продажі ↔ оплати по контрагентах (орг. Бейкуш Вайнери)")
    sold = defaultdict(float); paid = defaultdict(float)
    for s in sales:
        if (s.get("Организация") or "") == "Бейкуш Вайнери":
            sold[(s.get("Контрагент") or "").strip()] += num(s.get("Сумма"))
    for b in bank:
        if "покупат" in (b.get("Вид операции") or "").lower():
            paid[(b.get("Контрагент") or "").strip()] += num(b.get("Поступление"))
    INTERNAL = ["інтернет", "интернет", "конечный", "кінцевий", "корпорат", "дегустац"]
    isint = lambda n: any(x in n.lower() for x in INTERNAL)
    rows = []
    for name in set(sold) | set(paid):
        if not name or isint(name): continue
        d = sold[name] - paid[name]
        rows.append((name, sold[name], paid[name], d))
    over = sorted([r for r in rows if r[3] < -5000], key=lambda r: r[3])
    debt = sorted([r for r in rows if r[3] > 5000], key=lambda r: -r[3])
    p(f"ПЕРЕПЛАТИ (оплат більше, ніж продажів — ознака непроведених накладних): {len(over)} контрагентів на {-sum(r[3] for r in over):,.0f} грн")
    for n, s_, pd, d in over[:12]: p(f"  {n[:45]:47s} продано {s_:>12,.0f} / оплачено {pd:>12,.0f} / різниця {d:>12,.0f}")
    p(f"БОРГИ (продано > оплачено): {len(debt)} контрагентів на {sum(r[3] for r in debt):,.0f} грн")
    for n, s_, pd, d in debt[:12]: p(f"  {n[:45]:47s} продано {s_:>12,.0f} / оплачено {pd:>12,.0f} / борг {d:>12,.0f}")
    issues_csv["reconciliation.csv"] = [("counterparty","sold_uah","paid_uah","diff_uah")] + [(n, f"{s_:.2f}", f"{pd:.2f}", f"{d:.2f}") for n, s_, pd, d in sorted(rows, key=lambda r:-abs(r[3]))]

    h("7. ОСВ (оборотно-сальдова відомість)")
    accs = {}
    for r in osv:
        a = (r.get("Счет") or "").strip()
        if a and a != "Итого":
            accs[a] = {k: num(r.get(k)) for k in ["Сальдо нач. Дт","Сальдо нач. Кт","Обороты Дт","Обороты Кт","Сальдо кон. Дт","Сальдо кон. Кт"]}
    p("Рахунки у виписці: " + ", ".join(sorted(accs)))
    missing = [a for a in MUST_HAVE if a not in accs]
    p(f"ВІДСУТНІ обов'язкові для виноробні рахунки: " + ", ".join(f"{a} ({PLAN291[a]})" for a in missing))
    for a, v in sorted(accs.items()):
        flags = []
        if a == "00" and (v["Сальдо кон. Дт"] or v["Сальдо кон. Кт"]): flags.append("залишок на допоміжному рахунку — залишки введені не повністю")
        if a in ("70","71") and v["Сальдо кон. Кт"]: flags.append("доходи не закриті на 79")
        if a in ("90","92","93","94") and (v["Сальдо кон. Дт"] or v["Сальдо кон. Кт"]): flags.append("витрати не закриті на 79")
        if a == "79" and (v["Сальдо кон. Кт"] or v["Сальдо кон. Дт"]): flags.append("фінрезультат не закритий на 44")
        if v["Сальдо кон. Дт"] < 0 or v["Сальдо кон. Кт"] < 0: flags.append("ВІД'ЄМНЕ САЛЬДО — груба помилка")
        if a == "31" and v["Обороты Кт"] < v["Обороты Дт"] * 0.1: flags.append("з банку майже нічого не списувалось — видатки не проводились")
        if flags: p(f"  рах.{a} ({PLAN291.get(a,'?')}): " + "; ".join(flags))
    s31 = accs.get("31", {}).get("Сальдо кон. Дт", 0)
    p(f"Сальдо рах.31 (банк) за ОСВ: {s31:,.0f} грн — порівняйте з реальним залишком на рахунках; розрив = непроведені видатки.")

    h("8. СПІВРОБІТНИКИ / ДОГОВОРИ")
    act = [x for x in staff if (x.get("Актуален") or "").strip().lower() in ("true","так","да","1")]
    p(f"Співробітників у довіднику: {len(staff)}, актуальних: {len(act)}")
    p("АЛЕ в ОСВ немає рах.66 (зарплата) і 65 (ЄСВ) — зарплатний облік в 1С не вівся.")
    cno = [c for c in contracts if not (c.get("Контрагент") or "").strip()]
    p(f"Договорів: {len(contracts)}; без контрагента: {len(cno)}")

    print("\n".join(R))
    if out_dir:
        for fn, rows_ in issues_csv.items():
            with open(os.path.join(out_dir, fn), "w", encoding="utf-8-sig", newline="") as f:
                w = csv.writer(f); [w.writerow(r) for r in rows_]
        print(f"\nТаблиці проблем записано в {out_dir}/: " + ", ".join(issues_csv))

if __name__ == "__main__":
    main()
