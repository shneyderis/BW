// js/tabs/sales.js — Sales tab v2: Channels + Drill-down + Settings-aware FOP

// Channel mapping: source category → clean channel name
const CHAN_MAP={
  "Продаж, Мережі":"Сети",
  "Продаж, Horeca & Shops":"HoReCa",
  "Продаж,  Дістрібʼютор Укр":"Дистрибьюторы",
  "Продаж, Експорт":"Экспорт",
  "Доход, ФОП":"Інтернет-магазин",
  "Продаж, Інтернет магазини":"Інтернет-магазин",
  "Продаж, Корп клієнт":"Корп.клієнти",
  "Доход, каса БВ":"Каса БВ",
  "Продаж, на виноробні":"Продажі на виноробні"
};
const CHAN_ORDER=["Сети","HoReCa","Дистрибьюторы","Экспорт","Інтернет-магазин","Корп.клієнти","Каса БВ","Продажі на виноробні"];
const CHAN_CLR={"Сети":"#3b82f6","HoReCa":"#10b981","Дистрибьюторы":"#f59e0b","Экспорт":"#8b5cf6","Інтернет-магазин":"#ef4444","Корп.клієнти":"#06b6d4","Каса БВ":"#ec4899","Продажі на виноробні":"#f97316"};

function getChan(cat){return CHAN_MAP[cat]||"Інше"}

// FOP net amount using Settings from Google Sheet
function fopNet(sum,date){
  const taxR=getSettingValue("fop_tax",date);
  const bankR=getSettingValue("fop_bank",date);
  const tax=taxR!==null?taxR:5;
  const bank=bankR!==null?bankR:2.5;
  return sum*(1-(tax+bank)/100);
}

// Sales state
let _ss={year:null,month:0,chan:null,view:"channels"};

function rSales(f){
  const el=document.getElementById("t-sales");if(!el)return;
  const c$=cs();
  const allInc=T.filter(t=>t.tp==="Доход");
  // Init state with current year/month
  if(!_ss.year){const now=new Date();_ss.year=String(now.getFullYear());_ss.month=now.getMonth()+1}
  // Available years
  const yrs=[...new Set(allInc.map(t=>t.yr))].sort();

  // Controls
  el.innerHTML=`
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
      <div><div style="color:#7d8196;font-size:10px;margin-bottom:2px">Рік</div>
        <select class="flt" id="sY">${yrs.map(y=>`<option ${y===_ss.year?"selected":""}>${y}</option>`).join("")}</select></div>
      <div><div style="color:#7d8196;font-size:10px;margin-bottom:2px">Місяць</div>
        <select class="flt" id="sM"><option value="0" ${_ss.month===0?"selected":""}>Всі</option>${MN.map((m,i)=>`<option value="${i+1}" ${(i+1)===_ss.month?"selected":""}>${m}</option>`).join("")}</select></div>
      <div style="margin-left:auto"><button class="flt" id="sBack" style="display:${_ss.view==="drilldown"?"inline":"none"}">← Канали</button></div>
    </div>
    <div id="s-summary"></div>
    <div id="s-chart" style="margin:14px 0"></div>
    <div id="s-detail"></div>`;
  document.getElementById("sY").onchange=e=>{_ss.year=e.target.value;_ss.chan=null;_ss.view="channels";rSalesBody()};
  document.getElementById("sM").onchange=e=>{_ss.month=parseInt(e.target.value);_ss.chan=null;_ss.view="channels";rSalesBody()};
  document.getElementById("sBack").onclick=()=>{_ss.chan=null;_ss.view="channels";rSalesBody()};
  rSalesBody();
}

function rSalesBody(){
  const c$=cs();
  const allInc=T.filter(t=>t.tp==="Доход");
  // Filter by period
  let pd=allInc.filter(t=>t.yr===_ss.year);
  if(_ss.month)pd=pd.filter(t=>parseInt(t.mm)===_ss.month);
  // Back button
  const bb=document.getElementById("sBack");if(bb)bb.style.display=_ss.view==="drilldown"?"inline":"none";

  if(_ss.view==="drilldown"&&_ss.chan)renderDrill(pd,allInc,c$);
  else renderChans(pd,allInc,c$);
}

function renderChans(pd,allInc,c$){
  // Aggregate by channel
  const agg={};CHAN_ORDER.forEach(ch=>{agg[ch]={sum:0,net:0,cnt:0}});agg["Інше"]={sum:0,net:0,cnt:0};
  pd.forEach(t=>{const ch=getChan(t.cat);if(!agg[ch])agg[ch]={sum:0,net:0,cnt:0};const s=toCur(t.nt);agg[ch].sum+=s;agg[ch].cnt++;agg[ch].net+=ch==="Інтернет-магазин"?toCur(fopNet(t.nt,t.ym+"-01")):s});
  const total=Object.values(agg).reduce((s,a)=>s+a.sum,0);
  const chans=CHAN_ORDER.filter(ch=>agg[ch].sum>0);
  if(agg["Інше"].sum>0)chans.push("Інше");
  const ml=_ss.month?MN[_ss.month-1]+" "+_ss.year:_ss.year;

  // Summary
  document.getElementById("s-summary").innerHTML=`
    <div style="background:linear-gradient(135deg,#151821,#1a1f2e);border:1px solid #232738;border-radius:10px;padding:16px;margin-bottom:14px">
      <div style="color:#7d8196;font-size:11px">Загальні продажі · ${ml}</div>
      <div style="font-size:26px;font-weight:700;margin-top:4px;color:#e4e5ea">${ff(total)}${c$}</div>
      <div style="color:#7d8196;font-size:10px;margin-top:2px">${pd.length} транзакцій</div>
    </div>`;

  // Channel cards
  document.getElementById("s-detail").innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
      ${chans.map(ch=>{const a=agg[ch];const pct=total>0?(a.sum/total*100):0;const clr=CHAN_CLR[ch]||"#6b7280";
      return`<div style="background:#151821;border:1px solid #232738;border-radius:8px;padding:14px;cursor:pointer" onclick="_ss.chan='${ch}';_ss.view='drilldown';rSalesBody()">
        <div style="color:#7d8196;font-size:11px">${ch}</div>
        <div style="font-size:18px;font-weight:700;color:#e4e5ea;margin-top:3px">${ff(a.sum)}${c$}</div>
        ${ch==="Інтернет-магазин"?`<div style="font-size:10px;color:#ef4444;margin-top:1px">нетто ${ff(a.net)}${c$}</div>`:""}
        <div style="color:#7d8196;font-size:10px;margin-top:2px">${pct.toFixed(1)}% · ${a.cnt} опер</div>
        <div style="height:4px;background:#232738;border-radius:2px;margin-top:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${clr};border-radius:2px"></div></div>
      </div>`}).join("")}
    </div>`;

  // Chart: monthly bars current year + prev year line
  const yr=_ss.year,py=String(parseInt(yr)-1);
  const m1={},m2={};
  allInc.filter(t=>t.yr===yr).forEach(t=>{m1[t.mm]=(m1[t.mm]||0)+toCur(t.nt)});
  allInc.filter(t=>t.yr===py).forEach(t=>{m2[t.mm]=(m2[t.mm]||0)+toCur(t.nt)});
  document.getElementById("s-chart").innerHTML=`<canvas id="sCh" height="90"></canvas>`;
  dc("sCh");CH.sCh=new Chart(document.getElementById("sCh"),{type:"bar",data:{labels:MN,datasets:[
    {label:yr,data:MMa.map(m=>m1[m]||0),backgroundColor:"#10b981aa",borderColor:"#10b981",borderWidth:1,borderRadius:3},
    {label:py,data:MMa.map(m=>m2[m]||0),type:"line",borderColor:"#7d8196",borderDash:[4,4],pointRadius:2,pointBackgroundColor:"#7d8196",borderWidth:1.5,fill:false}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+ff(c.raw)+cs()}}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}

function renderDrill(pd,allInc,c$){
  const ch=_ss.chan,clr=CHAN_CLR[ch]||"#6b7280";
  const chData=pd.filter(t=>getChan(t.cat)===ch);
  const sum=chData.reduce((s,t)=>s+toCur(t.nt),0);
  const net=ch==="Інтернет-магазин"?chData.reduce((s,t)=>s+toCur(fopNet(t.nt,t.ym+"-01")),0):sum;
  const ml=_ss.month?MN[_ss.month-1]+" "+_ss.year:_ss.year;

  // Summary
  document.getElementById("s-summary").innerHTML=`
    <div style="background:linear-gradient(135deg,#151821,#1a1f2e);border:1px solid #232738;border-left:4px solid ${clr};border-radius:10px;padding:16px;margin-bottom:14px">
      <div style="color:#7d8196;font-size:11px">${ch} · ${ml}</div>
      <div style="font-size:26px;font-weight:700;color:#e4e5ea;margin-top:4px">${ff(sum)}${c$}</div>
      ${ch==="Інтернет-магазин"?`<div style="color:#ef4444;font-size:11px;margin-top:2px">Нетто (мінус ФОП+банк): ${ff(net)}${c$}</div>`:""}
      <div style="color:#7d8196;font-size:10px;margin-top:2px">${chData.length} транзакцій</div>
    </div>`;

  // Clients
  const clients={};chData.forEach(t=>{const n=t.alias||t.name||"(невідомо)";clients[n]=(clients[n]||0)+toCur(t.nt)});
  const sortedC=Object.entries(clients).sort((a,b)=>b[1]-a[1]);

  // Cities (for HoReCa and Internet)
  const showCities=(ch==="HoReCa"||ch==="Інтернет-магазин");
  const cities={};if(showCities)chData.forEach(t=>{if(t.geo&&t.geo!=="="&&t.geo!=="-")cities[t.geo]=(cities[t.geo]||0)+toCur(t.nt)});
  const sortedG=Object.entries(cities).sort((a,b)=>b[1]-a[1]);

  const hasGeo=showCities&&sortedG.length>0;

  document.getElementById("s-detail").innerHTML=`
    <div style="display:grid;grid-template-columns:${hasGeo?"1fr 1fr":"1fr"};gap:14px">
      ${hasGeo?`<div>
        <div style="color:#7d8196;font-size:11px;font-weight:500;margin-bottom:8px">По містах</div>
        <div style="background:#151821;border:1px solid #232738;border-radius:8px;overflow:hidden">
          ${sortedG.map(([c,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #1a1d28"><span style="color:#e4e5ea;font-size:12px">${c}</span><span style="color:#10b981;font-size:12px;font-weight:500">${ff(v)}${c$}</span></div>`).join("")}
        </div>
      </div>`:""}
      <div>
        <div style="color:#7d8196;font-size:11px;font-weight:500;margin-bottom:8px">Клієнти</div>
        <div style="background:#151821;border:1px solid #232738;border-radius:8px;overflow:hidden">
          ${sortedC.slice(0,30).map(([n,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #1a1d28"><span style="color:#e4e5ea;font-size:12px">${n.substring(0,30)}</span><span style="color:#10b981;font-size:12px;font-weight:500">${ff(v)}${c$}</span></div>`).join("")}
          ${sortedC.length>30?`<div style="padding:8px 12px;color:#7d8196;font-size:10px">+ ще ${sortedC.length-30}</div>`:""}
        </div>
      </div>
    </div>`;

  // Chart: this channel monthly dynamics
  const yr=_ss.year,py=String(parseInt(yr)-1);
  const m1={},m2={};
  allInc.filter(t=>t.yr===yr&&getChan(t.cat)===ch).forEach(t=>{m1[t.mm]=(m1[t.mm]||0)+toCur(t.nt)});
  allInc.filter(t=>t.yr===py&&getChan(t.cat)===ch).forEach(t=>{m2[t.mm]=(m2[t.mm]||0)+toCur(t.nt)});
  document.getElementById("s-chart").innerHTML=`<canvas id="sCh" height="90"></canvas>`;
  dc("sCh");CH.sCh=new Chart(document.getElementById("sCh"),{type:"bar",data:{labels:MN,datasets:[
    {label:yr,data:MMa.map(m=>m1[m]||0),backgroundColor:clr+"99",borderColor:clr,borderWidth:1,borderRadius:3},
    {label:py,data:MMa.map(m=>m2[m]||0),type:"line",borderColor:"#7d8196",borderDash:[4,4],pointRadius:2,pointBackgroundColor:"#7d8196",borderWidth:1.5,fill:false}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}},tooltip:{callbacks:{label:c=>c.dataset.label+": "+ff(c.raw)+cs()}}},scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}
