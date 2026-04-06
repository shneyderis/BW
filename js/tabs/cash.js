// js/tabs/cash.js — Cash Flow tab
function rCash(f){
  const el=document.getElementById("t-cash"),c$=cs();
  const uahB=BL.filter(b=>gv(b,"валют")==="UAH").reduce((s,b)=>s+pn(gv(b,"баланс")),0);
  const eurB=BL.filter(b=>gv(b,"валют")==="EUR").reduce((s,b)=>s+pn(gv(b,"баланс")),0);
  const usdB=BL.filter(b=>gv(b,"валют")==="USD").reduce((s,b)=>s+pn(gv(b,"баланс")),0);
  const totalB=uahB+eurB*FX.EUR+usdB*FX.USD;
  const totalEUR=uahB/FX.EUR+eurB+usdB*FX.USD/FX.EUR;
  const totalUSD=uahB/FX.USD+eurB*FX.EUR/FX.USD+usdB;
  const ft=f.yr!=="ALL"?T.filter(t=>t.yr===f.yr):T;
  const byM={};ft.forEach(t=>{if(!byM[t.ym])byM[t.ym]={i:0,o:0};if(t.amt>0)byM[t.ym].i+=t.amt;else byM[t.ym].o+=Math.abs(t.amt)});
  const ms=Object.keys(byM).sort();const netto=ms.map(m=>byM[m].i-byM[m].o);
  let cum=0;const cumData=netto.map(n=>{cum+=n;return cum});
  const lastD={};T.forEach(t=>{if(!lastD[t.src]||t.ym>lastD[t.src])lastD[t.src]=t.ym});
  el.innerHTML=`
    <div class="kpis">
      <div class="kpi"><div class="l">Всего ₴</div><div class="v" style="color:#f59e0b">${ff(totalB)} ₴</div></div>
      <div class="kpi"><div class="l">Всего €</div><div class="v" style="color:#3b82f6">${ff(totalEUR)} €</div></div>
      <div class="kpi"><div class="l">Всего $</div><div class="v" style="color:#10b981">${ff(totalUSD)} $</div></div>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="l">₴ счёт</div><div class="v">${ff(uahB)}</div></div>
      <div class="kpi"><div class="l">€ счёт</div><div class="v">${ff(eurB)}</div><div class="s">=${ff(eurB*FX.EUR)}₴</div></div>
      <div class="kpi"><div class="l">$ счёт</div><div class="v">${ff(usdB)}</div><div class="s">=${ff(usdB*FX.USD)}₴</div></div>
    </div>
    <div class="cc"><h3>Входящие vs Исходящие</h3><canvas id="cc1" height="100"></canvas></div>
    <div class="row">
      <div class="cc"><h3>Нетто помесячно</h3><canvas id="cc2" height="100"></canvas></div>
      <div class="cc"><h3>Кумулятивный нетто</h3><canvas id="cc3" height="100"></canvas></div>
    </div>
    <div class="cc"><h3>Последние обновления</h3><table class="tbl"><tr><th>Источник</th><th class="r">Данные до</th></tr>${Object.entries(lastD).sort().map(([s,d])=>'<tr><td>'+s+'</td><td class="r">'+d+'</td></tr>').join("")}</table>
    <p style="font-size:9px;color:#7d8196;margin-top:6px">€1=${FX.EUR.toFixed(2)}₴ · $1=${FX.USD.toFixed(2)}₴ (НБУ)</p></div>`;
  dc("cc1");CH.cc1=new Chart(document.getElementById("cc1"),{type:"bar",data:{labels:ms,datasets:[{label:"Вход",data:ms.map(m=>byM[m].i),backgroundColor:"#10b981",borderRadius:2},{label:"Выход",data:ms.map(m=>byM[m].o),backgroundColor:"rgba(239,68,68,.5)",borderRadius:2}]},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{ticks:{color:"#7d8196",font:{size:7},maxTicksLimit:14},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  dc("cc2");CH.cc2=new Chart(document.getElementById("cc2"),{type:"bar",data:{labels:ms,datasets:[{data:netto,backgroundColor:netto.map(v=>v>=0?"#10b981":"#ef4444"),borderRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:7},maxTicksLimit:14},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
  dc("cc3");CH.cc3=new Chart(document.getElementById("cc3"),{type:"line",data:{labels:ms,datasets:[{data:cumData,borderColor:"#8b5cf6",backgroundColor:"rgba(139,92,246,.08)",fill:true,tension:.3,pointRadius:0,borderWidth:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:7},maxTicksLimit:14},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}
