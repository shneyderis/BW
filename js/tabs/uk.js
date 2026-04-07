// js/tabs/uk.js — Wines of Ukraine (UK business) tab
// Data sources: Metorik (Shopify), Xero, Zoho Inventory

let ukLoaded=false,ukError="",UK={orders:[],products:[],customers:[],stats:{}};
let ukView="overview";

async function loadUK(){
  if(ukLoaded)return;
  try{
    // Load from Metorik API (proxied through Vercel or direct)
    const token="mtk_zzh4swqgn281dl57sr7fojgnue1klerihsj1196sezd4vdco";
    const base="https://app.metorik.com/api/v1";
    async function mFetch(ep){
      const r=await fetch(base+ep+(ep.includes("?")?"&":"?")+"token="+token);
      if(!r.ok)throw new Error("Metorik "+ep+": "+r.status);
      return r.json();
    }
    // Try loading from Sheets first (synced by sync.gs)
    const[ukOrd,ukProd]=await Promise.all([
      csvF("UK_Orders").catch(()=>[]),
      csvF("UK_Products").catch(()=>[])
    ]);
    if(ukOrd.length){
      UK.orders=ukOrd.map(r=>({
        id:pn(gv(r,"id")),date:gv(r,"date")||"",status:gv(r,"status")||"",
        total:parseFloat(gv(r,"total"))||0,currency:gv(r,"currency")||"GBP",
        customer:gv(r,"customer")||"",email:gv(r,"email")||"",
        city:gv(r,"city")||"",country:gv(r,"country")||"",
        items:gv(r,"items")||"",source:gv(r,"source")||""
      }));
      UK.products=ukProd.map(r=>({
        id:pn(gv(r,"id")),name:gv(r,"name")||"",sku:gv(r,"sku")||"",
        price:parseFloat(gv(r,"price"))||0,stock:pn(gv(r,"stock")),
        sold:pn(gv(r,"sold")),revenue:parseFloat(gv(r,"revenue"))||0
      }));
      ukLoaded=true;
      console.log("UK from Sheets:",UK.orders.length,"orders,",UK.products.length,"products");
    } else {
      // Try Metorik API directly
      try{
        const[ordData,prodData]=await Promise.all([
          mFetch("/orders/?per_page=200&orderby=date&order=desc"),
          mFetch("/products/?per_page=100")
        ]);
        if(ordData.data)UK.orders=ordData.data.map(o=>({
          id:o.id,date:o.date_created||"",status:o.status||"",
          total:parseFloat(o.total)||0,currency:o.currency||"GBP",
          customer:(o.billing||{}).first_name+" "+(o.billing||{}).last_name,
          email:(o.billing||{}).email||"",
          city:(o.billing||{}).city||"",country:(o.billing||{}).country||"",
          items:(o.line_items||[]).map(i=>i.name).join(", "),source:""
        }));
        if(prodData.data)UK.products=prodData.data.map(p=>({
          id:p.id,name:p.name||"",sku:p.sku||"",
          price:parseFloat(p.price)||0,stock:p.stock_quantity||0,
          sold:p.total_sales||0,revenue:0
        }));
        ukLoaded=true;
        console.log("UK from Metorik API:",UK.orders.length,"orders,",UK.products.length,"products");
      }catch(e){ukError="Metorik: "+e.message;console.warn("Metorik API failed:",e)}
      ukLoaded=true;
    }
  }catch(e){ukError=e.message;ukLoaded=true}
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

  // === OVERVIEW ===
  const orders=UK.orders;
  const products=UK.products;
  const completed=orders.filter(o=>o.status==="completed"||o.status==="processing");
  const totalRev=completed.reduce((s,o)=>s+o.total,0);
  const avgOrder=completed.length?totalRev/completed.length:0;

  // By month
  const byM={};completed.forEach(o=>{const m=(o.date||"").substring(0,7);if(m){if(!byM[m])byM[m]={rev:0,cnt:0};byM[m].rev+=o.total;byM[m].cnt++}});
  const ms=Object.keys(byM).sort();

  // By country
  const byCo={};completed.forEach(o=>{const c=o.country||"?";byCo[c]=(byCo[c]||0)+o.total});
  const coArr=Object.entries(byCo).sort((a,b)=>b[1]-a[1]).slice(0,10);

  // By city
  const byCi={};completed.forEach(o=>{const c=o.city||"?";if(c&&c!=="?")byCi[c]=(byCi[c]||0)+o.total});
  const ciArr=Object.entries(byCi).sort((a,b)=>b[1]-a[1]).slice(0,10);

  el.innerHTML=`${tabs}
    ${ukError?'<div class="warn">⚠ '+ukError+'</div>':""}
    ${!orders.length?'<div class="info">UK дані не завантажені. Створіть листи UK_Orders та UK_Products в Google Sheets, або налаштуйте Metorik API.</div>':""}
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

  if(ms.length>1){
    dc("cUKm");CH.cUKm=new Chart(document.getElementById("cUKm"),{type:"bar",
      data:{labels:ms,datasets:[{label:"Виручка £",data:ms.map(m=>byM[m].rev),backgroundColor:"#10b981",borderRadius:2}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:8}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>"£"+fm(v)},grid:{color:"#1e2130"}}}}});
  }
}

function rUKOrders(el,tabs){
  const orders=UK.orders.sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  el.innerHTML=`${tabs}
    <div class="cc"><h3>Замовлення (${orders.length})</h3>
      <table class="tbl"><tr><th>#</th><th>Дата</th><th>Клієнт</th><th class="r">Сума</th><th class="r">Статус</th><th>Місто</th></tr>
      ${orders.slice(0,50).map(o=>`<tr>
        <td style="color:#7d8196;font-size:9px">${o.id}</td>
        <td style="font-size:9px">${(o.date||"").substring(0,10)}</td>
        <td style="font-size:9px">${(o.customer||"").substring(0,20)}</td>
        <td class="r g">${o.total.toFixed(2)}£</td>
        <td class="r" style="font-size:9px;color:${o.status==="completed"?"#10b981":"#f59e0b"}">${o.status}</td>
        <td style="font-size:8px;color:#7d8196">${o.city}, ${o.country}</td>
      </tr>`).join("")}
      ${orders.length>50?`<tr><td colspan="6" style="color:#7d8196;font-size:9px">+ ще ${orders.length-50}</td></tr>`:""}</table></div>`;
}

function rUKProducts(el,tabs){
  const products=UK.products.sort((a,b)=>b.sold-a.sold);
  const totalSold=products.reduce((s,p)=>s+p.sold,0);
  el.innerHTML=`${tabs}
    <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">
      <div class="sh-kpi"><div class="l">Продуктів</div><div class="v">${products.length}</div></div>
      <div class="sh-kpi"><div class="l">Продано шт</div><div class="v">${ff(totalSold)}</div></div>
    </div>
    <div class="cc"><h3>Продукти</h3>
      <table class="tbl"><tr><th>Продукт</th><th class="r">Ціна</th><th class="r">Залишок</th><th class="r">Продано</th></tr>
      ${products.map(p=>{const lowStock=p.stock<=5&&p.stock>0;const noStock=p.stock<=0;return`<tr>
        <td style="font-size:9px">${p.name.substring(0,30)}</td>
        <td class="r">${p.price.toFixed(2)}£</td>
        <td class="r" style="color:${noStock?"#ef4444":lowStock?"#f59e0b":"#10b981"}">${p.stock}</td>
        <td class="r">${p.sold}</td>
      </tr>`}).join("")}</table></div>`;
}
