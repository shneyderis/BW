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

    ${readyToBtl.length?`<div class="cc" style="border-color:rgba(16,185,129,.3)"><h3 style="color:#10b981">🍾 Готові до розливу</h3>
      <table class="tbl"><tr><th>Лот</th><th>Назва</th><th class="r">Об'єм</th><th class="r">Сорт</th><th class="r">Врожай</th></tr>
      ${readyToBtl.map(l=>`<tr><td style="font-weight:600">${l.code}</td><td style="font-size:9px">${l.name}</td><td class="r g">${ff(l.volume)}л</td><td class="r" style="font-size:9px">${l.varietal}</td><td class="r">${l.vintage}</td></tr>`).join("")}</table></div>`:""}
  `;

  if(vintArr.length){dc("cProdVint");CH.cProdVint=new Chart(document.getElementById("cProdVint"),{type:"bar",data:{labels:vintArr.map(([v])=>v),datasets:[{data:vintArr.map(([,d])=>d.vol),backgroundColor:"#9f1239",borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)+"л"},grid:{color:"#1e2130"}}}}})}
  const topVar=varArr.slice(0,12);
  if(topVar.length){dc("cProdVar");CH.cProdVar=new Chart(document.getElementById("cProdVar"),{type:"bar",data:{labels:topVar.map(([v])=>v.substring(0,14)),datasets:[{data:topVar.map(([,d])=>d.vol),backgroundColor:topVar.map(([v])=>{const l=LOTS.find(x=>x.varietal===v);return colorClr[l?.color]||"#7d8196"}),borderRadius:2}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)+"л"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}})}
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

  el.innerHTML=`${tabs}
    <div class="info">${wineArr.length} вин планується з ${lots.length} лотів</div>
    ${wineArr.map(([wine,d])=>{
      const clr=d.lots[0]?{"red":"#e11d48","white":"#f59e0b","rose":"#ec4899","orange":"#f97316","sparkling":"#8b5cf6"}[d.lots[0].color]||"#7d8196":"#7d8196";
      const bottles=Math.floor(d.vol/0.75);
      return`<div class="cc">
        <h3 style="display:flex;justify-content:space-between"><span style="color:${clr}">${wine}</span><span>${ff(d.vol)}л · ~${ff(bottles)} пл</span></h3>
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
