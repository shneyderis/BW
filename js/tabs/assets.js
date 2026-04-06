// js/tabs/assets.js — Fixed Assets tab
function rAssets(f){
  const el=document.getElementById("t-assets"),c$=cs();
  const ft=T.filter(t=>isA(t)&&t.tp==="Расход");
  const total=toCur(Math.abs(ft.reduce((s,t)=>s+t.nt,0)));
  const yrs=aY();
  el.innerHTML=`
    <div class="kpis"><div class="kpi"><div class="l">Всего инвестиций</div><div class="v" style="color:#3b82f6">${ff(total)}${c$}</div></div>${ACATS.map(c=>'<div class="kpi"><div class="l">'+c.replace("Обладнання ","").replace(", власний транспорт","транспорт")+'</div><div class="v">'+ff(toCur(Math.abs(ft.filter(t=>t.cat.includes(c)).reduce((s,t)=>s+t.nt,0))))+c$+'</div></div>').join("")}</div>
    <div class="cc"><h3>Инвестиции по годам</h3><canvas id="ca1" height="130"></canvas></div>`;
  dc("ca1");CH.ca1=new Chart(document.getElementById("ca1"),{type:"bar",data:{labels:yrs,datasets:ACATS.map((c,i)=>({label:c.replace("Обладнання ",""),data:yrs.map(y=>toCur(Math.abs(ft.filter(t=>t.yr===y&&t.cat.includes(c)).reduce((s,t)=>s+t.nt,0)))),backgroundColor:CC[i+3],borderRadius:2}))},options:{responsive:true,plugins:{legend:{labels:{color:"#7d8196",font:{size:9},boxWidth:9}}},scales:{x:{stacked:true,ticks:{color:"#7d8196"},grid:{color:"#1e2130"}},y:{stacked:true,ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}}}}});
}
