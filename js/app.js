// js/app.js — Constants, Globals, Helpers, Load, Filters, Render

const IGN=["#ignore","Конвертація","ІГНОР!!!","Банк???","Банк, Еквайринг"];
const ZP=["ЗП менеджерів","ЗП Виноградник","ЗП Виноробня","ЗП Готель","ЗП Цибак","BW Света","BW Наташа","BW Таня"];
const ACATS=["Обладнання виноробні","Обладнання виноградник","Обладнання, власний транспорт"];
const CHS=["Продаж, Мережі","Продаж, Horeca & Shops","Продаж, Експорт","Доход, ФОП","Продаж, Корп клієнт","Доход, каса БВ","Продаж,  Дістрібʼютор Укр","Продаж, Інтернет магазини","Продаж, на виноробні"];
const CSH={"Продаж, Мережі":"Мережі","Продаж, Horeca & Shops":"HoReCa","Продаж, Експорт":"Експорт","Доход, ФОП":"ФОП","Продаж, Корп клієнт":"Корп","Доход, каса БВ":"Каса","Продаж,  Дістрібʼютор Укр":"Дистр","Продаж, Інтернет магазини":"Інет","Продаж, на виноробні":"Виноробня"};
const CC=["#e11d48","#8b5cf6","#10b981","#f59e0b","#3b82f6","#ec4899","#14b8a6","#6366f1","#a855f7"];
const MN=["Січ","Лют","Бер","Кві","Тра","Чер","Лип","Сер","Вер","Жов","Лис","Гру"];
const MMa=["01","02","03","04","05","06","07","08","09","10","11","12"];
const COB={responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9,padding:6}}},scales:{x:{ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}};
const TAB_IDS=["balance","pl","sales","goods","exp","salary","shop","stock","cash","mkt","partners","uk","production","unrec","status","settings"];
// Вкладки зі своїми фільтрами (глобальний filterbar ховається)
const OWN_FILTER_TABS=["sales","partners","uk","production","goods","stock","mkt","settings","unrec","status","salary"];

// ========== GLOBALS ==========
let T=[],SK=[],SD=[],BL=[],WO=[],WP=[],WCU=[],GD=[],WN={},FX={EUR:44,USD:41},CH={},SETS={fopTax:7.5,fopBank:0,dispCur:"UAH"},SETTINGS=[];
let wcLoaded=false,wcError="",SP={},IG={posts:[]},MA={campaigns:[]},mktLoaded=false,mktError="";
let C1={sales:[],partners:[],products:[],osv:[],bank:[],staff:[],loaded:false};
let USERS={}; // email → {name,role,tabs,phone,active}
let LOAD_PHASE=0; // 0 — нічого, 1 — основні дані, 2 — усе

// ========== HELPERS ==========
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function net(t){
  if(t.tp==="Доход"&&(t.src==="PRIVAT"||t.src==="VOSTOK")&&t.cat!=="Продаж, Експорт")return t.amt/1.2;
  if(t.tp==="Расход"&&(t.src==="PRIVAT"||t.src==="VOSTOK")&&!ZP.some(z=>t.cat.includes(z))&&!t.cat.includes("Податки")&&!t.cat.includes("Банківська"))return t.amt/1.2;
  return t.amt;
}
function isA(t){return ACATS.some(a=>t.cat.includes(a))}
function sT(t){return(t.src==="2fMK"||t.src==="2fKiev")?"2Ф":"1Ф"}
// Останній місяць (YYYY-MM), за який є операції у Dashboard_Data (доходи, якщо inc=true)
function lastYM(inc){const l=inc?T.filter(t=>t.tp==="Доход"):T;return l.length?l.reduce((a,b)=>a.ym>b.ym?a:b).ym:""}
// YYYY-MM ± n місяців
function ymAdd(ym,n){const y=parseInt(ym.substring(0,4)),m=parseInt(ym.substring(5,7))-1+n;const d=new Date(y,m,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")}
// Опорна дата для боргів/простроки по 1С: остання дата банку або реалізацій (не сьогодні — дані можуть відставати)
function c1RefDate(){const c=C1||{};let m="";(c.bank||[]).forEach(b=>{const d=typeof parseAnyDate==="function"?parseAnyDate(b.date):null;if(d&&d.getTime()<=Date.now()){const s=d.toISOString().substring(0,10);if(s>m)m=s}});const s2=maxD(c.sales||[],r=>r.date);if(s2>m)m=s2;return m?new Date(m).getTime():Date.now()}
function c1RefISO(){return new Date(c1RefDate()).toISOString().substring(0,10)}
function ymLabel(ym){if(!ym||ym.length<7)return ym||"";return MN[parseInt(ym.substring(5,7))-1]+" "+ym.substring(0,4)}

// ========== LOAD ==========
async function load(){
  try{
    await Promise.all([nbuF(), loadSettings(), loadUsers()]);
    const[t,s,b,sd]=await Promise.all([csvF("Dashboard_Data"),csvF("3_Stock"),(async()=>{try{const d=await csvF("PRIVAT_BALANCES",SID2);if(d.length){console.log("Balance: PRIVAT_BALANCES from BW_Accounts",d.length,"rows");return d}}catch(e){console.warn("PRIVAT_BALANCES from SID2 failed:",e.message)}try{const d=await csvF("6_Balances");if(d.length){console.log("Balance: 6_Balances fallback",d.length,"rows");return d}}catch(e){}return[]})(),csvF("Stock_Data").catch(()=>[])]);
    T=t.map(x=>{const mo=String(pn(gv(x,"month"))||gv(x,"month")||"");return{mo,money:gv(x,"money")||"",name:gv(x,"name")||"",alias:gv(x,"alias")||"",cat:gv(x,"category")||"",geo:gv(x,"geo")||"",mgr:gv(x,"менеджер")||gv(x,"manager")||"",amt:pn(gv(x,"sum_uah")),com:pn(gv(x,"commission")),sm:pn(gv(x,"sum_money")),src:gv(x,"source")||""}}).filter(x=>{const m=parseInt(x.mo);return m>=202001&&!IGN.includes(x.cat)&&x.cat!==""});
    T.forEach(x=>{x.yr=x.mo.substring(0,4);x.mm=x.mo.substring(4,6);x.ym=x.yr+"-"+x.mm;x.tp=x.amt>0?"Доход":"Расход";x.nt=net(x);x.st=sT(x)});
    SK=s;BL=b;SD=sd;
    console.log("BL loaded:",BL.length,"rows");
    const yrs=[...new Set(T.map(x=>x.yr))].filter(y=>y>="2020").sort();
    document.getElementById("status").textContent="● Connected";document.getElementById("status").style.color="#10b981";
    document.getElementById("ld").classList.add("hidden");
    LOAD_PHASE=1;setSubtitle("⏳ завантаження інших джерел…");
    bldFlt(yrs);render();

    // Phase 2: усі інші джерела паралельно (кожне — незалежно, помилки не блокують інші)
    await Promise.all([
      loadWC(),loadGD(),loadWN(),loadCC(),loadCRM(),load1C(),
      (typeof loadLots==="function"?loadLots():Promise.resolve()),
      (typeof loadUK==="function"?loadUK():Promise.resolve()),
      (typeof loadMkt==="function"?loadMkt():Promise.resolve()),
      (typeof loadPayroll==="function"?loadPayroll():Promise.resolve()),
      loadSyncLog(),loadManifest()
    ].map(p=>p.catch(e=>console.warn("phase2:",e))));
    LOAD_PHASE=2;
    try{healthCompute()}catch(e){console.error("healthCompute:",e)}
    setSubtitle("");healthUpdateChip();
    render();
  }catch(e){document.getElementById("status").textContent="● Err";document.getElementById("status").style.color="#ef4444";document.getElementById("ld").innerHTML='<p style="color:#ef4444;text-align:center;padding:60px">'+e.message+'</p>';console.error(e)}
}

function setSubtitle(extra){
  const last=lastYM(false);const ago=last&&typeof agoStr==="function"?agoStr(last):"";
  const dClr=(()=>{const n=last&&typeof daysSince==="function"?daysSince(last):null;return n===null?"":n>75?"#ef4444":n>40?"#f59e0b":""})();
  const warns=[];if(LOAD_PHASE>=2){if(!WO.length)warns.push("WC_Orders порожній");if(!BL.length)warns.push("баланси не завантажені")}
  document.getElementById("subtitle").innerHTML=ff(T.length)+" опер"+(WO.length?" · "+WO.length+" WC":"")+" · виписки до <b style=\""+(dClr?"color:"+dClr:"")+"\">"+(last||"?")+"</b>"+(ago?" ("+ago+")":"")+" · €"+FX.EUR.toFixed(2)+" $"+FX.USD.toFixed(2)
    +(warns.length?' · <span style="color:#f59e0b">⚠ '+warns.join(", ")+'</span>':"")+(wcError?' · <span style="color:#ef4444">'+esc(wcError)+'</span>':"")+(extra?" · "+extra:"")
    +(DATA_SRC?' · <span style="color:#8b5cf6">джерело: '+esc(DATA_SRC)+'</span>':"");
}

// ---- Phase 2 loaders ----
async function loadWC(){
  try{
    const[wcOrdSheet,wcProdSheet]=await Promise.all([csvF("WC_Orders").catch(()=>[]),csvF("WC_Products").catch(()=>[])]);
    if(wcOrdSheet.length){
      WO=wcOrdSheet.map(r=>({
        id:pn(gv(r,"id")),status:gv(r,"status")||"",date_created:gv(r,"date_created")||"",total:gv(r,"total")||"0",
        billing:{first_name:gv(r,"billing_first_name")||"",last_name:gv(r,"billing_last_name")||"",email:gv(r,"billing_email")||"",city:gv(r,"billing_city")||"",country:gv(r,"billing_country")||"",phone:gv(r,"billing_phone")||""},
        shipping:{city:gv(r,"shipping_city")||"",country:gv(r,"shipping_country")||""},
        payment_method:gv(r,"payment_method")||"",payment_method_title:gv(r,"payment_method_title")||"",
        utm_source:gv(r,"utm_source")||"",items_count:pn(gv(r,"items_count")),items_detail:gv(r,"items_detail")||"",
        line_items:[],meta_data:[]}));
      console.log("WC from Sheets:",WO.length,"orders");
    }
    if(wcProdSheet.length){
      WP=wcProdSheet.map(r=>{
        let cats=[];try{const c=gv(r,"categories")||r["categories"]||"";if(c)cats=JSON.parse(c)}catch(e){const c=gv(r,"categories")||r["categories"]||"";if(c)cats=c.split(",").map(n=>({name:n.trim()}))}
        return{id:pn(gv(r,"id")||r["id"]),name:gv(r,"name")||r["name"]||"",stock_status:gv(r,"stock_status")||r["stock_status"]||"instock",
          stock_quantity:gv(r,"stock_quantity")||r["stock_quantity"]?pn(gv(r,"stock_quantity")||r["stock_quantity"]):null,categories:cats}});
    }
    wcLoaded=true;
  }catch(e){wcError="Sheets: "+e.message;console.error("WC Sheets error:",e);wcLoaded=true}
}
async function loadGD(){
  try{
    const gd=await csvF("FINAL_sales_detail");
    GD=gd.map(r=>{const d=gv(r,"date")||"";return{date:d,yr:d.substring(0,4),mo:d.substring(0,7),doc:gv(r,"document")||"",cust:gv(r,"customer")||"",wh:gv(r,"warehouse")||"",prod:gv(r,"product")||"",code:gv(r,"product code")||"",qty:pn(gv(r,"quantity")),price:pn(gv(r,"price")),sum:pn(gv(r,"sum")),vat:pn(gv(r,"vat"))}}).filter(r=>r.prod&&r.qty>0);
    console.log("FINAL_sales_detail loaded:",GD.length,"rows");
  }catch(e){console.warn("FINAL_sales_detail not loaded:",e.message)}
}
async function loadWN(){
  try{
    let wn=[];
    for(const name of["workerNEW","worker_new","Worker_New","WorkerNew"]){try{wn=await csvF(name,SID2);if(wn.length){console.log("worker_new found as '"+name+"':",wn.length,"rows");break}}catch(e){}}
    WN={};
    if(wn.length){
      wn.forEach(r=>{
        const cust=(r["F"]||gv(r,"f")||"").trim();
        const alias=(r["ALIAS"]||gv(r,"alias")||"").trim();
        const chan=(r["CATEGORY"]||gv(r,"category")||"").trim();
        const geo=(r["GEO"]||gv(r,"geo")||"").trim();
        const mgr=(r["Менеджер"]||gv(r,"менеджер")||"").trim();
        const contact=(r["Контактное лицо"]||gv(r,"контактн")||"").trim();
        const tel=(r["Tel"]||gv(r,"tel")||gv(r,"phone")||"").trim();
        const edrpou=(r["EDRPOU"]||gv(r,"edrpou")||"").trim();
        const discount=(r["ЗНИЖКА"]||gv(r,"знижка")||"").trim();
        const commission=(r["Коміссія Фінальна"]||gv(r,"коміссія фін")||gv(r,"коміссія")||gv(r,"комісія")||"").trim();
        if(cust)WN[cust]={alias:alias||cust,channel:chan,geo,mgr,contact,tel,edrpou,discount,commission};
      });
      console.log("worker_new loaded:",Object.keys(WN).length,"mappings");
    } else {WN._err="Sheet empty or not found"}
  }catch(e){WN={};WN._err=e.message;console.warn("worker_new not loaded:",e.message)}
}
async function loadCC(){
  try{
    const cc=await csvF("customer_channels");
    if(cc.length){window.CC_MAP={};cc.forEach(r=>{const cust=(gv(r,"customer")||gv(r,"клієнт")||gv(r,"name")||"").trim();const chan=(gv(r,"channel")||gv(r,"канал")||"").trim();const alias=(gv(r,"alias")||gv(r,"аліас")||"").trim();if(cust&&chan)CC_MAP[cust]={channel:chan,alias:alias||cust}});console.log("customer_channels loaded:",Object.keys(CC_MAP).length)}
  }catch(e){console.warn("customer_channels not found (optional):",e.message)}
}
async function loadCRM(){
  try{
    const[leads,contacts]=await Promise.all([csvF("CRM_Leads").catch(()=>[]),csvF("CRM_Contacts").catch(()=>[])]);
    window.CRM_LEADS=leads.map(r=>({company:gv(r,"company")||gv(r,"компанія")||"",contact:gv(r,"contact")||gv(r,"контакт")||"",phone:gv(r,"phone")||gv(r,"телефон")||"",email:gv(r,"email")||"",stage:gv(r,"stage")||gv(r,"стадія")||gv(r,"status")||"new",source:gv(r,"source")||gv(r,"джерело")||"",date:gv(r,"date")||gv(r,"дата")||"",value:pn(gv(r,"value")||gv(r,"сума")),next:gv(r,"next")||gv(r,"next_action")||gv(r,"наступний")||"",notes:gv(r,"notes")||gv(r,"нотатки")||gv(r,"коментар")||""})).filter(r=>r.company);
    window.CRM_CONTACTS=contacts.map(r=>({partner:gv(r,"partner")||gv(r,"партнер")||"",contact:gv(r,"contact")||gv(r,"контакт")||gv(r,"name")||"",phone:gv(r,"phone")||gv(r,"телефон")||"",email:gv(r,"email")||"",position:gv(r,"position")||gv(r,"посада")||"",notes:gv(r,"notes")||gv(r,"нотатки")||""})).filter(r=>r.partner);
    if(CRM_LEADS.length)console.log("CRM_Leads loaded:",CRM_LEADS.length);
  }catch(e){window.CRM_LEADS=window.CRM_LEADS||[];window.CRM_CONTACTS=window.CRM_CONTACTS||[]}
}
// 1С: локальні CSV з data/ (якщо є), інакше — книга beykush_data (SID3)
async function csv1C(name){const d=await csvLocal("data/1c_"+name+".csv");if(d.length)return d;return csvF(name,SID3).catch(()=>[])}
function d2iso(d){if(!d)return"";const p=d.split(/[.\-\/]/);if(p.length>=3&&p[0].length<=2)return p[2].substring(0,4)+"-"+p[1]+"-"+p[0];return d.substring(0,10)}
async function load1C(){
  try{
    const[sales1c,partners1c,products1c,osv1c,bank1c,staff1c]=await Promise.all([csv1C("sales"),csv1C("partners"),csv1C("products"),csv1C("osv"),csv1C("bank"),csv1C("staff")]);
    C1.sales=(sales1c||[]).map(r=>({date:d2iso(gv(r,"дата"))||"",num:gv(r,"номер")||"",type:gv(r,"вид")||"",sum:pn(gv(r,"сумма")),currency:gv(r,"валюта")||"грн",partner:gv(r,"контрагент")||"",warehouse:gv(r,"склад")||"",org:gv(r,"организация")||"",manager:gv(r,"ответственный")||"",comment:gv(r,"комментарий")||""})).filter(r=>r.sum>0);
    C1.partners=(partners1c||[]).map(r=>({name:gv(r,"наименование")||"",code:gv(r,"код")||"",fullname:gv(r,"полное")||"",type:gv(r,"вид")||"",edrpou:gv(r,"код по едрпоу")||gv(r,"едрпоу")||r["Код по ЕДРПОУ"]||"",tax:gv(r,"схема")||""}));
    C1.products=(products1c||[]).map(r=>({name:gv(r,"наименование")||"",code:gv(r,"код")||"",sku:gv(r,"артикул")||"",unit:gv(r,"ед")||"",vat:gv(r,"ндс")||"",comment:gv(r,"комментарий")||""}));
    C1.osv=(osv1c||[]).map(r=>{const v=Object.values(r);return{account:v[0]||"",saldoStartDt:pn(v[1]),saldoStartKt:pn(v[2]),turnDt:pn(v[3]),turnKt:pn(v[4]),saldoEndDt:pn(v[5]),saldoEndKt:pn(v[6])}}).filter(r=>r.account);
    C1.bank=(bank1c||[]).map(r=>({date:gv(r,"дата")||"",iso:d2iso(gv(r,"дата")||""),income:pn(gv(r,"поступление")),expense:pn(gv(r,"списание")),purpose:gv(r,"назначение")||"",partner:gv(r,"контрагент")||"",type:gv(r,"вид")||"",org:gv(r,"организация")||"",account:gv(r,"банковский")||""}));
    C1.staff=(staff1c||[]).map(r=>({code:gv(r,"код")||"",name:gv(r,"фио")||gv(r,"піб")||"",active:gv(r,"актуален")||"",archived:gv(r,"в архиве")||gv(r,"в архів")||""}));
    C1.loaded=true;
    console.log("1C loaded: sales",C1.sales.length,", partners",C1.partners.length,", staff",C1.staff.length);
  }catch(e){C1.loaded=true;console.warn("1C load failed:",e)}
}
async function loadSyncLog(){try{const rows=await csvF("Sync_Log").catch(()=>[]);healthParseSyncLog(rows);if(SYNC_LOG.length)console.log("Sync_Log:",SYNC_LOG.length,"rows")}catch(e){}}
async function loadManifest(){try{const r=await fetch("data/manifest.json",{cache:"no-store"});if(r.ok)MANIFEST=await r.json()}catch(e){MANIFEST=null}}

// ========== FILTERS ==========
function bldFlt(yrs){
  const fb=document.getElementById("filterbar");
  const geos=[...new Set(T.filter(t=>t.geo&&t.geo!=="="&&t.geo!=="-").map(t=>t.geo))].sort();
  const chs=[...new Set(T.filter(t=>t.tp==="Доход").map(t=>t.cat))].sort();
  const mgrs=[...new Set(T.filter(t=>t.mgr&&t.mgr!=="-"&&t.mgr!=="="&&t.mgr.trim()).map(t=>t.mgr))].sort();
  fb.innerHTML=`
    <select class="flt" id="fY"><option value="ALL">Всі роки</option>${yrs.map(y=>'<option>'+y+'</option>').join("")}</select>
    <select class="flt" id="fM"><option value="ALL">Всі міс</option>${MMa.map((m,i)=>'<option value="'+m+'">'+MN[i]+'</option>').join("")}</select>
    <select class="flt" id="fS"><option value="ALL">1Ф+2Ф</option><option>1Ф</option><option>2Ф</option></select>
    <select class="flt" id="fC"><option value="ALL">Всі канали</option>${chs.map(c=>'<option value="'+c+'">'+(c.length>22?c.substring(0,22)+"…":c)+'</option>').join("")}</select>
    <select class="flt" id="fG"><option value="ALL">Все гео</option>${geos.map(g=>'<option>'+g+'</option>').join("")}</select>
    <select class="flt" id="fMgr"><option value="ALL">Всі менедж.</option>${mgrs.map(m=>'<option>'+m+'</option>').join("")}</select>
    <select class="flt" id="fCur"><option value="UAH">₴</option><option value="EUR">€</option><option value="USD">$</option></select>`;
  ["fY","fM","fS","fC","fG","fMgr","fCur"].forEach(id=>document.getElementById(id).onchange=()=>{if(id==="fCur")SETS.dispCur=document.getElementById("fCur").value;render()});
}
function gF(){return{yr:document.getElementById("fY")?.value||"ALL",mm:document.getElementById("fM")?.value||"ALL",src:document.getElementById("fS")?.value||"ALL",chan:document.getElementById("fC")?.value||"ALL",geo:document.getElementById("fG")?.value||"ALL",mgr:document.getElementById("fMgr")?.value||"ALL"}}
function fl(list,f,tp){let r=list;if(f.yr!=="ALL")r=r.filter(t=>t.yr===f.yr);if(f.mm!=="ALL")r=r.filter(t=>t.mm===f.mm);if(f.src!=="ALL")r=r.filter(t=>t.st===f.src);if(f.chan!=="ALL")r=r.filter(t=>t.cat===f.chan);if(f.geo!=="ALL")r=r.filter(t=>t.geo===f.geo);if(f.mgr!=="ALL")r=r.filter(t=>t.mgr===f.mgr);if(tp)r=r.filter(t=>t.tp===tp);return r}
function sw(id,btn){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));if(btn)btn.classList.add('on');TAB_IDS.forEach(t=>{const el=document.getElementById('t-'+t);if(el)el.classList.add('hidden')});const target=document.getElementById('t-'+id);if(target)target.classList.remove('hidden');window.scrollTo(0,0);render()}
// Перейти на вкладку за id (з задач, довідки, чіпа в хедері)
window.goTab=function(id){const b=document.querySelector(`.tab[onclick*="'${id}'"]`);if(b&&!b.classList.contains("hidden"))sw(id,b)};
function dc(id){if(CH[id]){CH[id].destroy();delete CH[id]}}
function aY(){return[...new Set(T.map(x=>x.yr))].sort()}
function sY(f){return f.yr!=="ALL"?f.yr:aY().pop()||String(new Date().getFullYear())}
function pYr(y){return String(parseInt(y)-1)}
function mxMM(y){const ms=T.filter(t=>t.yr===y).map(t=>parseInt(t.mm));return ms.length?Math.max(...ms):12}

// ========== RENDER ==========
const RENDERERS={balance:()=>rBalance(),pl:f=>rPL(f),sales:f=>rSales(f),goods:()=>rGoods(),exp:f=>rExp(f),salary:f=>rSalary(f),shop:f=>rShop(f),stock:()=>rStock(),cash:f=>rCash(f),mkt:()=>rMkt(),partners:()=>rPartners(),uk:()=>rUK(),production:()=>rProduction(),unrec:()=>rUnrec(),status:()=>rStatus(),settings:()=>rSettings()};
// Рендеримо ТІЛЬКИ активну вкладку (швидко) і зберігаємо фокус/курсор у полі вводу, якщо він був
function render(){
  const f=gF();const id=activeTabId();
  document.getElementById("filterbar").classList.toggle("hidden",OWN_FILTER_TABS.includes(id));
  const ae=document.activeElement;const keep=ae&&ae.id&&(ae.tagName==="INPUT"||ae.tagName==="SELECT")&&document.getElementById("t-"+id)?.contains(ae)?{id:ae.id,s:ae.selectionStart,e:ae.selectionEnd}:null;
  const fn=RENDERERS[id];if(fn){try{fn(f)}catch(e){console.error("Render error ["+id+"]:",e);const el=document.getElementById("t-"+id);if(el&&!el.innerHTML)el.innerHTML='<div class="warn">Помилка відображення: '+esc(e.message)+'</div>'}}
  if(keep){const el2=document.getElementById(keep.id);if(el2){el2.focus();try{if(keep.s!==null&&keep.s!==undefined&&el2.setSelectionRange)el2.setSelectionRange(keep.s,keep.e)}catch(e){}}}
}
let _dbT=null;function dbRender(ms){clearTimeout(_dbT);_dbT=setTimeout(render,ms||150)}
// load() is called by showApp() after auth

// ========== MODALS ==========
window.showMgr=function(n){
  const f=gF(),c$=cs();const ft=fl(T,f).filter(t=>t.mgr===n&&t.tp==="Доход");
  const rev=ft.reduce((s,t)=>s+toCur(t.nt),0),com=ft.reduce((s,t)=>s+toCur(t.com),0);
  const byCat={};ft.forEach(t=>{const c=CSH[t.cat]||t.cat;byCat[c]=(byCat[c]||0)+toCur(t.nt)});
  const byC={};ft.forEach(t=>{const a=t.alias||t.name;byC[a]=(byC[a]||0)+toCur(t.nt)});
  const byM={};ft.forEach(t=>{byM[t.ym]=(byM[t.ym]||0)+toCur(t.nt)});
  document.getElementById("modal").innerHTML=`<div class="modal-c"><button class="modal-close" onclick="closeModal()">✕</button><h2>${esc(n)}</h2>
    <div class="kpis"><div class="kpi"><div class="l">Продажі</div><div class="v g">${ff(rev)}${c$}</div></div><div class="kpi"><div class="l">Комісія</div><div class="v">${ff(com)}${c$}</div><div class="s">${rev?(com/rev*100).toFixed(1):0}%</div></div><div class="kpi"><div class="l">Операцій</div><div class="v">${ft.length}</div></div></div>
    <div class="sec">По каналах</div><table class="tbl">${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>'<tr><td>'+esc(c)+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
    <div class="sec">Топ контрагентів</div><table class="tbl">${Object.entries(byC).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,v])=>'<tr><td>'+esc(n.substring(0,28))+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
    <div class="sec">По місяцях</div><table class="tbl">${Object.entries(byM).sort().map(([m,v])=>'<tr><td>'+m+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
  </div>`;document.getElementById("modal").classList.remove("hidden");
};
window.showContr=function(n){
  const f=gF(),c$=cs();const ft=fl(T,f).filter(t=>(t.alias||t.name)===n);
  const rev=ft.filter(t=>t.tp==="Доход").reduce((s,t)=>s+toCur(t.nt),0);
  const byYr={};ft.filter(t=>t.tp==="Доход").forEach(t=>{byYr[t.yr]=(byYr[t.yr]||0)+toCur(t.nt)});
  const byM={};ft.filter(t=>t.tp==="Доход").forEach(t=>{byM[t.ym]=(byM[t.ym]||0)+toCur(t.nt)});
  document.getElementById("modal").innerHTML=`<div class="modal-c"><button class="modal-close" onclick="closeModal()">✕</button><h2>${esc(n)}</h2>
    <div class="kpi" style="margin-bottom:10px"><div class="l">Всього</div><div class="v g">${ff(rev)}${c$}</div></div>
    <div class="sec">По роках</div><table class="tbl">${Object.entries(byYr).sort().map(([y,v])=>'<tr><td>'+y+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
    <div class="sec">По місяцях</div><table class="tbl">${Object.entries(byM).sort().map(([m,v])=>'<tr><td>'+m+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
  </div>`;document.getElementById("modal").classList.remove("hidden");
};
window.closeModal=function(){document.getElementById("modal").classList.add("hidden")};
document.getElementById("modal").onclick=function(e){if(e.target===this)closeModal()};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
