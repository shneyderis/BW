// js/tabs/sales.js — Sales v4: Channels + Drill-down + Managers + Periods

const CHAN_MAP={
  "Продаж, Мережі":"Сети","Продаж, Horeca & Shops":"HoReCa",
  "Продаж,  Дістрібʼютор Укр":"Дистрибьютори","Продаж, Експорт":"Експорт",
  "Доход, ФОП":"Інтернет-магазин","Продаж, Інтернет магазини":"Інтернет-магазин",
  "Продаж, Корп клієнт":"Корп.клієнти","Доход, каса БВ":"Каса БВ",
  "Продаж, на виноробні":"Продажі на виноробні"
};
const CHAN_ORDER=["Сети","HoReCa","Дистрибьютори","Експорт","Інтернет-магазин","Корп.клієнти","Каса БВ","Продажі на виноробні"];
const CHAN_CLR={"Сети":"#3b82f6","HoReCa":"#10b981","Дистрибьютори":"#f59e0b","Експорт":"#8b5cf6","Інтернет-магазин":"#ef4444","Корп.клієнти":"#06b6d4","Каса БВ":"#ec4899","Продажі на виноробні":"#f97316"};
function getChan(cat){return CHAN_MAP[cat]||"Інше"}
function fopNet(sum,date){const tax=typeof getSettingValue==="function"?getSettingValue("fop_tax",date):null;const bank=typeof getSettingValue==="function"?getSettingValue("fop_bank",date):null;return sum*(1-((tax!==null?tax:5)+(bank!==null?bank:2.5))/100)}

const _s={year:null,chan:null,view:"main",partner:null,city:null,mgr:null,period:"month"};

function rSales(f){
  const el=document.getElementById("t-sales");if(!el)return;
  if(!_s.year){_s.year=String(new Date().getFullYear())}
  const c$=cs();
  const yrs=[...new Set(T.filter(t=>t.tp==="Доход").map(t=>t.yr))].sort();
  const allInc=T.filter(t=>t.tp==="Доход");
  const yrData=allInc.filter(t=>t.yr===_s.year);
  const py=String(parseInt(_s.year)-1);

  // Period filter
  const now=new Date();const curMM=String(now.getMonth()+1).padStart(2,"0");const curYM=_s.year+"-"+curMM;
  const prevMM=String(now.getMonth()).padStart(2,"0")||"12";const prevYM=(prevMM==="00"?String(parseInt(_s.year)-1)+"-12":_s.year+"-"+prevMM);
  let pdCur,pdPrev,periodLabel;
  if(_s.period==="month"){pdCur=yrData.filter(t=>t.mm===curMM);pdPrev=yrData.filter(t=>t.mm===prevMM);periodLabel=MN[parseInt(curMM)-1]+" "+_s.year}
  else if(_s.period==="prev"){pdCur=yrData.filter(t=>t.mm===prevMM);pdPrev=yrData.filter(t=>t.mm===String(Math.max(1,parseInt(prevMM)-1)).padStart(2,"0"));periodLabel=MN[parseInt(prevMM)-1]+" "+_s.year}
  else if(_s.period==="quarter"){const q=Math.floor((now.getMonth())/3)*3;const qms=[q+1,q+2,q+3].map(m=>String(m).padStart(2,"0"));pdCur=yrData.filter(t=>qms.includes(t.mm));const pqms=[q-2,q-1,q].filter(m=>m>0).map(m=>String(m).padStart(2,"0"));pdPrev=yrData.filter(t=>pqms.includes(t.mm));periodLabel="Q"+Math.ceil((q+1)/3)+" "+_s.year}
  else{pdCur=yrData;pdPrev=allInc.filter(t=>t.yr===py);periodLabel=_s.year}

  // Channel filter for chart
  const chartData=_s.chan?yrData.filter(t=>getChan(t.cat)===_s.chan):yrData;
  const chartPrev=_s.chan?allInc.filter(t=>t.yr===py&&getChan(t.cat)===_s.chan):allInc.filter(t=>t.yr===py);
  const m1={},m2={};
  chartData.forEach(t=>{m1[t.mm]=(m1[t.mm]||0)+toCur(t.nt)});
  chartPrev.forEach(t=>{m2[t.mm]=(m2[t.mm]||0)+toCur(t.nt)});

  // Channel aggregation for period
  const agg={};CHAN_ORDER.forEach(ch=>{agg[ch]={cur:0,prev:0,cnt:0}});
  pdCur.forEach(t=>{const ch=getChan(t.cat);if(!agg[ch])agg[ch]={cur:0,prev:0,cnt:0};agg[ch].cur+=toCur(t.nt);agg[ch].cnt++});
  pdPrev.forEach(t=>{const ch=getChan(t.cat);if(agg[ch])agg[ch].prev+=toCur(t.nt)});
  const totalCur=Object.values(agg).reduce((s,a)=>s+a.cur,0);
  const totalPrev=Object.values(agg).reduce((s,a)=>s+a.prev,0);
  const chans=CHAN_ORDER.filter(ch=>agg[ch].cur>0||agg[ch].prev>0);

  // Managers
  const mgrs={};const noMgr={sum:0,cnt:0};
  pdCur.forEach(t=>{const m=t.mgr;if(!m||m==="-"||m==="="||!m.trim()){noMgr.sum+=toCur(t.nt);noMgr.cnt++;return}if(!mgrs[m])mgrs[m]={sum:0,com:0,cnt:0};mgrs[m].sum+=toCur(t.nt);mgrs[m].com+=toCur(t.com);mgrs[m].cnt++});
  const mgrArr=Object.entries(mgrs).sort((a,b)=>b[1].sum-a[1].sum);

  // Back button
  const backBtn=(_s.view!=="main")?`<button class="flt" style="margin-bottom:8px" onclick="_s.view='main';_s.partner=null;_s.city=null;_s.mgr=null;render()">← Назад</button>`:"";

  // === DRILL DOWNS ===
  if(_s.view==="partner"&&_s.partner){return rSalesPartner(el,c$,allInc,backBtn)}
  if(_s.view==="city"&&_s.city){return rSalesCity(el,c$,yrData,backBtn)}
  if(_s.view==="manager"&&_s.mgr){return rSalesMgr(el,c$,pdCur,allInc,backBtn)}

  // === MAIN VIEW ===
  const clr=_s.chan?CHAN_CLR[_s.chan]||"#10b981":"#10b981";

  el.innerHTML=`
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
      <select class="flt" id="sY">${yrs.map(y=>`<option ${y===_s.year?"selected":""}>${y}</option>`).join("")}</select>
      ${CHAN_ORDER.filter(ch=>{const d=allInc.filter(t=>t.yr===_s.year&&getChan(t.cat)===ch);return d.length>0}).map(ch=>`<button class="flt" style="${_s.chan===ch?"background:#9f1239;color:#fff;border-color:#9f1239":""}" onclick="_s.chan=${_s.chan===ch?"null":"'"+ch+"'"};render()">${ch}</button>`).join("")}
      ${_s.chan?`<button class="flt" style="color:#ef4444" onclick="_s.chan=null;render()">✕</button>`:""}
    </div>

    <div class="cc">
      <h3>${_s.chan||"Всі канали"}: ${_s.year} vs ${py}</h3>
      <div style="position:relative;height:220px"><canvas id="sCh"></canvas></div>
    </div>

    <div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">
      ${["month","prev","quarter","year"].map(p=>`<button class="flt" style="${_s.period===p?"background:#9f1239;color:#fff;border-color:#9f1239":""}" onclick="_s.period='${p}';render()">${p==="month"?"Поточний міс.":p==="prev"?"Минулий міс.":p==="quarter"?"Квартал":"Рік"}</button>`).join("")}
    </div>

    <div class="kpis" style="margin-bottom:8px">
      <div class="kpi"><div class="l">Продажі · ${periodLabel}</div><div class="v g">${ff(totalCur)}${c$}</div><div class="s">${totalPrev>0?`${((totalCur-totalPrev)/totalPrev*100).toFixed(0)}% vs попередній`:`${pdCur.length} опер`}</div></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;margin-bottom:10px">
      ${chans.map(ch=>{const a=agg[ch];const pct=totalCur>0?(a.cur/totalCur*100):0;const delta=a.prev>0?((a.cur-a.prev)/a.prev*100):0;const clr2=CHAN_CLR[ch]||"#6b7280";
      return`<div class="kpi" style="cursor:pointer;border-left:3px solid ${clr2}" onclick="_s.chan='${ch}';_s.view='channel';render()">
        <div class="l">${ch}</div>
        <div class="v" style="font-size:15px">${ff(a.cur)}${c$}</div>
        <div class="s">${pct.toFixed(1)}% ${a.prev>0?`<span style="color:${delta>=0?"#10b981":"#ef4444"}">${delta>0?"+":""}${delta.toFixed(0)}%</span>`:""}</div>
        <div style="height:3px;background:#232738;border-radius:2px;margin-top:4px"><div style="height:100%;width:${pct}%;background:${clr2};border-radius:2px"></div></div>
      </div>`}).join("")}
    </div>

    <div class="cc"><h3>Менеджери</h3>
      <table class="tbl"><tr><th>Менеджер</th><th class="r">Продажі</th><th class="r">Комісія</th><th class="r">Опер.</th></tr>
      ${mgrArr.map(([n,d])=>`<tr class="click" onclick="_s.mgr='${n.replace(/'/g,"\\'")}';_s.view='manager';render()"><td>${n}</td><td class="r g">${ff(d.sum)}${c$}</td><td class="r">${ff(d.com)}${c$}</td><td class="r">${d.cnt}</td></tr>`).join("")}
      ${noMgr.cnt?`<tr style="color:#f59e0b" class="click" onclick="_s.mgr='__none__';_s.view='manager';render()"><td>⚠ Не призначений</td><td class="r">${ff(noMgr.sum)}${c$}</td><td class="r">—</td><td class="r">${noMgr.cnt}</td></tr>`:""}
      </table></div>`;

  document.getElementById("sY").onchange=e=>{_s.year=e.target.value;_s.chan=null;render()};

  // Chart
  dc("sCh");CH.sCh=new Chart(document.getElementById("sCh"),{type:"bar",
    data:{labels:MN,datasets:[
      {label:_s.year,data:MMa.map(m=>m1[m]||0),backgroundColor:clr+"88",borderColor:clr,borderWidth:1,borderRadius:4},
      {label:py,data:MMa.map(m=>m2[m]||0),type:"line",borderColor:"#7d8196",borderDash:[5,3],pointRadius:3,pointBackgroundColor:"#7d8196",borderWidth:1.5,fill:false}
    ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#7d8196",font:{size:10},boxWidth:10}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+ff(c.raw)+cs()}}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}

// === CHANNEL DRILL-DOWN (reuse main with channel selected) ===
// When _s.view==="channel", main view already filters by _s.chan
// Clicking channel card sets _s.chan and shows filtered chart + partners

// === PARTNER DRILL-DOWN ===
function rSalesPartner(el,c$,allInc,back){
  const p=_s.partner;
  const pData=allInc.filter(t=>(t.alias||t.name)===p);
  const byM={};pData.filter(t=>t.yr===_s.year).forEach(t=>{byM[t.mm]=(byM[t.mm]||0)+toCur(t.nt)});
  const total=pData.filter(t=>t.yr===_s.year).reduce((s,t)=>s+toCur(t.nt),0);
  const info=C1&&C1.partners?C1.partners.find(x=>x.name===p||p.includes(x.name)):null;

  el.innerHTML=`${back}
    <div class="kpis"><div class="kpi"><div class="l">${esc(p)}</div><div class="v g">${ff(total)}${c$}</div><div class="s">${info?.edrpou||""} ${_s.year}</div></div></div>
    <div class="cc"><h3>Продажі по місяцях</h3><canvas id="sPartCh" height="100"></canvas></div>`;
  dc("sPartCh");CH.sPartCh=new Chart(document.getElementById("sPartCh"),{type:"bar",data:{labels:MN,datasets:[{data:MMa.map(m=>byM[m]||0),backgroundColor:"#10b981",borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}

// === CITY DRILL-DOWN ===
function rSalesCity(el,c$,yrData,back){
  const city=_s.city;
  const cData=yrData.filter(t=>t.geo===city);
  const byM={};cData.forEach(t=>{byM[t.mm]=(byM[t.mm]||0)+toCur(t.nt)});
  const total=cData.reduce((s,t)=>s+toCur(t.nt),0);

  el.innerHTML=`${back}
    <div class="kpis"><div class="kpi"><div class="l">${esc(city)}</div><div class="v g">${ff(total)}${c$}</div><div class="s">${cData.length} опер · ${_s.year}</div></div></div>
    <div class="cc"><h3>Продажі по місяцях</h3><canvas id="sCityCh" height="100"></canvas></div>`;
  dc("sCityCh");CH.sCityCh=new Chart(document.getElementById("sCityCh"),{type:"bar",data:{labels:MN,datasets:[{data:MMa.map(m=>byM[m]||0),backgroundColor:"#3b82f6",borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}

// === MANAGER DRILL-DOWN ===
function rSalesMgr(el,c$,pdCur,allInc,back){
  const mgr=_s.mgr;const isNone=mgr==="__none__";
  const mData=isNone?pdCur.filter(t=>!t.mgr||t.mgr==="-"||t.mgr==="="||!t.mgr.trim()):pdCur.filter(t=>t.mgr===mgr);
  const total=mData.reduce((s,t)=>s+toCur(t.nt),0);

  // Partners of this manager
  const partners={};mData.forEach(t=>{const n=t.alias||t.name||"?";if(!partners[n])partners[n]={sum:0,cnt:0,lastDate:""};partners[n].sum+=toCur(t.nt);partners[n].cnt++;if(t.ym>partners[n].lastDate)partners[n].lastDate=t.ym});
  const pArr=Object.entries(partners).sort((a,b)=>b[1].sum-a[1].sum);

  // Monthly chart
  const byM={};mData.forEach(t=>{byM[t.mm]=(byM[t.mm]||0)+toCur(t.nt)});

  // Debt info from C1
  const hasC1=C1&&C1.sales&&C1.bank;

  el.innerHTML=`${back}
    <div class="kpis"><div class="kpi"><div class="l">${isNone?"⚠ Не призначений":esc(mgr)}</div><div class="v g">${ff(total)}${c$}</div><div class="s">${mData.length} опер</div></div></div>
    <div class="cc"><h3>Продажі по місяцях</h3><canvas id="sMgrCh" height="100"></canvas></div>
    <div class="cc"><h3>Партнери (${pArr.length})</h3>
      <table class="tbl"><tr><th>Партнер</th><th class="r">Продажі</th><th class="r">%</th><th class="r">Опер.</th><th class="r">Ост.продаж</th></tr>
      ${pArr.slice(0,30).map(([n,d])=>{const pct=total>0?(d.sum/total*100):0;
        return`<tr class="click" onclick="_s.partner='${n.replace(/'/g,"\\'")}';_s.view='partner';render()">
        <td style="font-size:9px">${n.substring(0,28)}</td>
        <td class="r g">${ff(d.sum)}${c$}</td>
        <td class="r">${pct.toFixed(1)}%</td>
        <td class="r">${d.cnt}</td>
        <td class="r" style="color:#7d8196;font-size:9px">${d.lastDate}</td>
      </tr>`}).join("")}</table></div>`;

  dc("sMgrCh");CH.sMgrCh=new Chart(document.getElementById("sMgrCh"),{type:"bar",data:{labels:MN,datasets:[{data:MMa.map(m=>byM[m]||0),backgroundColor:"#8b5cf6",borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}
