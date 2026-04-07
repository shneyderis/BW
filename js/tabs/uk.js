// js/tabs/uk.js — Wines of Ukraine (UK business) tab
// Data ONLY from Google Sheets (synced by sync.gs)

let ukLoaded=false,ukError="",UK={orders:[],products:[],customers:[]};
let ukView="overview";

async function loadUK(){
  if(ukLoaded)return;
  try{
    const[ukOrd,ukProd]=await Promise.all([
      csvF("UK_Orders").catch(()=>[]),
      csvF("UK_Products").catch(()=>[])
    ]);
    UK.orders=(ukOrd||[]).map(r=>({
      id:pn(gv(r,"id")),date:gv(r,"date")||gv(r,"date_created")||"",status:gv(r,"status")||"",
      total:parseFloat(gv(r,"total"))||0,currency:gv(r,"currency")||"GBP",
      customer:gv(r,"customer")||gv(r,"billing_first")||"",email:gv(r,"email")||gv(r,"billing_email")||"",
      city:gv(r,"city")||gv(r,"billing_city")||"",country:gv(r,"country")||gv(r,"billing_country")||"",
      items:gv(r,"items")||gv(r,"items_detail")||"",source:gv(r,"source")||gv(r,"utm_source")||""
    }));
    UK.products=(ukProd||[]).map(r=>({
      id:pn(gv(r,"id")),name:gv(r,"name")||"",sku:gv(r,"sku")||"",
      price:parseFloat(gv(r,"price"))||0,stock:pn(gv(r,"stock")),
      sold:pn(gv(r,"sold")||gv(r,"total_sales")),revenue:parseFloat(gv(r,"revenue"))||0
    }));
    ukLoaded=true;
    console.log("UK from Sheets:",UK.orders.length,"orders,",UK.products.length,"products");
  }catch(e){ukError=e.message;console.warn("UK load error:",e);ukLoaded=true}
}

function rUK(){
  const el=document.getElementById("t-uk");if(!el)return;
  if(!ukLoaded){el.innerHTML='<div class="info">⏳ Завантаження UK даних...</div>';loadUK().then(()=>rUK());return}

  const tabs=`<div class="sh-tabs" style="margin-bottom:10px">
    <button class="sh-tab ${ukView==="overview"?"on":""}" onclick="ukView='overview';render()">Огляд</button>
    <button class="sh-tab ${ukView==="orders"?"on":""}" onclick="ukView='orders';render()">Замовлення</button>
    <button class="sh-tab ${ukView==="products"?"on":""}" onclick="ukView='products';render()">Продукти</button>
  </div>`;

  if(ukView==="orders")return rUKOrders(el,tabs);
  if(ukView==="products")return rUKProducts(el,tabs);

  const orders=UK.orders;
  const products=UK.products;
  const completed=orders.filter(o=>o.status==="completed"||o.status==="processing");
  const totalRev=completed.reduce((s,o)=>s+o.total,0);
  const avgOrder=completed.length?totalRev/completed.length:0;

  if(!orders.length&&!products.length){
    el.innerHTML=`${tabs}
      <div class="sec">🇬🇧 Wines of Ukraine Ltd</div>
      <div class="info">UK дані не завантажені. Створіть листи <b>UK_Orders</b> та <b>UK_Products</b> в Google Sheets.<br>Дані синхронізуються через sync.gs (Metorik/Shopify/Xero API → Sheets).</div>`;
    return;
  }

  const byM={};completed.forEach(o=>{const m=(o.date||"").substring(0,7);if(m){if(!byM[m])byM[m]={rev:0,cnt:0};byM[m].rev+=o.total;byM[m].cnt++}});
  const ms=Object.keys(byM).sort();
  const byCo={};completed.forEach(o=>{const c=o.country||"?";byCo[c]=(byCo[c]||0)+o.total});
  const coArr=Object.entries(byCo).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const byCi={};completed.forEach(o=>{const c=o.city||"?";if(c&&c!=="?")byCi[c]=(byCi[c]||0)+o.total});
  const ciArr=Object.entries(byCi).sort((a,b)=>b[1]-a[1]).slice(0,10);

  el.innerHTML=`${tabs}
    ${ukError?'<div class="warn">⚠ '+ukError+'</div>':""}
    <div class="sec">🇬🇧 Wines of Ukraine Ltd</div>
    <div class="kpis">
      <div class="kpi"><div class="l">Виручка £</div><div class="v g">${ff(totalRev)}£</div><div class="s">${completed.length} замовлень</div></div>
      <div class="kpi"><div class="l">Сер. чек</div><div class="v">${ff(avgOrder)}£</div></div>
      <div class="kpi"><div class="l">Продуктів</div><div class="v">${products.length}</div></div>
      <div class="kpi"><div class="l">Країн</div><div class="v">${Object.keys(byCo).length}</div></div>
    </div>
    ${ms.length>1?'<div class="cc"><h3>Виручка помісячно (£)</h3><canvas id="cUKm" height="100"></canvas></div>':""}
    <div class="row">
      ${coArr.length?`<div class="cc"><h3>По країнах</h3><table class="tbl"><tr><th>Країна</th><th class="r">Виручка</th></tr>
        ${coArr.map(([c,v])=>`<tr><td>${c}</td><td class="r g">${ff(v)}£</td></tr>`).join("")}</table></div>`:""}
      ${ciArr.length?`<div class="cc"><h3>По містах</h3><table class="tbl"><tr><th>Місто</th><th class="r">Виручка</th></tr>
        ${ciArr.map(([c,v])=>`<tr><td>${c}</td><td class="r g">${ff(v)}£</td></tr>`).join("")}</table></div>`:""}
    </div>`;
  if(ms.length>1){dc("cUKm");CH.cUKm=new Chart(document.getElementById("cUKm"),{type:"bar",data:{labels:ms,datasets:[{label:"£",data:ms.map(m=>byM[m].rev),backgroundColor:"#10b981",borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>"£"+fm(v)},grid:{color:"#1e2130"}}}}})}
}

function rUKOrders(el,tabs){
  const orders=UK.orders.sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  el.innerHTML=`${tabs}<div class="cc"><h3>Замовлення (${orders.length})</h3>
    <table class="tbl"><tr><th>#</th><th>Дата</th><th>Клієнт</th><th class="r">Сума</th><th class="r">Статус</th><th>Місто</th></tr>
    ${orders.slice(0,50).map(o=>`<tr>
      <td style="color:#7d8196;font-size:9px">${o.id}</td>
      <td style="font-size:9px">${(o.date||"").substring(0,10)}</td>
      <td style="font-size:9px">${(o.customer||"").substring(0,20)}</td>
      <td class="r g">${o.total.toFixed(2)}£</td>
      <td class="r" style="font-size:9px;color:${o.status==="completed"?"#10b981":"#f59e0b"}">${o.status}</td>
      <td style="font-size:8px;color:#7d8196">${[o.city,o.country].filter(Boolean).join(", ")}</td>
    </tr>`).join("")}</table></div>`;
}

function rUKProducts(el,tabs){
  const products=UK.products.sort((a,b)=>b.sold-a.sold);
  el.innerHTML=`${tabs}<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">
    <div class="sh-kpi"><div class="l">Продуктів</div><div class="v">${products.length}</div></div>
    <div class="sh-kpi"><div class="l">Продано шт</div><div class="v">${ff(products.reduce((s,p)=>s+p.sold,0))}</div></div>
  </div>
  <div class="cc"><h3>Продукти</h3><table class="tbl"><tr><th>Продукт</th><th class="r">Ціна</th><th class="r">Залишок</th><th class="r">Продано</th></tr>
    ${products.map(p=>`<tr>
      <td style="font-size:9px">${p.name.substring(0,30)}</td>
      <td class="r">${p.price.toFixed(2)}£</td>
      <td class="r" style="color:${p.stock<=0?"#ef4444":p.stock<=5?"#f59e0b":"#10b981"}">${p.stock}</td>
      <td class="r">${p.sold}</td>
    </tr>`).join("")}</table></div>`;
}
