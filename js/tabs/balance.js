// js/tabs/balance.js — Consolidated Balance: money + wine + debt + P&L

function rBalance(){
  const el=document.getElementById("t-balance");if(!el)return;
  const c$=cs();

  // === MONEY (from BL - PRIVAT_BALANCES) ===
  const uahB=BL.filter(b=>gv(b,"валют")==="UAH").reduce((s,b)=>s+pn(gv(b,"баланс")),0);
  const eurB=BL.filter(b=>gv(b,"валют")==="EUR").reduce((s,b)=>s+pn(gv(b,"баланс")),0);
  const usdB=BL.filter(b=>gv(b,"валют")==="USD").reduce((s,b)=>s+pn(gv(b,"баланс")),0);
  const totalMoney=uahB+eurB*FX.EUR+usdB*FX.USD;

  // === WINE IN LOTS (from LOTS - production) ===
  const lots=typeof LOTS!=="undefined"?LOTS:[];
  const lotsVol=lots.reduce((s,l)=>s+l.volume,0);
  const lotsBottles=Math.floor(lotsVol/0.75);
  // Estimate value by brand
  const brandPrices={"Kara Kermen":1200,"Loca Deserta":1500,"Artania":500,"Beykush":800,"Beresagne":600,"Yafe Nagar":700};
  let lotsValue=0;
  lots.forEach(l=>{
    const tags=l.tags||"";let price=500;
    for(const[brand,p]of Object.entries(brandPrices)){if(tags.includes(brand)){price=p;break}}
    lotsValue+=Math.floor(l.volume/0.75)*price;
  });

  // === WINE IN BOTTLES (from 3_Stock / Stock_Data) ===
  const stockItems=SK.map(s=>({st:pn(gv(s,"остаток")||"0"),av:pn(gv(s,"сред")||"0")})).filter(s=>s.st>0);
  const stockBottles=stockItems.reduce((s,i)=>s+i.st,0);
  const stockValue=stockBottles*500; // avg ₴500/bottle

  // === RECEIVABLES (from 1C OSV account 36) ===
  const osv=C1&&C1.osv?C1.osv:[];
  const acc36=osv.find(r=>r.account==="36")||{};
  const receivables=acc36.saldoEndDt||0;

  // === OVERDUE DEBT (from partners) ===
  let overdueDebt=0,overdueCount=0;
  if(C1&&C1.sales&&C1.bank){
    const byP={};C1.sales.filter(s=>s.org==="Бейкуш Вайнери").forEach(s=>{const p=s.partner;if(!byP[p])byP[p]={sold:0,paid:0,lastPay:""};byP[p].sold+=s.sum});
    C1.bank.filter(b=>b.income>0&&b.type.includes("покупат")).forEach(b=>{const p=b.partner;if(byP[p]){byP[p].paid+=b.income;if(b.date>byP[p].lastPay)byP[p].lastPay=b.date}});
    const now=Date.now();
    Object.values(byP).forEach(p=>{
      const debt=p.sold-p.paid;
      if(debt>1000){
        const lp=p.lastPay?new Date(p.lastPay.split(/[.\-\/]/).reverse().join("-")):null;
        if(!lp||now-lp.getTime()>30*24*60*60*1000){overdueDebt+=debt;overdueCount++}
      }
    });
  }

  // === FIXED ASSETS (from OSV account 10/11) ===
  const accAssets=osv.find(r=>r.account==="10"||r.account==="11")||{};
  const fixedAssets=accAssets.saldoEndDt||0;

  // === GOODS ON STOCK (from OSV account 28) ===
  const acc28=osv.find(r=>r.account==="28")||{};
  const goodsOnStock=acc28.saldoEndDt||0;

  // === P&L YTD ===
  const curYr=String(new Date().getFullYear());
  const prevYr=String(parseInt(curYr)-1);
  const opex=T.filter(t=>!isA(t));
  const revYTD=opex.filter(t=>t.yr===curYr&&t.tp==="Доход").reduce((s,t)=>s+t.nt,0);
  const expYTD=opex.filter(t=>t.yr===curYr&&t.tp==="Расход").reduce((s,t)=>s+t.nt,0);
  const profitYTD=revYTD+expYTD;
  const marginYTD=revYTD?(profitYTD/revYTD*100):0;
  const revPrevYTD=opex.filter(t=>t.yr===prevYr&&t.tp==="Доход").reduce((s,t)=>s+t.nt,0);
  const revGrowth=revPrevYTD?((revYTD-revPrevYTD)/revPrevYTD*100):0;

  // === UK ===
  const ukRev=(typeof UK!=="undefined"&&UK.orders)?UK.orders.filter(o=>o.status==="completed"||o.status==="processing").reduce((s,o)=>s+o.total,0):0;

  // === TOTAL ASSETS ===
  const totalWine=lotsValue+stockValue+goodsOnStock;
  const totalAssets=totalMoney+totalWine+receivables+fixedAssets;

  // === STRUCTURE ===
  const structure=[
    {name:"Гроші",val:totalMoney,clr:"#10b981"},
    {name:"Вино (бочки)",val:lotsValue,clr:"#8b5cf6"},
    {name:"Вино (пляшки)",val:stockValue+goodsOnStock,clr:"#e11d48"},
    {name:"Дебіторка",val:receivables,clr:"#3b82f6"},
    {name:"Осн.засоби",val:fixedAssets,clr:"#f59e0b"}
  ].filter(s=>s.val>0);

  // === MONTHLY BALANCE TREND (from cash flow data) ===
  const byMonth={};
  T.filter(t=>t.yr===curYr||t.yr===prevYr).forEach(t=>{
    if(!byMonth[t.ym])byMonth[t.ym]={inc:0,exp:0};
    if(t.amt>0)byMonth[t.ym].inc+=t.amt;else byMonth[t.ym].exp+=Math.abs(t.amt);
  });
  const months=Object.keys(byMonth).sort();
  let cumBalance=0;
  const balanceData=months.map(m=>{cumBalance+=byMonth[m].inc-byMonth[m].exp;return cumBalance});

  // === RENDER ===
  el.innerHTML=`
    <div class="sec">💰 Баланс · Beykush Winery</div>

    <div class="kpis">
      <div class="kpi"><div class="l">Загальні активи</div><div class="v" style="color:#f59e0b">${ff(toCur(totalAssets))}${c$}</div></div>
      <div class="kpi"><div class="l">Гроші</div><div class="v g">${ff(toCur(totalMoney))}${c$}</div><div class="s">₴${ff(uahB)} €${ff(eurB)} $${ff(usdB)}</div></div>
      <div class="kpi"><div class="l">Дебіторка</div><div class="v" style="color:#3b82f6">${ff(toCur(receivables))}${c$}</div><div class="s">${overdueCount?`<span style="color:#ef4444">⚠ ${ff(overdueDebt)}₴ прострочено</span>`:"✓"}</div></div>
      <div class="kpi"><div class="l">Вино всього</div><div class="v" style="color:#8b5cf6">${ff(toCur(totalWine))}${c$}</div><div class="s">бочки + пляшки</div></div>
    </div>

    <div class="row">
      <div class="cc"><h3>Структура активів</h3><canvas id="cBalStr" height="160"></canvas></div>
      <div class="cc"><h3>Динаміка (кумулятивний P&L)</h3><canvas id="cBalTrend" height="160"></canvas></div>
    </div>

    <div class="cc"><h3>💵 Грошові рахунки</h3>
      ${BL.length?`<table class="tbl"><tr><th>Рахунок</th><th class="r">Валюта</th><th class="r">Баланс</th><th class="r">В ₴</th></tr>
        ${BL.map(b=>{const cur=gv(b,"валют")||"";const bal=pn(gv(b,"баланс"));const acc=gv(b,"рахунок")||gv(b,"account")||gv(b,"назва")||"—";const inUAH=cur==="EUR"?bal*FX.EUR:cur==="USD"?bal*FX.USD:bal;const curClr=cur==="UAH"?"#f59e0b":cur==="EUR"?"#3b82f6":"#10b981";return`<tr>
          <td style="font-size:9px">${acc}</td>
          <td class="r" style="color:${curClr}">${cur}</td>
          <td class="r" style="font-weight:600">${ff(bal)}</td>
          <td class="r" style="color:#7d8196">${ff(inUAH)}₴</td>
        </tr>`}).join("")}
        <tr class="tot"><td>Разом</td><td></td><td></td><td class="r g">${ff(totalMoney)}₴</td></tr>
      </table>`:'<div class="info">Баланси не завантажені (PRIVAT_BALANCES)</div>'}
    </div>

    <div class="row">
      <div class="cc"><h3>🍷 Вино в бочках/ємностях</h3>
        <div class="kpis" style="grid-template-columns:1fr 1fr">
          <div class="sh-kpi"><div class="l">Літрів</div><div class="v" style="color:#8b5cf6">${ff(lotsVol)}</div></div>
          <div class="sh-kpi"><div class="l">~Пляшок</div><div class="v">${ff(lotsBottles)}</div></div>
        </div>
        <div style="font-size:10px;color:#7d8196;margin-top:4px">Оцінка: <b style="color:#8b5cf6">${ff(lotsValue)}₴</b> (${ff(lotsValue/FX.EUR)}€)</div>
        <div style="margin-top:8px">
          ${(()=>{const byClr={};lots.forEach(l=>{const c=l.color||"?";if(!byClr[c])byClr[c]=0;byClr[c]+=l.volume});const colorClr={"red":"#e11d48","white":"#f59e0b","rose":"#ec4899","orange":"#f97316","sparkling":"#8b5cf6"};return Object.entries(byClr).sort((a,b)=>b[1]-a[1]).map(([c,v])=>{const pct=lotsVol>0?(v/lotsVol*100):0;return`<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px"><span style="color:${colorClr[c]||"#7d8196"}">${c}</span><span>${ff(v)}л (${pct.toFixed(0)}%)</span></div>`}).join("")})()}
        </div>
      </div>
      <div class="cc"><h3>🍾 Вино в пляшках (склад)</h3>
        <div class="kpis" style="grid-template-columns:1fr 1fr">
          <div class="sh-kpi"><div class="l">Пляшок</div><div class="v">${ff(stockBottles)}</div></div>
          <div class="sh-kpi"><div class="l">Оцінка</div><div class="v" style="color:#e11d48">${ff(stockValue)}₴</div></div>
        </div>
        ${goodsOnStock?`<div style="font-size:10px;color:#7d8196;margin-top:6px">Рах.28 (товари): <b>${ff(goodsOnStock)}₴</b></div>`:""}
      </div>
    </div>

    <div class="cc"><h3>📊 P&L ${curYr} YTD</h3>
      <div class="kpis">
        <div class="kpi"><div class="l">Виручка</div><div class="v g">${ff(toCur(revYTD))}${c$}</div><div class="s">${revGrowth>0?"+":""}${revGrowth.toFixed(0)}% vs ${prevYr}</div></div>
        <div class="kpi"><div class="l">OPEX</div><div class="v rd">${ff(toCur(Math.abs(expYTD)))}${c$}</div></div>
        <div class="kpi"><div class="l">Прибуток</div><div class="v" style="color:${profitYTD>0?"#10b981":"#ef4444"}">${ff(toCur(profitYTD))}${c$}</div><div class="s">маржа ${marginYTD.toFixed(1)}%</div></div>
        ${ukRev>0?`<div class="kpi"><div class="l">🇬🇧 UK виручка</div><div class="v g">${ff(ukRev)}£</div></div>`:""}
      </div>
    </div>

    ${overdueDebt>0?`<div class="cc" style="border-color:rgba(239,68,68,.4)"><h3 style="color:#ef4444">⚠ Прострочена заборгованість</h3>
      <div style="font-size:11px">Борг >30 днів: <b style="color:#ef4444">${ff(overdueDebt)}₴</b> (${overdueCount} партнерів)</div>
      <div style="font-size:9px;color:#7d8196;margin-top:4px">Деталі → вкладка Партнери → Борги</div>
    </div>`:""}

    <div class="cc"><h3>🏭 Основні фонди (CAPEX)</h3>
      <div class="kpis">
        <div class="kpi"><div class="l">Балансова вартість</div><div class="v" style="color:#f59e0b">${ff(toCur(fixedAssets))}${c$}</div><div class="s">рах. 10/11</div></div>
        ${(()=>{const ft=T.filter(t=>isA(t)&&t.tp==="Расход");const totalInv=toCur(Math.abs(ft.reduce((s,t)=>s+t.nt,0)));return'<div class="kpi"><div class="l">Всього інвестицій</div><div class="v" style="color:#3b82f6">'+ff(totalInv)+c$+'</div></div>'+ACATS.map(c=>'<div class="kpi"><div class="l">'+c.replace("Обладнання ","").replace(", власний транспорт","транспорт")+'</div><div class="v">'+ff(toCur(Math.abs(ft.filter(t=>t.cat.includes(c)).reduce((s,t)=>s+t.nt,0))))+c$+'</div></div>').join("")})()}
      </div>
      <canvas id="cBalCapex" height="130"></canvas>
    </div>
  `;

  // === CHARTS ===
  // Asset structure doughnut
  if(structure.length){
    dc("cBalStr");CH.cBalStr=new Chart(document.getElementById("cBalStr"),{type:"doughnut",
      data:{labels:structure.map(s=>s.name),datasets:[{data:structure.map(s=>s.val),backgroundColor:structure.map(s=>s.clr)}]},
      options:{responsive:true,plugins:{legend:{position:"bottom",labels:{color:"#7d8196",font:{size:9},boxWidth:9,padding:4}},
        tooltip:{callbacks:{label:ctx=>ctx.label+": "+ff(ctx.raw)+"₴ ("+((ctx.raw/totalAssets)*100).toFixed(0)+"%)"}}}}
    });
  }

  // CAPEX by year (stacked bar)
  const capexFt=T.filter(t=>isA(t)&&t.tp==="Расход");
  const capexYrs=aY();
  if(capexFt.length){
    dc("cBalCapex");CH.cBalCapex=new Chart(document.getElementById("cBalCapex"),{type:"bar",data:{labels:capexYrs,datasets:ACATS.map((c,i)=>({label:c.replace("Обладнання ",""),data:capexYrs.map(y=>toCur(Math.abs(capexFt.filter(t=>t.yr===y&&t.cat.includes(c)).reduce((s,t)=>s+t.nt,0)))),backgroundColor:CC[i+3],borderRadius:2}))},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{stacked:true,ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{stacked:true,ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  }

  // Balance trend
  if(months.length>2){
    dc("cBalTrend");CH.cBalTrend=new Chart(document.getElementById("cBalTrend"),{type:"line",
      data:{labels:months,datasets:[
        {label:"Кумулятивний P&L",data:balanceData,borderColor:"#8b5cf6",backgroundColor:"rgba(139,92,246,.08)",fill:true,tension:.3,pointRadius:0,borderWidth:2}
      ]},
      options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>ff(c.raw)+"₴"}}},
        scales:{x:{ticks:{color:"#7d8196",font:{size:7},maxTicksLimit:12},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)+"₴"},grid:{color:"#1e2130"}}}}
    });
  }
}
