// js/tabs/partners.js — Partners: sales, payments, debt, alerts from 1C

function toISO(d){if(!d)return"";const p=d.split(/[.\-\/]/);if(p.length===3){if(p[0].length===4)return d;return p[2].substring(0,4)+"-"+p[1]+"-"+p[0]}return d.substring(0,10)}

function rPartners(){
  const el=document.getElementById("t-partners");if(!el)return;
  if(!C1.loaded){el.innerHTML='<div class="info">⏳ Завантаження даних 1С...</div>';return}
  if(!C1.sales.length&&!C1.partners.length){el.innerHTML='<div class="warn">Дані 1С не завантажені. Перевірте data/*.csv файли або розшарте Google Sheet.</div>';return}

  const sales=C1.sales,partners=C1.partners,bank=C1.bank||[];

  // === Sales by partner ===
  const byP={};
  sales.forEach(s=>{
    const p=s.partner||"(невідомий)";
    if(!byP[p])byP[p]={sold:0,cntS:0,lastSale:"",firstSale:"9999",warehouses:new Set()};
    byP[p].sold+=s.sum;byP[p].cntS++;
    if(s.date>byP[p].lastSale)byP[p].lastSale=s.date;
    if(s.date<byP[p].firstSale)byP[p].firstSale=s.date;
    if(s.warehouse)byP[p].warehouses.add(s.warehouse);
  });

  // === Payments by partner ===
  const payments=bank.filter(b=>b.income>0&&b.type.includes("покупат"));
  const byPay={};
  payments.forEach(b=>{
    const p=b.partner||"";if(!p)return;
    if(!byPay[p])byPay[p]={paid:0,cntP:0,lastPay:""};
    byPay[p].paid+=b.income;byPay[p].cntP++;
    if(b.date>byPay[p].lastPay)byPay[p].lastPay=b.date;
  });

  // === Merge: sales + payments + info → debt ===
  const allNames=new Set([...Object.keys(byP),...Object.keys(byPay)]);
  const merged=[];
  allNames.forEach(name=>{
    const s=byP[name]||{sold:0,cntS:0,lastSale:"",firstSale:"",warehouses:new Set()};
    const p=byPay[name]||{paid:0,cntP:0,lastPay:""};
    // Try fuzzy match for partner info (1C names can differ)
    const info=partners.find(x=>x.name===name)||partners.find(x=>name.includes(x.name))||{};
    const debt=s.sold-p.paid;
    merged.push({
      name,sold:s.sold,paid:p.paid,debt,
      cntS:s.cntS,cntP:p.cntP,
      lastSale:s.lastSale,lastPay:p.lastPay,firstSale:s.firstSale,
      warehouses:[...s.warehouses],
      edrpou:info.edrpou||"",type:info.type||"",fullname:info.fullname||""
    });
  });
  merged.sort((a,b)=>b.sold-a.sold);

  const totalSold=merged.reduce((s,p)=>s+p.sold,0);
  const totalPaid=merged.reduce((s,p)=>s+p.paid,0);
  const totalDebt=merged.reduce((s,p)=>s+(p.debt>0?p.debt:0),0);

  // === Debtors (sold > paid, debt > 1000) ===
  const debtors=merged.filter(p=>p.debt>1000).sort((a,b)=>b.debt-a.debt);

  // === Overdue: debt + last payment > 30 days ago ===
  const now=Date.now();
  const overdue=debtors.filter(p=>{
    const lp=toISO(p.lastPay);
    if(!lp)return p.debt>5000; // never paid
    return(now-new Date(lp).getTime())>30*24*60*60*1000;
  }).slice(0,20);

  // === Dormant: had sales but none in 6+ months, sum > 10K ===
  const sixMAgo=new Date();sixMAgo.setMonth(sixMAgo.getMonth()-6);const sixMS=sixMAgo.toISOString().substring(0,10);
  const dormant=merged.filter(p=>p.sold>10000&&toISO(p.lastSale)<sixMS).slice(0,15);

  // === By warehouse ===
  const byWH={};sales.forEach(s=>{const w=s.warehouse||"Інше";if(!byWH[w])byWH[w]={sum:0,cnt:0,partners:new Set()};byWH[w].sum+=s.sum;byWH[w].cnt++;byWH[w].partners.add(s.partner)});
  const whArr=Object.entries(byWH).map(([w,d])=>({w,sum:d.sum,cnt:d.cnt,pCnt:d.partners.size})).sort((a,b)=>b.sum-a.sum);

  // === By year ===
  const byYr={};sales.forEach(s=>{const y=toISO(s.date).substring(0,4)||"?";if(y<"2015")return;if(!byYr[y])byYr[y]={sum:0,cnt:0};byYr[y].sum+=s.sum;byYr[y].cnt++});
  const yrArr=Object.entries(byYr).sort((a,b)=>b[0].localeCompare(a[0]));

  // === Active in 2025+ ===
  const active=merged.filter(p=>toISO(p.lastSale)>="2025");
  const top25=merged.slice(0,25);

  // === RENDER ===
  el.innerHTML=`
    <div class="sec">Партнери · 1С Бухгалтерія</div>
    <div class="info">${ff(sales.length)} реалізацій · ${partners.length} контрагентів · ${ff(bank.length)} банк.операцій · ${C1.products.length} номенклатура</div>

    <div class="kpis">
      <div class="kpi"><div class="l">Продано</div><div class="v g">${ff(totalSold)}₴</div><div class="s">${ff(sales.length)} док.</div></div>
      <div class="kpi"><div class="l">Оплачено</div><div class="v" style="color:#3b82f6">${ff(totalPaid)}₴</div><div class="s">${ff(payments.length)} платежів</div></div>
      <div class="kpi"><div class="l">Заборгованість</div><div class="v" style="color:${totalDebt>0?"#ef4444":"#10b981"}">${ff(totalDebt)}₴</div><div class="s">${debtors.length} боржників</div></div>
      <div class="kpi"><div class="l">Партнерів</div><div class="v">${merged.length}</div><div class="s">активних: ${active.length}</div></div>
      <div class="kpi"><div class="l">Склади</div><div class="v">${whArr.length}</div></div>
    </div>

    ${overdue.length?`<div class="cc" style="border-color:rgba(239,68,68,.4)"><h3 style="color:#ef4444">🔴 Прострочена заборгованість (>30 днів)</h3>
      <table class="tbl"><tr><th>Партнер</th><th class="r">Борг</th><th class="r">Продано</th><th class="r">Оплачено</th><th class="r">Ост.оплата</th></tr>
      ${overdue.map(p=>{const days=p.lastPay?Math.floor((now-new Date(toISO(p.lastPay)).getTime())/(1000*60*60*24)):"ніколи";return`<tr>
        <td style="font-size:9px">${p.name.substring(0,30)}</td>
        <td class="r rd" style="font-weight:700">${ff(p.debt)}₴</td>
        <td class="r">${ff(p.sold)}₴</td>
        <td class="r" style="color:#3b82f6">${ff(p.paid)}₴</td>
        <td class="r" style="color:#ef4444;font-size:9px">${p.lastPay||"—"} (${days}д)</td>
      </tr>`}).join("")}</table></div>`:""}

    <div class="row">
      <div class="cc"><h3>По роках</h3><canvas id="cPYr" height="100"></canvas></div>
      <div class="cc"><h3>По складах (каналах)</h3>
        <table class="tbl"><tr><th>Склад</th><th class="r">Сума</th><th class="r">Партн.</th><th class="r">Док.</th></tr>
        ${whArr.map(w=>`<tr><td>${w.w}</td><td class="r g">${ff(w.sum)}₴</td><td class="r">${w.pCnt}</td><td class="r">${ff(w.cnt)}</td></tr>`).join("")}</table></div>
    </div>

    <div class="cc"><h3>Топ-25 партнерів</h3>
      <table class="tbl"><tr><th>Партнер</th><th class="r">ЄДРПОУ</th><th class="r">Продано</th><th class="r">Оплачено</th><th class="r">Борг</th><th class="r">Ост.продаж</th></tr>
      ${top25.map(p=>{const hasDebt=p.debt>1000;const lastISO=toISO(p.lastSale);const old=lastISO<sixMS;return`<tr>
        <td style="font-size:9px">${p.name.substring(0,28)}</td>
        <td class="r" style="color:#7d8196;font-size:9px">${p.edrpou}</td>
        <td class="r g">${ff(p.sold)}₴</td>
        <td class="r" style="color:#3b82f6">${ff(p.paid)}₴</td>
        <td class="r ${hasDebt?"rd":""}">${p.debt>0?ff(p.debt)+"₴":"✓"}</td>
        <td class="r" style="color:${old?"#ef4444":"#7d8196"};font-size:9px">${p.lastSale}</td>
      </tr>`}).join("")}</table></div>

    <div class="cc"><h3>Топ партнерів</h3><canvas id="cPartBar" height="160"></canvas></div>

    ${dormant.length?`<div class="cc"><h3 style="color:#f59e0b">⚠ Сплячі партнери (>6 міс, продаж >10K)</h3>
      <table class="tbl"><tr><th>Партнер</th><th class="r">Загалом</th><th class="r">Ост.продаж</th><th class="r">Днів тому</th></tr>
      ${dormant.map(p=>{const li=toISO(p.lastSale);const days=li?Math.floor((now-new Date(li).getTime())/(1000*60*60*24)):"?";return`<tr>
        <td style="font-size:9px">${p.name.substring(0,30)}</td>
        <td class="r">${ff(p.sold)}₴</td>
        <td class="r" style="color:#ef4444;font-size:9px">${p.lastSale}</td>
        <td class="r rd">${days}д</td>
      </tr>`}).join("")}</table></div>`:""}

    ${debtors.length?`<div class="cc"><h3>Всі боржники (борг >1000₴)</h3>
      <table class="tbl"><tr><th>Партнер</th><th class="r">Борг</th><th class="r">Ост.оплата</th><th class="r">Днів</th></tr>
      ${debtors.slice(0,30).map(p=>{const li=toISO(p.lastPay);const days=li?Math.floor((now-new Date(li).getTime())/(1000*60*60*24)):"∞";const urgent=days==="∞"||days>60;return`<tr>
        <td style="font-size:9px">${p.name.substring(0,30)}</td>
        <td class="r rd">${ff(p.debt)}₴</td>
        <td class="r" style="color:#7d8196;font-size:9px">${p.lastPay||"ніколи"}</td>
        <td class="r" style="color:${urgent?"#ef4444":"#f59e0b"}">${days}</td>
      </tr>`}).join("")}</table></div>`:""}
  `;

  // Charts
  if(yrArr.length>1){
    dc("cPYr");CH.cPYr=new Chart(document.getElementById("cPYr"),{type:"bar",
      data:{labels:yrArr.map(([y])=>y),datasets:[{data:yrArr.map(([,d])=>d.sum),backgroundColor:"#10b981",borderRadius:2}]},
      options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9}},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  }
  const chartData=top25.slice(0,15);
  if(chartData.length){
    dc("cPartBar");CH.cPartBar=new Chart(document.getElementById("cPartBar"),{type:"bar",
      data:{labels:chartData.map(p=>p.name.substring(0,15)),datasets:[
        {label:"Продано",data:chartData.map(p=>p.sold),backgroundColor:"#10b981",borderRadius:2},
        {label:"Оплачено",data:chartData.map(p=>p.paid),backgroundColor:"#3b82f6",borderRadius:2}
      ]},
      options:{indexAxis:"y",responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
  }
}
