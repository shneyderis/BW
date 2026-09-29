// js/health.js — Стан даних: реєстр джерел, свіжість, Sync_Log, задачі для оператора.
// Використання: healthCompute() після завантаження → HEALTH; healthChip(), healthTasksHTML(), healthTableHTML(), hdot(id).
// Кожне джерело описує: звідки береться, як часто має оновлюватись, і ЩО РОБИТИ, якщо застаріло.

let HEALTH={byId:{},list:[],tasks:[],counts:{},computedAt:null};
let SYNC_LOG=[];      // рядки листа Sync_Log: {source,result,ts}
let MANIFEST=null;    // data/manifest.json — дати вивантажень локальних файлів (1С, Innovint)

const GH_REPO="https://github.com/shneyderis/BW";
const ghFile=p=>`${GH_REPO}/blob/main/${p}`;
const bookUrl=sid=>`https://docs.google.com/spreadsheets/d/${sid}/edit`;

// ---------- дати ----------
function parseAnyDate(s){
  if(!s)return null;if(s instanceof Date)return isNaN(s)?null:s;
  s=String(s).trim();let m;
  if((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)))return new Date(+m[1],+m[2]-1,+m[3]);
  if((m=s.match(/^(\d{4})-(\d{2})$/)))return new Date(+m[1],+m[2],0);            // YYYY-MM → кінець місяця
  if((m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)))return new Date(+m[3],+m[2]-1,+m[1]);
  if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)))return new Date(+m[3],+m[1]-1,+m[2]); // US m/d/yyyy (Sheets)
  if((m=s.match(/^(\d{4})(\d{2})$/)))return new Date(+m[1],+m[2],0);
  const d=new Date(s);return isNaN(d)?null:d;
}
function daysSince(d){const dt=parseAnyDate(d);if(!dt)return null;return Math.floor((Date.now()-dt.getTime())/86400000)}
function plDays(n){if(n===null||n===undefined)return"—";const a=Math.abs(n)%100,b=a%10;const w=(a>=11&&a<=19)?"днів":b===1?"день":(b>=2&&b<=4)?"дні":"днів";return n+" "+w}
function agoStr(d){const n=daysSince(d);if(n===null)return"";if(n<=0)return"сьогодні";if(n===1)return"вчора";return plDays(n)+" тому"}
const todayISO=()=>new Date().toISOString().substring(0,10);
function _g(name){try{const v=(0,eval)(name);return v===null?undefined:v}catch(e){return undefined}}
const _rows=v=>Array.isArray(v)?v.length:(v&&typeof v==="object")?Object.keys(v).filter(k=>k!=="_err").length:0;

// ---------- реєстр джерел ----------
// kind: manual (людина вносить), sync (Apps Script), file (файл у репо), live (API), ref (довідник), opt (опційно)
// warn/stale — днів після останньої ДАТИ ДАНИХ; syncWarn/syncStale — днів після останньої синхронізації (Sync_Log)
function healthSources(){
  const S=[];
  S.push({id:"dd",label:"Dashboard_Data — банківські виписки",tabs:["balance","pl","sales","exp","salary","cash","unrec"],kind:"manual",
    where:()=>BK_MAIN()+" → лист Dashboard_Data",link:()=>bookUrl(SID),
    rows:()=>_rows(_g("T")),last:()=>maxD(_g("T")||[],t=>t.ym),warn:40,stale:75,monthly:true,
    why:"Основа для P&L, продажів, витрат, кеш-фло і ЗП. Вносяться вручну щомісяця.",
    howto:["Відкрити книгу BW_Looker_Data → лист Dashboard_Data","Додати операції за відсутні місяці (month, name, alias, category, sum_uah, source, менеджер)","Перевірити, що немає категорій «???» (вкладка ⚠️)","Оновити сторінку дашборду (Ctrl+R)"]});
  S.push({id:"bal",label:"PRIVAT_BALANCES — залишки на рахунках",tabs:["balance","pl","cash"],kind:"manual",
    where:()=>BK_ACC()+" → лист PRIVAT_BALANCES",link:()=>bookUrl(SID2),
    rows:()=>_rows(_g("BL")),last:()=>maxD(_g("BL")||[],b=>gv(b,"dpd")),warn:10,stale:30,
    why:"Гроші на рахунках у ₴/€/$ для Балансу та Кеш-фло.",
    howto:["Відкрити книгу BW_accounts → лист PRIVAT_BALANCES","Оновити баланси по рахунках і дату (dpd)","Оновити сторінку дашборду"]});
  S.push({id:"stock",label:"3_Stock / Stock_Data — залишки складу",tabs:["stock","goods","balance"],kind:"manual",
    where:()=>BK_MAIN()+" → листи 3_Stock (старий формат) / Stock_Data (новий)",link:()=>bookUrl(SID),
    rows:()=>_rows(_g("SD"))||_rows(_g("SK")),last:()=>{const sd=_g("SD")||[];return sd.length?maxD(sd,r=>gv(r,"date")):""},warn:45,stale:90,noDateOk:true,
    why:"Залишки пляшок по винах: місяці запасу у Товарах, оцінка вина у Балансі.",
    howto:["Відкрити BW_Looker_Data → лист Stock_Data (wine, date, type=balance|bottling, qty)","Додати рядки type=balance з поточними залишками на сьогоднішню дату","Або оновити 3_Stock (вино, урожай, остаток, продано, сред, запас)"]});
  S.push({id:"gd",label:"FINAL_sales_detail — накладні з 1С (пляшки)",tabs:["goods","production"],kind:"manual",
    where:()=>BK_MAIN()+" → лист FINAL_sales_detail",link:()=>bookUrl(SID),
    rows:()=>_rows(_g("GD")),last:()=>maxD(_g("GD")||[],r=>r.date),warn:40,stale:75,
    why:"Продажі по кожній пляшці: топ вин, ABC, швидкість продажу, клієнти.",
    howto:["Вивантажити з 1С реалізації по номенклатурі за відсутній період","Додати рядки в лист FINAL_sales_detail (date, document, customer, warehouse, product, quantity, price, sum)","Оновити сторінку дашборду"]});
  S.push({id:"wc",label:"WC_Orders — замовлення інтернет-магазину",tabs:["shop","mkt"],kind:"sync",syncKeys:["WC Orders"],
    where:()=>BK_MAIN()+" → лист WC_Orders (sync.gs, щогодини)",link:()=>bookUrl(SID),
    rows:()=>_rows(_g("WO")),last:()=>maxD(_g("WO")||[],o=>o.date_created),warn:14,stale:45,syncWarn:2,syncStale:7,
    why:"Продажі магазину beykush.com: виручка, клієнти, воронка, кореляція з маркетингом.",
    howto:["Відкрити BW_Looker_Data → Extensions → Apps Script → Triggers","Перевірити, що тригер syncWCOrdersIncremental (щогодини) та syncPart1 (щодня) активні й без помилок","Запустити syncWooCommerce() вручну і подивитись лист Sync_Log"]});
  S.push({id:"wcp",label:"WC_Products — товари магазину",tabs:["shop"],kind:"sync",syncKeys:["WC Products"],
    where:()=>BK_MAIN()+" → лист WC_Products (sync.gs, щодня)",link:()=>bookUrl(SID),
    rows:()=>_rows(_g("WP")),last:()=>"",noDateOk:true,syncWarn:3,syncStale:14,
    why:"Каталог і залишки товарів магазину.",
    howto:["Apps Script → запустити syncWooCommerce()","Перевірити Sync_Log на помилки WC Products"]});
  S.push({id:"sp",label:"SP_Campaigns / SP_Lists — email-розсилки",tabs:["mkt"],kind:"sync",syncKeys:["SendPulse Campaigns","SendPulse Lists"],
    where:()=>BK_MAIN()+" → листи SP_Campaigns, SP_Lists (sync.gs, щодня)",link:()=>bookUrl(SID),
    rows:()=>_rows((_g("SP")||{}).campaigns),last:()=>maxD((_g("SP")||{}).campaigns||[],c=>c.send_date),noDateOk:true,syncWarn:3,syncStale:14,
    why:"Розсилки SendPulse: open/click rate, кореляція із замовленнями.",
    howto:["Apps Script → запустити syncSendPulse()","Якщо помилка 401 — оновити SP_APIKEY у Script Properties"]});
  S.push({id:"ig",label:"IG_Posts — Instagram",tabs:["mkt"],kind:"sync",syncKeys:["IG Posts"],
    where:()=>BK_MAIN()+" → лист IG_Posts (sync.gs, щодня)",link:()=>bookUrl(SID),
    rows:()=>_rows((_g("IG")||{}).posts),last:()=>maxD((_g("IG")||{}).posts||[],p=>p.date),warn:21,stale:60,syncWarn:3,syncStale:14,
    why:"Пости, reach, engagement, найкращий день для публікації.",
    howto:["Apps Script → запустити syncIGPosts()","Якщо 0 постів або помилка 190 — згенерувати новий META_TOKEN (див. DOCS.md → Meta) і зберегти у Script Properties"]});
  S.push({id:"ads",label:"ADD1 / Meta_Ads — реклама",tabs:["mkt"],kind:"opt",syncKeys:["Meta Ads"],
    where:()=>BK_MAIN()+" → лист ADD1 (експорт Ads Manager) або Meta_Ads (API)",link:()=>bookUrl(SID),
    rows:()=>_rows((_g("MA")||{}).campaigns),last:()=>maxD((_g("MA")||{}).campaigns||[],a=>a.date_stop),warn:60,stale:120,
    why:"Витрати на рекламу, результати, CPA.",
    howto:["Ads Manager → Експорт таблиці (усі оголошення) → вставити в лист ADD1","Або Apps Script → syncMetaAds()"]});
  S.push({id:"uk",label:"UK_Orders / UK_Products — Wines of Ukraine (UK)",tabs:["uk","balance"],kind:"sync",syncKeys:["UK Orders","UK Products"],
    where:()=>BK_MAIN()+" → листи UK_Orders, UK_Products (sync.gs → syncUK)",link:()=>bookUrl(SID),
    rows:()=>_rows((_g("UK")||{}).orders),last:()=>maxD((_g("UK")||{}).orders||[],o=>o.date),warn:30,stale:90,syncWarn:3,syncStale:14,
    why:"Продажі UK-компанії через Shopify/Metorik.",
    howto:["Apps Script → запустити syncUK()","Перевірити METORIK_UK_TOKEN у Script Properties"]});
  S.push({id:"c1",label:"1С — реалізації, банк, контрагенти, ОСВ (файли data/1c_*.csv)",tabs:["partners","stock","balance","salary"],kind:"file",
    where:()=>"файли data/1c_*.csv у репозиторії (вивантаження з 1С «Бухгалтерія»)",link:()=>ghFile("data"),
    rows:()=>_rows((_g("C1")||{}).sales),last:()=>{const c=_g("C1")||{};const s=maxD(c.sales||[],r=>r.date);const m=MANIFEST&&MANIFEST.files&&MANIFEST.files["data/1c_sales.csv"];return s||(m&&m.exported)||""},warn:40,stale:90,
    exported:()=>{const m=MANIFEST&&MANIFEST.files&&MANIFEST.files["data/1c_sales.csv"];return m?m.exported:""},
    why:"Партнери, борги, оплати, номенклатура, дебіторка (рах.36), товари (рах.28), осн.засоби.",
    howto:["Вивантажити з 1С файл beykush_data.xlsx (аркуші Продажи, Контрагенты, Номенклатура, ОСВ, Банк, Склады, Договоры, Организации, Сотрудники, ОС)","Замінити beykush_data.xlsx у репозиторії та виконати: python3 tools/convert_1c.py","git commit + push → Vercel задеплоїть автоматично (або завантажити файли через GitHub → Add file → Upload)"]});
  S.push({id:"lots",label:"data/lots.csv — лоти Innovint (виробництво)",tabs:["production","balance"],kind:"file",
    where:()=>"файл data/lots.csv у репозиторії (експорт з InnoVint)",link:()=>ghFile("data/lots.csv"),
    rows:()=>_rows(_g("LOTS")),last:()=>{const m=MANIFEST&&MANIFEST.files&&MANIFEST.files["data/lots.csv"];return m?m.exported:""},warn:60,stale:120,noDateOk:false,
    exported:()=>{const m=MANIFEST&&MANIFEST.files&&MANIFEST.files["data/lots.csv"];return m?m.exported:""},
    why:"Об'єми у ємностях, стадії, готовність до розливу, оцінка вина у Балансі.",
    howto:["InnoVint → Lots → Export CSV (усі активні лоти)","Замінити data/lots.csv та виконати: python3 tools/convert_1c.py --lots-only (оновить manifest.json)","git commit + push"]});
  S.push({id:"wn",label:"workerNEW — довідник клієнтів (аліаси, канали, контакти)",tabs:["goods","partners","salary"],kind:"ref",
    where:()=>BK_ACC()+" → лист workerNEW",link:()=>bookUrl(SID2),
    rows:()=>_rows(_g("WN")),last:()=>"",noDateOk:true,
    why:"Зіставлення клієнтів 1С з каналами, менеджерами, ставками комісії, контактами.",
    howto:["Відкрити BW_accounts → workerNEW","Додати рядок: F (назва з 1С), ALIAS, CATEGORY (канал), GEO, Менеджер, Контактное лицо, Tel, EDRPOU, Коміссія Фінальна"]});
  S.push({id:"cc",label:"customer_channels — ручний маппінг клієнт → канал",tabs:["goods"],kind:"opt",
    where:()=>BK_MAIN()+" → лист customer_channels (опційно)",link:()=>bookUrl(SID),
    rows:()=>_rows(_g("CC_MAP")),last:()=>"",noDateOk:true,
    why:"Перекриває автоматичне визначення каналу для клієнтів, яких не розпізнано.",
    howto:["Товари → кнопка «📋 Експорт маппінгу каналів» → заповнити Channel для «?»","Вставити рядки в лист customer_channels (customer, channel, alias)"]});
  S.push({id:"crm",label:"CRM_Leads / CRM_Contacts — ліди та контакти",tabs:["partners"],kind:"opt",
    where:()=>BK_MAIN()+" → листи CRM_Leads, CRM_Contacts (опційно)",link:()=>bookUrl(SID),
    rows:()=>_rows(_g("CRM_LEADS")),last:()=>maxD(_g("CRM_LEADS")||[],l=>l.date),warn:30,stale:90,
    why:"Воронка лідів (new → contact → negotiate → won/lost) у вкладці Партнери → Ліди.",
    howto:["Створити лист CRM_Leads: company, contact, phone, email, stage, source, date, value, next, notes","stage = new | contact | negotiate | won | lost"]});
  S.push({id:"payroll",label:"Payroll / Payroll_Adj — оклади та коригування ЗП",tabs:["salary"],kind:"opt",wanted:true,
    where:()=>BK_MAIN()+" → листи Payroll, Payroll_Adj",link:()=>bookUrl(SID),
    rows:()=>_rows(_g("PAYROLL")),last:()=>"",noDateOk:true,
    why:"Відомість ЗП: оклад + комісія менеджера + бонуси − аванси, порівняння з фактично виплаченим.",
    howto:["Створити лист Payroll: employee, role (manager|staff), manager_name (як у колонці «менеджер» Dashboard_Data), base, currency, commission_pct, zp_category (категорія виплат у Dashboard_Data), date_from, active, notes","Опційно лист Payroll_Adj: employee, month (YYYY-MM), type (bonus|advance|deduction), amount, note","Оновити сторінку → ЗП → Відомість"]});
  S.push({id:"settings",label:"Settings — ставки (fop_tax, fop_bank, vat_rate…)",tabs:["settings","sales","shop"],kind:"ref",
    where:()=>BK_MAIN()+" → лист Settings",link:()=>bookUrl(SID),
    rows:()=>_rows(_g("SETTINGS")),last:()=>"",noDateOk:true,
    why:"Ставки з датою дії (date_from) для нетто-розрахунків ФОП.",
    howto:["Додати рядок: setting_key, value, date_from, description (стара ставка залишається для попередніх періодів)"]});
  S.push({id:"nbu",label:"НБУ — курси €/$",tabs:["balance","cash","settings"],kind:"live",
    where:()=>"API bank.gov.ua (онлайн)",link:()=>"https://bank.gov.ua/ua/markets/exchangerates",
    rows:()=>{const fx=_g("FX")||{};return(fx.EUR!==44||fx.USD!==41)?1:0},last:()=>todayISO(),noDateOk:true,
    why:"Перерахунок валютних залишків у ₴.",howto:["Курс підтягується автоматично. Якщо ✗ — API НБУ недоступний, використовуються значення за замовчуванням (€44/$41)"]});
  S.push({id:"synclog",label:"Sync_Log — журнал синхронізацій Apps Script",tabs:["status"],kind:"sync",
    where:()=>BK_MAIN()+" → лист Sync_Log",link:()=>bookUrl(SID),
    rows:()=>SYNC_LOG.length,last:()=>{let m="";SYNC_LOG.forEach(r=>{if(r.iso>m)m=r.iso});return m},warn:2,stale:7,
    why:"Показує, чи працюють автоматичні синхронізації (WC, SendPulse, IG, UK).",
    howto:["Apps Script → Triggers: syncPart1 (щодня), syncPart2 (щодня), syncWCOrdersIncremental (щогодини)","Executions → подивитись помилки останніх запусків"]});
  return S;
}

// ---------- Sync_Log ----------
function healthParseSyncLog(rows){
  SYNC_LOG=(rows||[]).map(r=>{const src=(gv(r,"source")||"").trim();const res=(gv(r,"result")||"").trim();const ts=gv(r,"timestamp")||"";const d=parseAnyDate(ts);return{source:src,result:res,ts,iso:d?d.toISOString().substring(0,10):"",d}}).filter(r=>r.source);
}
function syncInfo(keys){
  if(!keys||!keys.length||!SYNC_LOG.length)return null;
  let best=null;SYNC_LOG.forEach(r=>{if(keys.includes(r.source)&&r.d&&(!best||r.d>best.d))best=r});
  if(!best)return null;
  return{d:best.d,iso:best.iso,result:best.result,error:/^ERROR/i.test(best.result),age:daysSince(best.d)};
}

// ---------- обчислення ----------
function healthCompute(){
  const list=healthSources().map(s=>{
    const rows=s.rows()||0;const last=s.last()||"";const exported=s.exported?s.exported():"";
    const dataAge=last?daysSince(last):null;
    const sync=syncInfo(s.syncKeys);
    let status="ok",reason="";
    if(!rows){status=(s.kind==="opt"||s.kind==="ref"&&!s.wanted)?(s.wanted?"missing":"off"):"missing";reason=s.kind==="opt"&&!s.wanted?"не налаштовано (опційно)":"немає даних"}
    else if(sync&&sync.error){status="error";reason="помилка синхронізації: "+sync.result.substring(0,60)}
    else{
      const dStale=s.stale&&dataAge!==null&&dataAge>s.stale,dWarn=s.warn&&dataAge!==null&&dataAge>s.warn;
      const sStale=s.syncStale&&sync&&sync.age>s.syncStale,sWarn=s.syncWarn&&sync&&sync.age>s.syncWarn;
      const noDate=!last&&!s.noDateOk;
      if(dStale||sStale||noDate){status="stale";reason=noDate?"невідома дата даних":dStale?`дані до ${last} (${agoStr(last)})`:`синхронізація ${agoStr(sync.d)}`}
      else if(dWarn||sWarn){status="warn";reason=dWarn?`дані до ${last} (${agoStr(last)})`:`синхронізація ${agoStr(sync.d)}`}
      else reason=last?`дані до ${last}`:"";
      if(s.id==="stock"&&!_rows(_g("SD"))&&_rows(_g("SK"))){if(status==="ok"){status="warn"}reason="3_Stock (старий формат), Stock_Data порожній"}
    }
    return{...s,rows,last,exported,dataAge,sync,status,reason};
  });
  const byId={};list.forEach(s=>byId[s.id]=s);
  const counts={ok:0,warn:0,stale:0,error:0,missing:0,off:0};list.forEach(s=>counts[s.status]=(counts[s.status]||0)+1);
  HEALTH={byId,list,counts,computedAt:new Date(),tasks:[]};
  HEALTH.tasks=healthBuildTasks(list);
  return HEALTH;
}

// ---------- задачі для оператора ----------
const PRI={high:0,med:1,low:2};
function healthBuildTasks(list){
  const tasks=[];
  list.forEach(s=>{
    if(s.status==="ok"||s.status==="off")return;
    if(s.id==="synclog"&&s.status==="missing")return; // окремо нижче
    const pri=(s.status==="stale"||s.status==="error"||(s.status==="missing"&&s.kind!=="opt"))?"high":"med";
    const verb=s.status==="missing"?(s.wanted?"Створити":"Заповнити"):s.status==="error"?"Полагодити":"Оновити";
    tasks.push({kind:"data",pri,src:s.id,icon:s.kind==="sync"?"🔄":s.kind==="file"?"📁":"📝",
      title:`${verb}: ${s.label.split(" — ")[0]}`,why:s.reason+(s.why?" · "+s.why:""),steps:s.howto,link:s.link(),linkLabel:s.kind==="file"?"GitHub ↗":"Таблиця ↗",tabs:s.tabs});
  });
  // Sync_Log помилки, яких не покриває джерело
  const seen=new Set();SYNC_LOG.slice().sort((a,b)=>(b.iso||"").localeCompare(a.iso||"")).forEach(r=>{
    if(seen.has(r.source))return;seen.add(r.source);
    if(/^ERROR/i.test(r.result)&&!list.some(s=>(s.syncKeys||[]).includes(r.source)&&s.status==="error"))
      tasks.push({kind:"data",pri:"med",src:"synclog",icon:"🔄",title:`Помилка синхронізації: ${r.source}`,why:`${r.iso}: ${r.result.substring(0,80)}`,steps:["Apps Script → Executions → відкрити останній запуск","Виправити ключ/токен у Script Properties та запустити функцію вручну"],link:bookUrl(SID),linkLabel:"Таблиця ↗",tabs:["status"]});
  });
  // ---- якість даних / бізнес ----
  try{healthBizTasks(tasks)}catch(e){console.warn("biz tasks:",e)}
  tasks.sort((a,b)=>PRI[a.pri]-PRI[b.pri]);
  return tasks;
}

function healthBizTasks(tasks){
  const T_=_g("T")||[],GD_=_g("GD")||[],C1_=_g("C1")||{},WO_=_g("WO")||[];
  const lastYr=T_.length?[...new Set(T_.map(t=>t.yr))].sort().pop():"";
  // 1. нерозпізнані операції
  const unrec=T_.filter(t=>t.cat==="???"||t.cat===""||t.cat.includes("???"));
  if(unrec.length){const sum=Math.abs(unrec.reduce((s,t)=>s+t.amt,0));
    tasks.push({kind:"quality",pri:sum>100000?"high":"med",icon:"❓",title:`Розпізнати ${unrec.length} операцій без категорії (${ff(sum)}₴)`,why:"Ці суми не потрапляють у P&L та продажі. Останні: "+maxD(unrec,t=>t.ym),
      steps:["Вкладка ⚠️ → «Експорт CSV» — список контрагентів","У Dashboard_Data проставити category для цих рядків","Оновити сторінку"],link:bookUrl(SID),linkLabel:"Dashboard_Data ↗",tabs:["unrec"]})}
  // 2. продажі без менеджера (останній рік з даними)
  if(lastYr){const nm=T_.filter(t=>t.tp==="Доход"&&t.yr===lastYr&&(!t.mgr||t.mgr==="-"||t.mgr==="="||!t.mgr.trim())&&CHS.includes(t.cat)&&t.cat!=="Доход, ФОП"&&t.cat!=="Доход, каса БВ");
    if(nm.length){const sum=nm.reduce((s,t)=>s+t.nt,0);
      tasks.push({kind:"quality",pri:"med",icon:"👤",title:`Призначити менеджера: ${nm.length} продажів ${lastYr} на ${ff(sum)}₴`,why:"Без менеджера не рахуються комісії та ЗП менеджерів.",
        steps:["Продажі → Менеджери → рядок «⚠ Не призначений» — список операцій","У Dashboard_Data заповнити колонку «менеджер»"],link:bookUrl(SID),linkLabel:"Dashboard_Data ↗",tabs:["sales","salary"]})}}
  // 3. клієнти без каналу у накладних
  if(GD_.length&&typeof gdChan==="function"){const cs={};GD_.forEach(r=>{if(!gdChan(r.cust)){if(!cs[r.cust])cs[r.cust]=0;cs[r.cust]+=r.sum}});const n=Object.keys(cs).length;
    if(n){const sum=Object.values(cs).reduce((a,b)=>a+b,0);
      tasks.push({kind:"quality",pri:"low",icon:"🏷",title:`Визначити канал для ${n} клієнтів (${ff(sum)}₴ продажів)`,why:"У Товарах ці клієнти показані як «Невизначений».",
        steps:["Товари → «📋 Експорт маппінгу каналів»","Заповнити Channel для рядків із «?»","Вставити у лист customer_channels (customer, channel, alias)"],link:bookUrl(SID),linkLabel:"Таблиця ↗",tabs:["goods"]})}}
  // 4. прострочена дебіторка (1С)
  if(C1_.sales&&C1_.sales.length&&C1_.bank&&C1_.bank.length){
    const byP={};C1_.sales.filter(s=>s.org==="Бейкуш Вайнери").forEach(s=>{const p=s.partner;if(!byP[p])byP[p]={sold:0,paid:0,lastPay:""};byP[p].sold+=s.sum});
    C1_.bank.filter(b=>b.income>0&&b.type.includes("покупат")).forEach(b=>{const p=b.partner;if(byP[p]){byP[p].paid+=b.income;const iso=parseAnyDate(b.date);const s=iso?iso.toISOString().substring(0,10):"";if(s>byP[p].lastPay)byP[p].lastPay=s}});
    const INT=["інтернет магазин","конечный потребитель","корпорат.клиент","садовой","кінцевий споживач"];
    const refT=typeof c1RefDate==="function"?c1RefDate():Date.now();const ref=new Date(refT).toISOString().substring(0,10);
    let cnt=0,sum=0;Object.entries(byP).forEach(([p,d])=>{const debt=d.sold-d.paid;if(debt>1000&&!INT.some(x=>p.toLowerCase().includes(x))){const age=d.lastPay?Math.floor((refT-parseAnyDate(d.lastPay).getTime())/86400000):999;if(age>30){cnt++;sum+=debt}}});
    if(cnt)tasks.push({kind:"biz",pri:sum>200000?"high":"med",icon:"📞",title:`Дебіторка: ${cnt} партнерів без оплат >30 днів, борг ${ff(sum)}₴`,why:"Розраховано з 1С (реалізації − оплати) станом на "+ref+" — дату останніх даних 1С.",
      steps:["Партнери → CRM — список «кому зателефонувати» з контактами","Партнери → Борги — деталі по кожному"],tabs:["partners"]});
    // 5. дати в майбутньому
    const fut=C1_.bank.filter(b=>{const d=parseAnyDate(b.date);return d&&d.getTime()>Date.now()+86400000});
    if(fut.length)tasks.push({kind:"quality",pri:"low",icon:"📅",title:`1С банк: ${fut.length} операцій з датою у майбутньому`,why:fut.slice(0,3).map(b=>b.date+" · "+ff(b.income||b.expense)+"₴ · "+(b.partner||"").substring(0,30)).join("; "),
      steps:["Виправити дату документа в 1С","Перевивантажити банк (tools/convert_1c.py)"],tabs:["partners"]});
  }
  // 6. закінчуються вина (місяців запасу < 2 при наявному складі)
  if(typeof gdWineStats==="function"&&GD_.length){const arr=gdWineStats(GD_).filter(p=>p.stock>0&&p.monthsLeft>0&&p.monthsLeft<2&&p.velocity>=5);
    if(arr.length)tasks.push({kind:"biz",pri:"med",icon:"🍾",title:`Закінчуються: ${arr.length} вин із запасом < 2 міс`,why:arr.slice(0,4).map(p=>`${p.name} (${p.stock} пл, ${p.monthsLeft.toFixed(1)} міс)`).join("; "),
      steps:["Товари → сортування «Міс.зал.» — повний список","Спланувати розлив (Виробництво → готові до розливу) або обмежити продаж"],tabs:["goods","production"]})}
  // 7. магазин: скасування
  if(WO_.length){const last90=WO_.filter(o=>daysSince((o.date_created||"").substring(0,10))<=90);const canc=last90.filter(o=>o.status==="cancelled"||o.status==="failed");
    if(last90.length>=20&&canc.length/last90.length>0.15)tasks.push({kind:"biz",pri:"low",icon:"🛒",title:`Магазин: ${(canc.length/last90.length*100).toFixed(0)}% скасованих замовлень за 90 днів`,why:`${canc.length} з ${last90.length} замовлень не оплачені/скасовані.`,steps:["Магазин → Замовлення → статуси помісячно","Перевірити оплату та доставку на сайті"],tabs:["shop"]})}
}

// ---------- рендер ----------
const HST={ok:{c:"#10b981",t:"актуально"},warn:{c:"#f59e0b",t:"застаріває"},stale:{c:"#ef4444",t:"застаріло"},error:{c:"#ef4444",t:"помилка"},missing:{c:"#ef4444",t:"немає даних"},off:{c:"#565b6e",t:"не налаштовано"}};
function hdot(id){const s=HEALTH.byId[id];if(!s)return"";const st=HST[s.status]||HST.off;return`<span class="hd" style="background:${st.c}" title="${esc(s.label)}: ${st.t}${s.reason?" · "+esc(s.reason):""}"></span>`}
function healthChip(){
  const t=HEALTH.tasks||[];const hi=t.filter(x=>x.pri==="high").length;const c=HEALTH.counts||{};
  const bad=(c.stale||0)+(c.error||0)+(c.missing||0);
  const clr=bad?"#ef4444":(c.warn||0)?"#f59e0b":"#10b981";
  const txt=!HEALTH.computedAt?"дані…":t.length?`${t.length} ${t.length===1?"задача":t.length<5?"задачі":"задач"}${hi?" · "+hi+" 🔴":""}`:"дані актуальні";
  return`<span class="hd" style="background:${clr}"></span>${txt}`;
}
function healthUpdateChip(){const el=document.getElementById("hchip");if(el)el.innerHTML=healthChip()}
function taskCardHTML(t,open){
  const pc={high:"#ef4444",med:"#f59e0b",low:"#7d8196"}[t.pri]||"#7d8196";
  const tabLinks=(t.tabs||[]).filter(id=>document.getElementById("t-"+id)&&!document.querySelector(`.tab[onclick*="'${id}'"]`)?.classList.contains("hidden")).slice(0,2).map(id=>`<a href="#" onclick="goTab('${id}');return false">→ ${tabTitle(id)}</a>`).join(" ");
  return`<div class="task" style="border-left-color:${pc}">
    <div class="task-t"><span class="task-i">${t.icon||"•"}</span>${esc(t.title)}</div>
    <div class="task-w">${esc(t.why||"")}</div>
    ${t.steps&&t.steps.length?`<details class="task-d"${open?" open":""}><summary>Як зробити</summary><ol>${t.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></details>`:""}
    <div class="task-l">${t.link?`<a href="${t.link}" target="_blank" rel="noopener">${t.linkLabel||"Відкрити ↗"}</a>`:""}${tabLinks}</div>
  </div>`;
}
function tabTitle(id){const b=document.querySelector(`.tab[onclick*="'${id}'"]`);return b?b.textContent.trim():id}
// Панель задач: opts.max — скільки показати, opts.open — розгорнути кроки, opts.kinds — фільтр
function healthTasksHTML(opts){
  opts=opts||{};let t=HEALTH.tasks||[];if(opts.kinds)t=t.filter(x=>opts.kinds.includes(x.kind));
  if(!HEALTH.computedAt)return"";
  const shown=opts.max?t.slice(0,opts.max):t;
  const head=`<div class="task-head"><span>📌 ${t.length?`Що потрібно зробити (${t.length})`:"Дані актуальні, задач немає ✓"}</span><span class="task-sub">${HEALTH.counts.ok||0} ✓ · ${(HEALTH.counts.warn||0)} ⚠ · ${(HEALTH.counts.stale||0)+(HEALTH.counts.error||0)+(HEALTH.counts.missing||0)} ✗ джерел</span></div>`;
  if(!t.length)return`<div class="cc task-panel ok">${head}</div>`;
  return`<div class="cc task-panel">${head}<div class="task-grid">${shown.map(x=>taskCardHTML(x,opts.open)).join("")}</div>${t.length>shown.length?`<div class="task-more"><a href="#" onclick="goTab('status');return false">Ще ${t.length-shown.length} → вкладка 📋 Статус</a></div>`:""}</div>`;
}
function healthTableHTML(){
  if(!HEALTH.list.length)return"";
  const kindT={manual:"вручну",sync:"авто (sync.gs)",file:"файл у репо",live:"онлайн",ref:"довідник",opt:"опційно"};
  return`<div class="cc"><h3>Джерела даних · ${HEALTH.list.length}</h3><div class="tbl-wrap"><table class="tbl">
    <tr><th></th><th>Джерело</th><th>Тип</th><th class="r">Рядків</th><th class="r">Дані до</th><th class="r">Синхр.</th><th>Стан</th></tr>
    ${HEALTH.list.map(s=>{const st=HST[s.status];const sync=s.sync?`<span title="${esc(s.sync.result)}" style="color:${s.sync.error?"#ef4444":"#7d8196"}">${s.sync.iso}</span>`:(s.exported?`<span style="color:#7d8196" title="дата вивантаження">${s.exported}</span>`:"—");
      return`<tr><td>${hdot(s.id)}</td><td style="font-size:9px"><b>${esc(s.label.split(" — ")[0])}</b><div style="color:#7d8196">${s.where()}</div></td><td style="font-size:9px;color:#7d8196">${kindT[s.kind]||s.kind}</td><td class="r">${s.rows?ff(s.rows):"—"}</td><td class="r" style="font-size:9px">${s.last||"—"}</td><td class="r" style="font-size:9px">${sync}</td><td style="font-size:9px;color:${st.c}">${st.t}${s.reason&&s.status!=="ok"?`<div style="color:#7d8196">${esc(s.reason)}</div>`:""}</td></tr>`}).join("")}
  </table></div></div>`;
}
