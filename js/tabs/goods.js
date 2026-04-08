// js/tabs/goods.js — Product-level sales analytics (FINAL_sales_detail)

let _gdView="top",_gdChan=null,_gdYr="ALL",_gdSearch="";

function rGoods(){
  const el=document.getElementById("t-goods");if(!el)return;
  if(!GD.length){el.innerHTML='<div class="info">Завантаження FINAL_sales_detail...</div>';return}
  const c$=cs();

  // === FILTERS ===
  const allYrs=[...new Set(GD.map(r=>r.yr))].filter(y=>y>="2020").sort();
  const allWH=[...new Set(GD.map(r=>r.wh))].filter(Boolean).sort();
  let fd=GD;
  if(_gdYr!=="ALL")fd=fd.filter(r=>r.yr===_gdYr);

  const totalQty=fd.reduce((s,r)=>s+r.qty,0);
  const totalSum=fd.reduce((s,r)=>s+r.sum,0);
  const totalDocs=[...new Set(fd.map(r=>r.doc))].length;
  const totalProds=[...new Set(fd.map(r=>r.prod))].length;
  const totalCusts=[...new Set(fd.map(r=>r.cust))].length;

  // Sub-tabs + year filter
  const tabs=`<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px">
    <div class="sh-tabs">
      <button class="sh-tab ${_gdView==="top"?"on":""}" onclick="_gdView='top';_gdChan=null;render()">Топ вина</button>
      <button class="sh-tab ${_gdView==="channels"?"on":""}" onclick="_gdView='channels';_gdChan=null;render()">Канали</button>
      <button class="sh-tab ${_gdView==="customers"?"on":""}" onclick="_gdView='customers';render()">Клієнти</button>
      <button class="sh-tab ${_gdView==="trends"?"on":""}" onclick="_gdView='trends';render()">Тренди</button>
    </div>
    <div>
      <select class="flt" id="gdYrFlt">
        <option value="ALL" ${_gdYr==="ALL"?"selected":""}>Всі роки</option>
        ${allYrs.map(y=>`<option ${y===_gdYr?"selected":""}>${y}</option>`).join("")}
      </select>
      <input type="text" placeholder="Пошук вина..." value="${_gdSearch}" style="background:#0c0e13;border:1px solid #232738;color:#e4e5ea;padding:5px 8px;border-radius:4px;font-size:11px;width:140px" oninput="_gdSearch=this.value;render()">
    </div>
  </div>`;

  function bindFlt(){const s=document.getElementById("gdYrFlt");if(s)s.onchange=e=>{_gdYr=e.target.value;render()}}

  if(_gdView==="channels"){rGdChannels(el,tabs,fd,allWH,c$);bindFlt();return}
  if(_gdView==="customers"){rGdCustomers(el,tabs,fd,c$);bindFlt();return}
  if(_gdView==="trends"){rGdTrends(el,tabs,fd,allYrs,c$);bindFlt();return}

  // === TOP PRODUCTS ===
  const byProd={};
  fd.forEach(r=>{
    if(!byProd[r.prod])byProd[r.prod]={qty:0,sum:0,code:r.code,whs:new Set(),custs:new Set()};
    byProd[r.prod].qty+=r.qty;byProd[r.prod].sum+=r.sum;
    if(r.wh)byProd[r.prod].whs.add(r.wh);byProd[r.prod].custs.add(r.cust);
  });
  let prodArr=Object.entries(byProd).map(([name,d])=>({name,qty:d.qty,sum:d.sum,code:d.code,chCnt:d.whs.size,custCnt:d.custs.size}));
  if(_gdSearch){const q=_gdSearch.toLowerCase();prodArr=prodArr.filter(p=>p.name.toLowerCase().includes(q))}
  prodArr.sort((a,b)=>b.sum-a.sum);

  // By channel summary
  const byWH={};fd.forEach(r=>{if(!byWH[r.wh])byWH[r.wh]={qty:0,sum:0};byWH[r.wh].qty+=r.qty;byWH[r.wh].sum+=r.sum});
  const whArr=Object.entries(byWH).map(([w,d])=>({w,...d})).sort((a,b)=>b.sum-a.sum);

  el.innerHTML=`${tabs}
    <div class="info">${ff(GD.length)} позицій · ${ff(totalDocs)} накладних · ${totalProds} вин · ${totalCusts} клієнтів${_gdYr!=="ALL"?" · "+_gdYr:""}</div>
    <div class="kpis">
      <div class="kpi"><div class="l">Продано пляшок</div><div class="v g">${ff(totalQty)}</div></div>
      <div class="kpi"><div class="l">Сума</div><div class="v" style="color:#f59e0b">${ff(toCur(totalSum))}${c$}</div></div>
      <div class="kpi"><div class="l">Сер. ціна/пл.</div><div class="v">${totalQty?(toCur(totalSum/totalQty)).toFixed(0):"—"}${c$}</div></div>
      <div class="kpi"><div class="l">Унік. вин</div><div class="v">${totalProds}</div></div>
      <div class="kpi"><div class="l">Клієнтів</div><div class="v">${totalCusts}</div></div>
    </div>

    <div class="row">
      <div class="cc"><h3>Топ-15 вин по виручці</h3><canvas id="cGdTop" height="180"></canvas></div>
      <div class="cc"><h3>Канали продажу</h3><canvas id="cGdCh" height="180"></canvas></div>
    </div>

    <div class="cc"><h3>Всі вина (${prodArr.length}) <button class="flt" style="float:right;font-size:9px" onclick="exportGoodsCSV()">Експорт CSV</button></h3>
      <table class="tbl"><tr><th>Вино</th><th class="r">Код</th><th class="r">Пляшок</th><th class="r">Сума</th><th class="r">Сер.ціна</th><th class="r">Каналів</th><th class="r">Клієнтів</th></tr>
      ${prodArr.slice(0,50).map((p,i)=>{const avg=p.qty>0?(p.sum/p.qty):0;return`<tr>
        <td style="font-size:10px;font-weight:${i<5?"600":"400"}">${p.name.substring(0,35)}</td>
        <td class="r" style="font-size:9px;color:#7d8196">${p.code}</td>
        <td class="r">${ff(p.qty)}</td>
        <td class="r g">${ff(p.sum)}₴</td>
        <td class="r" style="color:#f59e0b">${avg.toFixed(0)}₴</td>
        <td class="r">${p.chCnt}</td>
        <td class="r">${p.custCnt}</td>
      </tr>`}).join("")}
      ${prodArr.length>50?`<tr><td colspan="7" style="color:#7d8196;font-size:9px">+ ще ${prodArr.length-50}</td></tr>`:""}</table></div>`;

  // Export
  window.exportGoodsCSV=function(){
    exportCSV("goods.csv",["Вино","Код","Пляшок","Сума","Сер.ціна","Каналів","Клієнтів"],
      prodArr.map(p=>[p.name,p.code,p.qty.toFixed(0),p.sum.toFixed(0),(p.qty>0?p.sum/p.qty:0).toFixed(0),p.chCnt,p.custCnt]));
  };

  // Charts
  const top15=prodArr.slice(0,15);
  if(top15.length){
    dc("cGdTop");CH.cGdTop=new Chart(document.getElementById("cGdTop"),{type:"bar",
      data:{labels:top15.map(p=>p.name.substring(0,18)),datasets:[
        {label:"Сума ₴",data:top15.map(p=>p.sum),backgroundColor:"#10b981",borderRadius:2}
      ]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>ff(c.raw)+"₴ ("+ff(top15[c.dataIndex].qty)+" пл.)"}}},
        scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
  }
  if(whArr.length){
    dc("cGdCh");CH.cGdCh=new Chart(document.getElementById("cGdCh"),{type:"doughnut",
      data:{labels:whArr.map(w=>w.w),datasets:[{data:whArr.map(w=>w.sum),backgroundColor:CC.concat(CC)}]},
      options:{responsive:true,plugins:{legend:{position:"right",labels:{color:"#7d8196",font:{size:8},boxWidth:8,padding:3}},
        tooltip:{callbacks:{label:ctx=>ctx.label+": "+ff(ctx.raw)+"₴ ("+ff(whArr[ctx.dataIndex].qty)+" пл.)"}}}}});
  }
  bindFlt();
}

// === CHANNELS VIEW ===
function rGdChannels(el,tabs,fd,allWH,c$){
  if(_gdChan){
    // Drill-down into specific channel
    const chData=fd.filter(r=>r.wh===_gdChan);
    const byProd={};
    chData.forEach(r=>{if(!byProd[r.prod])byProd[r.prod]={qty:0,sum:0,custs:new Set()};byProd[r.prod].qty+=r.qty;byProd[r.prod].sum+=r.sum;byProd[r.prod].custs.add(r.cust)});
    let prods=Object.entries(byProd).map(([name,d])=>({name,qty:d.qty,sum:d.sum,custCnt:d.custs.size})).sort((a,b)=>b.sum-a.sum);
    if(_gdSearch){const q=_gdSearch.toLowerCase();prods=prods.filter(p=>p.name.toLowerCase().includes(q))}
    const totalQ=prods.reduce((s,p)=>s+p.qty,0);
    const totalS=prods.reduce((s,p)=>s+p.sum,0);

    el.innerHTML=`${tabs}
      <button class="flt" style="margin-bottom:10px" onclick="_gdChan=null;render()">← Всі канали</button>
      <div class="kpis">
        <div class="kpi"><div class="l">${_gdChan}</div><div class="v g">${ff(toCur(totalS))}${c$}</div><div class="s">${ff(totalQ)} пл. · ${prods.length} вин</div></div>
        <div class="kpi"><div class="l">Сер. ціна</div><div class="v" style="color:#f59e0b">${totalQ?(toCur(totalS/totalQ)).toFixed(0):"—"}${c$}</div></div>
      </div>
      <div class="cc"><h3>Топ вина в "${_gdChan}"</h3><canvas id="cGdChD" height="160"></canvas></div>
      <div class="cc"><h3>Всі вина каналу (${prods.length})</h3>
        <table class="tbl"><tr><th>Вино</th><th class="r">Пляшок</th><th class="r">Сума</th><th class="r">% каналу</th><th class="r">Сер.ціна</th><th class="r">Клієнтів</th></tr>
        ${prods.slice(0,40).map(p=>{const pct=totalS>0?(p.sum/totalS*100):0;return`<tr>
          <td style="font-size:10px">${p.name.substring(0,35)}</td>
          <td class="r">${ff(p.qty)}</td>
          <td class="r g">${ff(p.sum)}₴</td>
          <td class="r" style="color:#7d8196">${pct.toFixed(1)}%</td>
          <td class="r" style="color:#f59e0b">${p.qty>0?(p.sum/p.qty).toFixed(0):0}₴</td>
          <td class="r">${p.custCnt}</td>
        </tr>`}).join("")}</table></div>`;
    const top12=prods.slice(0,12);
    if(top12.length){
      dc("cGdChD");CH.cGdChD=new Chart(document.getElementById("cGdChD"),{type:"bar",
        data:{labels:top12.map(p=>p.name.substring(0,18)),datasets:[{data:top12.map(p=>p.sum),backgroundColor:"#10b981",borderRadius:2}]},
        options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},
          scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
    }
    return;
  }

  // All channels overview
  const byWH={};
  fd.forEach(r=>{
    if(!byWH[r.wh])byWH[r.wh]={qty:0,sum:0,prods:new Set(),custs:new Set(),topProd:{}};
    byWH[r.wh].qty+=r.qty;byWH[r.wh].sum+=r.sum;byWH[r.wh].prods.add(r.prod);byWH[r.wh].custs.add(r.cust);
    if(!byWH[r.wh].topProd[r.prod])byWH[r.wh].topProd[r.prod]=0;byWH[r.wh].topProd[r.prod]+=r.sum;
  });
  const totalSum=fd.reduce((s,r)=>s+r.sum,0);
  const whArr=Object.entries(byWH).map(([w,d])=>{
    const top3=Object.entries(d.topProd).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n])=>n.substring(0,20));
    return{w,qty:d.qty,sum:d.sum,pCnt:d.prods.size,cCnt:d.custs.size,top3};
  }).sort((a,b)=>b.sum-a.sum);

  el.innerHTML=`${tabs}
    <div class="info">Канали = склади з 1С. Натисніть для деталей.</div>
    ${whArr.map(w=>{const pct=totalSum>0?(w.sum/totalSum*100):0;return`<div class="cc" style="cursor:pointer" onclick="_gdChan='${w.w.replace(/'/g,"\\'")}';render()">
      <h3 style="display:flex;justify-content:space-between">${w.w} <span class="g">${ff(toCur(w.sum))}${c$}</span></h3>
      <div style="font-size:9px;color:#7d8196">${pct.toFixed(1)}% · ${ff(w.qty)} пл. · ${w.pCnt} вин · ${w.cCnt} клієнтів</div>
      <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap">${w.top3.map(n=>`<span style="font-size:9px;background:#1e2130;padding:2px 6px;border-radius:3px">${n}</span>`).join("")}</div>
    </div>`}).join("")}`;
}

// === CUSTOMERS VIEW ===
function rGdCustomers(el,tabs,fd,c$){
  const byCust={};
  fd.forEach(r=>{
    if(!byCust[r.cust])byCust[r.cust]={qty:0,sum:0,prods:new Set(),docs:new Set(),lastDate:""};
    byCust[r.cust].qty+=r.qty;byCust[r.cust].sum+=r.sum;byCust[r.cust].prods.add(r.prod);byCust[r.cust].docs.add(r.doc);
    if(r.date>byCust[r.cust].lastDate)byCust[r.cust].lastDate=r.date;
  });
  let custArr=Object.entries(byCust).map(([name,d])=>({name,qty:d.qty,sum:d.sum,pCnt:d.prods.size,dCnt:d.docs.size,last:d.lastDate}));
  if(_gdSearch){const q=_gdSearch.toLowerCase();custArr=custArr.filter(c=>c.name.toLowerCase().includes(q))}
  custArr.sort((a,b)=>b.sum-a.sum);

  el.innerHTML=`${tabs}
    <div class="kpis">
      <div class="kpi"><div class="l">Клієнтів</div><div class="v">${custArr.length}</div></div>
      <div class="kpi"><div class="l">Сер. чек</div><div class="v" style="color:#f59e0b">${custArr.length?(toCur(custArr.reduce((s,c)=>s+c.sum,0)/custArr.length)).toFixed(0):"—"}${c$}</div></div>
    </div>
    <div class="cc"><h3>Топ клієнтів по виручці</h3><canvas id="cGdCust" height="180"></canvas></div>
    <div class="cc"><h3>Всі клієнти (${custArr.length})</h3>
      <table class="tbl"><tr><th>Клієнт</th><th class="r">Пляшок</th><th class="r">Сума</th><th class="r">Накладних</th><th class="r">Вин</th><th class="r">Ост.покупка</th></tr>
      ${custArr.slice(0,50).map(c=>`<tr>
        <td style="font-size:9px">${c.name.substring(0,30)}</td>
        <td class="r">${ff(c.qty)}</td>
        <td class="r g">${ff(c.sum)}₴</td>
        <td class="r">${c.dCnt}</td>
        <td class="r">${c.pCnt}</td>
        <td class="r" style="color:#7d8196;font-size:9px">${c.last}</td>
      </tr>`).join("")}
      ${custArr.length>50?`<tr><td colspan="6" style="color:#7d8196;font-size:9px">+ ще ${custArr.length-50}</td></tr>`:""}</table></div>`;

  const top15=custArr.slice(0,15);
  if(top15.length){
    dc("cGdCust");CH.cGdCust=new Chart(document.getElementById("cGdCust"),{type:"bar",
      data:{labels:top15.map(c=>c.name.substring(0,16)),datasets:[{data:top15.map(c=>c.sum),backgroundColor:"#3b82f6",borderRadius:2}]},
      options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},
        scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
  }
}

// === TRENDS VIEW ===
function rGdTrends(el,tabs,fd,allYrs,c$){
  // By year
  const byYr={};fd.forEach(r=>{if(!byYr[r.yr])byYr[r.yr]={qty:0,sum:0};byYr[r.yr].qty+=r.qty;byYr[r.yr].sum+=r.sum});
  const yrArr=Object.entries(byYr).sort();

  // By month (current & prev year)
  const curYr=_gdYr!=="ALL"?_gdYr:allYrs[allYrs.length-1]||"2026";
  const prevYr=String(parseInt(curYr)-1);
  const byMoCur={},byMoPrev={};
  fd.filter(r=>r.yr===curYr).forEach(r=>{const m=r.date.substring(5,7);if(!byMoCur[m])byMoCur[m]={qty:0,sum:0};byMoCur[m].qty+=r.qty;byMoCur[m].sum+=r.sum});
  fd.filter(r=>r.yr===prevYr).forEach(r=>{const m=r.date.substring(5,7);if(!byMoPrev[m])byMoPrev[m]={qty:0,sum:0};byMoPrev[m].qty+=r.qty;byMoPrev[m].sum+=r.sum});

  // Top products year-over-year
  const topProds=[...new Set(fd.filter(r=>r.yr===curYr).map(r=>r.prod))];
  const prodYoY=topProds.map(p=>{
    const cur=fd.filter(r=>r.yr===curYr&&r.prod===p);
    const prev=fd.filter(r=>r.yr===prevYr&&r.prod===p);
    const sumC=cur.reduce((s,r)=>s+r.sum,0),qtyC=cur.reduce((s,r)=>s+r.qty,0);
    const sumP=prev.reduce((s,r)=>s+r.sum,0),qtyP=prev.reduce((s,r)=>s+r.qty,0);
    return{name:p,sumC,qtyC,sumP,qtyP,growth:sumP>0?((sumC-sumP)/sumP*100):0};
  }).filter(p=>p.sumC>0).sort((a,b)=>b.sumC-a.sumC);

  el.innerHTML=`${tabs}
    <div class="row">
      <div class="cc"><h3>Продажі по роках (пляшки)</h3><canvas id="cGdYr" height="120"></canvas></div>
      <div class="cc"><h3>Помісячно: ${curYr} vs ${prevYr}</h3><canvas id="cGdMo" height="120"></canvas></div>
    </div>
    <div class="cc"><h3>Топ вина ${curYr} vs ${prevYr}</h3>
      <table class="tbl"><tr><th>Вино</th><th class="r">Пл. ${curYr}</th><th class="r">Сума ${curYr}</th><th class="r">Пл. ${prevYr}</th><th class="r">Сума ${prevYr}</th><th class="r">Ріст</th></tr>
      ${prodYoY.slice(0,30).map(p=>{const gc=p.growth>0?"g":p.growth<0?"rd":"";return`<tr>
        <td style="font-size:10px">${p.name.substring(0,30)}</td>
        <td class="r">${ff(p.qtyC)}</td>
        <td class="r g">${ff(p.sumC)}₴</td>
        <td class="r" style="color:#7d8196">${ff(p.qtyP)}</td>
        <td class="r" style="color:#7d8196">${ff(p.sumP)}₴</td>
        <td class="r ${gc}">${p.sumP>0?(p.growth>0?"+":"")+p.growth.toFixed(0)+"%":"new"}</td>
      </tr>`}).join("")}</table></div>`;

  if(yrArr.length){
    dc("cGdYr");CH.cGdYr=new Chart(document.getElementById("cGdYr"),{type:"bar",
      data:{labels:yrArr.map(([y])=>y),datasets:[
        {label:"Пляшок",data:yrArr.map(([,d])=>d.qty),backgroundColor:"#8b5cf6",borderRadius:2,yAxisID:"y"},
        {label:"Сума ₴",data:yrArr.map(([,d])=>d.sum),type:"line",borderColor:"#f59e0b",borderWidth:2,pointRadius:3,pointBackgroundColor:"#f59e0b",tension:.3,yAxisID:"y1"}
      ]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},
        scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{position:"left",ticks:{color:"#8b5cf6",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y1:{position:"right",ticks:{color:"#f59e0b",font:{size:9},callback:v=>fm(v)+"₴"},grid:{display:false}}}}});
  }
  if(Object.keys(byMoCur).length){
    dc("cGdMo");CH.cGdMo=new Chart(document.getElementById("cGdMo"),{type:"bar",
      data:{labels:MN,datasets:[
        {label:curYr,data:MMa.map(m=>byMoCur[m]?.qty||0),backgroundColor:"#10b981",borderRadius:2},
        {label:prevYr,data:MMa.map(m=>byMoPrev[m]?.qty||0),backgroundColor:"rgba(139,92,246,.35)",borderRadius:2}
      ]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},
        scales:{x:{ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  }
}
