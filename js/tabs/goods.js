// js/tabs/goods.js — Product-level sales analytics (FINAL_sales_detail + worker_new)

let _gdView="top",_gdYr="ALL",_gdChan="ALL",_gdGeo="ALL",_gdSearch="",_gdSort="sum",_gdSortDir=-1;
function stripVintage(name){return name.replace(/\s+20[12]\d\s*$/,"").trim()}

// Build channel/alias mapping from Dashboard_Data (T) — always available
// T has: name (bank counterparty), alias, cat (channel like "Продаж, Horeca & Shops")
const _chanCache={};
let _chanMap=null; // alias → {alias, channel}
function _buildChanMap(){
  if(_chanMap)return;
  _chanMap={byAlias:{},byName:{},byEdr:{}};
  // From T: map alias and name → channel
  if(typeof T!=="undefined"&&T.length){
    T.forEach(t=>{
      if(t.tp==="Доход"&&t.cat&&CHS.includes(t.cat)){
        const ch=CSH[t.cat]||t.cat;
        if(t.alias&&!_chanMap.byAlias[t.alias])_chanMap.byAlias[t.alias]={alias:t.alias,channel:ch,geo:t.geo||""};
        if(t.name&&!_chanMap.byName[t.name])_chanMap.byName[t.name]={alias:t.alias||t.name,channel:ch,geo:t.geo||""};
      }
    });
  }
  // From WN if available
  if(WN&&Object.keys(WN).length){
    for(const[k,v]of Object.entries(WN)){
      if(k==="_err")continue;
      if(v.channel){
        const ch=CSH[v.channel]||v.channel;
        const entry={alias:v.alias||k,channel:ch,geo:v.geo||"",contact:v.contact||"",tel:v.tel||"",mgr:v.mgr||"",discount:v.discount||"",commission:v.commission||""};
        _chanMap.byName[k]=entry;
        if(v.alias&&v.alias!==k)_chanMap.byAlias[v.alias]=entry;
        if(v.edrpou)_chanMap.byEdr[v.edrpou]=entry;
      }
    }
  }
}
function _normName(n){
  return n.toLowerCase().replace(/товариство з обмеженою відповідальніст[юі]\s*/gi,"").replace(/tobapиctbo 3 oбmeжеhoю відповідальніст[юі]\s*/gi,"").replace(/фізична особа[\s\-–]*підприємець\s*/gi,"").replace(/фiзична особа[\s\-–]*пiдприємець\s*/gi,"").replace(/\bтов\b|\bфоп\b/gi,"").replace(/[""«»"']/g,"").replace(/\s+/g," ").trim();
}
function _chanLookup(cust){
  if(_chanCache[cust]!==undefined)return _chanCache[cust];
  // 0. Manual override from customer_channels sheet (highest priority)
  if(typeof CC_MAP!=="undefined"&&CC_MAP[cust]){_chanCache[cust]=CC_MAP[cust];return CC_MAP[cust]}
  if(typeof CC_MAP!=="undefined"&&CC_MAP[cust.trim()]){_chanCache[cust]=CC_MAP[cust.trim()];return CC_MAP[cust.trim()]}
  _buildChanMap();
  // 1. Exact by name/alias
  if(_chanMap.byAlias[cust]){_chanCache[cust]=_chanMap.byAlias[cust];return _chanCache[cust]}
  if(_chanMap.byName[cust]){_chanCache[cust]=_chanMap.byName[cust];return _chanCache[cust]}
  const ct=cust.trim();
  if(_chanMap.byAlias[ct]||_chanMap.byName[ct]){const r=_chanMap.byAlias[ct]||_chanMap.byName[ct];_chanCache[cust]=r;return r}
  // 2. EDRPOU bridge via C1.partners
  if(C1&&C1.partners&&C1.partners.length){
    const p=C1.partners.find(x=>x.name===cust||x.name===ct);
    if(p&&p.edrpou&&_chanMap.byEdr[p.edrpou]){_chanCache[cust]=_chanMap.byEdr[p.edrpou];return _chanCache[cust]}
  }
  // 3. Fuzzy normalized match on alias/name keys
  const nc=_normName(cust);
  if(nc.length>3){
    for(const[k,v]of Object.entries(_chanMap.byAlias)){
      const nk=_normName(k);if(nk.length>3&&(nc.includes(nk)||nk.includes(nc))){_chanCache[cust]=v;return v}
    }
    for(const[k,v]of Object.entries(_chanMap.byName)){
      const nk=_normName(k);if(nk.length>3&&(nc.includes(nk)||nk.includes(nc))){_chanCache[cust]=v;return v}
    }
  }
  _chanCache[cust]=null;return null;
}
function _shortName(n){return n.replace(/Товариство з обмеженою відповідальніст[юі]\s*/gi,"ТОВ ").replace(/ТОВАРИСТВО З ОБМЕЖЕНОЮ В[IІ]ДПОВ[IІ]ДАЛЬН[IІ]СТ[ЮІ]\s*/gi,"ТОВ ").replace(/TOBAPИCTBO 3 OБMEЖЕHOЮ ВІДПОВІДАЛЬНІСТ[ЮІ]\s*/gi,"ТОВ ").replace(/Фізична особа[\s\-–]*підприємець\s*/gi,"ФОП ").replace(/ФІЗИЧНА ОСОБА[\s\-–]*ПІДПРИЄМЕЦЬ\s*/gi,"ФОП ").replace(/[""«»"]/g,"").trim()}
function gdAlias(cust){const w=_chanLookup(cust);return w&&w.alias?w.alias:_shortName(cust)}
function gdChan(cust){const w=_chanLookup(cust);return w&&w.channel?w.channel:""}

function rGoods(){
  const el=document.getElementById("t-goods");if(!el)return;
  if(!GD.length){el.innerHTML='<div class="info">Завантаження FINAL_sales_detail...</div>';return}
  // Reset caches on each render (WN may have loaded since last render)
  _chanMap=null;Object.keys(_chanCache).forEach(k=>delete _chanCache[k]);
  const c$=cs();

  // === Available years, channels, geo ===
  const allYrs=[...new Set(GD.map(r=>r.yr))].filter(y=>y>="2020").sort();
  const allChans=[...new Set(GD.map(r=>gdChan(r.cust)).filter(Boolean))].sort();
  // Geo from T mapping (via _chanLookup)
  function _gdGeoFor(cust){const w=_chanLookup(cust);return w&&w.geo?w.geo:""}
  const allGeos=[...new Set(GD.map(r=>{const w=_chanLookup(r.cust);return w&&w.geo?w.geo:""}).filter(Boolean))].sort();

  // === Filter data ===
  let fd=GD;
  if(_gdYr!=="ALL")fd=fd.filter(r=>r.yr===_gdYr);
  if(_gdChan==="?")fd=fd.filter(r=>!gdChan(r.cust));
  else if(_gdChan!=="ALL")fd=fd.filter(r=>gdChan(r.cust)===_gdChan);
  if(_gdGeo!=="ALL")fd=fd.filter(r=>_gdGeoFor(r.cust)===_gdGeo);

  const totalQty=fd.reduce((s,r)=>s+r.qty,0);
  const totalSum=fd.reduce((s,r)=>s+r.sum,0);
  const totalDocs=[...new Set(fd.map(r=>r.doc))].length;
  const totalProds=[...new Set(fd.map(r=>r.prod))].length;
  const totalCusts=[...new Set(fd.map(r=>r.cust))].length;

  // === Header: sub-tabs + filters ===
  const header=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px">
    <div class="sh-tabs">
      <button class="sh-tab ${_gdView==="top"?"on":""}" onclick="_gdView='top';render()">Топ вина</button>
      <button class="sh-tab ${_gdView==="customers"?"on":""}" onclick="_gdView='customers';render()">Клієнти</button>
      <button class="sh-tab ${_gdView==="trends"?"on":""}" onclick="_gdView='trends';render()">Тренди</button>
    </div>
    <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
      <select class="flt" id="gdYrFlt">
        <option value="ALL" ${_gdYr==="ALL"?"selected":""}>Всі роки</option>
        ${allYrs.map(y=>`<option ${y===_gdYr?"selected":""}>${y}</option>`).join("")}
      </select>
      ${allGeos.length?`<select class="flt" id="gdGeoFlt">
        <option value="ALL" ${_gdGeo==="ALL"?"selected":""}>Все гео</option>
        ${allGeos.map(g=>`<option ${g===_gdGeo?"selected":""}>${g}</option>`).join("")}
      </select>`:""}
      <input type="text" placeholder="Пошук вина..." value="${_gdSearch}" style="background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:5px 8px;border-radius:4px;font-size:11px;width:130px" oninput="_gdSearch=this.value;render()">
    </div>
  </div>
  <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">
    <button class="flt" style="${_gdChan==="ALL"?"background:#9f1239;color:#fff;border-color:#9f1239":""}" onclick="_gdChan='ALL';render()">Всі канали</button>
    ${allChans.map(ch=>`<button class="flt" style="${_gdChan===ch?"background:#9f1239;color:#fff;border-color:#9f1239":""}" onclick="_gdChan='${ch.replace(/'/g,"\\'")}';render()">${ch}</button>`).join("")}
    <button class="flt" style="${_gdChan==="?"?"background:#7d8196;color:#fff;border-color:#7d8196":""}" onclick="_gdChan='?';render()">Невизначений</button>
  </div>`;

  function bindFlt(){const s=document.getElementById("gdYrFlt");if(s)s.onchange=e=>{_gdYr=e.target.value;render()};const g=document.getElementById("gdGeoFlt");if(g)g.onchange=e=>{_gdGeo=e.target.value;render()}}

  if(_gdView==="customers"){rGdCustomers(el,header,fd,c$);bindFlt();return}
  if(_gdView==="trends"){rGdTrends(el,header,allYrs,c$);bindFlt();return}

  // === TOP PRODUCTS (grouped by base name, without vintage year) ===
  const byWine={};
  fd.forEach(r=>{
    const base=stripVintage(r.prod);
    if(!byWine[base])byWine[base]={qty:0,sum:0,vintages:new Set()};
    byWine[base].qty+=r.qty;byWine[base].sum+=r.sum;
    // Extract vintage year
    const ym=r.prod.match(/\b(20[12]\d)\s*$/);if(ym)byWine[base].vintages.add(ym[1]);
  });
  let prodArr=Object.entries(byWine).map(([name,d])=>({name,qty:d.qty,sum:d.sum,avg:d.qty>0?d.sum/d.qty:0,vintages:[...d.vintages].sort().join(", ")}));
  if(_gdSearch){const q=_gdSearch.toLowerCase();prodArr=prodArr.filter(p=>p.name.toLowerCase().includes(q))}

  // Sort
  if(_gdSort==="qty")prodArr.sort((a,b)=>(a.qty-b.qty)*_gdSortDir);
  else if(_gdSort==="avg")prodArr.sort((a,b)=>(a.avg-b.avg)*_gdSortDir);
  else prodArr.sort((a,b)=>(a.sum-b.sum)*_gdSortDir);

  function sortHdr(col,label){const active=_gdSort===col;const arrow=active?(_gdSortDir<0?"▼":"▲"):"";return`<th class="r" style="cursor:pointer;user-select:none${active?";color:#f59e0b":""}" onclick="gdToggleSort('${col}')">${label} ${arrow}</th>`}

  const _wnCount=WN?Object.keys(WN).filter(k=>k!=="_err").length:0;
  const _allGdCusts=[...new Set(GD.map(r=>r.cust))];
  const _matchedCount=_allGdCusts.filter(c=>_chanLookup(c)).length;

  el.innerHTML=`${header}
    <div class="info">${ff(fd.length)} позицій · ${ff(totalDocs)} накладних · ${totalProds} вин · ${totalCusts} клієнтів${_gdYr!=="ALL"?" · "+_gdYr:""}${_gdChan!=="ALL"?" · "+_gdChan:""}${_gdGeo!=="ALL"?" · "+_gdGeo:""}
      · <span style="color:${_wnCount>0?"#10b981":"#ef4444"}">WN:${_wnCount}</span> matched:${_matchedCount}/${_allGdCusts.length}
      <button class="flt" style="float:right;font-size:9px" onclick="exportChannelMapping()">📋 Експорт маппінгу каналів</button>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="l">Продано пляшок</div><div class="v g">${ff(totalQty)}</div></div>
      <div class="kpi"><div class="l">Сума</div><div class="v" style="color:#f59e0b">${ff(toCur(totalSum))}${c$}</div></div>
      <div class="kpi"><div class="l">Сер. ціна/пл.</div><div class="v">${totalQty?(toCur(totalSum/totalQty)).toFixed(0):"—"}${c$}</div></div>
      <div class="kpi"><div class="l">Унік. вин</div><div class="v">${totalProds}</div></div>
      <div class="kpi"><div class="l">Клієнтів</div><div class="v">${totalCusts}</div></div>
    </div>

    <div class="cc"><h3>Топ-25 вин по ${_gdSort==="qty"?"кількості":_gdSort==="avg"?"ціні":"виручці"}</h3><canvas id="cGdTop" height="260"></canvas></div>

    <div class="cc"><h3>Всі вина (${prodArr.length}) <button class="flt" style="float:right;font-size:9px" onclick="exportGoodsCSV()">Експорт CSV</button></h3>
      <table class="tbl"><tr><th>Вино</th><th style="color:#7d8196">Вінтажі</th>${sortHdr("qty","Пляшок")}${sortHdr("sum","Сума")}${sortHdr("avg","Сер.ціна")}</tr>
      ${prodArr.slice(0,60).map((p,i)=>`<tr>
        <td style="font-size:10px;font-weight:${i<5?"600":"400"}">${p.name.substring(0,35)}</td>
        <td style="font-size:9px;color:#7d8196">${p.vintages||"—"}</td>
        <td class="r">${ff(p.qty)}</td>
        <td class="r g">${ff(p.sum)}₴</td>
        <td class="r" style="color:#f59e0b">${p.avg.toFixed(0)}₴</td>
      </tr>`).join("")}
      <tr class="tot"><td>Разом</td><td></td><td class="r">${ff(prodArr.reduce((s,p)=>s+p.qty,0))}</td><td class="r g">${ff(prodArr.reduce((s,p)=>s+p.sum,0))}₴</td><td class="r">${prodArr.reduce((s,p)=>s+p.qty,0)>0?(prodArr.reduce((s,p)=>s+p.sum,0)/prodArr.reduce((s,p)=>s+p.qty,0)).toFixed(0):"—"}₴</td></tr>
      ${prodArr.length>60?`<tr><td colspan="5" style="color:#7d8196;font-size:9px">+ ще ${prodArr.length-60}</td></tr>`:""}</table></div>`;

  // Export
  window.exportGoodsCSV=function(){
    exportCSV("goods.csv",["Вино","Вінтажі","Пляшок","Сума","Сер.ціна"],
      prodArr.map(p=>[p.name,p.vintages,p.qty.toFixed(0),p.sum.toFixed(0),p.avg.toFixed(0)]));
  };

  // Export channel mapping — all unique customers with their resolved channel (or "?")
  window.exportChannelMapping=function(){
    const custs=[...new Set(GD.map(r=>r.cust))];
    const rows=custs.map(c=>{
      const ch=gdChan(c)||"?";
      const al=gdAlias(c);
      const sum=GD.filter(r=>r.cust===c).reduce((s,r)=>s+r.sum,0);
      return[c,ch,al,sum.toFixed(0)];
    }).sort((a,b)=>a[1].localeCompare(b[1]));
    exportCSV("customer_channels.csv",["Customer","Channel","Alias","Sum"],rows);
  };

  // Sort toggle
  window.gdToggleSort=function(col){if(_gdSort===col)_gdSortDir*=-1;else{_gdSort=col;_gdSortDir=-1}render()};

  // Chart — top 25
  const top25=prodArr.slice(0,25);
  if(top25.length){
    dc("cGdTop");CH.cGdTop=new Chart(document.getElementById("cGdTop"),{type:"bar",
      data:{labels:top25.map(p=>p.name.substring(0,22)),datasets:[
        {label:"Сума ₴",data:top25.map(p=>p.sum),backgroundColor:"#10b981",borderRadius:2}
      ]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>ff(c.raw)+"₴ ("+ff(top25[c.dataIndex].qty)+" пл.)"}}},
        scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
  }
  bindFlt();
}

// === CUSTOMERS VIEW ===
function rGdCustomers(el,header,fd,c$){
  const byCust={};const totalFdSum=fd.reduce((s,r)=>s+r.sum,0);
  fd.forEach(r=>{
    const alias=gdAlias(r.cust);const w=_chanLookup(r.cust);
    if(!byCust[alias])byCust[alias]={qty:0,sum:0,prods:new Set(),docs:new Set(),lastDate:"",chan:gdChan(r.cust),geo:w&&w.geo?w.geo:""};
    byCust[alias].qty+=r.qty;byCust[alias].sum+=r.sum;byCust[alias].prods.add(r.prod);byCust[alias].docs.add(r.doc);
    if(r.date>byCust[alias].lastDate)byCust[alias].lastDate=r.date;
  });
  let custArr=Object.entries(byCust).map(([name,d])=>({name,qty:d.qty,sum:d.sum,pct:totalFdSum>0?(d.sum/totalFdSum*100):0,pCnt:d.prods.size,dCnt:d.docs.size,last:d.lastDate,chan:d.chan,geo:d.geo}));
  if(_gdSearch){const q=_gdSearch.toLowerCase();custArr=custArr.filter(c=>c.name.toLowerCase().includes(q))}

  // Sort
  if(_gdSort==="qty")custArr.sort((a,b)=>(a.qty-b.qty)*_gdSortDir);
  else if(_gdSort==="avg")custArr.sort((a,b)=>((a.qty?a.sum/a.qty:0)-(b.qty?b.sum/b.qty:0))*_gdSortDir);
  else custArr.sort((a,b)=>(a.sum-b.sum)*_gdSortDir);

  function sortHdr(col,label){const active=_gdSort===col;const arrow=active?(_gdSortDir<0?"▼":"▲"):"";return`<th class="r" style="cursor:pointer;user-select:none${active?";color:#f59e0b":""}" onclick="gdToggleSort('${col}')">${label} ${arrow}</th>`}
  window.gdToggleSort=function(col){if(_gdSort===col)_gdSortDir*=-1;else{_gdSort=col;_gdSortDir=-1}render()};

  el.innerHTML=`${header}
    <div class="kpis">
      <div class="kpi"><div class="l">Клієнтів</div><div class="v">${custArr.length}</div></div>
      <div class="kpi"><div class="l">Сер. чек</div><div class="v" style="color:#f59e0b">${custArr.length?(toCur(custArr.reduce((s,c)=>s+c.sum,0)/custArr.length)).toFixed(0):"—"}${c$}</div></div>
    </div>
    <div class="cc"><h3>Топ клієнтів</h3><canvas id="cGdCust" height="240"></canvas></div>
    <div class="cc"><h3>Клієнти (${custArr.length})</h3>
      <table class="tbl"><tr><th>Клієнт</th><th>Канал</th><th>Гео</th>${sortHdr("qty","Пляшок")}${sortHdr("sum","Сума")}<th class="r">%</th><th class="r">Накладних</th><th class="r">Вин</th><th class="r">Ост.покупка</th></tr>
      ${custArr.slice(0,60).map(c=>`<tr>
        <td style="font-size:10px">${c.name.substring(0,28)}</td>
        <td style="font-size:9px;color:#8b5cf6">${c.chan}</td>
        <td style="font-size:9px;color:#7d8196">${c.geo}</td>
        <td class="r">${ff(c.qty)}</td>
        <td class="r g">${ff(c.sum)}₴</td>
        <td class="r" style="color:#f59e0b">${c.pct.toFixed(1)}%</td>
        <td class="r">${c.dCnt}</td>
        <td class="r">${c.pCnt}</td>
        <td class="r" style="color:#7d8196;font-size:9px">${c.last}</td>
      </tr>`).join("")}
      ${custArr.length>60?`<tr><td colspan="9" style="color:#7d8196;font-size:9px">+ ще ${custArr.length-60}</td></tr>`:""}
      <tr class="tot"><td>Разом</td><td></td><td></td><td class="r">${ff(custArr.reduce((s,c)=>s+c.qty,0))}</td><td class="r g">${ff(custArr.reduce((s,c)=>s+c.sum,0))}₴</td><td class="r">100%</td><td class="r">${custArr.reduce((s,c)=>s+c.dCnt,0)}</td><td class="r">${custArr.reduce((s,c)=>s+c.pCnt,0)}</td><td></td></tr></table></div>`;

  const top20=custArr.slice(0,20);
  if(top20.length){
    dc("cGdCust");CH.cGdCust=new Chart(document.getElementById("cGdCust"),{type:"bar",
      data:{labels:top20.map(c=>c.name.substring(0,18)),datasets:[{data:top20.map(c=>c.sum),backgroundColor:"#3b82f6",borderRadius:2}]},
      options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},
        scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
  }
}

// === TRENDS VIEW (uses full GD, not filtered fd!) ===
function rGdTrends(el,header,allYrs,c$){
  // Apply channel filter but NOT year filter for trends
  let all=GD;
  if(_gdChan!=="ALL")all=all.filter(r=>gdChan(r.cust)===_gdChan);

  // By year
  const byYr={};all.forEach(r=>{if(!byYr[r.yr])byYr[r.yr]={qty:0,sum:0};byYr[r.yr].qty+=r.qty;byYr[r.yr].sum+=r.sum});
  const yrArr=Object.entries(byYr).sort();

  // Current & previous year
  const curYr=_gdYr!=="ALL"?_gdYr:allYrs[allYrs.length-1]||"2026";
  const prevYr=String(parseInt(curYr)-1);

  // By month
  const byMoCur={},byMoPrev={};
  all.filter(r=>r.yr===curYr).forEach(r=>{const m=r.date.substring(5,7);if(!byMoCur[m])byMoCur[m]={qty:0,sum:0};byMoCur[m].qty+=r.qty;byMoCur[m].sum+=r.sum});
  all.filter(r=>r.yr===prevYr).forEach(r=>{const m=r.date.substring(5,7);if(!byMoPrev[m])byMoPrev[m]={qty:0,sum:0};byMoPrev[m].qty+=r.qty;byMoPrev[m].sum+=r.sum});

  // Top products year-over-year (grouped by base name, no vintage)
  const yoyData={};
  all.filter(r=>r.yr===curYr||r.yr===prevYr).forEach(r=>{
    const base=stripVintage(r.prod);
    if(!yoyData[base])yoyData[base]={sumC:0,qtyC:0,sumP:0,qtyP:0};
    if(r.yr===curYr){yoyData[base].sumC+=r.sum;yoyData[base].qtyC+=r.qty}
    else{yoyData[base].sumP+=r.sum;yoyData[base].qtyP+=r.qty}
  });
  const prodYoY=Object.entries(yoyData).map(([name,d])=>({
    name,...d,growth:d.sumP>0?((d.sumC-d.sumP)/d.sumP*100):d.sumC>0?999:0
  })).filter(p=>p.sumC>0||p.sumP>0).sort((a,b)=>b.sumC-a.sumC);

  el.innerHTML=`${header}
    <div class="row">
      <div class="cc"><h3>Продажі по роках (пляшки)</h3><canvas id="cGdYr" height="120"></canvas></div>
      <div class="cc"><h3>Помісячно: ${curYr} vs ${prevYr}</h3><canvas id="cGdMo" height="120"></canvas></div>
    </div>
    <div class="cc"><h3>Топ вина ${curYr} vs ${prevYr}${_gdChan!=="ALL"?" · "+_gdChan:""}</h3>
      <table class="tbl"><tr><th>Вино</th><th class="r">Пл. ${curYr}</th><th class="r">Сума ${curYr}</th><th class="r">Пл. ${prevYr}</th><th class="r">Сума ${prevYr}</th><th class="r">Ріст</th></tr>
      ${prodYoY.slice(0,40).map(p=>{const gc=p.growth>0?"g":p.growth<0?"rd":"";const gTxt=p.growth===999?"new":p.sumP===0&&p.sumC===0?"—":(p.growth>0?"+":"")+p.growth.toFixed(0)+"%";return`<tr>
        <td style="font-size:10px">${p.name.substring(0,35)}</td>
        <td class="r">${ff(p.qtyC)}</td>
        <td class="r g">${ff(p.sumC)}₴</td>
        <td class="r" style="color:#7d8196">${ff(p.qtyP)}</td>
        <td class="r" style="color:#7d8196">${ff(p.sumP)}₴</td>
        <td class="r ${gc}">${gTxt}</td>
      </tr>`}).join("")}
      ${(()=>{const tqC=prodYoY.reduce((s,p)=>s+p.qtyC,0),tsC=prodYoY.reduce((s,p)=>s+p.sumC,0),tqP=prodYoY.reduce((s,p)=>s+p.qtyP,0),tsP=prodYoY.reduce((s,p)=>s+p.sumP,0);const tg=tsP>0?((tsC-tsP)/tsP*100):0;return`<tr class="tot"><td>Разом</td><td class="r">${ff(tqC)}</td><td class="r g">${ff(tsC)}₴</td><td class="r">${ff(tqP)}</td><td class="r">${ff(tsP)}₴</td><td class="r" style="color:${tg>0?"#10b981":"#ef4444"}">${tg>0?"+":""}${tg.toFixed(0)}%</td></tr>`})()}
      </table></div>`;

  if(yrArr.length){
    dc("cGdYr");CH.cGdYr=new Chart(document.getElementById("cGdYr"),{type:"bar",
      data:{labels:yrArr.map(([y])=>y),datasets:[
        {label:"Пляшок",data:yrArr.map(([,d])=>d.qty),backgroundColor:"#8b5cf6",borderRadius:2,yAxisID:"y"},
        {label:"Сума ₴",data:yrArr.map(([,d])=>d.sum),type:"line",borderColor:"#f59e0b",borderWidth:2,pointRadius:3,pointBackgroundColor:"#f59e0b",tension:.3,yAxisID:"y1"}
      ]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},
        scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{position:"left",ticks:{color:"#8b5cf6",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y1:{position:"right",ticks:{color:"#f59e0b",font:{size:9},callback:v=>fm(v)+"₴"},grid:{display:false}}}}});
  }
  if(Object.keys(byMoCur).length||Object.keys(byMoPrev).length){
    dc("cGdMo");CH.cGdMo=new Chart(document.getElementById("cGdMo"),{type:"bar",
      data:{labels:MN,datasets:[
        {label:curYr,data:MMa.map(m=>byMoCur[m]?.qty||0),backgroundColor:"#10b981",borderRadius:2},
        {label:prevYr,data:MMa.map(m=>byMoPrev[m]?.qty||0),backgroundColor:"rgba(139,92,246,.35)",borderRadius:2}
      ]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},
        scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  }
}
