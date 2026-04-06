// js/tabs/shop.js — Shop tab (4 sub-tabs: sales, products, customers, orders)
let shopSub="sales",shopCityFlt="ALL";
function shopSw(s){shopSub=s;shopCityFlt="ALL";render()}

function rShop(f){
  const el=document.getElementById("t-shop"),c$=cs();
  if(!WO.length&&!wcLoaded){el.innerHTML='<div class="info">⏳ WooCommerce загружается...</div>';return}
  if(!WO.length&&wcLoaded){el.innerHTML='<div class="warn">WooCommerce: нет данных.'+(wcError?' Ошибка: '+wcError:'')+'<br><button class="flt" style="margin-top:6px" onclick="localStorage.removeItem(\'bw_wc_cache\');location.reload()">Сбросить кэш</button></div>';return}
  const yr=f.yr;
  const allOrd=yr==="ALL"?WO:WO.filter(o=>(o.date_created||"").startsWith(yr));
  const completed=allOrd.filter(o=>o.status==="completed"||o.status==="processing");
  const cancelled=allOrd.filter(o=>o.status==="cancelled");
  const refunded=allOrd.filter(o=>o.status==="refunded");
  const pending=allOrd.filter(o=>o.status==="pending"||o.status==="on-hold");
  const tabs=`<div class="sh-tabs">
    <button class="sh-tab ${shopSub==="sales"?"on":""}" onclick="shopSw('sales')">Продажи</button>
    <button class="sh-tab ${shopSub==="products"?"on":""}" onclick="shopSw('products')">Продукты</button>
    <button class="sh-tab ${shopSub==="customers"?"on":""}" onclick="shopSw('customers')">Клиенты</button>
    <button class="sh-tab ${shopSub==="orders"?"on":""}" onclick="shopSw('orders')">Заказы</button>
  </div>`;
  if(shopSub==="sales") rShopSales(el,tabs,completed,allOrd,f,c$);
  else if(shopSub==="products") rShopProducts(el,tabs,completed,c$);
  else if(shopSub==="customers") rShopCustomers(el,tabs,completed,c$);
  else if(shopSub==="orders") rShopOrders(el,tabs,allOrd,completed,cancelled,refunded,pending,c$);
}

function rShopSales(el,tabs,orders,allOrd,f,c$){
  const totalR=orders.reduce((s,o)=>s+parseFloat(o.total||0),0);
  const avg=orders.length?totalR/orders.length:0;
  const fopCut=totalR*(SETS.fopTax+SETS.fopBank)/100;
  const yr=f.yr;let prevOrders=[];
  if(yr!=="ALL"){const py=String(parseInt(yr)-1);prevOrders=WO.filter(o=>(o.date_created||"").startsWith(py)&&(o.status==="completed"||o.status==="processing"))}
  const prevR=prevOrders.reduce((s,o)=>s+parseFloat(o.total||0),0);
  const revGrow=prevR>0?((totalR-prevR)/prevR*100):0;
  const prevAvg=prevOrders.length?prevR/prevOrders.length:0;
  const avgGrow=prevAvg>0?((avg-prevAvg)/prevAvg*100):0;
  const cntGrow=prevOrders.length>0?((orders.length-prevOrders.length)/prevOrders.length*100):0;
  function cmpH(v){if(!v||!isFinite(v))return"";const cl=v>=0?"color:#10b981":"color:#ef4444";const ar=v>=0?"↑":"↓";return`<div class="cmp" style="${cl}">${ar}${Math.abs(v).toFixed(1)}%</div>`}
  const byM={};orders.forEach(o=>{const m=(o.date_created||"").substring(0,7);if(!byM[m])byM[m]={r:0,c:0,avg:0};byM[m].r+=parseFloat(o.total||0);byM[m].c++});
  Object.keys(byM).forEach(m=>{byM[m].avg=byM[m].c?byM[m].r/byM[m].c:0});
  const ms=Object.keys(byM).sort();
  const byW={};orders.forEach(o=>{const d=new Date(o.date_created);const w=new Date(d);w.setDate(d.getDate()-d.getDay());const wk=w.toISOString().substring(0,10);if(!byW[wk])byW[wk]={r:0,c:0};byW[wk].r+=parseFloat(o.total||0);byW[wk].c++});
  const ws=Object.keys(byW).sort().slice(-12);
  const payM={};orders.forEach(o=>{const m=o.payment_method_title||o.payment_method||"Не указан";payM[m]=(payM[m]||0)+parseFloat(o.total||0)});
  const payS=Object.entries(payM).sort((a,b)=>b[1]-a[1]);const payTotal=payS.reduce((s,[,v])=>s+v,0);
  const srcs={};orders.forEach(o=>{const s=((o.meta_data||[]).find(x=>x.key==="_metorik_utm_source")||{}).value||"direct";srcs[s]=(srcs[s]||0)+1});
  const srcS=Object.entries(srcs).sort((a,b)=>b[1]-a[1]).slice(0,8);
  el.innerHTML=`${tabs}
    <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">
      <div class="sh-kpi"><div class="l">Выручка</div><div class="v g">${ff(toCur(totalR))}${c$}</div>${cmpH(revGrow)}</div>
      <div class="sh-kpi"><div class="l">Заказов</div><div class="v">${orders.length}</div>${cmpH(cntGrow)}</div>
      <div class="sh-kpi"><div class="l">Ср.чек</div><div class="v">${ff(toCur(avg))}${c$}</div>${cmpH(avgGrow)}</div>
      <div class="sh-kpi"><div class="l">ФОП налоги</div><div class="v rd">${ff(toCur(fopCut))}${c$}</div><div class="s">${SETS.fopTax}%+${SETS.fopBank}%</div></div>
      <div class="sh-kpi"><div class="l">Чистая</div><div class="v g">${ff(toCur(totalR-fopCut))}${c$}</div></div>
    </div>
    <div class="cc"><h3>Выручка и заказы помесячно</h3><canvas id="cs1" height="90"></canvas></div>
    <div class="row">
      <div class="cc"><h3>Средний чек (тренд)</h3><canvas id="csAvg" height="90"></canvas></div>
      <div class="cc"><h3>Выручка по неделям (12 нед)</h3><canvas id="csW" height="90"></canvas></div>
    </div>
    <div class="row">
      <div class="cc"><h3>Способы оплаты</h3>${payS.map(([m,v])=>{const pct=payTotal>0?(v/payTotal*100):0;return`<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;margin-bottom:4px"><span>${m}</span><span class="g" style="font-weight:600">${ff(toCur(v))}${c$} <span style="color:#7d8196;font-weight:400">(${pct.toFixed(0)}%)</span></span></div>`}).join("")}</div>
      <div class="cc"><h3>UTM источники</h3><table class="tbl"><tr><th>Источник</th><th class="r">Заказов</th><th class="r">%</th></tr>${srcS.map(([s,c])=>`<tr><td>${s}</td><td class="r">${c}</td><td class="r" style="color:#7d8196">${(c/orders.length*100).toFixed(1)}%</td></tr>`).join("")}</table></div>
    </div>`;
  dc("cs1");CH.cs1=new Chart(document.getElementById("cs1"),{type:"bar",data:{labels:ms,datasets:[{label:"Выручка",data:ms.map(m=>toCur(byM[m].r)),backgroundColor:"#10b981",borderRadius:2,yAxisID:"y"},{label:"Заказов",data:ms.map(m=>byM[m].c),type:"line",borderColor:"#f59e0b",pointRadius:2,pointBackgroundColor:"#f59e0b",borderWidth:1.5,yAxisID:"y1"}]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{position:"left",ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y1:{position:"right",ticks:{color:"#f59e0b",font:{size:9}},grid:{display:false}}}}});
  dc("csAvg");CH.csAvg=new Chart(document.getElementById("csAvg"),{type:"line",data:{labels:ms,datasets:[{data:ms.map(m=>toCur(byM[m].avg)),borderColor:"#8b5cf6",backgroundColor:"rgba(139,92,246,.08)",fill:true,tension:.3,pointRadius:2,pointBackgroundColor:"#8b5cf6",borderWidth:1.5}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  dc("csW");CH.csW=new Chart(document.getElementById("csW"),{type:"bar",data:{labels:ws.map(w=>w.substring(5)),datasets:[{data:ws.map(w=>toCur(byW[w].r)),backgroundColor:"#3b82f6",borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}

function rShopProducts(el,tabs,orders,c$){
  // Sales per product from line_items (may be empty if loaded from Sheets)
  const prods={};orders.forEach(o=>{(o.line_items||[]).forEach(li=>{if(parseFloat(li.total||0)>=0){const n=li.name||"?";const pid=li.product_id||0;if(!prods[pid])prods[pid]={n,r:0,q:0,orders:0};prods[pid].r+=parseFloat(li.total);prods[pid].q+=li.quantity||1;prods[pid].orders++}})});
  const prodArr=Object.values(prods).sort((a,b)=>b.r-a.r);const totalR=prodArr.reduce((s,p)=>s+p.r,0);const totalQ=prodArr.reduce((s,p)=>s+p.q,0);
  const hasLineItems=prodArr.length>0;

  const inStock=WP.filter(p=>p.stock_status==="instock").length,outStock=WP.filter(p=>p.stock_status==="outofstock").length;
  const stockAlerts=WP.filter(p=>(p.stock_quantity!==null&&p.stock_quantity>0&&p.stock_quantity<=5)||p.stock_status==="outofstock").sort((a,b)=>(a.stock_quantity||0)-(b.stock_quantity||0));
  const wpSorted=WP.slice().sort((a,b)=>(a.name||"").localeCompare(b.name||""));

  if(hasLineItems){
    // Full view with ABC analysis
    let cum=0;prodArr.forEach(p=>{cum+=p.r;const pct=totalR>0?(cum/totalR*100):0;p.abc=pct<=80?"A":pct<=95?"B":"C"});
    const aCount=prodArr.filter(p=>p.abc==="A").length,bCount=prodArr.filter(p=>p.abc==="B").length,cCount=prodArr.filter(p=>p.abc==="C").length;
    el.innerHTML=`${tabs}
      <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">
        <div class="sh-kpi"><div class="l">Позиций продано</div><div class="v">${prodArr.length}</div></div>
        <div class="sh-kpi"><div class="l">Всего шт</div><div class="v">${ff(totalQ)}</div></div>
        <div class="sh-kpi"><div class="l">В наличии</div><div class="v g">${inStock}</div></div>
        <div class="sh-kpi"><div class="l">Мало / Нет</div><div class="v rd">${outStock}</div></div>
      </div>
      <div class="row">
        <div class="cc"><h3>ABC-анализ</h3><div style="display:flex;gap:6px;margin-bottom:8px;font-size:10px"><span style="color:#10b981;font-weight:600">A: ${aCount}</span><span style="color:#f59e0b;font-weight:600">B: ${bCount}</span><span style="color:#7d8196;font-weight:600">C: ${cCount}</span></div><canvas id="csABC" height="100"></canvas></div>
        <div class="cc"><h3>По категориям</h3><canvas id="csCat" height="100"></canvas></div>
      </div>
      <div class="cc"><h3>Топ товаров</h3><table class="tbl"><tr><th>ABC</th><th>Товар</th><th class="r">Выручка</th><th class="r">Шт</th><th class="r">%</th></tr>
        ${prodArr.slice(0,20).map(p=>{const abcC=p.abc==="A"?"#10b981":p.abc==="B"?"#f59e0b":"#7d8196";return`<tr><td style="color:${abcC};font-weight:700">${p.abc}</td><td>${p.n.substring(0,30)}</td><td class="r g">${ff(toCur(p.r))}${c$}</td><td class="r">${p.q}</td><td class="r" style="color:#7d8196">${totalR>0?(p.r/totalR*100).toFixed(1):0}%</td></tr>`}).join("")}</table></div>
      ${stockAlerts.length?`<div class="cc"><h3>⚠ Stock Alerts</h3><table class="tbl"><tr><th>Товар</th><th class="r">Остаток</th><th class="r">Статус</th></tr>${stockAlerts.slice(0,15).map(p=>{const sq=p.stock_quantity;const cls=p.stock_status==="outofstock"?"stock-out":"stock-low";return`<tr><td>${(p.name||"?").substring(0,35)}</td><td class="r">${sq!==null?sq:"—"}</td><td class="r"><span class="stock-badge ${cls}">${p.stock_status==="outofstock"?"Нет":"Мало"}</span></td></tr>`}).join("")}</table></div>`:""}`;
    dc("csABC");CH.csABC=new Chart(document.getElementById("csABC"),{type:"bar",data:{labels:prodArr.slice(0,15).map(p=>p.n.substring(0,12)),datasets:[{data:prodArr.slice(0,15).map(p=>toCur(p.r)),backgroundColor:prodArr.slice(0,15).map(p=>p.abc==="A"?"#10b981":p.abc==="B"?"#f59e0b":"#7d8196"),borderRadius:2}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:8},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
  } else {
    // No line_items — show product catalog from WP
    el.innerHTML=`${tabs}
      <div class="info">Дані про продажі по товарах недоступні (line_items не в Sheets). Каталог з WC_Products.</div>
      <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">
        <div class="sh-kpi"><div class="l">Товарів</div><div class="v">${WP.length}</div></div>
        <div class="sh-kpi"><div class="l">В наявності</div><div class="v g">${inStock}</div></div>
        <div class="sh-kpi"><div class="l">Немає / Мало</div><div class="v rd">${outStock}</div></div>
      </div>
      ${WP.length?`<div class="cc"><h3>Каталог товарів</h3><table class="tbl"><tr><th>Товар</th><th class="r">Залишок</th><th class="r">Статус</th></tr>
        ${wpSorted.map(p=>{const sq=p.stock_quantity;const sc=p.stock_status==="outofstock"?"stock-out":sq!==null&&sq<=5?"stock-low":"stock-in";const sl=p.stock_status==="outofstock"?"Немає":sq!==null&&sq<=5?"Мало":"Є";return`<tr><td>${(p.name||"?").substring(0,40)}</td><td class="r">${sq!==null?sq:"—"}</td><td class="r"><span class="stock-badge ${sc}">${sl}</span></td></tr>`}).join("")}</table></div>`:'<div class="warn">WC_Products порожній або колонки не співпадають. Перевірте консоль (F12).</div>'}
      ${stockAlerts.length?`<div class="cc"><h3>⚠ Stock Alerts</h3><table class="tbl"><tr><th>Товар</th><th class="r">Залишок</th><th class="r">Статус</th></tr>${stockAlerts.slice(0,15).map(p=>{const sq=p.stock_quantity;const cls=p.stock_status==="outofstock"?"stock-out":"stock-low";return`<tr><td>${(p.name||"?").substring(0,35)}</td><td class="r">${sq!==null?sq:"—"}</td><td class="r"><span class="stock-badge ${cls}">${p.stock_status==="outofstock"?"Немає":"Мало"}</span></td></tr>`}).join("")}</table></div>`:""}`;
  }
}

function rShopCustomers(el,tabs,orders,c$){
  const custs={};orders.forEach(o=>{const email=(o.billing?.email||"").toLowerCase().trim();if(!email)return;if(!custs[email])custs[email]={name:(o.billing?.first_name||"")+" "+(o.billing?.last_name||""),email,orders:0,total:0,first:o.date_created,last:o.date_created,city:o.billing?.city||o.shipping?.city||"",country:o.billing?.country||""};custs[email].orders++;custs[email].total+=parseFloat(o.total||0);if(o.date_created<custs[email].first)custs[email].first=o.date_created;if(o.date_created>custs[email].last)custs[email].last=o.date_created});
  const allCustArr=Object.values(custs);
  const allCities=[...new Set(allCustArr.map(c=>c.city).filter(Boolean))].sort();
  const custArr=shopCityFlt==="ALL"?allCustArr:allCustArr.filter(c=>c.city===shopCityFlt);
  const totalCust=custArr.length;
  const returning=custArr.filter(c=>c.orders>1);const returningPct=totalCust>0?(returning.length/totalCust*100):0;
  const avgLTV=totalCust>0?custArr.reduce((s,c)=>s+c.total,0)/totalCust:0;
  const avgOrders=totalCust>0?custArr.reduce((s,c)=>s+c.orders,0)/totalCust:0;
  const topLTV=custArr.sort((a,b)=>b.total-a.total).slice(0,15);
  const countries={};const cities={};custArr.forEach(c=>{if(c.country)countries[c.country]=(countries[c.country]||0)+1;if(c.city)cities[c.city]=(cities[c.city]||0)+1});
  const topCountries=Object.entries(countries).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const topCities=Object.entries(cities).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const firstByM={};custArr.forEach(c=>{const m=(c.first||"").substring(0,7);firstByM[m]=(firstByM[m]||0)+1});
  const ordByM={};orders.forEach(o=>{const m=(o.date_created||"").substring(0,7);if(!ordByM[m])ordByM[m]={total:0,ret:0};ordByM[m].total++;const email=(o.billing?.email||"").toLowerCase().trim();const cu=custs[email];if(cu&&cu.orders>1)ordByM[m].ret++});
  const cMs=Object.keys(ordByM).sort().slice(-12);
  el.innerHTML=`${tabs}
    <div style="margin-bottom:8px"><select class="flt" id="shopCityFlt"><option value="ALL">Всі міста</option>${allCities.map(c=>`<option ${c===shopCityFlt?"selected":""}>${c}</option>`).join("")}</select></div>
    <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">
      <div class="sh-kpi"><div class="l">Клиентов</div><div class="v">${totalCust}</div></div>
      <div class="sh-kpi"><div class="l">Повторные</div><div class="v" style="color:#8b5cf6">${returning.length}</div><div class="s">${returningPct.toFixed(1)}%</div></div>
      <div class="sh-kpi"><div class="l">Ср. LTV</div><div class="v">${ff(toCur(avgLTV))}${c$}</div></div>
      <div class="sh-kpi"><div class="l">Ср. заказов/кл</div><div class="v">${avgOrders.toFixed(1)}</div></div>
    </div>
    <div class="cc"><h3>Новые клиенты vs Повторные заказы</h3><canvas id="csCust" height="80"></canvas></div>
    <div class="row">
      <div class="cc"><h3>Топ клиентов (LTV)</h3><table class="tbl"><tr><th>Клиент</th><th class="r">LTV</th><th class="r">Зак.</th><th class="r">Город</th></tr>${topLTV.map(c=>`<tr><td style="font-size:9px">${c.name.trim().substring(0,20)||c.email.substring(0,20)}</td><td class="r g">${ff(toCur(c.total))}${c$}</td><td class="r">${c.orders}</td><td class="r" style="color:#7d8196;font-size:9px">${c.city}</td></tr>`).join("")}</table></div>
      <div class="cc"><h3>География</h3><table class="tbl"><tr><th>Город</th><th class="r">Кл.</th></tr>${topCities.map(([c,n])=>`<tr><td>${c}</td><td class="r">${n}</td></tr>`).join("")}</table></div>
    </div>`;
  dc("csCust");CH.csCust=new Chart(document.getElementById("csCust"),{type:"bar",data:{labels:cMs,datasets:[{label:"Новые",data:cMs.map(m=>firstByM[m]||0),backgroundColor:"#3b82f6",borderRadius:2},{label:"Повт.",data:cMs.map(m=>ordByM[m]?.ret||0),backgroundColor:"#8b5cf6",borderRadius:2}]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{stacked:true,ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{stacked:true,ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}}}}});
  document.getElementById("shopCityFlt").onchange=e=>{shopCityFlt=e.target.value;render()};
}

function rShopOrders(el,tabs,allOrd,completed,cancelled,refunded,pending,c$){
  const totalOrd=allOrd.length;const compR=completed.reduce((s,o)=>s+parseFloat(o.total||0),0);
  const cancelRate=totalOrd>0?(cancelled.length/totalOrd*100):0;const refundRate=totalOrd>0?(refunded.length/totalOrd*100):0;const refundR=refunded.reduce((s,o)=>s+parseFloat(o.total||0),0);
  const statuses={};allOrd.forEach(o=>{const s=o.status||"unknown";statuses[s]=(statuses[s]||0)+1});const statArr=Object.entries(statuses).sort((a,b)=>b[1]-a[1]);
  const statColors={"completed":"#10b981","processing":"#3b82f6","pending":"#f59e0b","on-hold":"#8b5cf6","cancelled":"#ef4444","refunded":"#ec4899","failed":"#64748b"};
  const funnel=[{l:"Всего",v:totalOrd,c:"#7d8196"},{l:"Processing",v:(statuses["processing"]||0)+(statuses["completed"]||0)+(statuses["refunded"]||0),c:"#3b82f6"},{l:"Completed",v:statuses["completed"]||0,c:"#10b981"},{l:"Cancelled",v:statuses["cancelled"]||0,c:"#ef4444"},{l:"Refunded",v:statuses["refunded"]||0,c:"#ec4899"}];
  const byMSt={};allOrd.forEach(o=>{const m=(o.date_created||"").substring(0,7);const s=o.status;if(!byMSt[m])byMSt[m]={};byMSt[m][s]=(byMSt[m][s]||0)+1});
  const oMs=Object.keys(byMSt).sort().slice(-12);const mainSt=["completed","processing","cancelled","refunded"];
  const recent=allOrd.sort((a,b)=>(b.date_created||"").localeCompare(a.date_created||"")).slice(0,20);
  // City distribution from completed orders
  const byCityOrd={},byCityRev={};completed.forEach(o=>{const city=o.billing?.city||o.shipping?.city||"";if(!city)return;byCityOrd[city]=(byCityOrd[city]||0)+1;byCityRev[city]=(byCityRev[city]||0)+parseFloat(o.total||0)});
  const cityArr=Object.entries(byCityOrd).map(([c,n])=>({c,n,r:byCityRev[c]||0})).sort((a,b)=>b.r-a.r);
  const topCitiesOrd=cityArr.slice(0,12);

  el.innerHTML=`${tabs}
    <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">
      <div class="sh-kpi"><div class="l">Всего</div><div class="v">${totalOrd}</div></div>
      <div class="sh-kpi"><div class="l">Выполнено</div><div class="v g">${completed.length}</div></div>
      <div class="sh-kpi"><div class="l">Refund</div><div class="v" style="color:#ec4899">${refundRate.toFixed(1)}%</div></div>
      <div class="sh-kpi"><div class="l">Cancel</div><div class="v rd">${cancelRate.toFixed(1)}%</div></div>
      <div class="sh-kpi"><div class="l">Міст</div><div class="v">${cityArr.length}</div></div>
    </div>
    <div class="row">
      <div class="cc"><h3>Воронка</h3>${funnel.map(f=>{const w=totalOrd>0?(f.v/totalOrd*100):0;return`<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px"><span>${f.l}</span><span style="font-weight:600">${f.v} (${w.toFixed(0)}%)</span></div><div style="height:5px;background:#1e2130;border-radius:3px"><div style="height:100%;width:${w}%;background:${f.c};border-radius:3px"></div></div></div>`}).join("")}</div>
      <div class="cc"><h3>Статусы</h3><canvas id="csStatus" height="100"></canvas></div>
    </div>
    ${topCitiesOrd.length?`<div class="row">
      <div class="cc"><h3>По містах (виручка)</h3><canvas id="csCityBar" height="100"></canvas></div>
      <div class="cc"><h3>Топ міст</h3><table class="tbl"><tr><th>Місто</th><th class="r">Замовл.</th><th class="r">Виручка</th></tr>
        ${topCitiesOrd.map(x=>`<tr><td>${x.c}</td><td class="r">${x.n}</td><td class="r g">${ff(toCur(x.r))}${c$}</td></tr>`).join("")}</table></div>
    </div>`:""}
    <div class="cc"><h3>По статусам (помесячно)</h3><canvas id="csOrdM" height="80"></canvas></div>
    <div class="cc"><h3>Последние заказы</h3><table class="tbl"><tr><th>#</th><th>Дата</th><th>Клиент</th><th class="r">Сумма</th><th class="r">Статус</th></tr>${recent.map(o=>{const sc=statColors[o.status]||"#7d8196";return`<tr><td style="color:#7d8196">${o.id}</td><td style="font-size:9px">${(o.date_created||"").substring(0,10)}</td><td style="font-size:9px">${(o.billing?.first_name||"")} ${(o.billing?.last_name||"").substring(0,1)}.</td><td class="r g">${ff(toCur(parseFloat(o.total||0)))}${c$}</td><td class="r"><span style="color:${sc};font-weight:600;font-size:9px">${o.status}</span></td></tr>`}).join("")}</table></div>`;
  dc("csStatus");CH.csStatus=new Chart(document.getElementById("csStatus"),{type:"doughnut",data:{labels:statArr.map(([s])=>s),datasets:[{data:statArr.map(([,v])=>v),backgroundColor:statArr.map(([s])=>statColors[s]||"#64748b")}]},options:{responsive:true,plugins:{legend:{position:"bottom",labels:{color:"#7d8196",font:{size:8},boxWidth:8,padding:4}}}}});
  dc("csOrdM");CH.csOrdM=new Chart(document.getElementById("csOrdM"),{type:"bar",data:{labels:oMs,datasets:mainSt.map(s=>({label:s,data:oMs.map(m=>byMSt[m]?.[s]||0),backgroundColor:statColors[s]||"#64748b",borderRadius:1}))},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{stacked:true,ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{stacked:true,ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}}}}});
  if(topCitiesOrd.length){dc("csCityBar");CH.csCityBar=new Chart(document.getElementById("csCityBar"),{type:"bar",data:{labels:topCitiesOrd.map(x=>x.c),datasets:[{data:topCitiesOrd.map(x=>toCur(x.r)),backgroundColor:"#3b82f6",borderRadius:2}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:8},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}})}
}
