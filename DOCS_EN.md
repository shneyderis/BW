# Beykush Winery Dashboard — Documentation

## General Description

Dashboard for Beykush Winery — a web application for monitoring finances, sales, inventory, marketing, and partners. Runs as a static site on Vercel, reads data from Google Sheets and local CSV files.

**URL**: https://project-33ms4.vercel.app
**Repository**: https://github.com/shneyderis/BW
**Deployment**: automatic via Vercel on push to main

---

## Authorization

### Password (always works)
| Role | Password | Access |
|---|---|---|
| **owner** | `beykush2024` | All tabs |
| **manager** | `sales2024` | Sales, Shop, Stock, Marketing, Partners |
| **accountant** | `acc2024` | P&L, Expenses, Fixed Assets, Cash Flow, Partners, Unrecognized |

### Google Sign-In (prepared, not activated)
Requires `GOOGLE_CLIENT_ID` in `js/config.js`. To set up:
1. `console.cloud.google.com` → APIs → Credentials → OAuth 2.0 Client ID
2. Authorized origins: `https://project-33ms4.vercel.app`
3. Insert Client ID into config.js → `GOOGLE_CLIENT_ID`
4. Add users to the "Users" sheet in Google Sheets

### Session
- Timeout: 30 minutes of inactivity
- Resets on any action (click, scroll, keypress)
- Stored in sessionStorage

---

## Architecture

### Project Files
```
index.html              — HTML skeleton, script imports
css/style.css           — Styles (dark theme)
js/config.js            — Sheet IDs, passwords, roles, Google OAuth
js/data.js              — CSV loader, NBU exchange rates, Settings
js/app.js               — Authorization, load(), filters, render(), modals
js/tabs/pl.js           — P&L
js/tabs/sales.js        — Sales (channels, drill-down, managers)
js/tabs/exp.js          — Expenses
js/tabs/assets.js       — Fixed Assets
js/tabs/shop.js         — Shop (4 sub-tabs: sales, products, customers, orders)
js/tabs/stock.js        — Stock (balances + 1C nomenclature)
js/tabs/cash.js         — Cash Flow
js/tabs/mkt.js          — Marketing (Email + Instagram + Meta Ads)
js/tabs/partners.js     — Partners (overview, channels, debts, contacts, CRM)
js/tabs/unrec.js        — Unrecognized transactions
js/tabs/settings.js     — Settings, roles, users, data sources
js/tabs/uk.js           — Wines of Ukraine UK (prepared)
vercel.json             — Vercel configuration (Cache-Control)
sync.gs                 — Google Apps Script for data synchronization
data/1c_*.csv           — CSV data from 1C accounting
beykush_data.xlsx       — Source xlsx file from 1C
```

### Data Sources

#### 1. Google Sheets — Main Spreadsheet (SID)
**ID**: `1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ`

| Sheet | Contents | How it's updated |
|---|---|---|
| Dashboard_Data | 5950 transactions (income/expenses) | Manually |
| 3_Stock | Wine balances (old format) | Manually |
| Stock_Data | Wine balances (new format) | Manually |
| Settings | Settings (fop_tax, vat_rate) | Manually |
| SP_Lists | SendPulse mailing lists | sync.gs → syncAll() |
| SP_Campaigns | SendPulse campaigns with statistics | sync.gs → syncAll() |
| WC_Orders | WooCommerce orders | sync.gs → syncAll() |
| WC_Products | WooCommerce products | sync.gs → syncAll() |
| IG_Posts | Instagram posts with engagement | sync.gs → syncIGPosts() |
| Meta_Ads | Meta advertising campaigns | sync.gs → syncMetaAds() |
| FB_Posts | Facebook posts | sync.gs → syncFBPosts() |
| Sync_Log | Synchronization log | Automatically |
| Users | Users for Google Auth | Manually |

#### 2. Google Sheets — Balances (SID2)
**ID**: `1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w`

| Sheet | Contents |
|---|---|
| PRIVAT_BALANCES | Account balances (₴, €, $) |

#### 3. 1C Accounting — CSV Files (data/)
Export from 1C "Accounting for Ukraine". Converted from xlsx to CSV.

| File | Records | Contents |
|---|---|---|
| 1c_sales.csv | 11,885 | Sales (date, amount, counterparty, warehouse) |
| 1c_partners.csv | 670 | Counterparties (name, EDRPOU code, type) |
| 1c_products.csv | 630 | Nomenclature (name, article, unit of measure) |
| 1c_bank.csv | 4,781 | Bank transactions (payments from buyers) |
| 1c_osv.csv | 14 | Trial balance sheet |
| 1c_contracts.csv | 1,519 | Contracts |
| 1c_warehouses.csv | 9 | Warehouses |
| 1c_orgs.csv | 4 | Organizations |
| 1c_staff.csv | 37 | Employees |
| 1c_assets.csv | 116 | Fixed assets |

#### 4. External APIs (via sync.gs)
| API | What it provides | Key/Token |
|---|---|---|
| NBU | EUR/USD exchange rates | Public API |
| SendPulse | Mailings, campaigns | Bearer token in sync.gs |
| WooCommerce | Orders, products | ck/cs keys in sync.gs |
| Meta Graph API | IG posts, FB posts, Ads | OAuth token in sync.gs |

---

## Dashboard Tabs

### P&L (Profit & Loss)
- KPIs: revenue, OPEX, fixed assets, profit, margin, balance
- Charts: by year / by month with year-over-year comparison
- Tables: income by channels, expenses by categories
- Drill-down: selecting a specific month shows details

### Sales
- **Own filters**: year + month (not global)
- 8 channels: Retail Chains, HoReCa, Distributors, Export, Online Store, Corporate Clients, Beykush Winery Register, Winery On-site Sales
- Click on a channel → drill-down (clients, cities, monthly)
- Online Store: net = amount × (1 - fop_tax% - fop_bank%)
- Managers: sales, commission, click → modal with details
- Chart: current year vs previous year

### Expenses
- OPEX excluding fixed assets
- Horizontal bar chart by categories
- Top-5 categories monthly (stacked bar)
- Year-over-year comparison

### Fixed Assets
- 3 categories: winery, vineyard, transport
- Investments by year (stacked bar)

### Shop (WooCommerce from Google Sheets)
Sub-tabs:
- **Sales**: revenue, orders, avg. check, FOP taxes, monthly, weekly, payments, UTM
- **Products**: catalog from WC_Products (if line_items are not in Sheets)
- **Customers**: LTV, repeat customers, geography, filter by city
- **Orders**: funnel, statuses, by cities, latest orders

### Stock
Sub-tabs:
- **Balances**: 3_Stock or Stock_Data (bottles, critical, stuck)
- **1C Nomenclature**: 35 wines with barcodes, trial balance (accounts 28, 36, 70)

### Cash Flow
- Balances in 3 currencies (₴, €, $)
- Accounts table with DPD
- Incoming vs outgoing monthly
- Net and cumulative chart

### Marketing
3 sections:

**Email (SendPulse)**:
- KPIs: subscribers, campaigns, open rate, click rate
- Mailings chart monthly (opened vs not opened)
- Lists, campaigns by year, latest campaigns
- Correlation: mailing → orders (±3 days)

**Instagram**:
- KPIs: engagement rate, avg. likes/reach, total likes/reach
- Content types with ER% comparison (VIDEO vs CAROUSEL vs IMAGE)
- Top-5 by likes, Top-5 by reach
- Engagement chart by posts
- Latest posts

**Meta Ads**:
- Campaign list with names, statuses, dates
- If there are expenses: spend, ROAS, CTR, purchases

### Partners (1C data)
Sub-tabs:
- **Overview**: KPIs (sold/paid/debt), overdue >30 days, by year, channels
- **Channels**: warehouses → click → list of channel partners
- **Debts**: overdue, all debtors, dormant, debt chart
- **Contacts**: full name, EDRPOU code, type, channels
- **CRM**: partner search, "need to call", latest payments

Filter by organization: Beykush Winery / Beykush F2 / All
Warning: Bank transactions are available only for Beykush Winery

### Unrecognized
- Transactions with category "???" or empty
- CSV export

### Settings
- FOP rates (single tax, bank commission)
- Roles and access (tabs × roles matrix with checkboxes)
- Passwords (owner only)
- Users
- Settings from Google Sheet (with change history)
- NBU exchange rates
- Data sources with statuses
- Session information

---

## sync.gs — Data Synchronization

### Location
Google Sheet (SID) → Extensions → Apps Script

### Configuration
All keys are in the `CONFIG` object at the beginning of the file:
- SendPulse API key
- WooCommerce ck/cs
- Meta token, Page ID, IG Account ID, Ad Account ID

### Functions

| Function | What it does | Trigger |
|---|---|---|
| `syncAll()` | Full synchronization of everything | Daily 6:00-7:00 |
| `syncWCOrdersIncremental()` | WC orders for the last 2 days | Every hour |
| `syncSendPulse()` | SendPulse only (lists + campaigns) | On demand |
| `syncWooCommerce()` | WooCommerce only (orders + products) | On demand |
| `syncAllMarketing()` | IG + FB + Meta Ads | Daily |
| `syncIGPosts()` | Instagram posts (last 100) | Daily |
| `syncFBPosts()` | Facebook posts (last 100) | Daily |
| `syncMetaAds()` | Meta advertising campaigns | Daily |
| `discoverMetaIds()` | Shows Page/IG/Ad IDs | One-time |

### Setting Up Triggers
Apps Script → Triggers → Add Trigger:
1. `syncAll` → Time-driven → Day timer → 6am-7am
2. `syncWCOrdersIncremental` → Time-driven → Hour timer → Every hour
3. `syncAllMarketing` → Time-driven → Day timer → 7am-8am

---

## Updating Data from 1C

1. Export xlsx from 1C (Accounting for Ukraine)
2. Upload to GitHub repo (replace `beykush_data.xlsx`)
3. Run conversion:
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
4. Commit + push → Vercel auto-deploy

---

## Updating Meta Token

Meta token lives ~60 days. To update:
1. https://developers.facebook.com/tools/explorer/
2. Select the Beykush app
3. Add permissions: pages_show_list, pages_read_engagement, instagram_basic, instagram_manage_insights
4. Generate Access Token
5. Update in sync.gs → CONFIG.META_TOKEN
6. Run syncAll() to verify

---

## Technical Details

### VAT Logic
- PRIVAT/VOSTOK income Ukraine: /1.2 (except Export)
- PRIVAT/VOSTOK expenses: /1.2 (except Salary, Taxes, Banking)
- Export and 2F — no changes

### Cache
- `csvF()` caches data in localStorage (offline fallback)
- Fetch timeout: 8 seconds
- If Google Sheets is unavailable — shows cached data

### Security
- XSS protection: `esc()` for HTML in modals
- Session: 30 min timeout
- Passwords in config.js (visible via View Source — static site limitation)

### CSS Conventions
- Dark theme: bg `#0c0e13`, cards `#151821`, border `#232738`
- Accents: `#10b981` green, `#ef4444` red, `#f59e0b` yellow, `#3b82f6` blue, `#9f1239` brand
- Classes: `.kpi`, `.cc`, `.tbl`, `.row`, `.flt`, `.info`, `.warn`, `.sec`

---

## Contacts and Access

| Resource | URL |
|---|---|
| Dashboard | https://project-33ms4.vercel.app |
| GitHub | https://github.com/shneyderis/BW |
| Google Sheet (main) | SID: 1K52LGIjxaQg1LfmjdVKXA0-wMh0MVUo16q-Z6BiNOsQ |
| Google Sheet (balances) | SID2: 1NGC2iicXsEZRzOASBz2KZY46Lu7EO7jNd28UOWmQK7w |
| Apps Script | In the main spreadsheet → Extensions → Apps Script |
| Meta Developers | https://developers.facebook.com/apps/ |
| Vercel | https://vercel.com (auto-deploy from GitHub) |
