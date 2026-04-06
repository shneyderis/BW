// js/tabs/exp.js — Expenses tab
function rExp(f){
  const el=document.getElementById("t-exp"),c$=cs(),sy=sY(f),py=pYr(sy);
  const ft=fl(T.filter(t=>t.tp==="Расход"&&!isA(t)),f);
  const revT=fl(T.filter(t=>t.tp==="Доход"),f).reduce((s,t)=>s+t.nt,0);
  const bc={};ft.forEach(t=>{bc[t.cat||"???"]=(bc[t.cat||"???"]||0)+t.nt});
  const so=Object.entries(bc).map(([c,v])=>({c,a:v})).sort((a,b)=>a.a-b.a).slice(0,15);
  const prevFt=T.filter(t=>t.tp==="Расход"&&!isA(t)&&t.yr===py);const prevBc={};prevFt.forEach(t=>{prevBc[t.cat||"???"]=(prevBc[t.cat||"???"]||0)+t.nt});
  const totalE=so.reduce((s,x)=>s+Math.abs(x.a),0);
  el.innerHTML=`
    <div class="cc"><h3>OPEX (без осн.фондов)</h3><canvas id="c4" height="${Math.max(120,so.length*14)}"></canvas></div>
    <div class="cc"><h3>Детализация</h3><table class="tbl"><tr><th>Категория</th><th class="r">Сумма</th><th class="r">%выр</th><th class="r">${py}</th><th class="r">Δ</th></tr>
      ${so.map(e=>{const cv=toCur(Math.abs(e.a));const pv=toCur(Math.abs(prevBc[e.c]||0));const pct=revT?(Math.abs(e.a)/revT*100).toFixed(1):"—";const d=pv?((cv-pv)/pv*100).toFixed(0):"—";return'<tr><td>'+e.c.substring(0,24)+'</td><td class="r rd">'+ff(cv)+c$+'</td><td class="r">'+pct+'%</td><td class="r" style="color:#7d8196">'+ff(pv)+'</td><td class="r" style="color:'+(d>0?"#ef4444":"#10b981")+'">'+(d>0?"+":"")+d+'%</td></tr>'}).join("")}
      <tr class="tot"><td>Итого OPEX</td><td class="r rd">${ff(toCur(totalE))}${c$}</td><td class="r">${revT?(totalE/revT*100).toFixed(1):"—"}%</td><td></td><td></td></tr></table></div>`;
  dc("c4");CH.c4=new Chart(document.getElementById("c4"),{type:"bar",data:{labels:so.map(e=>e.c.substring(0,20)),datasets:[{data:so.map(e=>toCur(Math.abs(e.a))),backgroundColor:"rgba(239,68,68,.5)",borderRadius:2}]},options:{indexAxis:"y",responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{color:"#7d8196",font:{size:9},callback:v=>fm(v)},grid:{color:"#1e2130"}},y:{ticks:{color:"#7d8196",font:{size:8}},grid:{display:false}}}}});
}
