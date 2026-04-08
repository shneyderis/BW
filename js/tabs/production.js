// js/tabs/production.js — Cellar/Production: lots, aging, bottling plan
let prodLoaded=false,LOTS=[];

async function loadLots(){
  if(prodLoaded)return;
  try{
    const data=await(async()=>{try{const r=await fetch("data/lots.csv");if(!r.ok)throw new Error(r.status);const t=await r.text();if(!t||t.includes("<html"))return[];const rows=[];let c=[],q=false,f="";for(let i=0;i<t.length;i++){const x=t[i];if(q){if(x==='"'&&t[i+1]==='"'){f+='"';i++}else if(x==='"')q=false;else f+=x}else{if(x==='"')q=true;else if(x===','){c.push(f);f=""}else if(x==='\n'||(x==='\r'&&t[i+1]==='\n')){c.push(f);f="";rows.push(c);c=[];if(x==='\r')i++}else f+=x}}if(f||c.length){c.push(f);rows.push(c)}if(rows.length<2)return[];const h=rows[0].map(x=>x.trim());return rows.slice(1).map(r=>{const o={};h.forEach((k,i)=>{o[k]=r[i]!==undefined?r[i].trim():""});return o})}catch(e){return[]}})();
    LOTS=data.map(r=>({
      code:r["Lot code"]||"",name:r["Lot Name"]||"",volume:parseFloat(r["Volume (liters)"])||0,
      stage:r["Stage"]||"",vintage:r["Vintage"]||"",varietal:r["Varietal"]||"",
      varietalPct:r["Varietal %"]||"",color:r["Color"]||"",vineyard:r["Vineyard"]||"",
      block:r["Block"]||"",tags:r["Tags"]||"",
      alc:parseFloat(r["Alc"])||0,rs:parseFloat(r["RS"])||0,
      freeSO2:parseFloat(r["Free SO2"])||0,totalSO2:parseFloat(r["Total SO2"])||0,
      ta:parseFloat(r["TA"])||0,va:parseFloat(r["VA"])||0,ph:parseFloat(r["PH"])||0,
      tanks:r["Tanks"]||"",barrels:parseInt(r["Barrels"])||0
    })).filter(l=>l.code);
    prodLoaded=true;
    console.log("Lots loaded:",LOTS.length);
  }catch(e){console.warn("Lots load error:",e);prodLoaded=true}
}

let prodView="overview";

function rProduction(){
  const el=document.getElementById("t-production");if(!el)return;
  if(!prodLoaded){el.innerHTML='<div class="info">⏳ Завантаження лотів...</div>';loadLots().then(()=>rProduction());return}

  const lots=LOTS;
  if(!lots.length){el.innerHTML='<div class="warn">Немає даних лотів. Додайте data/lots.csv.</div>';return}

  const tabs=`<div class="sh-tabs" style="margin-bottom:10px">
    <button class="sh-tab ${prodView==="overview"?"on":""}" onclick="prodView='overview';render()">Огляд</button>
    <button class="sh-tab ${prodView==="lots"?"on":""}" onclick="prodView='lots';render()">Лоти</button>
    <button class="sh-tab ${prodView==="wines"?"on":""}" onclick="prodView='wines';render()">По винах</button>
  </div>`;

  if(prodView==="lots")return rProdLots(el,tabs,lots);
  if(prodView==="wines")return rProdWines(el,tabs,lots);

  // === OVERVIEW ===
  const totalVol=lots.reduce((s,l)=>s+l.volume,0);
  const totalBottles=Math.floor(totalVol/0.75);
  const byColor={};lots.forEach(l=>{const c=l.color||"?";if(!byColor[c])byColor[c]={vol:0,cnt:0};byColor[c].vol+=l.volume;byColor[c].cnt++});
  const byVintage={};lots.forEach(l=>{const v=l.vintage||"?";if(!byVintage[v])byVintage[v]={vol:0,cnt:0};byVintage[v].vol+=l.volume;byVintage[v].cnt++});
  const byStage={};lots.forEach(l=>{const s=l.stage||"?";if(!byStage[s])byStage[s]={vol:0,cnt:0};byStage[s].vol+=l.volume;byStage[s].cnt++});
  const byVarietal={};lots.forEach(l=>{const v=l.varietal||"?";if(!byVarietal[v])byVarietal[v]={vol:0,cnt:0};byVarietal[v].vol+=l.volume;byVarietal[v].cnt++});

  const colorClr={"red":"#e11d48","white":"#f59e0b","rose":"#ec4899","orange":"#f97316","sparkling":"#8b5cf6"};
  const vintArr=Object.entries(byVintage).sort((a,b)=>b[0].localeCompare(a[0]));
  const varArr=Object.entries(byVarietal).sort((a,b)=>b[1].vol-a[1].vol);
  const stageArr=Object.entries(byStage).sort((a,b)=>b[1].vol-a[1].vol);

  // Estimate value (avg bottle price ~₴500)
  const estValue=totalBottles*500;
  const estValueEUR=estValue/FX.EUR;

  // Ready to bottle (Pre-Bottling)
  const readyToBtl=lots.filter(l=>l.stage.includes("Pre-Bottling")||l.stage.includes("Stabilization"));
  const readyVol=readyToBtl.reduce((s,l)=>s+l.volume,0);

  // === Revenue Forecast ===
  const rvPrices={"Kara Kermen":1200,"Loca Deserta":1500,"Artania":500,"Beykush":800,"Beresagne":600,"Yafe Nagar":700};
  function rvBrand(tags){const t=tags||"";if(t.includes("Kara Kermen"))return"Kara Kermen";if(t.includes("Loca Deserta")||t.includes("LocaDeserta"))return"Loca Deserta";if(t.includes("Artania"))return"Artania";if(t.includes("Beresagne"))return"Beresagne";if(t.includes("Yafe Nagar"))return"Yafe Nagar";if(t.includes("Beykush"))return"Beykush";return"Інше"}
  const revByBrand={};const revByColor={};let totalRev=0;
  lots.forEach(l=>{const bottles=Math.floor(l.volume/0.75);const brand=rvBrand(l.tags);const price=rvPrices[brand]||500;const rev=bottles*price;totalRev+=rev;if(!revByBrand[brand])revByBrand[brand]=0;revByBrand[brand]+=rev;const c=l.color||"?";if(!revByColor[c])revByColor[c]=0;revByColor[c]+=rev});
  const totalRevEUR=totalRev/FX.EUR;
  const brandArr=Object.entries(revByBrand).sort((a,b)=>b[1]-a[1]);
  const colorRevArr=Object.entries(revByColor).sort((a,b)=>b[1]-a[1]);
  const revForecastHTML='<div class="sec">💰 Прогноз доходу (поточні лоти)</div>'
    +'<div class="kpis">'
    +'<div class="kpi"><div class="l">Загальний прогноз</div><div class="v g">'+ff(totalRev)+'₴</div><div class="s">~'+ff(Math.round(totalRevEUR))+'€</div></div>'
    +brandArr.slice(0,5).map(function(e){var b=e[0],r=e[1];return'<div class="kpi"><div class="l">'+b+'</div><div class="v" style="color:#8b5cf6">'+ff(r)+'₴</div><div class="s">~'+ff(Math.floor(r/(rvPrices[b]||500)))+' пл</div></div>'}).join("")
    +'</div>'
    +'<div class="row">'
    +'<div class="cc"><h3>Дохід по брендах</h3><canvas id="cRevBrand" height="180"></canvas></div>'
    +'<div class="cc"><h3>Дохід по кольорах</h3>'
    +colorRevArr.map(function(e){var c=e[0],r=e[1];var pct=totalRev>0?(r/totalRev*100):0;var clr=colorClr[c]||"#7d8196";return'<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:5px"><span style="color:'+clr+';font-weight:600">'+c+'</span><span>'+ff(r)+'₴ · '+pct.toFixed(0)+'%</span></div><div style="height:4px;background:#232738;border-radius:2px;margin-bottom:6px"><div style="height:100%;width:'+pct+'%;background:'+clr+';border-radius:2px"></div></div>'}).join("")
    +'</div>'
    +'</div>';

  el.innerHTML=`${tabs}
    <div class="sec">🍷 Виробництво · Лоти на витримці</div>
    <div class="kpis">
      <div class="kpi"><div class="l">Лотів</div><div class="v">${lots.length}</div></div>
      <div class="kpi"><div class="l">Об'єм (л)</div><div class="v" style="color:#8b5cf6">${ff(totalVol)}</div><div class="s">~${ff(totalBottles)} пляшок</div></div>
      <div class="kpi"><div class="l">Оцінка вартості</div><div class="v g">${ff(estValue)}₴</div><div class="s">~${ff(estValueEUR)}€ (по ₴500/пл)</div></div>
      <div class="kpi"><div class="l">Готові до розливу</div><div class="v" style="color:#10b981">${readyToBtl.length}</div><div class="s">${ff(readyVol)} л</div></div>
    </div>

    <div class="row">
      <div class="cc"><h3>По кольорах</h3>
        ${Object.entries(byColor).sort((a,b)=>b[1].vol-a[1].vol).map(([c,d])=>{const pct=totalVol>0?(d.vol/totalVol*100):0;const clr=colorClr[c]||"#7d8196";return`<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:5px"><span style="color:${clr};font-weight:600">${c}</span><span>${ff(d.vol)}л · ${d.cnt} лотів · ${pct.toFixed(0)}%</span></div><div style="height:4px;background:#232738;border-radius:2px;margin-bottom:6px"><div style="height:100%;width:${pct}%;background:${clr};border-radius:2px"></div></div>`}).join("")}</div>
      <div class="cc"><h3>По стадіях</h3>
        ${stageArr.map(([s,d])=>{const pct=totalVol>0?(d.vol/totalVol*100):0;return`<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px"><span>${s}</span><span style="font-weight:600">${ff(d.vol)}л (${d.cnt})</span></div>`}).join("")}</div>
    </div>

    <div class="row">
      <div class="cc"><h3>По врожаях</h3><canvas id="cProdVint" height="100"></canvas></div>
      <div class="cc"><h3>Топ сортів (по об'єму)</h3><canvas id="cProdVar" height="140"></canvas></div>
    </div>

    <div class="cc"><h3>Таймлайн розливу (по врожаях)</h3><canvas id="cProdTimeline" height="${Math.max(200,lots.length*12)}"></canvas></div>

    ${revForecastHTML}

    ${readyToBtl.length?`<div class="cc" style="border-color:rgba(16,185,129,.3)"><h3 style="color:#10b981">🍾 Готові до розливу</h3>
      <table class="tbl"><tr><th>Лот</th><th>Назва</th><th class="r">Об'єм</th><th class="r">Сорт</th><th class="r">Врожай</th></tr>
      ${readyToBtl.map(l=>`<tr><td style="font-weight:600">${l.code}</td><td style="font-size:9px">${l.name}</td><td class="r g">${ff(l.volume)}л</td><td class="r" style="font-size:9px">${l.varietal}</td><td class="r">${l.vintage}</td></tr>`).join("")}</table></div>`:""}

    <div class="cc"><h3>🌿 Виноградник · середня врожайність</h3>
      <div style="font-size:9px;color:#7d8196;margin-bottom:6px">Дані за 2021-2025 по ділянках (з таблиці лотів)</div>
      <table class="tbl"><tr><th>Ділянка</th><th class="r">Сортів</th><th class="r">Сер.кг/рік</th><th class="r">Тренд</th></tr>
      ${(()=>{
        const byPlot={};lots.forEach(l=>{const p=l.vineyard||"?";if(!byPlot[p])byPlot[p]={varietals:new Set(),vols:{}};byPlot[p].varietals.add(l.varietal);const y=l.vintage;if(!byPlot[p].vols[y])byPlot[p].vols[y]=0;byPlot[p].vols[y]+=l.volume});
        return Object.entries(byPlot).sort((a,b)=>{const aVol=Object.values(a[1].vols).reduce((s,v)=>s+v,0);const bVol=Object.values(b[1].vols).reduce((s,v)=>s+v,0);return bVol-aVol}).map(([p,d])=>{
          const yrs=Object.keys(d.vols).sort();const avg=yrs.length?Object.values(d.vols).reduce((s,v)=>s+v,0)/yrs.length:0;
          const last=d.vols[yrs[yrs.length-1]]||0;const prev=d.vols[yrs[yrs.length-2]]||0;
          const trend=prev>0?((last-prev)/prev*100):0;
          const tClr=trend>10?"#10b981":trend<-10?"#ef4444":"#7d8196";
          return`<tr><td>${p}</td><td class="r">${d.varietals.size}</td><td class="r">${ff(avg.toFixed(0))}л</td><td class="r" style="color:${tClr}">${trend>0?"+":""}${trend.toFixed(0)}%</td></tr>`
        }).join("")})()}</table>
    </div>
  `;

  if(vintArr.length){dc("cProdVint");CH.cProdVint=new Chart(document.getElementById("cProdVint"),{type:"bar",data:{labels:vintArr.map(([v])=>v),datasets:[{data:vintArr.map(([,d])=>d.vol),backgroundColor:"#9f1239",borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)+"л"},grid:{color:"#1e2130"}}}}})}
  const topVar=varArr.slice(0,12);
  if(topVar.length){dc("cProdVar");CH.cProdVar=new Chart(document.getElementById("cProdVar"),{type:"bar",data:{labels:topVar.map(([v])=>v.substring(0,14)),datasets:[{data:topVar.map(([,d])=>d.vol),backgroundColor:topVar.map(([v])=>{const l=LOTS.find(x=>x.varietal===v);return colorClr[l?.color]||"#7d8196"}),borderRadius:2}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)+"л"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}})}

  // === BOTTLING TIMELINE CHART ===
  const stageClr={"Aging":"#3b82f6","Pre-Bottling Stabilization":"#10b981","Fermenting":"#f59e0b","Riddling":"#8b5cf6","Extended Maceration":"#e11d48","Processed":"#6b7280"};
  const tlLots=lots.filter(l=>l.vintage).sort((a,b)=>a.vintage.localeCompare(b.vintage)||a.name.localeCompare(b.name));
  if(tlLots.length){
    const vintages=[...new Set(tlLots.map(l=>l.vintage))].sort();
    const vintMin=parseInt(vintages[0])||2015;
    const vintMax=parseInt(vintages[vintages.length-1])||2025;
    const tlLabels=tlLots.map(l=>l.code);
    const tlColors=tlLots.map(l=>{const s=l.stage||"";for(const[k,c]of Object.entries(stageClr)){if(s.includes(k))return c}return"#6b7280"});
    dc("cProdTimeline");CH.cProdTimeline=new Chart(document.getElementById("cProdTimeline"),{type:"bar",data:{labels:tlLabels,datasets:[{data:tlLots.map(l=>{const v=parseInt(l.vintage)||vintMin;return[v-0.35,v+0.35]}),backgroundColor:tlColors,borderRadius:2,barPercentage:0.7,categoryPercentage:0.85}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:true,labels:{generateLabels:function(){return Object.entries(stageClr).map(([text,fc])=>({text:text,fillStyle:fc,strokeStyle:fc,lineWidth:0}))},color:"#7d8196",font:{size:8}}},tooltip:{callbacks:{label:function(ctx){const l=tlLots[ctx.dataIndex];return l.name+" · "+l.vintage+" · "+l.stage+" · "+ff(l.volume)+"л"}}}},scales:{x:{type:"linear",min:vintMin-0.5,max:vintMax+0.5,ticks:{color:"#7d8196",font:{size:9},stepSize:1,callback:v=>Number.isInteger(v)?v:""},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:7}},grid:{display:false}}}}});
  }

  // === REVENUE BY BRAND CHART ===
  const rvBrandClr={"Kara Kermen":"#e11d48","Loca Deserta":"#8b5cf6","Artania":"#f59e0b","Beykush":"#3b82f6","Beresagne":"#10b981","Yafe Nagar":"#ec4899","Інше":"#6b7280"};
  if(brandArr.length){dc("cRevBrand");CH.cRevBrand=new Chart(document.getElementById("cRevBrand"),{type:"bar",data:{labels:brandArr.map(function(e){return e[0]}),datasets:[{data:brandArr.map(function(e){return e[1]}),backgroundColor:brandArr.map(function(e){return rvBrandClr[e[0]]||"#7d8196"}),borderRadius:2}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return ff(ctx.raw)+"₴"}}}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:function(v){return fm(v)+"₴"}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9}},grid:{display:false}}}}})}
}

function rProdLots(el,tabs,lots){
  el.innerHTML=`${tabs}
    <div class="cc"><h3>Всі лоти (${lots.length})</h3>
      <table class="tbl"><tr><th>Код</th><th>Назва</th><th class="r">Об'єм</th><th class="r">Стадія</th><th class="r">Сорт</th><th class="r">Врожай</th><th class="r">Колір</th><th class="r">Alc%</th></tr>
      ${lots.map(l=>{const clr={"red":"#e11d48","white":"#f59e0b","rose":"#ec4899","orange":"#f97316","sparkling":"#8b5cf6"}[l.color]||"#7d8196";return`<tr>
        <td style="font-weight:600;font-size:9px">${l.code}</td>
        <td style="font-size:9px">${l.name.substring(0,25)}</td>
        <td class="r">${ff(l.volume)}л</td>
        <td class="r" style="font-size:8px">${l.stage}</td>
        <td class="r" style="font-size:9px">${l.varietal}</td>
        <td class="r">${l.vintage}</td>
        <td class="r" style="color:${clr}">${l.color}</td>
        <td class="r">${l.alc||"—"}</td>
      </tr>`}).join("")}</table></div>`;
}

function rProdWines(el,tabs,lots){
  // Group by intended wine (from tags)
  const byWine={};
  lots.forEach(l=>{
    const tags=(l.tags||"").split(",").map(t=>t.trim()).filter(t=>!t.startsWith("#")&&t.length>3);
    if(!tags.length)tags.push("Інше");
    tags.forEach(t=>{if(!byWine[t])byWine[t]={lots:[],vol:0};byWine[t].lots.push(l);byWine[t].vol+=l.volume});
  });
  const wineArr=Object.entries(byWine).sort((a,b)=>b[1].vol-a[1].vol);

  // Estimate months of stock per wine based on 1C sales speed
  const salesByWine={};
  if(C1&&C1.sales&&C1.sales.length){
    // Rough mapping wine brand → 1C sales (by matching names)
    const monthsOfData=Math.max(1,(C1.sales.length>0?((new Date()-new Date(C1.sales[C1.sales.length-1].date||"2021-01-01"))/(1000*60*60*24*30)):12));
    const totalSalesPerMonth=C1.sales.length/monthsOfData;
    // Use total sales as rough proxy — refined mapping needs product-level data
  }

  el.innerHTML=`${tabs}
    <div class="info">${wineArr.length} вин планується з ${lots.length} лотів</div>
    ${wineArr.map(([wine,d])=>{
      const clr=d.lots[0]?{"red":"#e11d48","white":"#f59e0b","rose":"#ec4899","orange":"#f97316","sparkling":"#8b5cf6"}[d.lots[0].color]||"#7d8196":"#7d8196";
      const bottles=Math.floor(d.vol/0.75);
      // Stock alert: <500 bottles = low, >5000 = high
      const alertLow=bottles>0&&bottles<500;
      const alertHigh=bottles>5000;
      const alertStyle=alertLow?"border-color:rgba(239,68,68,.4)":alertHigh?"border-color:rgba(245,158,11,.3)":"";
      const alertBadge=alertLow?`<span style="color:#ef4444;font-size:9px;margin-left:8px">⚠ мало — гальмувати продаж</span>`:alertHigh?`<span style="color:#f59e0b;font-size:9px;margin-left:8px">📦 багато — прискорити продаж</span>`:"";
      return`<div class="cc" style="${alertStyle}">
        <h3 style="display:flex;justify-content:space-between;flex-wrap:wrap"><span style="color:${clr}">${wine}${alertBadge}</span><span>${ff(d.vol)}л · ~${ff(bottles)} пл</span></h3>
        <table class="tbl"><tr><th>Лот</th><th class="r">Об'єм</th><th class="r">Сорт</th><th class="r">Врожай</th><th class="r">Стадія</th></tr>
        ${d.lots.map(l=>`<tr>
          <td style="font-size:9px;font-weight:600">${l.code}</td>
          <td class="r">${ff(l.volume)}л</td>
          <td class="r" style="font-size:9px">${l.varietal}</td>
          <td class="r">${l.vintage}</td>
          <td class="r" style="font-size:8px">${l.stage}</td>
        </tr>`).join("")}</table>
      </div>`}).join("")}`;
}
