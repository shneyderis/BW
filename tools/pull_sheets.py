#!/usr/bin/env python3
"""
Знімок усіх листів Google Sheets → data/sheets/<лист>.csv

Навіщо: (1) щоб Claude міг аналізувати дані офлайн (tools/analyze.py), (2) резервна копія,
(3) дашборд можна відкрити на знімку: index.html?src=local

Використання (з кореня репозиторію, потрібен інтернет):
    python3 tools/pull_sheets.py            # усі листи
    python3 tools/pull_sheets.py WC_Orders  # лише вказані

Доступ: книги мають бути доступні «за посиланням» (так само працює і сам дашборд).
Ключів не потрібно — використовується той самий gviz CSV-експорт, що і в браузері.
"""
import os, sys, json, urllib.request, urllib.parse, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "sheets")

SID = "1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ"   # BW_Looker_Data
SID2 = "1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w"  # BW_accounts

# лист → книга. Опційні листи можуть бути відсутні — це нормально.
SHEETS = {
    "Dashboard_Data": SID, "3_Stock": SID, "Stock_Data": SID, "Settings": SID, "Users": SID,
    "FINAL_sales_detail": SID, "customer_channels": SID, "CRM_Leads": SID, "CRM_Contacts": SID,
    "WC_Orders": SID, "WC_Products": SID, "SP_Lists": SID, "SP_Campaigns": SID,
    "IG_Posts": SID, "FB_Posts": SID, "Meta_Ads": SID, "ADD1": SID,
    "UK_Orders": SID, "UK_Products": SID, "Sync_Log": SID,
    "Payroll": SID, "Payroll_Adj": SID,
    "PRIVAT_BALANCES": SID2, "workerNEW": SID2,
}


def fetch(sheet, sid):
    url = f"https://docs.google.com/spreadsheets/d/{sid}/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(sheet)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (bw-dashboard pull_sheets)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        ct = r.headers.get("Content-Type", "")
        body = r.read()
        if "html" in ct or body[:1] == b"<":
            return None
        return body


def main():
    want = sys.argv[1:] or list(SHEETS)
    os.makedirs(OUT, exist_ok=True)
    meta = {"pulled": datetime.datetime.now().isoformat(timespec="seconds"), "sheets": {}}
    mpath = os.path.join(OUT, "_pulled.json")
    if os.path.exists(mpath):
        try:
            meta["sheets"] = json.load(open(mpath, encoding="utf-8")).get("sheets", {})
        except Exception:
            pass
    ok = 0
    for sh in want:
        sid = SHEETS.get(sh, SID)
        try:
            body = fetch(sh, sid)
        except Exception as e:
            print(f"  ✗ {sh}: {e}")
            continue
        if body is None or len(body) < 5:
            print(f"  – {sh}: листа немає або порожній")
            continue
        path = os.path.join(OUT, f"{sh}.csv")
        with open(path, "wb") as f:
            f.write(body)
        rows = max(0, body.count(b"\n") - 1)
        meta["sheets"][sh] = {"rows": rows, "pulled": meta["pulled"], "bytes": len(body)}
        print(f"  ✓ {sh}: ~{rows} рядків")
        ok += 1
    json.dump(meta, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"Готово: {ok} листів → data/sheets/. Далі: python3 tools/analyze.py")


if __name__ == "__main__":
    main()
