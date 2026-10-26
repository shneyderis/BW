#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Журнал проводок з реальних банківських виписок (data/bank_raw/*) для
ТОВ «Бейкуш Вайнері» — з денними датами, ЄДРПОУ і призначенням платежу.
Запуск з кореня: python3 accounting/build_postings_daily.py
Вихід: accounting/export/bank_postings_daily.csv (+ _summary).
Формати: виписки ПриватБанку (xls/xlsx/csv, заголовок «Дата проводки»),
Банк Восток (додається після отримання файлу). .xls/.xlsx спершу конвертуються
в .csv:  soffice --headless --convert-to csv --outdir data/bank_raw <file>
Правила розноски — ті самі, що в js/postings.js, але категорію замінює
призначення платежу (regex) + ЄДРПОУ контрагента.
"""
import csv, re, os, glob, sys
from collections import defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
RAW  = os.path.join(BASE, "..", "data", "bank_raw")
OUT  = os.path.join(BASE, "export")
OWN_EDRPOU = "37992910"  # ТОВ «Бейкуш Вайнері»

def num(s):
    s = (s or "").strip().replace("\xa0","").replace(" ","")
    s = s.replace(",", ".") if s.count(",")==1 and s.count(".")==0 else s.replace(",","")
    try: return float(s)
    except ValueError: return 0.0

def d2iso(d):
    m = re.match(r"(\d{2})\.(\d{2})\.(\d{4})", (d or "").strip())
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ""

# --- правила розноски ---
# Податкові рахунки застосовуються ЛИШЕ до платежів у бюджет (казначейство/ДПС),
# інакше «у т.ч. ПДВ 20%» у звичайних оплатах постачальникам дає хибні 641.
BUDGET_RX = r"казначейств|держказна|дпс\b|дпi|дпі|податкова|пенсійн|фонд соц|до бюджету|держбюджет"
TAX_RULES = [
    (r"єдиний внесок|єсв|есв", "651", "ЄСВ"),
    (r"пдфо|податку? на доходи|військов|военн", "641", "ПДФО/ВЗ"),
    (r"\bпдв\b|податок на додану", "641.ПДВ", "ПДВ"),
    (r"акциз", "641", "акциз"),
    (r"єдиний податок", "641", "єдиний податок"),
    (r"земельн|оренда земл|екологічн", "641", "інші податки/збори"),
]
COMMISSION_RX = r"комісі|комиси|обслуговування рахунк|абонплата|банк-клієнт|банк-клиент"
SALARY_RX = r"заробітн|зарплат|відпускн|лікарнян|аванс.*зарпл"
BANK_EDRPOU = {"14360570"}  # ПриватБанк (комісії, «ДОХОДЫ РО БАНК-КЛИЕНТ»)

def posting(amount, purpose, edrpou, currency, cp=""):
    # у виписках українська «і» часто набрана латинською i — нормалізуємо для regex
    p = (purpose or "").lower().replace("i", "і")
    who = ((cp or "").lower() + " " + p).replace("i", "і")
    bank = "311" if currency == "UAH" else "312"
    if edrpou == OWN_EDRPOU or "#перенесення" in p or "перенесення залишку" in p:
        return bank, bank, "внутрішній переказ", ["internal_transfer"]
    if re.search(r"купівля валют|продаж валют|конверта|валютно-обмін|для покупки eur|для покупки usd|для продажу", who):
        return (bank, "333", "конвертація", ["conversion_pair"]) if amount > 0 else ("333", bank, "конвертація", ["conversion_pair"])
    if amount > 0:
        if re.search(r"еквайр|екв\.|acquiring|торговел", p): return bank, "333", "еквайринг", []
        if re.search(r"повернення|возврат", p): return bank, "631", "повернення від постачальника", []
        if re.search(r"поворотн.*фінанс|фіндопомог", p): return bank, "685", "фіндопомога", []
        if re.search(r"відсотки на залишок|депозит", p): return bank, "719", "відсотки банку", []
        return bank, ("362" if currency != "UAH" else "361"), "оплата покупця", []
    # списання
    if re.search(r"видача|вьідача|выдача|готівк|каса приватбанку", who):
        return "301", bank, "готівка (видача)", ["cash_review"]
    if edrpou in BANK_EDRPOU or re.search(COMMISSION_RX, p):
        return "92", bank, "комісія банку", []
    if re.search(SALARY_RX, p):
        return "661", bank, "зарплата", []
    if re.search(BUDGET_RX, who) or re.search(r"єдиний внесок|єсв|есв|пдфо|військов", p):
        for rx, acc, note in TAX_RULES:
            if re.search(rx, p): return acc, bank, note, []
        return "641", bank, "податки (уточнити)", ["tax_unclassified"]
    if re.search(r"відсотк|процент|кредит", p): return "684", bank, "кредит/відсотки", []
    if re.search(r"поворотн.*фінанс|фіндопомог", p): return "685", bank, "фіндопомога", []
    if re.search(r"відряджен|добові|підзвіт", p): return "372", bank, "підзвіт/відрядження", []
    flags = ["no_purpose"] if not p.strip() else []
    return "631", bank, "оплата постачальнику", flags

# --- парсер виписки ПриватБанку ---
def parse_privat(path):
    rows = list(csv.reader(open(path, encoding="utf-8", errors="replace")))
    # знайти заголовок
    hi = next((i for i, r in enumerate(rows) if any("Дата проводки" in (c or "") for c in r)), None)
    if hi is None: return None
    hdr = rows[hi]
    ix = {re.sub(r"\s+"," ",(c or "").strip()): j for j, c in enumerate(hdr)}
    def col(r, name, alt=None):
        j = ix.get(name, ix.get(alt or "", -1))
        return r[j].strip() if 0 <= j < len(r) else ""
    acc_line = next((" ".join(c for c in r if c) for r in rows[:hi] if any("Виписка по рахунку" in (c or "") for c in r)), os.path.basename(path))
    m = re.search(r"UA\d{10,}", acc_line); acc = m.group(0) if m else os.path.basename(path)
    out = []
    for r in rows[hi+1:]:
        d = d2iso(col(r, "Дата проводки"))
        if not d: continue
        amt = num(col(r, "Сума"))
        if amt == 0: continue
        out.append({
            "date": d, "time": col(r, "Час проводки"), "amount": amt,
            "currency": col(r, "Валюта") or "UAH",
            "purpose": col(r, "Призначення платежу"),
            "edrpou": col(r, "ЄДРПОУ"), "cp": col(r, "Назва контрагента"),
            "cp_acc": col(r, "Рахунок контрагента"), "ref": col(r, "Референс"),
            "bank_acc": acc, "src_file": os.path.basename(path),
        })
    return out

PARSERS = [parse_privat]  # parse_vostok додамо, щойно побачимо формат

def main():
    os.makedirs(OUT, exist_ok=True)
    allops, skipped = [], []
    for path in sorted(glob.glob(os.path.join(RAW, "*.csv"))):
        parsed = None
        for p in PARSERS:
            parsed = p(path)
            if parsed is not None: break
        if parsed is None: skipped.append(os.path.basename(path)); continue
        allops += parsed
        print(f"  {os.path.basename(path)}: {len(parsed)} операцій")
    if skipped: print("  НЕ розпізнано формат:", ", ".join(skipped))
    # дедуплікація (той самий референс+дата+сума може бути у двох файлах, що перетинаються)
    seen, ops = set(), []
    for o in allops:
        key = (o["ref"] or "", o["date"], f'{o["amount"]:.2f}', o["bank_acc"])
        if o["ref"] and key in seen: continue
        seen.add(key); ops.append(o)
    dup = len(allops) - len(ops)
    if dup: print(f"  прибрано дублікатів (перетин файлів): {dup}")
    ops.sort(key=lambda o: (o["date"], o["time"]))
    rows, agg = [], defaultdict(lambda: [0.0, 0])
    for o in ops:
        dt, kt, note, flags = posting(o["amount"], o["purpose"], o["edrpou"], o["currency"], o["cp"])
        rows.append([o["date"], o["time"], o["bank_acc"], o["currency"],
                     f'{abs(o["amount"]):.2f}', "in" if o["amount"] > 0 else "out",
                     dt, kt, note, o["cp"], o["edrpou"], o["purpose"], o["ref"],
                     o["src_file"], ";".join(flags)])
        k = (o["date"][:4], dt, kt, note)
        agg[k][0] += abs(o["amount"]); agg[k][1] += 1
    with open(os.path.join(OUT, "bank_postings_daily.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date","time","bank_account","currency","amount","direction","dt","kt","note","counterparty","edrpou","purpose","ref","src_file","flags"])
        w.writerows(rows)
    with open(os.path.join(OUT, "bank_postings_daily_summary.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["year","dt","kt","note","amount","ops"])
        for (yr, dt, kt, note), (s, c) in sorted(agg.items()):
            w.writerow([yr, dt, kt, note, f"{s:.2f}", c])
    print(f"Разом: {len(rows)} проводок → export/bank_postings_daily.csv (+_summary)")

if __name__ == "__main__":
    main()
