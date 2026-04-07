// js/tabs/stock.js — Stock tab: Stock_Data + 3_Stock + 1C Номенклатура/ОСВ
let stockView="main";
function rStock(){
  const el=document.getElementById("t-stock");

  const tabs=C1.loaded&&C1.products.length?`<div class="sh-tabs" style="margin-bottom:10px">
    <button class="sh-tab ${stockView==="main"?"on":""}" onclick="stockView='main';render()">Залишки</button>
    <button class="sh-tab ${stockView==="1c"?"on":""}" onclick="stockView='1c';render()">1С Номенклатура</button>
  </div>`:"";

  if(stockView==="1c"&&C1.loaded)return rStock1C(el,tabs);

  if(SD.length){
    const wines=[...new Set(SD.map(r=>gv(r,"wine")||""))].filter(Boolean).sort();
    const dates=[...new Set(SD.map(r=>gv(r,"date")||""))].sort();const lastDate=dates[dates.length-1]||"";
    const current={};
    wines.forEach(w=>{const rows=SD.filter(r=>(gv(r,"wine")||"")===w).sort((a,b)=>(gv(a,"date")||"").localeCompare(gv(b,"date")||""));const lastBal=rows.filter(r=>(gv(r,"type")||"").toLowerCase()==="balance").pop();const totalBottling=rows.filter(r=>(gv(r,"type")||"").toLowerCase()==="bottling").reduce((s,r)=>s+pn(gv(r,"qty")),0);current[w]={bal:lastBal?pn(gv(lastBal,"qty")):0,bottling:totalBottling,lastDate:lastBal?gv(lastBal,"date"):""}});
    const totalBtl=Object.values(current).reduce((s,c)=>s+c.bal,0);const totalBottling=Object.values(current).reduce((s,c)=>s+c.bottling,0);
    const recentDates=dates.slice(-8);const balByDate={};
    recentDates.forEach(d=>{balByDate[d]={};wines.forEach(w=>{const row=SD.find(r=>(gv(r,"wine")||"")===w&&(gv(r,"date")||"")===d&&(gv(r,"type")||"").toLowerCase()==="balance");balByDate[d][w]=row?pn(gv(row,"qty")):null})});
    el.innerHTML=`${tabs}<div class="info">Stock_Data · до: ${lastDate} · ${wines.length} позицій</div>
      <div class="kpis"><div class="kpi"><div class="l">Позицій</div><div class="v">${wines.length}</div></div><div class="kpi"><div class="l">Пляшок</div><div class="v">${ff(totalBtl)}</div></div><div class="kpi"><div class="l">Розлито</div><div class="v" style="color:#3b82f6">${ff(totalBottling)}</div></div></div>
      <div class="cc"><h3>Залишки</h3>${Object.entries(current).sort((a,b)=>b[1].bal-a[1].bal).map(([w,d])=>{const pct=totalBtl>0?(d.bal/totalBtl*100):0;const co=d.bal<=0?"#ef4444":d.bal<50?"#f59e0b":"#10b981";return'<div class="si"><div class="top"><span class="nm">'+w+'</span><span style="color:'+co+';font-weight:600">'+ff(d.bal)+' бут</span></div><div class="bar"><div class="bf" style="width:'+Math.min(pct*3,100)+'%;background:'+co+'"></div></div><div class="bot"><span>Розлито: '+ff(d.bottling)+'</span><span>'+d.lastDate+'</span></div></div>'}).join("")}</div>
      ${recentDates.length>1?'<div class="cc"><h3>Динаміка</h3><canvas id="cStk" height="120"></canvas></div>':""}`;
    if(recentDates.length>1){const topW=Object.entries(current).sort((a,b)=>b[1].bal-a[1].bal).slice(0,6).map(([w])=>w);dc("cStk");CH.cStk=new Chart(document.getElementById("cStk"),{type:"line",data:{labels:recentDates.map(d=>d.substring(5)),datasets:topW.map((w,i)=>({label:w.substring(0,15),data:recentDates.map(d=>balByDate[d][w]),borderColor:CC[i%CC.length],tension:.3,pointRadius:2,borderWidth:1.5,spanGaps:true}))},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:8},boxWidth:8}}},scales:{x:{ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}}}}})}
  } else {
    const it=SK.map(s=>{const w=gv(s,"вино")||"";const vi=gv(s,"урожай")||"";const st=pn(gv(s,"остаток")||"0");const so=pn(gv(s,"продано")||"0");const av=pn(gv(s,"сред")||"0");const mr=gv(s,"запас")||"";const mo=mr&&mr!=="N/A"?parseFloat(mr):null;return{w,vi,st,so,av,mo}}).filter(s=>s.st>0);
    it.sort((a,b)=>{if(a.mo===null)return 1;if(b.mo===null)return-1;return a.mo-b.mo});
    const tb=it.reduce((s,i)=>s+i.st,0),lo=it.filter(i=>i.mo!==null&&i.mo<2).length,lo3=it.filter(i=>i.mo!==null&&i.mo<3).length,sk=it.filter(i=>i.mo!==null&&i.mo>15).length;
    const top10=it.slice().sort((a,b)=>b.st-a.st).slice(0,10);
    el.innerHTML=`${tabs}<div class="info">3_Stock (старий). Stock_Data порожній.</div>
      <div class="row"><div>
      <div class="kpis"><div class="kpi"><div class="l">Позицій</div><div class="v">${it.length}</div></div><div class="kpi"><div class="l">Пляшок</div><div class="v">${ff(tb)}</div></div><div class="kpi"><div class="l">Крит.</div><div class="v rd">${lo}</div><div class="s">&lt;2м</div></div><div class="kpi"><div class="l">Закінч.</div><div class="v" style="color:#e11d48">${lo3}</div></div><div class="kpi"><div class="l">Застр.</div><div class="v" style="color:#f59e0b">${sk}</div></div></div>
      </div><div class="cc"><h3>Топ-10 по залишках</h3><canvas id="cStkD" height="160"></canvas></div></div>
      ${it.map(i=>{const t=i.st+i.so,p=t>0?(i.st/t*100):0;const cr=i.mo!==null&&i.mo<2;const lw=i.mo!==null&&i.mo<3;const st=i.mo!==null&&i.mo>15;const cl=cr||lw?"low":st?"stk":"";const co=cr?"#ef4444":lw?"#e11d48":st?"#f59e0b":"#10b981";return'<div class="si '+cl+'"><div class="top"><span class="nm">'+i.w+' '+i.vi+'</span><span style="color:'+co+';font-weight:600">'+ff(i.st)+' · '+(i.mo!==null?i.mo.toFixed(1)+'м':'N/A')+'</span></div><div class="bar"><div class="bf" style="width:'+p+'%;background:'+co+'"></div></div><div class="bot"><span>Продано: '+ff(i.so)+'</span><span>~'+i.av+'/мес</span></div></div>'}).join("")}`;
    dc("cStkD");CH.cStkD=new Chart(document.getElementById("cStkD"),{type:"doughnut",data:{labels:top10.map(i=>(i.w+" "+i.vi).substring(0,18)),datasets:[{data:top10.map(i=>i.st),backgroundColor:CC.concat(["#64748b"])}]},options:{responsive:true,plugins:{legend:{position:"bottom",labels:{color:"#7d8196",font:{size:8},boxWidth:8,padding:3}}}}});
  }
}

// === 1С Номенклатура view ===
function rStock1C(el,tabs){
  const products=C1.products||[];
  const osv=C1.osv||[];

  // ОСВ key accounts
  const acc28=osv.find(r=>r.account==="28")||{};
  const acc36=osv.find(r=>r.account==="36")||{};
  const acc70=osv.find(r=>r.account==="70")||{};

  // Filter only bottles (пляш.)
  const bottles=products.filter(p=>p.unit==="пляш."&&p.name.length>3);
  const other=products.filter(p=>p.unit!=="пляш."||p.name.length<=3);

  // Group wines by base name
  const bases={};
  bottles.forEach(p=>{
    const m=p.name.match(/^(.+?)\s*(\d{4})/);
    const base=m?m[1].trim():p.name;
    const year=m?m[2]:"";
    if(!bases[base])bases[base]={vintages:[],skus:new Set()};
    bases[base].vintages.push({name:p.name,year,sku:p.sku});
    if(p.sku)bases[base].skus.add(p.sku);
  });
  const baseArr=Object.entries(bases).sort((a,b)=>b[1].vintages.length-a[1].vintages.length);

  // Units breakdown
  const byUnit={};products.forEach(p=>{const u=p.unit||"?";byUnit[u]=(byUnit[u]||0)+1});
  const unitArr=Object.entries(byUnit).sort((a,b)=>b[1]-a[1]);

  el.innerHTML=`${tabs}
    <div class="info">1С Номенклатура: ${products.length} позицій, ${bottles.length} вин (пляш.), ${baseArr.length} базових назв</div>
    <div class="kpis">
      <div class="kpi"><div class="l">Товари на складі (рах.28)</div><div class="v" style="color:#3b82f6">${ff(acc28.saldoEndDt||0)}₴</div></div>
      <div class="kpi"><div class="l">Дебіторка (рах.36)</div><div class="v" style="color:#ef4444">${ff(acc36.saldoEndDt||0)}₴</div></div>
      <div class="kpi"><div class="l">Дохід (рах.70)</div><div class="v g">${ff(acc70.saldoEndKt||0)}₴</div></div>
      <div class="kpi"><div class="l">Вин (пляш.)</div><div class="v">${bottles.length}</div><div class="s">${baseArr.length} назв</div></div>
    </div>

    <div class="row">
      <div class="cc"><h3>По одиницях виміру</h3>
        ${unitArr.map(([u,n])=>{const pct=products.length?(n/products.length*100):0;return`<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px"><span>${u}</span><span style="font-weight:600">${n} <span style="color:#7d8196">(${pct.toFixed(0)}%)</span></span></div>`}).join("")}</div>
      <div class="cc"><h3>Вина по кількості врожаїв</h3><canvas id="cWineVint" height="140"></canvas></div>
    </div>

    <div class="cc"><h3>Каталог вин (${baseArr.length} назв)</h3>
      <table class="tbl"><tr><th>Вино</th><th class="r">Врожаї</th><th class="r">Штрих-код</th><th class="r">Роки</th></tr>
      ${baseArr.map(([base,d])=>{const years=d.vintages.map(v=>v.year).filter(Boolean).sort();const sku=[...d.skus].join(", ");return`<tr>
        <td style="font-size:9px;font-weight:600">${base.substring(0,30)}</td>
        <td class="r">${d.vintages.length}</td>
        <td class="r" style="color:#7d8196;font-size:8px">${sku.substring(0,15)}</td>
        <td class="r" style="color:#7d8196;font-size:8px">${years.length>3?years[0]+"—"+years[years.length-1]:years.join(", ")}</td>
      </tr>`}).join("")}</table></div>

    ${other.length?`<div class="cc"><h3>Інша номенклатура (${other.length})</h3>
      <table class="tbl"><tr><th>Назва</th><th class="r">Од.</th><th class="r">ПДВ</th></tr>
      ${other.slice(0,20).map(p=>`<tr><td style="font-size:9px">${p.name.substring(0,35)}</td><td class="r">${p.unit}</td><td class="r">${p.vat}</td></tr>`).join("")}
      ${other.length>20?`<tr><td colspan="3" style="color:#7d8196;font-size:9px">+ ще ${other.length-20}</td></tr>`:""}</table></div>`:""}
  `;

  // Top wines by vintage count
  const topWines=baseArr.slice(0,15);
  if(topWines.length){
    dc("cWineVint");CH.cWineVint=new Chart(document.getElementById("cWineVint"),{type:"bar",
      data:{labels:topWines.map(([b])=>b.substring(0,14)),datasets:[{data:topWines.map(([,d])=>d.vintages.length),backgroundColor:"#9f1239",borderRadius:2}]},
      options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
  }
}
