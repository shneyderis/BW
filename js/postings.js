// js/postings.js — Журнал проводок по банку для ТОВ «Бейкуш Вайнері»
// Джерело: лист Dashboard_Data (банківські виписки PRIVAT + VOSTOK), читається
// заново БЕЗ фільтрів дашборда — включно з конвертаціями та нерозпізнаними.
// Правила розноски виписки (План рахунків №291, субрахунки):
//   надходження від покупця:        Дт 311/312  Кт 361/362
//   оплата постачальнику:           Дт 631      Кт 311/312
//   зарплата (ЗП*, BW*):            Дт 661      Кт 311
//   податки: ЄСВ → 651, ПДВ → 641.ПДВ, інші → 641;  Кт 311
//   банківська комісія:             Дт 92       Кт 311
//   конвертація валют:              311 ↔ 312   (flag=conversion, розносити парами)
// Основні фонди ідуть через 631 з позначкою capex=1 (далі в програмі: Дт 152 Кт 631).
// Категорія з виписки зберігається як аналітика. Дата в Dashboard_Data — лише
// місяць (YYYYMM), тому поле period; для фінального імпорту в бухпрограму
// використовуйте виписки з банку з денними датами — правила ті самі.

const POST_SRC=["PRIVAT","VOSTOK"]; // рахунки ТОВ «Бейкуш Вайнері»

function postingFor(r){
  // r: {cat, amt, money, name, alias, src}
  const fx=r.money==="EUR"||r.money==="USD";
  const bank=fx?"312":"311";
  const flags=[];
  if(!r.name&&!r.alias)flags.push("no_counterparty");
  if(!r.cat||r.cat==="???"||r.cat.includes("???")||r.cat==="#ignore"||r.cat==="ІГНОР!!!"||r.cat==="Банк???")flags.push("unmapped_category");
  let dt,kt,capex="";
  if(r.cat==="Конвертація"){dt=bank;kt=bank==="311"?"312":"311";flags.push("conversion_pair")}
  else if(r.amt>0){
    dt=bank;kt=fx||r.cat==="Продаж, Експорт"?"362":"361";
    if(r.cat==="Банк, Еквайринг")kt="333";
  } else {
    kt=bank;
    if(ZP.some(z=>r.cat.includes(z)))dt="661";
    else if(r.cat.includes("Податки"))dt=/єсв|есв/i.test(r.cat)?"651":/пдв|ндс/i.test(r.cat)?"641.ПДВ":"641";
    else if(r.cat.includes("Банківська"))dt="92";
    else if(r.cat==="Банк, Еквайринг")dt="333";
    else{dt="631";if(ACATS.some(a=>r.cat.includes(a)))capex="1"}
  }
  return{dt,kt,capex,flags};
}

async function loadRawStatements(){
  const raw=await csvF("Dashboard_Data");
  return raw.map(x=>({
    mo:String(pn(gv(x,"month"))||gv(x,"month")||""),
    money:gv(x,"money")||"",name:gv(x,"name")||"",alias:gv(x,"alias")||"",
    cat:(gv(x,"category")||"").trim(),amt:pn(gv(x,"sum_uah")),sm:pn(gv(x,"sum_money")),
    src:gv(x,"source")||""
  })).filter(x=>POST_SRC.includes(x.src)&&parseInt(x.mo)>=202001&&x.amt!==0);
}

window.exportPostingsCSV=async function(){
  const rows=await loadRawStatements();
  const out=rows.map(r=>{
    const p=postingFor(r);
    return[r.mo.substring(0,4)+"-"+r.mo.substring(4,6),r.src,
      r.amt>0?"in":"out",Math.abs(r.amt).toFixed(2),
      r.money&&r.money!=="UAH"?Math.abs(r.sm).toFixed(2):"",r.money||"UAH",
      p.dt,p.kt,(r.name||"").trim(),(r.alias||"").trim(),r.cat,p.capex,p.flags.join(";")];
  }).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
  exportCSV("bank_postings_BV.csv",
    ["period","source","direction","amount_uah","amount_orig","currency","dt","kt","counterparty","alias","category","capex","flags"],out);
  alert("Експортовано "+out.length+" операцій (ТОВ: PRIVAT+VOSTOK, 2020+). Дата — з точністю до місяця; для фінального імпорту використовуйте банківські виписки з денними датами.");
};

window.exportPostingsSummaryCSV=async function(){
  const rows=await loadRawStatements();
  const agg={};
  rows.forEach(r=>{
    const p=postingFor(r);
    const yr=r.mo.substring(0,4);
    const key=[yr,p.dt,p.kt,r.cat].join("|");
    if(!agg[key])agg[key]={yr,dt:p.dt,kt:p.kt,cat:r.cat,sum:0,cnt:0,flags:p.flags.join(";")};
    agg[key].sum+=Math.abs(r.amt);agg[key].cnt++;
  });
  const out=Object.values(agg).sort((a,b)=>a.yr.localeCompare(b.yr)||b.sum-a.sum)
    .map(a=>[a.yr,a.dt,a.kt,a.cat,a.sum.toFixed(2),a.cnt,a.flags]);
  exportCSV("bank_postings_BV_summary.csv",
    ["year","dt","kt","category","amount_uah","ops","flags"],out);
};
