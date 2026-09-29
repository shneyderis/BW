#!/usr/bin/env python3
"""
Аналіз даних дашборду → reports/latest.md (+ reports/YYYY-MM-DD.md)

Читає: data/sheets/*.csv (знімок Google Sheets, робить tools/pull_sheets.py),
       data/1c_*.csv, data/lots.csv, data/manifest.json.
Працює з тим, що є: відсутні файли просто пропускаються (і це відзначається у звіті).

Використання (з кореня репозиторію):
    python3 tools/analyze.py            # звіт у reports/latest.md і reports/<дата>.md
    python3 tools/analyze.py --print    # лише вивести в консоль

Звіт показує: свіжість джерел, продажі vs минулий рік по каналах, клієнти що зникли,
дебіторка, запаси вин, ЗП/виручка, нерозпізнані операції, магазин, email — і що з цим робити.
Без сторонніх бібліотек (тільки стандартна бібліотека Python).
"""
import csv, json, os, re, sys, datetime, collections, statistics

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = os.path.join(ROOT, "data", "sheets")
DATA = os.path.join(ROOT, "data")
REPORTS = os.path.join(ROOT, "reports")
TODAY = datetime.date.today()

MN = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"]
CHS = ["Продаж, Мережі", "Продаж, Horeca & Shops", "Продаж, Експорт", "Доход, ФОП", "Продаж, Корп клієнт",
       "Доход, каса БВ", "Продаж,  Дістрібʼютор Укр", "Продаж, Інтернет магазини", "Продаж, на виноробні"]
IGN = ["#ignore", "Конвертація", "ІГНОР!!!", "Банк???", "Банк, Еквайринг"]
ZP = ["ЗП менеджерів", "ЗП Виноградник", "ЗП Виноробня", "ЗП Готель", "ЗП Цибак", "BW Света", "BW Наташа", "BW Таня"]
ACATS = ["Обладнання виноробні", "Обладнання виноградник", "Обладнання, власний транспорт"]
INTERNAL = ["інтернет магазин", "конечный потребитель", "корпорат.клиент", "садовой", "кінцевий споживач"]

missing = []
findings = []   # (severity, title, detail, action)  severity: 🔴 🟡 🟢 ℹ️


def rd(name, where=SHEETS):
    p = os.path.join(where, name)
    if not os.path.exists(p):
        missing.append(name)
        return []
    with open(p, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def gv(row, prefix):
    pl = prefix.lower()
    for k, v in row.items():
        if k and k.strip().lower().startswith(pl):
            return v or ""
    return ""


def pn(s):
    if s is None:
        return 0.0
    s = str(s).strip()
    if not s:
        return 0.0
    neg = s.startswith("-") or (s.startswith("(") and s.endswith(")"))
    s = re.sub(r"[₴$€\s()\-]", "", s).replace(",", "")
    try:
        v = float(s)
    except ValueError:
        return 0.0
    return -v if neg else v


def iso(d):
    d = (d or "").strip()
    m = re.match(r"(\d{2})\.(\d{2})\.(\d{4})", d)
    if m:
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    return d[:10] if re.match(r"\d{4}-\d{2}-\d{2}", d) else ""


def fmt(n):
    return f"{n:,.0f}".replace(",", " ")


def short(n):
    n = re.sub(r"Товариство з обмеженою відповідальністю\s*", "ТОВ ", n or "", flags=re.I)
    n = re.sub(r"Фізична особа[\s\-–]*підприємець\s*", "ФОП ", n, flags=re.I)
    return n.replace('"', "").replace("«", "").replace("»", "").strip()


def add(sev, title, detail="", action=""):
    findings.append((sev, title, detail, action))


def days_ago(d):
    try:
        return (TODAY - datetime.date.fromisoformat(d[:10])).days
    except Exception:
        return None


# ---------------- Dashboard_Data ----------------
def load_T():
    rows = rd("Dashboard_Data.csv")
    T = []
    for x in rows:
        mo = str(gv(x, "month") or "").strip().replace(".0", "")
        cat = gv(x, "category")
        if not re.match(r"^20\d{4}$", mo) or int(mo) < 202001 or cat in IGN or cat == "":
            continue
        amt = pn(gv(x, "sum_uah"))
        src = gv(x, "source")
        t = {"ym": mo[:4] + "-" + mo[4:6], "yr": mo[:4], "mm": mo[4:6], "cat": cat, "amt": amt,
             "name": gv(x, "name"), "alias": gv(x, "alias"), "mgr": gv(x, "менеджер") or gv(x, "manager"),
             "src": src, "tp": "Доход" if amt > 0 else "Расход"}
        if t["tp"] == "Доход" and src in ("PRIVAT", "VOSTOK") and cat != "Продаж, Експорт":
            t["nt"] = amt / 1.2
        elif t["tp"] == "Расход" and src in ("PRIVAT", "VOSTOK") and not any(z in cat for z in ZP) and "Податки" not in cat and "Банківська" not in cat:
            t["nt"] = amt / 1.2
        else:
            t["nt"] = amt
        T.append(t)
    return T


def analyze_T(T):
    out = []
    if not T:
        return out
    last = max(t["ym"] for t in T)
    lag = (TODAY.year - int(last[:4])) * 12 + TODAY.month - int(last[5:7])
    out.append(f"- Операцій: **{len(T)}**, виписки до **{last}**" + (f" — відстають на {lag} міс від календаря" if lag > 1 else ""))
    if lag > 1:
        add("🔴", f"Виписки Dashboard_Data відстають: останній місяць {last}", f"Календар: {TODAY:%Y-%m}. Усі показники P&L/продажів за {lag - 1} останні місяці відсутні.",
            "Внести операції за відсутні місяці в лист Dashboard_Data (BW_Looker_Data).")
    unrec = [t for t in T if t["cat"] in ("???", "") or "???" in t["cat"]]
    if unrec:
        add("🟡", f"{len(unrec)} операцій без категорії на {fmt(abs(sum(t['amt'] for t in unrec)))}₴", "Не входять у P&L.", "Вкладка ⚠️ → експорт → проставити category.")
    yr = last[:4]; py = str(int(yr) - 1); mm = int(last[5:7])
    inc = lambda y: [t for t in T if t["tp"] == "Доход" and t["yr"] == y and int(t["mm"]) <= mm and not any(a in t["cat"] for a in ACATS)]
    exp = lambda y: [t for t in T if t["tp"] == "Расход" and t["yr"] == y and int(t["mm"]) <= mm and not any(a in t["cat"] for a in ACATS)]
    r1, r0 = sum(t["nt"] for t in inc(yr)), sum(t["nt"] for t in inc(py))
    e1, e0 = -sum(t["nt"] for t in exp(yr)), -sum(t["nt"] for t in exp(py))
    out.append(f"- Виручка нетто {yr} (до {MN[mm-1]}): **{fmt(r1)}₴** vs {fmt(r0)}₴ у {py} ({(r1-r0)/r0*100:+.0f}%)" if r0 else f"- Виручка нетто {yr}: **{fmt(r1)}₴**")
    out.append(f"- OPEX {yr} (до {MN[mm-1]}): **{fmt(e1)}₴** vs {fmt(e0)}₴ ({(e1-e0)/e0*100:+.0f}%)" if e0 else f"- OPEX {yr}: {fmt(e1)}₴")
    if r1:
        out.append(f"- Прибуток {yr} YTD: **{fmt(r1-e1)}₴**, маржа {(r1-e1)/r1*100:.1f}%" + (f" (у {py}: {(r0-e0)/r0*100:.1f}%)" if r0 else ""))
        if r0 and (r1 - r0) / r0 < -0.15:
            add("🔴", f"Виручка {yr} нижча за {py} на {abs((r1-r0)/r0*100):.0f}% (порівняння до {MN[mm-1]})", f"{fmt(r1)}₴ vs {fmt(r0)}₴", "Дивитись по каналах нижче: де саме просадка.")
        if e0 and e1 / max(r1, 1) > 0.9 and (e1 - e0) / e0 > 0.1:
            add("🟡", f"Витрати ростуть швидше за виручку: OPEX {(e1-e0)/e0*100:+.0f}%", "", "P&L → Витрати по категоріях, Δ vs минулий рік.")
    # channels
    out.append("")
    out.append(f"| Канал | {yr} | {py} | Δ |"); out.append("|---|---:|---:|---:|")
    for c in CHS:
        a = sum(t["nt"] for t in inc(yr) if t["cat"] == c); b = sum(t["nt"] for t in inc(py) if t["cat"] == c)
        if a or b:
            d = f"{(a-b)/b*100:+.0f}%" if b else "new"
            out.append(f"| {c} | {fmt(a)} | {fmt(b)} | {d} |")
            if b > 100000 and (a - b) / b < -0.3:
                add("🟡", f"Канал «{c}»: {(a-b)/b*100:+.0f}% vs {py}", f"{fmt(a)}₴ vs {fmt(b)}₴ (до {MN[mm-1]})", "Продажі → канал → партнери: хто перестав купувати.")
    # lost customers: bought >= 3 times in previous 12 months ending 6 months before last, nothing in last 6 months
    ymk = lambda t: int(t["ym"][:4]) * 12 + int(t["ym"][5:7])
    L = int(last[:4]) * 12 + int(last[5:7])
    cust = collections.defaultdict(lambda: {"prev": 0.0, "n": 0, "recent": 0.0, "last": ""})
    for t in T:
        if t["tp"] != "Доход" or t["cat"] not in CHS or t["cat"] in ("Доход, ФОП", "Доход, каса БВ"):
            continue
        k = t["alias"] or t["name"]
        if not k:
            continue
        c = cust[k]
        if L - 18 < ymk(t) <= L - 6:
            c["prev"] += t["nt"]; c["n"] += 1
        if ymk(t) > L - 6:
            c["recent"] += t["nt"]
        c["last"] = max(c["last"], t["ym"])
    lost = sorted([(k, v) for k, v in cust.items() if v["n"] >= 3 and v["prev"] > 50000 and v["recent"] == 0], key=lambda kv: -kv[1]["prev"])
    if lost:
        add("🟡", f"{len(lost)} клієнтів, які купували регулярно, нічого не купили за останні 6 міс",
            "; ".join(f"{k[:28]} ({fmt(v['prev'])}₴, ост. {v['last']})" for k, v in lost[:6]),
            "Партнери → CRM: зателефонувати; перевірити, чи не пішли до конкурента.")
    # no manager
    nm = [t for t in T if t["tp"] == "Доход" and t["yr"] == yr and t["cat"] in CHS and t["cat"] not in ("Доход, ФОП", "Доход, каса БВ") and (not t["mgr"] or t["mgr"] in ("-", "="))]
    if nm:
        add("🟡", f"{len(nm)} продажів {yr} без менеджера на {fmt(sum(t['nt'] for t in nm))}₴", "Комісії менеджерів по них не рахуються.", "Заповнити колонку «менеджер» у Dashboard_Data.")
    # salary share
    zp = -sum(t["amt"] for t in T if t["tp"] == "Расход" and t["yr"] == yr and any(z in t["cat"] for z in ZP))
    if r1 and zp:
        share = zp / r1 * 100
        out.append(f"- ЗП {yr}: **{fmt(zp)}₴** = {share:.1f}% від виручки нетто")
        if share > 35:
            add("🟡", f"ЗП = {share:.0f}% від виручки", f"{fmt(zp)}₴ за {yr}", "ЗП → по категоріях: що зросло.")
    # monthly cash net last 6 months
    bym = collections.defaultdict(float)
    for t in T:
        bym[t["ym"]] += t["amt"]
    ms = sorted(bym)[-6:]
    neg = [m for m in ms if bym[m] < 0]
    if len(neg) >= 4:
        add("🟡", f"Відʼємний грошовий потік у {len(neg)} з останніх {len(ms)} місяців", ", ".join(f"{m}: {fmt(bym[m])}₴" for m in ms), "Кеш-фло → вхідні vs вихідні; Баланс → залишки.")
    return out


# ---------------- 1С ----------------
def analyze_1c():
    out = []
    sales = rd("1c_sales.csv", DATA); bank = rd("1c_bank.csv", DATA)
    if not sales:
        return out
    S = [{"date": iso(gv(r, "дата")), "sum": pn(gv(r, "сумма")), "partner": gv(r, "контрагент"), "org": gv(r, "организация"), "wh": gv(r, "склад")} for r in sales]
    S = [s for s in S if s["sum"] > 0 and s["date"]]
    last = max(s["date"] for s in S)
    out.append(f"- Реалізацій: **{len(S)}**, до **{last}** ({days_ago(last)} днів тому)")
    if (days_ago(last) or 0) > 60:
        add("🔴", f"Дані 1С застаріли: останні реалізації {last}", f"{days_ago(last)} днів без оновлення. Борги, партнери, номенклатура — неактуальні.",
            "Вивантажити beykush_data.xlsx з 1С → python3 tools/convert_1c.py → commit.")
    B = [{"date": iso(gv(r, "дата")), "inc": pn(gv(r, "поступление")), "partner": gv(r, "контрагент"), "type": gv(r, "вид")} for r in bank]
    fut = [b for b in B if b["date"] > TODAY.isoformat()]
    if fut:
        add("🟡", f"1С банк: {len(fut)} операцій з датою в майбутньому", "; ".join(f"{b['date']} {fmt(b['inc'])}₴ {short(b['partner'])[:34]}" for b in fut[:3]), "Виправити дату документа в 1С.")
    byP = collections.defaultdict(lambda: {"sold": 0.0, "paid": 0.0, "lastPay": "", "lastSale": ""})
    for s in S:
        if s["org"] == "Бейкуш Вайнери":
            byP[s["partner"]]["sold"] += s["sum"]; byP[s["partner"]]["lastSale"] = max(byP[s["partner"]]["lastSale"], s["date"])
    for b in B:
        if b["inc"] > 0 and "покупат" in b["type"] and b["partner"] in byP:
            byP[b["partner"]]["paid"] += b["inc"]; byP[b["partner"]]["lastPay"] = max(byP[b["partner"]]["lastPay"], b["date"])
    ref = max([b["date"] for b in B if b["date"] and b["date"] <= TODAY.isoformat()] + [last])   # дата останніх даних, а не сьогодні
    ref_d = datetime.date.fromisoformat(ref)
    dsince = lambda d: (ref_d - datetime.date.fromisoformat(d)).days if d else 9999
    debt = [(p, v) for p, v in byP.items() if v["sold"] - v["paid"] > 1000 and not any(x in p.lower() for x in INTERNAL)]
    overdue = [(p, v) for p, v in debt if dsince(v["lastPay"]) > 30]
    tot = sum(v["sold"] - v["paid"] for p, v in overdue)
    out.append(f"- Дебіторка (Бейкуш Вайнери): {len(debt)} боржників на {fmt(sum(v['sold']-v['paid'] for p, v in debt))}₴, з них **{len(overdue)} без оплат >30 днів на {fmt(tot)}₴** (станом на {ref} — дату останніх даних 1С)")
    if overdue:
        top = sorted(overdue, key=lambda pv: -(pv[1]["sold"] - pv[1]["paid"]))[:8]
        add("🔴" if tot > 300000 else "🟡", f"Прострочена дебіторка {fmt(tot)}₴ у {len(overdue)} партнерів",
            "; ".join(f"{short(p)[:34]}: {fmt(v['sold']-v['paid'])}₴ (ост. оплата {v['lastPay'] or 'ніколи'})" for p, v in top),
            "Партнери → Борги / CRM: подзвонити, узгодити графік.")
    # by org / year
    byY = collections.defaultdict(float)
    for s in S:
        byY[s["date"][:4]] += s["sum"]
    out.append("- Реалізації по роках (усі організації): " + ", ".join(f"{y}: {fmt(v)}₴" for y, v in sorted(byY.items())))
    return out


# ---------------- Товари / склад ----------------
def analyze_goods():
    out = []
    gd = rd("FINAL_sales_detail.csv")
    if not gd:
        return out
    G = [{"date": gv(r, "date")[:10], "prod": gv(r, "product"), "qty": pn(gv(r, "quantity")), "sum": pn(gv(r, "sum")), "cust": gv(r, "customer")} for r in gd]
    G = [g for g in G if g["prod"] and g["qty"] > 0]
    last = max(g["date"] for g in G)
    out.append(f"- Накладних-рядків: **{len(G)}**, до **{last}**")
    strip = lambda n: re.sub(r"\s+20[12]\d\s*$", "", n).strip()
    stock = {}
    sd = rd("Stock_Data.csv")
    if sd:
        bal = collections.defaultdict(list)
        for r in sd:
            if (gv(r, "type") or "").lower() == "balance":
                bal[gv(r, "wine")].append((gv(r, "date"), pn(gv(r, "qty"))))
        for w, l in bal.items():
            stock[strip(w)] = sorted(l)[-1][1]
    else:
        for r in rd("3_Stock.csv"):
            w = gv(r, "вино") or gv(r, "wine"); q = pn(gv(r, "остаток") or gv(r, "stock"))
            if w and q > 0:
                stock[strip(w)] = stock.get(strip(w), 0) + q
    byW = collections.defaultdict(lambda: {"qty": 0.0, "sum": 0.0, "months": set()})
    for g in G:
        b = byW[strip(g["prod"])]; b["qty"] += g["qty"]; b["sum"] += g["sum"]; b["months"].add(g["date"][:7])
    wines = sorted(byW.items(), key=lambda kv: -kv[1]["sum"])
    tot = sum(v["sum"] for _, v in wines) or 1
    cum = 0; A = []
    for n, v in wines:
        cum += v["sum"]
        if cum / tot <= 0.8:
            A.append(n)
    out.append(f"- Вин: {len(wines)}, A-клас (80% виручки): {len(A)} — " + ", ".join(A[:8]) + ("…" if len(A) > 8 else ""))
    low = []
    for n, v in wines:
        vel = v["qty"] / max(1, len(v["months"]))
        st = stock.get(n)
        if st is not None and vel >= 5 and st / vel < 2:
            low.append(f"{n} ({fmt(st)} пл, {st/vel:.1f} міс)")
    if low:
        add("🟡", f"Закінчуються {len(low)} вин (запас < 2 міс при поточній швидкості)", "; ".join(low[:8]), "Товари → Міс.зал.; Виробництво → готові до розливу.")
    if not stock:
        add("ℹ️", "Залишки складу не заповнені (3_Stock / Stock_Data)", "Без них не рахується «місяців запасу».", "Заповнити Stock_Data.")
    return out


# ---------------- Магазин / маркетинг ----------------
def analyze_shop_mkt():
    out = []
    wo = rd("WC_Orders.csv")
    if wo:
        O = [{"date": gv(r, "date_created")[:10], "status": gv(r, "status"), "total": pn(gv(r, "total"))} for r in wo]
        last = max(o["date"] for o in O if o["date"])
        out.append(f"- WC замовлень: **{len(O)}**, останнє **{last}** ({days_ago(last)} днів тому)")
        if (days_ago(last) or 0) > 14:
            add("🔴", f"Магазин: останнє замовлення {last} ({days_ago(last)} днів тому)", "Або продажів немає, або зламалась синхронізація sync.gs.", "Sync_Log → перевірити WC Orders; Apps Script → Triggers.")
        ok = lambda o: o["status"] in ("completed", "processing")
        ym = lambda o: o["date"][:7]
        m = collections.defaultdict(float)
        for o in O:
            if ok(o):
                m[ym(o)] += o["total"]
        ms = sorted(m)[-6:]
        out.append("- Виручка магазину по місяцях: " + ", ".join(f"{k}: {fmt(m[k])}₴" for k in ms))
        l90 = [o for o in O if (days_ago(o["date"]) or 999) <= 90]
        canc = [o for o in l90 if o["status"] in ("cancelled", "failed")]
        if len(l90) >= 20 and len(canc) / len(l90) > 0.15:
            add("🟡", f"Магазин: {len(canc)/len(l90)*100:.0f}% скасованих/невдалих замовлень за 90 днів", f"{len(canc)} з {len(l90)}", "Перевірити оплату/доставку на сайті.")
    sp = rd("SP_Campaigns.csv")
    if sp:
        C = [{"date": gv(r, "send_date")[:10], "sent": pn(gv(r, "all_count") or gv(r, "sent_count")), "opened": pn(gv(r, "opened"))} for r in sp]
        C = sorted([c for c in C if c["date"] and c["sent"] > 100], key=lambda c: c["date"], reverse=True)
        if C:
            out.append(f"- Email: {len(C)} кампаній, остання {C[0]['date']} ({days_ago(C[0]['date'])} днів тому)")
            if (days_ago(C[0]["date"]) or 0) > 45:
                add("🟡", f"Розсилок не було {days_ago(C[0]['date'])} днів", "", "Запланувати email-кампанію (Маркетинг → найкращий день).")
            r5 = [c["opened"] / c["sent"] * 100 for c in C[:5]]; r10 = [c["opened"] / c["sent"] * 100 for c in C[5:10]]
            if r5 and r10 and statistics.mean(r5) < statistics.mean(r10) - 3:
                add("🟡", f"Open rate падає: {statistics.mean(r5):.1f}% (останні 5) vs {statistics.mean(r10):.1f}%", "", "Змінити теми/частоту, почистити список.")
    ig = rd("IG_Posts.csv")
    if ig:
        last = max((gv(r, "timestamp")[:10] for r in ig), default="")
        out.append(f"- Instagram: {len(ig)} постів, останній {last}")
        if last and (days_ago(last) or 0) > 21:
            add("🟡", f"Instagram: останній пост {last} ({days_ago(last)} днів тому)", "Або немає публікацій, або sync/токен Meta не працює.", "Sync_Log → IG Posts; Script Properties → META_TOKEN.")
    return out


# ---------------- Свіжість файлів ----------------
def freshness():
    out = []
    mp = os.path.join(DATA, "manifest.json")
    if os.path.exists(mp):
        m = json.load(open(mp, encoding="utf-8"))
        for f, v in sorted(m.get("files", {}).items()):
            d = v.get("max_date") or v.get("exported")
            out.append(f"- `{f}`: {v.get('rows', '?')} рядків, вивантажено {v.get('exported')}" + (f", дані до {v['max_date']}" if v.get("max_date") else ""))
    pp = os.path.join(SHEETS, "_pulled.json")
    if os.path.exists(pp):
        p = json.load(open(pp, encoding="utf-8"))
        out.append(f"- Знімок Google Sheets: {p.get('pulled')} ({len(p.get('sheets', {}))} листів)")
    else:
        out.append("- Знімка Google Sheets немає (`python3 tools/pull_sheets.py`) — аналіз лише по файлах 1С/Innovint")
    return out


def main():
    T = load_T()
    sec = [("Свіжість даних", freshness()), ("Фінанси (Dashboard_Data)", analyze_T(T)), ("1С: реалізації, борги", analyze_1c()),
           ("Товари та склад", analyze_goods()), ("Магазин та маркетинг", analyze_shop_mkt())]
    order = {"🔴": 0, "🟡": 1, "ℹ️": 2, "🟢": 3}
    findings.sort(key=lambda f: order.get(f[0], 9))
    L = [f"# Аналіз даних · {TODAY.isoformat()}", "",
         f"Згенеровано `tools/analyze.py`. Джерела: {'знімок Sheets + ' if os.path.exists(SHEETS) else ''}файли 1С/Innovint у data/. "
         f"Календарна дата аналізу: {TODAY.isoformat()}.", ""]
    L.append("## Що потребує уваги" if findings else "## Проблем не виявлено")
    L.append("")
    for sev, title, detail, action in findings:
        L.append(f"- {sev} **{title}**" + (f" — {detail}" if detail else "") + (f" → *{action}*" if action else ""))
    for title, body in sec:
        if body:
            L += ["", f"## {title}", ""] + body
    if missing:
        L += ["", "## Не знайдено (пропущено)", "", "- " + ", ".join(sorted(set(missing))) + " — зробіть знімок: `python3 tools/pull_sheets.py`"]
    text = "\n".join(L) + "\n"
    if "--print" in sys.argv:
        print(text); return
    os.makedirs(REPORTS, exist_ok=True)
    open(os.path.join(REPORTS, "latest.md"), "w", encoding="utf-8").write(text)
    open(os.path.join(REPORTS, f"{TODAY.isoformat()}.md"), "w", encoding="utf-8").write(text)
    print(text)
    print(f"→ reports/latest.md, reports/{TODAY.isoformat()}.md ({len(findings)} знахідок)")


if __name__ == "__main__":
    main()
