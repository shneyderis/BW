// js/app.js — Auth, Load, Filters, Render orchestration

const IGN=["#ignore","Конвертація","ІГНОР!!!","Банк???","Банк, Еквайринг"];
const ZP=["ЗП менеджерів","ЗП Виноградник","ЗП Виноробня","ЗП Готель","ЗП Цибак","BW Света","BW Наташа","BW Таня"];
const ACATS=["Обладнання виноробні","Обладнання виноградник","Обладнання, власний транспорт"];
const CHS=["Продаж, Мережі","Продаж, Horeca & Shops","Продаж, Експорт","Доход, ФОП","Продаж, Корп клієнт","Доход, каса БВ","Продаж,  Дістрібʼютор Укр","Продаж, Інтернет магазини","Продаж, на виноробні"];
const CSH={"Продаж, Мережі":"Сети","Продаж, Horeca & Shops":"HoReCa","Продаж, Експорт":"Экспорт","Доход, ФОП":"ФОП","Продаж, Корп клієнт":"Корп","Доход, каса БВ":"Каса","Продаж,  Дістрібʼютор Укр":"Дистр","Продаж, Інтернет магазини":"Инет","Продаж, на виноробні":"Виноробня"};
const CC=["#e11d48","#8b5cf6","#10b981","#f59e0b","#3b82f6","#ec4899","#14b8a6","#6366f1","#a855f7"];
const MN=["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
const MMa=["01","02","03","04","05","06","07","08","09","10","11","12"];
const COB={responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9,padding:6}}},scales:{x:{ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}};

// ========== GLOBALS ==========
let T=[],SK=[],SD=[],BL=[],WO=[],WP=[],WCU=[],FX={EUR:44,USD:41},CH={},SETS={fopTax:7.5,fopBank:0,dispCur:"UAH"},SETTINGS=[];
let wcLoaded=false,wcError="",SP={},IG={posts:[]},MA={campaigns:[]},mktLoaded=false,mktError="";

// ========== AUTH ==========
// ROLES defined in config.js
let currentRole=null;

function doLogin(){
  const p=document.getElementById("login-pass").value;
  for(const[role,cfg]of Object.entries(ROLES)){
    if(cfg.password===p){currentRole=role;sessionStorage.setItem("bw_role",role);showApp(cfg.tabs);return}
  }
  document.getElementById("login-err").textContent="Неверный пароль";
}

function doLogout(){sessionStorage.removeItem("bw_role");currentRole=null;wcLoaded=false;wcError="";WO=[];WP=[];WCU=[];document.getElementById("app").classList.add("hidden");document.getElementById("login-screen").classList.remove("hidden");document.getElementById("login-pass").value=""}

function showApp(tabs){
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.querySelectorAll('.tab').forEach(btn=>{
    const id=btn.getAttribute('onclick')?.match(/sw\('(\w+)'/)?.[1];
    if(id){btn.classList.toggle("hidden",!tabs.includes(id));if(!tabs.includes(id)&&btn.classList.contains("on")){btn.classList.remove("on")}}
  });
  const firstVisible=document.querySelector('.tab:not(.hidden)');
  if(firstVisible&&!document.querySelector('.tab.on:not(.hidden)')){firstVisible.classList.add("on");const id=firstVisible.getAttribute('onclick')?.match(/sw\('(\w+)'/)?.[1];if(id){['pl','sales','exp','assets','shop','stock','cash','mkt','unrec','settings'].forEach(t=>document.getElementById('t-'+t).classList.add('hidden'));document.getElementById('t-'+id).classList.remove('hidden')}}
  load();
}

// Auto-login from session
(function(){const r=sessionStorage.getItem("bw_role");if(r&&ROLES[r]){currentRole=r;showApp(ROLES[r].tabs)}})();

// ========== HELPERS ==========
function net(t){
  if(t.tp==="Доход"&&(t.src==="PRIVAT"||t.src==="VOSTOK")&&t.cat!=="Продаж, Експорт")return t.amt/1.2;
  if(t.tp==="Расход"&&(t.src==="PRIVAT"||t.src==="VOSTOK")&&!ZP.some(z=>t.cat.includes(z))&&!t.cat.includes("Податки")&&!t.cat.includes("Банківська"))return t.amt/1.2;
  return t.amt;
}
function isA(t){return ACATS.some(a=>t.cat.includes(a))}
function sT(t){return(t.src==="2fMK"||t.src==="2fKiev")?"2Ф":"1Ф"}

// ========== LOAD ==========
async function load(){
  try{
    await Promise.all([nbuF(), loadSettings()]);
    const[t,s,b,sd]=await Promise.all([csvF("Dashboard_Data"),csvF("3_Stock"),(async()=>{try{const d=await csvF("PRIVAT_BALANCES",SID2);if(d.length){console.log("Balance: PRIVAT_BALANCES from BW_Accounts",d.length,"rows");return d}}catch(e){console.warn("PRIVAT_BALANCES from SID2 failed:",e.message)}try{const d=await csvF("6_Balances");if(d.length){console.log("Balance: 6_Balances fallback",d.length,"rows");return d}}catch(e){}return[]})(),csvF("Stock_Data").catch(()=>[])]);
    T=t.map(x=>{const mo=String(pn(gv(x,"month"))||gv(x,"month")||"");return{mo,money:gv(x,"money")||"",name:gv(x,"name")||"",alias:gv(x,"alias")||"",cat:gv(x,"category")||"",geo:gv(x,"geo")||"",mgr:gv(x,"менеджер")||gv(x,"manager")||"",amt:pn(gv(x,"sum_uah")),com:pn(gv(x,"commission")),sm:pn(gv(x,"sum_money")),src:gv(x,"source")||""}}).filter(x=>{const m=parseInt(x.mo);return m>=202001&&!IGN.includes(x.cat)&&x.cat!==""});
    T.forEach(x=>{x.yr=x.mo.substring(0,4);x.mm=x.mo.substring(4,6);x.ym=x.yr+"-"+x.mm;x.tp=x.amt>0?"Доход":"Расход";x.nt=net(x);x.st=sT(x)});
    SK=s;BL=b;SD=sd;
    console.log("BL loaded:",BL.length,"rows");
    const yrs=[...new Set(T.map(x=>x.yr))].filter(y=>y>="2020").sort();
    const lastTxn=T.length?T.reduce((a,b)=>a.mo>b.mo?a:b).ym:"?";
    const lastTxnDate=lastTxn!=="?"?new Date(lastTxn.substring(0,4)+"-"+lastTxn.substring(5,7)+"-28"):null;
    const daysSince=lastTxnDate?Math.floor((Date.now()-lastTxnDate.getTime())/(1000*60*60*24)):null;
    const daysStr=daysSince!==null?` · останнє оновлення: ${daysSince} днів тому`:"";
    const daysClr=daysSince>30?"#ef4444":daysSince>7?"#f59e0b":"";
    document.getElementById("status").textContent="● Connected";document.getElementById("status").style.color="#10b981";
    document.getElementById("subtitle").textContent=ff(T.length)+" опер · до "+lastTxn+" · €"+FX.EUR.toFixed(2)+" $"+FX.USD.toFixed(2)+" · ⏳ WC...";
    document.getElementById("ld").classList.add("hidden");
    bldFlt(yrs);render();

    // Phase 2: WooCommerce — from Google Sheets only
    try{
      const[wcOrdSheet,wcProdSheet]=await Promise.all([csvF("WC_Orders").catch(()=>[]),csvF("WC_Products").catch(()=>[])]);
      if(wcOrdSheet.length){
        console.log("WC_Orders columns:",Object.keys(wcOrdSheet[0]));
        console.log("WC_Orders row[0]:",JSON.stringify(wcOrdSheet[0]));
        WO=wcOrdSheet.map(r=>{
          return{
            id:pn(gv(r,"id")),
            status:gv(r,"status")||"",
            date_created:gv(r,"date_created")||"",
            total:gv(r,"total")||"0",
            billing:{
              first_name:gv(r,"billing_first_name")||"",
              last_name:gv(r,"billing_last_name")||"",
              email:gv(r,"billing_email")||"",
              city:gv(r,"billing_city")||"",
              country:gv(r,"billing_country")||"",
              phone:gv(r,"billing_phone")||""
            },
            shipping:{city:gv(r,"shipping_city")||"",country:gv(r,"shipping_country")||""},
            payment_method:gv(r,"payment_method")||"",
            payment_method_title:gv(r,"payment_method_title")||"",
            utm_source:gv(r,"utm_source")||"",
            items_count:pn(gv(r,"items_count")),
            line_items:[],meta_data:[]
          }});
        console.log("WC_Orders mapped[0]:",JSON.stringify(WO[0]));
      }
      if(wcProdSheet.length){
        console.log("WC_Products columns:",Object.keys(wcProdSheet[0]));
        WP=wcProdSheet.map(r=>{
          let cats=[];try{const c=gv(r,"categories")||r["categories"]||"";if(c)cats=JSON.parse(c)}catch(e){const c=gv(r,"categories")||r["categories"]||"";if(c)cats=c.split(",").map(n=>({name:n.trim()}))}
          return{
            id:pn(gv(r,"id")||r["id"]),
            name:gv(r,"name")||r["name"]||"",
            stock_status:gv(r,"stock_status")||r["stock_status"]||"instock",
            stock_quantity:gv(r,"stock_quantity")||r["stock_quantity"]?pn(gv(r,"stock_quantity")||r["stock_quantity"]):null,
            categories:cats
          }});
      }
      wcLoaded=true;
      console.log("WC from Sheets:",WO.length,"orders,",WP.length,"products");
    }catch(e){wcError="Sheets: "+e.message;console.error("WC Sheets error:",e);wcLoaded=true}
    const subEl=document.getElementById("subtitle");
    subEl.innerHTML=ff(T.length)+" опер · "+WO.length+" WC заказов · "+WP.length+" товаров · до "+lastTxn+" · €"+FX.EUR.toFixed(2)+" $"+FX.USD.toFixed(2)+(daysStr?` · <span style="${daysClr?"color:"+daysClr:""}">${daysStr.trim().substring(3)}</span>`:"")+(wcError?" · ⚠ "+wcError:"");
    render();
  }catch(e){document.getElementById("status").textContent="● Err";document.getElementById("status").style.color="#ef4444";document.getElementById("ld").innerHTML='<p style="color:#ef4444;text-align:center;padding:60px">'+e.message+'</p>'}
}

// ========== FILTERS ==========
function bldFlt(yrs){
  const fb=document.getElementById("filterbar");
  const geos=[...new Set(T.filter(t=>t.geo&&t.geo!=="="&&t.geo!=="-").map(t=>t.geo))].sort();
  const chs=[...new Set(T.filter(t=>t.tp==="Доход").map(t=>t.cat))].sort();
  const mgrs=[...new Set(T.filter(t=>t.mgr&&t.mgr!=="-"&&t.mgr!=="="&&t.mgr.trim()).map(t=>t.mgr))].sort();
  fb.innerHTML=`
    <select class="flt" id="fY"><option value="ALL">Все годы</option>${yrs.map(y=>'<option>'+y+'</option>').join("")}</select>
    <select class="flt" id="fM"><option value="ALL">Все мес</option>${["01","02","03","04","05","06","07","08","09","10","11","12"].map(m=>'<option>'+m+'</option>').join("")}</select>
    <select class="flt" id="fS"><option value="ALL">1Ф+2Ф</option><option>1Ф</option><option>2Ф</option></select>
    <select class="flt" id="fC"><option value="ALL">Все каналы</option>${chs.map(c=>'<option value="'+c+'">'+(c.length>22?c.substring(0,22)+"…":c)+'</option>').join("")}</select>
    <select class="flt" id="fG"><option value="ALL">Все гео</option>${geos.map(g=>'<option>'+g+'</option>').join("")}</select>
    <select class="flt" id="fMgr"><option value="ALL">Все менедж.</option>${mgrs.map(m=>'<option>'+m+'</option>').join("")}</select>
    <select class="flt" id="fCur"><option value="UAH">₴</option><option value="EUR">€</option><option value="USD">$</option></select>`;
  ["fY","fM","fS","fC","fG","fMgr","fCur"].forEach(id=>document.getElementById(id).onchange=()=>{if(id==="fCur")SETS.dispCur=document.getElementById("fCur").value;render()});
}
function gF(){return{yr:document.getElementById("fY")?.value||"ALL",mm:document.getElementById("fM")?.value||"ALL",src:document.getElementById("fS")?.value||"ALL",chan:document.getElementById("fC")?.value||"ALL",geo:document.getElementById("fG")?.value||"ALL",mgr:document.getElementById("fMgr")?.value||"ALL"}}
function fl(list,f,tp){let r=list;if(f.yr!=="ALL")r=r.filter(t=>t.yr===f.yr);if(f.mm!=="ALL")r=r.filter(t=>t.mm===f.mm);if(f.src!=="ALL")r=r.filter(t=>t.st===f.src);if(f.chan!=="ALL")r=r.filter(t=>t.cat===f.chan);if(f.geo!=="ALL")r=r.filter(t=>t.geo===f.geo);if(f.mgr!=="ALL")r=r.filter(t=>t.mgr===f.mgr);if(tp)r=r.filter(t=>t.tp===tp);return r}
function sw(id,btn){document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));btn.classList.add('on');['pl','sales','exp','assets','shop','stock','cash','mkt','unrec','settings'].forEach(t=>document.getElementById('t-'+t).classList.add('hidden'));document.getElementById('t-'+id).classList.remove('hidden');render()}
function dc(id){if(CH[id]){CH[id].destroy();delete CH[id]}}
function aY(){return[...new Set(T.map(x=>x.yr))].sort()}
function sY(f){return f.yr!=="ALL"?f.yr:aY().pop()||"2026"}
function pYr(y){return String(parseInt(y)-1)}
function mxMM(y){const ms=T.filter(t=>t.yr===y).map(t=>parseInt(t.mm));return ms.length?Math.max(...ms):12}

// ========== RENDER ==========
function render(){const f=gF();const salesOn=!document.getElementById("t-sales").classList.contains("hidden");document.getElementById("filterbar").classList.toggle("hidden",salesOn);[()=>rPL(f),()=>rSales(f),()=>rExp(f),()=>rAssets(f),()=>rShop(f),()=>rStock(),()=>rCash(f),()=>rMkt(),()=>rUnrec(),()=>rSettings()].forEach(fn=>{try{fn()}catch(e){console.error("Render error:",e)}})}
// load() is called by showApp() after auth

// ========== MODALS ==========
window.showMgr=function(n){
  const f=gF(),c$=cs();const ft=fl(T,f).filter(t=>t.mgr===n&&t.tp==="Доход");
  const rev=ft.reduce((s,t)=>s+toCur(t.nt),0),com=ft.reduce((s,t)=>s+toCur(t.com),0);
  const byCat={};ft.forEach(t=>{const c=CSH[t.cat]||t.cat;byCat[c]=(byCat[c]||0)+toCur(t.nt)});
  const byC={};ft.forEach(t=>{const a=t.alias||t.name;byC[a]=(byC[a]||0)+toCur(t.nt)});
  const byM={};ft.forEach(t=>{byM[t.ym]=(byM[t.ym]||0)+toCur(t.nt)});
  document.getElementById("modal").innerHTML=`<div class="modal-c"><button class="modal-close" onclick="closeModal()">✕</button><h2>${n}</h2>
    <div class="kpis"><div class="kpi"><div class="l">Продажи</div><div class="v g">${ff(rev)}${c$}</div></div><div class="kpi"><div class="l">Комиссия</div><div class="v">${ff(com)}${c$}</div><div class="s">${rev?(com/rev*100).toFixed(1):0}%</div></div><div class="kpi"><div class="l">Операций</div><div class="v">${ft.length}</div></div></div>
    <div class="sec">По каналам</div><table class="tbl">${Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>'<tr><td>'+c+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
    <div class="sec">Топ контрагентов</div><table class="tbl">${Object.entries(byC).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,v])=>'<tr><td>'+n.substring(0,28)+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
    <div class="sec">По месяцам</div><table class="tbl">${Object.entries(byM).sort().map(([m,v])=>'<tr><td>'+m+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
  </div>`;document.getElementById("modal").classList.remove("hidden");
};
window.showContr=function(n){
  const f=gF(),c$=cs();const ft=fl(T,f).filter(t=>(t.alias||t.name)===n);
  const rev=ft.filter(t=>t.tp==="Доход").reduce((s,t)=>s+toCur(t.nt),0);
  const byYr={};ft.filter(t=>t.tp==="Доход").forEach(t=>{byYr[t.yr]=(byYr[t.yr]||0)+toCur(t.nt)});
  const byM={};ft.filter(t=>t.tp==="Доход").forEach(t=>{byM[t.ym]=(byM[t.ym]||0)+toCur(t.nt)});
  document.getElementById("modal").innerHTML=`<div class="modal-c"><button class="modal-close" onclick="closeModal()">✕</button><h2>${n}</h2>
    <div class="kpi" style="margin-bottom:10px"><div class="l">Всего</div><div class="v g">${ff(rev)}${c$}</div></div>
    <div class="sec">По годам</div><table class="tbl">${Object.entries(byYr).sort().map(([y,v])=>'<tr><td>'+y+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
    <div class="sec">По месяцам</div><table class="tbl">${Object.entries(byM).sort().map(([m,v])=>'<tr><td>'+m+'</td><td class="r g">'+ff(v)+c$+'</td></tr>').join("")}</table>
  </div>`;document.getElementById("modal").classList.remove("hidden");
};
window.closeModal=function(){document.getElementById("modal").classList.add("hidden")};
document.getElementById("modal").onclick=function(e){if(e.target===this)closeModal()};
