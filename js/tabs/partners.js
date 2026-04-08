// js/tabs/partners.js — Partners: sales, payments, debt, contacts, channels

function toISO(d){if(!d)return"";const s=String(d).split(/[.\-\/]/);if(s.length>=3&&s[0].length<=2)return s[2].substring(0,4)+"-"+s[1]+"-"+s[0];if(s.length>=3&&s[0].length===4)return d.substring(0,10);return d.substring(0,10)}
function fmtDate(d){if(!d)return"";return String(d).replace(/ .*/,"").substring(0,10)}
function shortName(n){if(!n)return"";return n.replace(/Товариство з обмеженою відповідальністю\s*/gi,"ТОВ ").replace(/Фізична особа-підприємець\s*/gi,"ФОП ").replace(/ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ\s*/gi,"ТОВ ").replace(/""/g,"").replace(/"/g,"").trim()}

const INTERNAL=["інтернет магазин","конечный потребитель","корпорат.клиент","садовой","кінцевий споживач"];
const isInternal=n=>INTERNAL.some(x=>n.toLowerCase().includes(x));

let _partView="overview",_partChannel=null,_partOrg="Бейкуш Вайнери",_partSearch="";

function rPartners(){
  const el=document.getElementById("t-partners");if(!el)return;
  if(!C1.loaded){el.innerHTML='<div class="info">⏳ Завантаження даних 1С...</div>';return}
  if(!C1.sales.length){el.innerHTML='<div class="warn">Дані 1С не завантажені.</div>';return}

  // Org filter
  const allOrgs=[...new Set(C1.sales.map(s=>s.org).filter(Boolean))].sort();
  const sales=_partOrg==="ALL"?C1.sales:C1.sales.filter(s=>s.org===_partOrg);
  const partners=C1.partners;
  const bank=_partOrg==="ALL"?C1.bank||[]:(_partOrg==="Бейкуш Ф2"?[]:(C1.bank||[]));

  // === Sales by partner ===
  const byP={};
  sales.forEach(s=>{
    const p=s.partner||"(невідомий)";
    if(!byP[p])byP[p]={sold:0,cntS:0,lastSale:"",firstSale:"9999",warehouses:new Set()};
    byP[p].sold+=s.sum;byP[p].cntS++;
    if(s.date>byP[p].lastSale)byP[p].lastSale=s.date;
    if(s.date<byP[p].firstSale)byP[p].firstSale=s.date;
    if(s.warehouse)byP[p].warehouses.add(s.warehouse);
  });

  // === Payments ===
  const payments=bank.filter(b=>b.income>0&&b.type.includes("покупат"));
  const byPay={};
  payments.forEach(b=>{const p=b.partner||"";if(!p)return;if(!byPay[p])byPay[p]={paid:0,cntP:0,lastPay:""};byPay[p].paid+=b.income;byPay[p].cntP++;if(b.date>byPay[p].lastPay)byPay[p].lastPay=b.date});

  // === Merge ===
  const allNames=new Set([...Object.keys(byP),...Object.keys(byPay)]);
  const merged=[];
  allNames.forEach(name=>{
    const s=byP[name]||{sold:0,cntS:0,lastSale:"",firstSale:"",warehouses:new Set()};
    const p=byPay[name]||{paid:0,cntP:0,lastPay:""};
    const info=partners.find(x=>x.name===name)||partners.find(x=>name.includes(x.name))||{};
    merged.push({name,sold:s.sold,paid:p.paid,debt:s.sold-p.paid,cntS:s.cntS,cntP:p.cntP,lastSale:s.lastSale,lastPay:p.lastPay,warehouses:[...s.warehouses],edrpou:info.edrpou||"",type:info.type||"",fullname:info.fullname||""});
  });
  merged.sort((a,b)=>b.sold-a.sold);

  const totalSold=merged.reduce((s,p)=>s+p.sold,0);
  const totalPaid=merged.reduce((s,p)=>s+p.paid,0);
  const debtors=merged.filter(p=>p.debt>1000&&!isInternal(p.name)).sort((a,b)=>b.debt-a.debt);
  const totalDebtReal=debtors.reduce((s,p)=>s+p.debt,0);
  const now=Date.now();

  // === By warehouse (channel) ===
  const byWH={};
  sales.forEach(s=>{const w=s.warehouse||"Інше";if(!byWH[w])byWH[w]={sum:0,cnt:0,partners:{}};byWH[w].sum+=s.sum;byWH[w].cnt++;const p=s.partner;if(!byWH[w].partners[p])byWH[w].partners[p]={sum:0,cnt:0,last:""};byWH[w].partners[p].sum+=s.sum;byWH[w].partners[p].cnt++;if(s.date>byWH[w].partners[p].last)byWH[w].partners[p].last=s.date});
  const whArr=Object.entries(byWH).map(([w,d])=>({w,sum:d.sum,cnt:d.cnt,pCnt:Object.keys(d.partners).length,partners:d.partners})).sort((a,b)=>b.sum-a.sum);

  // === Sub-tabs + org filter ===
  const tabs=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px">
    <div class="sh-tabs">
      <button class="sh-tab ${_partView==="overview"?"on":""}" onclick="_partView='overview';_partChannel=null;render()">Огляд</button>
      <button class="sh-tab ${_partView==="channels"?"on":""}" onclick="_partView='channels';_partChannel=null;render()">Канали</button>
      <button class="sh-tab ${_partView==="debtors"?"on":""}" onclick="_partView='debtors';render()">Борги</button>
      <button class="sh-tab ${_partView==="contacts"?"on":""}" onclick="_partView='contacts';render()">Контакти</button>
      <button class="sh-tab ${_partView==="crm"?"on":""}" onclick="_partView='crm';render()">CRM</button>
      <button class="sh-tab ${_partView==="leads"?"on":""}" onclick="_partView='leads';render()">Ліди</button>
    </div>
    <select class="flt" id="partOrgFlt">
      <option value="ALL" ${_partOrg==="ALL"?"selected":""}>Всі організації</option>
      ${allOrgs.map(o=>`<option ${o===_partOrg?"selected":""}>${o}</option>`).join("")}
    </select>
  </div>`;

  function bindOrgFlt(){const s=document.getElementById("partOrgFlt");if(s)s.onchange=e=>{_partOrg=e.target.value;render()}}

  if(_partView==="channels"){rPartChannels(el,tabs,whArr,merged);bindOrgFlt();return}
  if(_partView==="debtors"){rPartDebtors(el,tabs,debtors,now);bindOrgFlt();return}
  if(_partView==="contacts"){rPartContacts(el,tabs,merged,partners);bindOrgFlt();return}
  if(_partView==="crm"){rPartCRM(el,tabs,merged,debtors,now,bank);bindOrgFlt();return}
  if(_partView==="leads"){rPartLeads(el,tabs);bindOrgFlt();return}

  // === OVERVIEW ===
  const byYr={};sales.forEach(s=>{const y=toISO(s.date).substring(0,4);if(y<"2015")return;if(!byYr[y])byYr[y]={sum:0,cnt:0};byYr[y].sum+=s.sum;byYr[y].cnt++});
  const yrArr=Object.entries(byYr).sort((a,b)=>b[0].localeCompare(a[0]));
  const active=merged.filter(p=>toISO(p.lastSale)>="2025");
  const overdue=debtors.filter(p=>{const lp=toISO(p.lastPay);if(!lp)return p.debt>5000;return(now-new Date(lp).getTime())>30*24*60*60*1000}).slice(0,10);

  el.innerHTML=`${tabs}
    <div class="info">${ff(sales.length)} реалізацій · ${partners.length} контрагентів · ${ff(bank.length)} банк.операцій</div>
    <div class="kpis">
      <div class="kpi"><div class="l">Продано</div><div class="v g">${ff(totalSold)}₴</div><div class="s">${ff(sales.length)} док.</div></div>
      <div class="kpi"><div class="l">Оплачено</div><div class="v" style="color:#3b82f6">${ff(totalPaid)}₴</div><div class="s">${ff(payments.length)} платежів</div></div>
      <div class="kpi"><div class="l">Заборгованість</div><div class="v" style="color:#ef4444">${ff(totalDebtReal)}₴</div><div class="s">${debtors.length} боржників</div></div>
      <div class="kpi"><div class="l">Партнерів</div><div class="v">${merged.length}</div><div class="s">активних: ${active.length}</div></div>
    </div>
    ${overdue.length?`<div class="cc" style="border-color:rgba(239,68,68,.4)"><h3 style="color:#ef4444">🔴 Прострочено (>30 днів)</h3>
      <table class="tbl"><tr><th>Партнер</th><th class="r">Борг</th><th class="r">Ост.оплата</th><th class="r">Днів</th></tr>
      ${overdue.map(p=>{const days=p.lastPay?Math.floor((now-new Date(toISO(p.lastPay)).getTime())/(1000*60*60*24)):"∞";return`<tr>
        <td style="font-size:9px">${shortName(p.name).substring(0,28)}</td>
        <td class="r rd" style="font-weight:700">${ff(p.debt)}₴</td>
        <td class="r" style="font-size:9px">${fmtDate(p.lastPay)||"ніколи"}</td>
        <td class="r rd">${days}</td>
      </tr>`}).join("")}</table></div>`:""}
    <div class="row">
      <div class="cc"><h3>По роках</h3><canvas id="cPYr" height="100"></canvas></div>
      <div class="cc"><h3>Канали (склади)</h3>
        ${whArr.map(w=>{const pct=totalSold>0?(w.sum/totalSold*100):0;return`<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px;cursor:pointer" onclick="_partView='channels';_partChannel='${w.w.replace(/'/g,"\\'")}';render()"><span>${w.w}</span><span class="g" style="font-weight:600">${ff(w.sum)}₴ <span style="color:#7d8196;font-weight:400">(${pct.toFixed(0)}%, ${w.pCnt} партн.)</span></span></div>`}).join("")}</div>
    </div>
    <div class="cc"><h3>Топ-20 партнерів <button class="flt" style="float:right;font-size:9px" onclick="exportPartnersCSV()">Експорт CSV</button></h3><canvas id="cPartBar" height="140"></canvas></div>`;

  // Export function
  window.exportPartnersCSV=function(){
    exportCSV("partners.csv",["Партнер","ЄДРПОУ","Тип","Продано","Оплачено","Борг","Ост.продаж","Ост.оплата","Канали"],
      merged.filter(p=>p.sold>0).map(p=>[shortName(p.name),p.edrpou,p.type,p.sold.toFixed(0),p.paid.toFixed(0),(p.debt>0?p.debt:0).toFixed(0),fmtDate(p.lastSale),fmtDate(p.lastPay),p.warehouses.join("; ")]));
  };

  if(yrArr.length>1){dc("cPYr");CH.cPYr=new Chart(document.getElementById("cPYr"),{type:"bar",data:{labels:yrArr.map(([y])=>y),datasets:[{data:yrArr.map(([,d])=>d.sum),backgroundColor:"#10b981",borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}})}
  const top20=merged.slice(0,20);
  if(top20.length){dc("cPartBar");CH.cPartBar=new Chart(document.getElementById("cPartBar"),{type:"bar",data:{labels:top20.map(p=>shortName(p.name).substring(0,15)),datasets:[{label:"Продано",data:top20.map(p=>p.sold),backgroundColor:"#10b981",borderRadius:2},{label:"Оплачено",data:top20.map(p=>p.paid),backgroundColor:"#3b82f6",borderRadius:2}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}})}
  bindOrgFlt();
}

// === CHANNELS VIEW ===
function rPartChannels(el,tabs,whArr,merged){
  if(_partChannel){
    const wh=whArr.find(w=>w.w===_partChannel);
    if(!wh){_partChannel=null;return rPartChannels(el,tabs,whArr,merged)}
    const pArr=Object.entries(wh.partners).map(([n,d])=>({name:n,...d,info:merged.find(m=>m.name===n)||{}})).sort((a,b)=>b.sum-a.sum);
    el.innerHTML=`${tabs}
      <button class="flt" style="margin-bottom:10px" onclick="_partChannel=null;render()">← Всі канали</button>
      <div class="kpis">
        <div class="kpi"><div class="l">${_partChannel}</div><div class="v g">${ff(wh.sum)}₴</div><div class="s">${wh.pCnt} партнерів · ${ff(wh.cnt)} док.</div></div>
      </div>
      <div class="cc"><h3>Партнери каналу "${_partChannel}"</h3>
        <table class="tbl"><tr><th>Партнер</th><th class="r">Продано</th><th class="r">Док.</th><th class="r">Ост.продаж</th><th class="r">Борг</th></tr>
        ${pArr.slice(0,40).map(p=>{const debt=(p.info.debt||0);const hasDebt=debt>1000&&!isInternal(p.name);return`<tr>
          <td style="font-size:9px">${shortName(p.name).substring(0,28)}</td>
          <td class="r g">${ff(p.sum)}₴</td>
          <td class="r">${p.cnt}</td>
          <td class="r" style="color:#7d8196;font-size:9px">${fmtDate(p.last)}</td>
          <td class="r ${hasDebt?"rd":""}">${hasDebt?ff(debt)+"₴":"✓"}</td>
        </tr>`}).join("")}
        ${pArr.length>40?`<tr><td colspan="5" style="color:#7d8196;font-size:9px">+ ще ${pArr.length-40}</td></tr>`:""}</table></div>
      <div class="cc"><h3>Топ партнерів каналу</h3><canvas id="cChPart" height="120"></canvas></div>`;
    const cd=pArr.slice(0,12);
    if(cd.length){dc("cChPart");CH.cChPart=new Chart(document.getElementById("cChPart"),{type:"bar",data:{labels:cd.map(p=>shortName(p.name).substring(0,14)),datasets:[{data:cd.map(p=>p.sum),backgroundColor:"#10b981",borderRadius:2}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}})}
    return;
  }
  // All channels
  el.innerHTML=`${tabs}
    <div class="info">Канали продажу = склади з 1С. Натисніть на канал для деталей.</div>
    ${whArr.map(w=>{const pArr=Object.entries(w.partners).sort((a,b)=>b[1].sum-a[1].sum).slice(0,5);
    return`<div class="cc" style="cursor:pointer" onclick="_partChannel='${w.w.replace(/'/g,"\\'")}';render()">
      <h3 style="display:flex;justify-content:space-between">${w.w} <span class="g">${ff(w.sum)}₴</span></h3>
      <div style="font-size:9px;color:#7d8196;margin-bottom:6px">${w.pCnt} партнерів · ${ff(w.cnt)} документів</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">${pArr.map(([n,d])=>`<span style="font-size:9px;background:#1e2130;padding:2px 6px;border-radius:3px">${shortName(n).substring(0,18)} <span class="g">${fm(d.sum)}</span></span>`).join("")}</div>
    </div>`}).join("")}`;
}

// === DEBTORS VIEW ===
function rPartDebtors(el,tabs,debtors,now){
  const sixMAgo=new Date();sixMAgo.setMonth(sixMAgo.getMonth()-6);const sixMS=sixMAgo.toISOString().substring(0,10);
  const noPayData=_partOrg==="Бейкуш Ф2"||_partOrg==="Интернет магазин"||_partOrg==="Дегустации";
  const overdue=noPayData?[]:debtors.filter(p=>{const lp=toISO(p.lastPay);if(!lp)return p.debt>5000;return(now-new Date(lp).getTime())>30*24*60*60*1000});
  const dormant=debtors.filter(p=>p.sold>10000&&toISO(p.lastSale)<sixMS);

  el.innerHTML=`${tabs}
    ${noPayData?'<div class="warn">⚠ Банківські операції є тільки для Бейкуш Вайнери. Для цієї організації борги розраховані тільки по реалізаціях (без оплат).</div>':""}
    <div class="kpis">
      <div class="kpi"><div class="l">Загальний борг</div><div class="v rd">${ff(debtors.reduce((s,p)=>s+p.debt,0))}₴</div><div class="s">${debtors.length} боржників</div></div>
      <div class="kpi"><div class="l">Прострочено (>30д)</div><div class="v rd">${overdue.length}</div><div class="s">${ff(overdue.reduce((s,p)=>s+p.debt,0))}₴</div></div>
    </div>
    ${overdue.length?`<div class="cc" style="border-color:rgba(239,68,68,.4)"><h3 style="color:#ef4444">🔴 Прострочено >30 днів</h3>
      <table class="tbl"><tr><th>Партнер</th><th class="r">Борг</th><th class="r">Продано</th><th class="r">Оплачено</th><th class="r">Ост.оплата</th><th class="r">Днів</th></tr>
      ${overdue.map(p=>{const days=p.lastPay?Math.floor((now-new Date(toISO(p.lastPay)).getTime())/(1000*60*60*24)):"∞";return`<tr>
        <td style="font-size:9px">${shortName(p.name).substring(0,25)}</td>
        <td class="r rd" style="font-weight:700">${ff(p.debt)}₴</td>
        <td class="r">${ff(p.sold)}₴</td>
        <td class="r" style="color:#3b82f6">${ff(p.paid)}₴</td>
        <td class="r" style="font-size:9px">${fmtDate(p.lastPay)||"ніколи"}</td>
        <td class="r rd">${days}</td>
      </tr>`}).join("")}</table></div>`:""}
    <div class="cc"><h3>Всі боржники (${debtors.length})</h3>
      <table class="tbl"><tr><th>Партнер</th><th class="r">Борг</th><th class="r">Ост.оплата</th><th class="r">Днів</th></tr>
      ${debtors.map(p=>{const lp=toISO(p.lastPay);const days=lp?Math.floor((now-new Date(lp).getTime())/(1000*60*60*24)):"∞";const urgent=days==="∞"||days>60;return`<tr>
        <td style="font-size:9px">${shortName(p.name).substring(0,28)}</td>
        <td class="r rd">${ff(p.debt)}₴</td>
        <td class="r" style="color:#7d8196;font-size:9px">${fmtDate(p.lastPay)||"ніколи"}</td>
        <td class="r" style="color:${urgent?"#ef4444":"#f59e0b"}">${days}</td>
      </tr>`}).join("")}</table></div>
    ${dormant.length?`<div class="cc"><h3 style="color:#f59e0b">⚠ Сплячі боржники (>6 міс без продажу)</h3>
      <table class="tbl"><tr><th>Партнер</th><th class="r">Борг</th><th class="r">Ост.продаж</th></tr>
      ${dormant.slice(0,15).map(p=>`<tr><td style="font-size:9px">${shortName(p.name).substring(0,28)}</td><td class="r rd">${ff(p.debt)}₴</td><td class="r" style="color:#ef4444;font-size:9px">${fmtDate(p.lastSale)}</td></tr>`).join("")}</table></div>`:""}
    <div class="cc"><h3>Борги по розміру</h3><canvas id="cDebtBar" height="140"></canvas></div>`;
  const top15=debtors.slice(0,15);
  if(top15.length){dc("cDebtBar");CH.cDebtBar=new Chart(document.getElementById("cDebtBar"),{type:"bar",data:{labels:top15.map(p=>shortName(p.name).substring(0,14)),datasets:[{label:"Борг",data:top15.map(p=>p.debt),backgroundColor:"#ef4444",borderRadius:2}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}})}
}

// === WN lookup for partners (uses same normalized matching as goods.js) ===
function wnForPartner(name){
  if(!WN||!Object.keys(WN).length)return null;
  return _wnLookup(name);
}

// === CONTACTS VIEW ===
function rPartContacts(el,tabs,merged,partners){
  const withSales=merged.filter(p=>p.sold>0).sort((a,b)=>b.sold-a.sold);
  const hasWN=WN&&Object.keys(WN).length>0;
  const withContact=withSales.map(p=>{const w=wnForPartner(p.name);return{...p,wn:w}});
  const search=_partSearch.toLowerCase();
  const filtered=search?withContact.filter(p=>p.name.toLowerCase().includes(search)||(p.wn&&p.wn.alias&&p.wn.alias.toLowerCase().includes(search))||(p.wn&&p.wn.contact&&p.wn.contact.toLowerCase().includes(search))):withContact;

  el.innerHTML=`${tabs}
    <div style="margin-bottom:10px">
      <input type="text" placeholder="Пошук партнера..." value="${esc(_partSearch)}"
        style="width:100%;max-width:300px;background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:8px 12px;border-radius:6px;font-family:inherit;font-size:12px"
        oninput="_partSearch=this.value;render()">
    </div>
    <div class="info">${filtered.length} партнерів · контакти: ${filtered.filter(p=>p.wn&&p.wn.contact).length} · телефони: ${filtered.filter(p=>p.wn&&p.wn.tel).length}</div>
    <div class="cc"><h3>Контакти партнерів</h3>
      <table class="tbl"><tr><th>Партнер</th><th>Контактна особа</th><th>Телефон</th><th>Канал</th><th>Менеджер</th><th class="r">Продано</th><th class="r">Борг</th></tr>
      ${filtered.slice(0,80).map(p=>{
        const w=p.wn||{};const alias=w.alias||shortName(p.name);const hasDebt=p.debt>1000&&!isInternal(p.name);
        return`<tr>
        <td style="font-size:10px;font-weight:600">${alias.substring(0,28)}</td>
        <td style="font-size:10px;color:#e4e5ea">${w.contact||'<span style="color:#7d8196">—</span>'}</td>
        <td style="font-size:10px">${w.tel?`<a href="tel:${w.tel}" style="color:#3b82f6">${w.tel}</a>`:'<span style="color:#7d8196">—</span>'}</td>
        <td style="font-size:9px;color:#8b5cf6">${w.channel||"—"}</td>
        <td style="font-size:9px;color:#7d8196">${w.mgr||"—"}</td>
        <td class="r g">${ff(p.sold)}₴</td>
        <td class="r ${hasDebt?"rd":""}">${hasDebt?ff(p.debt)+"₴":"✓"}</td>
      </tr>`}).join("")}
      ${filtered.length>80?`<tr><td colspan="7" style="color:#7d8196;font-size:9px">+ ще ${filtered.length-80}</td></tr>`:""}</table></div>`;
}

// === CRM VIEW ===
function rPartCRM(el,tabs,merged,debtors,now,bank){
  const urgentDebtors=debtors.filter(p=>{
    const lp=toISO(p.lastPay);if(!lp)return p.debt>5000;
    return(now-new Date(lp).getTime())>30*24*60*60*1000;
  });

  // Build task list: priority-sorted actions
  const tasks=[];
  // 1. Overdue debtors → CALL
  urgentDebtors.forEach(p=>{
    const w=wnForPartner(p.name)||{};
    const days=p.lastPay?Math.floor((now-new Date(toISO(p.lastPay)).getTime())/(1000*60*60*24)):999;
    const priority=days>90?"critical":days>60?"high":"medium";
    tasks.push({type:"call",priority,name:w.alias||shortName(p.name),contact:w.contact||"",tel:w.tel||"",
      reason:`Борг ${ff(p.debt)}₴ · ${days==="∞"?"ніколи не платив":days+" днів без оплати"}`,
      debt:p.debt,days,channel:w.channel||"",mgr:w.mgr||""});
  });
  // 2. Sleeping partners (had sales >6mo ago, no recent activity) → FOLLOW-UP
  const sixMAgo=new Date();sixMAgo.setMonth(sixMAgo.getMonth()-6);const sixMS=sixMAgo.toISOString().substring(0,10);
  merged.filter(p=>p.sold>20000&&!isInternal(p.name)&&toISO(p.lastSale)<sixMS&&toISO(p.lastSale)>"2020").forEach(p=>{
    const w=wnForPartner(p.name)||{};
    tasks.push({type:"followup",priority:"low",name:w.alias||shortName(p.name),contact:w.contact||"",tel:w.tel||"",
      reason:`Сплячий клієнт · продажі ${ff(p.sold)}₴ · ост.продаж ${fmtDate(p.lastSale)}`,
      debt:0,days:0,channel:w.channel||"",mgr:w.mgr||""});
  });

  tasks.sort((a,b)=>{const po={critical:0,high:1,medium:2,low:3};return(po[a.priority]||9)-(po[b.priority]||9)});

  // Recent payments
  const recentPay=bank.filter(b=>b.income>0&&b.type.includes("покупат")).sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,15);

  // Search
  const search=_partSearch.toLowerCase();
  const filteredTasks=search?tasks.filter(t=>t.name.toLowerCase().includes(search)||t.contact.toLowerCase().includes(search)):tasks;

  const prClr={critical:"#ef4444",high:"#f59e0b",medium:"#3b82f6",low:"#7d8196"};
  const prIcon={critical:"🔴",high:"🟡",medium:"🔵",low:"⚪"};
  const typeIcon={call:"📞",followup:"💤"};

  el.innerHTML=`${tabs}
    <div style="margin-bottom:10px">
      <input type="text" placeholder="Пошук..." value="${esc(_partSearch)}"
        style="width:100%;max-width:300px;background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:8px 12px;border-radius:6px;font-family:inherit;font-size:12px"
        oninput="_partSearch=this.value;render()">
    </div>

    <div class="kpis">
      <div class="kpi"><div class="l">Задач</div><div class="v" style="color:#ef4444">${tasks.length}</div></div>
      <div class="kpi"><div class="l">Критичних</div><div class="v" style="color:#ef4444">${tasks.filter(t=>t.priority==="critical").length}</div></div>
      <div class="kpi"><div class="l">Зателефонувати</div><div class="v" style="color:#f59e0b">${tasks.filter(t=>t.type==="call").length}</div></div>
      <div class="kpi"><div class="l">Нагадати</div><div class="v" style="color:#3b82f6">${tasks.filter(t=>t.type==="followup").length}</div></div>
    </div>

    <div class="cc"><h3>📋 Список задач (${filteredTasks.length})</h3>
      ${filteredTasks.slice(0,40).map(t=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:8px;margin-bottom:4px;background:#0c0e13;border-radius:6px;border-left:3px solid ${prClr[t.priority]}">
        <div style="font-size:14px;min-width:20px">${typeIcon[t.type]||"📌"}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:11px;font-weight:600;color:#e4e5ea">${t.name.substring(0,30)}</span>
            <span style="font-size:8px;padding:2px 6px;border-radius:3px;background:${prClr[t.priority]}22;color:${prClr[t.priority]}">${prIcon[t.priority]} ${t.priority}</span>
          </div>
          <div style="font-size:10px;color:#7d8196;margin-top:2px">${t.reason}</div>
          <div style="display:flex;gap:12px;margin-top:4px;font-size:10px">
            ${t.contact?`<span>👤 ${t.contact}</span>`:""}
            ${t.tel?`<a href="tel:${t.tel}" style="color:#3b82f6">📱 ${t.tel}</a>`:""}
            ${t.channel?`<span style="color:#8b5cf6">${t.channel}</span>`:""}
            ${t.mgr?`<span style="color:#7d8196">→ ${t.mgr}</span>`:""}
          </div>
        </div>
      </div>`).join("")}
    </div>

    <div class="cc"><h3>📥 Останні оплати</h3>
      <table class="tbl"><tr><th>Дата</th><th>Партнер</th><th class="r">Сума</th></tr>
      ${recentPay.map(b=>{const w=wnForPartner(b.partner);const alias=w?w.alias:shortName(b.partner);return`<tr>
        <td style="font-size:9px">${fmtDate(b.date)}</td>
        <td style="font-size:9px">${alias.substring(0,28)}</td>
        <td class="r g">${ff(b.income)}₴</td>
      </tr>`}).join("")}</table></div>`;
}

// === LEADS VIEW ===
function rPartLeads(el,tabs){
  // Pipeline stages
  const stages=[
    {id:"new",name:"Новий",clr:"#3b82f6",icon:"🆕"},
    {id:"contact",name:"Контакт",clr:"#8b5cf6",icon:"📞"},
    {id:"negotiate",name:"Переговори",clr:"#f59e0b",icon:"🤝"},
    {id:"won",name:"Виграно",clr:"#10b981",icon:"✅"},
    {id:"lost",name:"Програно",clr:"#ef4444",icon:"❌"}
  ];

  // Demo leads (to show how it would look)
  const demoLeads=[
    {company:"Ресторан 'La Terrazza'",contact:"Марія Іванова",phone:"+380501234567",stage:"new",source:"Instagram",date:"2026-04-05",value:50000,notes:"Зацікавились Кара Кермен"},
    {company:"Wine Bar Kyiv",contact:"Олексій Петров",phone:"+380671234567",stage:"contact",source:"Виставка",date:"2026-04-01",value:120000,notes:"Хочуть лінійку Artania"},
    {company:"Мережа 'Сільпо'",contact:"Анна Коваленко",phone:"+380931234567",stage:"negotiate",source:"Холодний дзвінок",date:"2026-03-15",value:500000,notes:"Тестова поставка 3 SKU"},
    {company:"Експорт Польща",contact:"Jan Kowalski",phone:"+48501234567",stage:"negotiate",source:"Email",date:"2026-03-20",value:800000,notes:"Loca Deserta + Kara Kermen"},
    {company:"Готель Одеса",contact:"Ігор Шевченко",phone:"+380661234567",stage:"won",source:"Рекомендація",date:"2026-02-10",value:35000,notes:"Перше замовлення відправлено"},
    {company:"Бар 'Дрова'",contact:"",phone:"",stage:"lost",source:"Instagram",date:"2026-01-20",value:20000,notes:"Обрали іншого постачальника"}
  ];

  const byStage={};stages.forEach(s=>{byStage[s.id]=demoLeads.filter(l=>l.stage===s.id)});
  const totalValue=demoLeads.filter(l=>l.stage!=="lost").reduce((s,l)=>s+l.value,0);
  const wonValue=demoLeads.filter(l=>l.stage==="won").reduce((s,l)=>s+l.value,0);

  el.innerHTML=`${tabs}
    <div class="warn" style="border-color:rgba(245,158,11,.4)">⚠ Це демо-приклад CRM. Для реальних даних створіть лист <b>CRM_Leads</b> в Google Sheets з колонками: company, contact, phone, stage, source, date, value, notes</div>

    <div class="kpis">
      <div class="kpi"><div class="l">Лідів</div><div class="v">${demoLeads.length}</div></div>
      <div class="kpi"><div class="l">В воронці</div><div class="v" style="color:#f59e0b">${demoLeads.filter(l=>l.stage!=="won"&&l.stage!=="lost").length}</div></div>
      <div class="kpi"><div class="l">Потенціал</div><div class="v g">${ff(totalValue)}₴</div></div>
      <div class="kpi"><div class="l">Виграно</div><div class="v" style="color:#10b981">${ff(wonValue)}₴</div></div>
    </div>

    <div class="cc"><h3>Воронка продажів</h3>
      <div style="display:flex;gap:4px;margin-bottom:12px">
        ${stages.map(s=>{const cnt=byStage[s.id].length;const val=byStage[s.id].reduce((sum,l)=>sum+l.value,0);
          return`<div style="flex:1;text-align:center;padding:8px;background:${s.clr}15;border:1px solid ${s.clr}40;border-radius:6px">
            <div style="font-size:16px">${s.icon}</div>
            <div style="font-size:10px;font-weight:600;color:${s.clr}">${s.name}</div>
            <div style="font-size:16px;font-weight:700;color:#e4e5ea">${cnt}</div>
            <div style="font-size:9px;color:#7d8196">${ff(val)}₴</div>
          </div>`}).join("")}
      </div>
    </div>

    ${stages.filter(s=>byStage[s.id].length).map(s=>`<div class="cc">
      <h3 style="color:${s.clr}">${s.icon} ${s.name} (${byStage[s.id].length})</h3>
      ${byStage[s.id].map(l=>`<div style="display:flex;align-items:flex-start;gap:8px;padding:8px;margin-bottom:4px;background:#0c0e13;border-radius:6px;border-left:3px solid ${s.clr}">
        <div style="flex:1">
          <div style="font-size:11px;font-weight:600;color:#e4e5ea">${l.company}</div>
          <div style="display:flex;gap:10px;font-size:10px;margin-top:3px">
            ${l.contact?`<span>👤 ${l.contact}</span>`:""}
            ${l.phone?`<a href="tel:${l.phone}" style="color:#3b82f6">📱 ${l.phone}</a>`:""}
            <span style="color:#7d8196">${l.source}</span>
            <span style="color:#7d8196">${l.date}</span>
          </div>
          ${l.notes?`<div style="font-size:9px;color:#7d8196;margin-top:2px">${l.notes}</div>`:""}
        </div>
        <div style="text-align:right;min-width:70px">
          <div style="font-size:11px;font-weight:600;color:#f59e0b">${ff(l.value)}₴</div>
        </div>
      </div>`).join("")}
    </div>`).join("")}`;
}
