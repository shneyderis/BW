// js/tabs/sales.js — Sales v3: Channels + Drill-down + Settings FOP

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

function fopNet(sum,date){
  const tax=typeof getSettingValue==="function"?getSettingValue("fop_tax",date):null;
  const bank=typeof getSettingValue==="function"?getSettingValue("fop_bank",date):null;
  return sum*(1-((tax!==null?tax:5)+(bank!==null?bank:2.5))/100);
}

let _ss={year:null,month:0,chan:null,view:"channels"};

function rSales(f){
  const el=document.getElementById("t-sales");if(!el)return;
  if(!_ss.year){const now=new Date();_ss.year=String(now.getFullYear());_ss.month=now.getMonth()+1}
  const yrs=[...new Set(T.filter(t=>t.tp==="Доход").map(t=>t.yr))].sort();

  el.innerHTML=`
    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap">
      <div>
        <div style="color:#7d8196;font-size:10px;margin-bottom:3px">Рік</div>
        <select class="flt" id="sY">${yrs.map(y=>`<option ${y===_ss.year?"selected":""}>${y}</option>`).join("")}</select>
      </div>
      <div>
        <div style="color:#7d8196;font-size:10px;margin-bottom:3px">Місяць</div>
        <select class="flt" id="sM"><option value="0" ${_ss.month===0?"selected":""}>Всі</option>${MN.map((m,i)=>`<option value="${i+1}" ${(i+1)===_ss.month?"selected":""}>${m}</option>`).join("")}</select>
      </div>
    </div>
    <div id="s-back-wrap"></div>
    <div id="s-summary"></div>
    <div id="s-chart"></div>
    <div id="s-detail"></div>`;

  document.getElementById("sY").onchange=e=>{_ss.year=e.target.value;_ss.chan=null;_ss.view="channels";rSalesBody()};
  document.getElementById("sM").onchange=e=>{_ss.month=parseInt(e.target.value);_ss.chan=null;_ss.view="channels";rSalesBody()};
  rSalesBody();
}

function rSalesBody(){
  const c$=cs();
  const allInc=T.filter(t=>t.tp==="Доход");
  let pd=allInc.filter(t=>t.yr===_ss.year);
  if(_ss.month)pd=pd.filter(t=>parseInt(t.mm)===_ss.month);

  // Back button
  const bw=document.getElementById("s-back-wrap");
  if(bw){
    if(_ss.view==="drilldown"&&_ss.chan){
      bw.innerHTML=`<button class="flt" id="sBack" style="margin-bottom:12px;cursor:pointer">← Назад до каналів</button>`;
      document.getElementById("sBack").onclick=()=>{_ss.chan=null;_ss.view="channels";rSalesBody()};
    }else{
      bw.innerHTML="";
    }
  }

  if(_ss.view==="drilldown"&&_ss.chan)renderDrill(pd,allInc,c$);
  else renderChans(pd,allInc,c$);
}

function renderChans(pd,allInc,c$){
  const agg={};CHAN_ORDER.forEach(ch=>{agg[ch]={sum:0,net:0,cnt:0}});agg["Інше"]={sum:0,net:0,cnt:0};
  pd.forEach(t=>{const ch=getChan(t.cat);if(!agg[ch])agg[ch]={sum:0,net:0,cnt:0};const s=toCur(t.nt);agg[ch].sum+=s;agg[ch].cnt++;agg[ch].net+=ch==="Інтернет-магазин"?toCur(fopNet(t.nt,t.ym+"-01")):s});
  const total=Object.values(agg).reduce((s,a)=>s+a.sum,0);
  const chans=CHAN_ORDER.filter(ch=>agg[ch].sum>0);
  if(agg["Інше"]&&agg["Інше"].sum>0)chans.push("Інше");
  const ml=_ss.month?MN[_ss.month-1]+" "+_ss.year:_ss.year;

  document.getElementById("s-summary").innerHTML=`
    <div class="kpis" style="margin-bottom:12px">
      <div class="kpi"><div class="l">Продажі · ${ml}</div><div class="v g">${ff(total)}${c$}</div><div class="s">${pd.length} транзакцій</div></div>
    </div>`;

  // Managers
  const mgrs={};pd.forEach(t=>{const m=t.mgr;if(!m||m==="-"||m==="="||!m.trim())return;if(!mgrs[m])mgrs[m]={sum:0,com:0,cnt:0};mgrs[m].sum+=toCur(t.nt);mgrs[m].com+=toCur(t.com);mgrs[m].cnt++});
  const mgrArr=Object.entries(mgrs).sort((a,b)=>b[1].sum-a[1].sum);
  const mgrHTML=mgrArr.length?`<div class="cc" style="margin-top:10px"><h3>Менеджери</h3>
    <table class="tbl"><tr><th>Менеджер</th><th class="r">Продажі</th><th class="r">Комісія</th><th class="r">Опер.</th></tr>
    ${mgrArr.map(([n,d])=>`<tr class="click" onclick="showMgr('${n.replace(/'/g,"\\'")}')"><td>${n}</td><td class="r g">${ff(d.sum)}${c$}</td><td class="r">${ff(d.com)}${c$}</td><td class="r">${d.cnt}</td></tr>`).join("")}</table></div>`:"";

  document.getElementById("s-detail").innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
      ${chans.map(ch=>{const a=agg[ch];const pct=total>0?(a.sum/total*100):0;const clr=CHAN_CLR[ch]||"#6b7280";
      return`<div class="kpi" style="cursor:pointer;border-left:3px solid ${clr}" data-ch="${ch}">
        <div class="l">${ch}</div>
        <div class="v" style="font-size:16px">${ff(a.sum)}${c$}</div>
        ${ch==="Інтернет-магазин"?`<div style="font-size:9px;color:#ef4444">нетто ${ff(a.net)}${c$}</div>`:""}
        <div class="s">${pct.toFixed(1)}% · ${a.cnt} опер</div>
        <div style="height:3px;background:#232738;border-radius:2px;margin-top:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${clr};border-radius:2px"></div></div>
      </div>`}).join("")}
    </div>${mgrHTML}`;

  document.querySelectorAll("[data-ch]").forEach(card=>{
    card.onclick=()=>{_ss.chan=card.dataset.ch;_ss.view="drilldown";rSalesBody()};
  });

  renderSalesChart(allInc,null);
}

function renderDrill(pd,allInc,c$){
  const ch=_ss.chan,clr=CHAN_CLR[ch]||"#6b7280";
  const chData=pd.filter(t=>getChan(t.cat)===ch);
  const sum=chData.reduce((s,t)=>s+toCur(t.nt),0);
  const net=ch==="Інтернет-магазин"?chData.reduce((s,t)=>s+toCur(fopNet(t.nt,t.ym+"-01")),0):sum;
  const ml=_ss.month?MN[_ss.month-1]+" "+_ss.year:_ss.year;

  document.getElementById("s-summary").innerHTML=`
    <div class="kpis" style="margin-bottom:12px">
      <div class="kpi" style="border-left:3px solid ${clr}">
        <div class="l">${ch} · ${ml}</div>
        <div class="v g" style="font-size:22px">${ff(sum)}${c$}</div>
        ${ch==="Інтернет-магазин"?`<div style="font-size:10px;color:#ef4444">Нетто: ${ff(net)}${c$}</div>`:""}
        <div class="s">${chData.length} транзакцій</div>
      </div>
    </div>`;

  const clients={};chData.forEach(t=>{const n=t.alias||t.name||"(невідомо)";clients[n]=(clients[n]||0)+toCur(t.nt)});
  const sortedC=Object.entries(clients).sort((a,b)=>b[1]-a[1]);

  const showCities=(ch==="HoReCa"||ch==="Інтернет-магазин");
  const cities={};if(showCities)chData.forEach(t=>{if(t.geo&&t.geo!=="="&&t.geo!=="-")cities[t.geo]=(cities[t.geo]||0)+toCur(t.nt)});
  const sortedG=Object.entries(cities).sort((a,b)=>b[1]-a[1]);
  const hasGeo=showCities&&sortedG.length>0;

  function listHTML(items,max){
    return`<table class="tbl"><tr><th>Назва</th><th class="r">Сума</th></tr>
      ${items.slice(0,max).map(([n,v])=>`<tr><td>${n.substring(0,28)}</td><td class="r g">${ff(v)}${c$}</td></tr>`).join("")}
      ${items.length>max?`<tr><td colspan="2" style="color:#7d8196;font-size:9px">+ ще ${items.length-max}</td></tr>`:""}
    </table>`;
  }

  document.getElementById("s-detail").innerHTML=`
    <div class="row">
      ${hasGeo?`<div class="cc"><h3>По містах</h3>${listHTML(sortedG,20)}</div>`:""}
      <div class="cc"><h3>Клієнти</h3>${listHTML(sortedC,30)}</div>
    </div>`;

  renderSalesChart(allInc,ch);
}

function renderSalesChart(allInc,channel){
  const yr=_ss.year,py=String(parseInt(yr)-1);
  const m1={},m2={};
  allInc.filter(t=>t.yr===yr&&(!channel||getChan(t.cat)===channel)).forEach(t=>{m1[t.mm]=(m1[t.mm]||0)+toCur(t.nt)});
  allInc.filter(t=>t.yr===py&&(!channel||getChan(t.cat)===channel)).forEach(t=>{m2[t.mm]=(m2[t.mm]||0)+toCur(t.nt)});
  const clr=channel?CHAN_CLR[channel]||"#10b981":"#10b981";

  document.getElementById("s-chart").innerHTML=`
    <div class="cc">
      <h3>${channel||"Всі канали"}: ${yr} vs ${py}</h3>
      <div style="position:relative;height:220px"><canvas id="sCh"></canvas></div>
    </div>`;

  dc("sCh");
  CH.sCh=new Chart(document.getElementById("sCh"),{
    type:"bar",
    data:{labels:MN,datasets:[
      {label:yr,data:MMa.map(m=>m1[m]||0),backgroundColor:clr+"88",borderColor:clr,borderWidth:1,borderRadius:4},
      {label:py,data:MMa.map(m=>m2[m]||0),type:"line",borderColor:"#7d8196",borderDash:[5,3],pointRadius:3,pointBackgroundColor:"#7d8196",borderWidth:1.5,fill:false}
    ]},
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{labels:{color:"#7d8196",font:{size:10},boxWidth:10,padding:8}},
        tooltip:{callbacks:{label:c=>c.dataset.label+": "+ff(c.raw)+cs()}}
      },
      scales:{
        x:{ticks:{color:"#7d8196",font:{size:10}},grid:{color:"#1e2130"}},
        y:{ticks:{color:"#7d8196",font:{size:10},callback:v=>fm(v)},grid:{color:"#1e2130"}}
      }
    }
  });
}
